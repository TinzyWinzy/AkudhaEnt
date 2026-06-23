import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';

export interface HubInventory {
  hubId: string;
  hubName: string;
  currentSachetStock: number;
  vendorCount: number;
  recentWeeklySales: number[];
  regionForecastTemp: number;
  regionForecastRain: string;
}

export interface DispatchRecommendation {
  hubId: string;
  recommendedQuota: number;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
}

const WEATHER_IMPACT: Record<string, number> = {
  sunny: 1.3,
  'partly cloudy': 1.1,
  cloudy: 0.9,
  rainy: 0.6,
  storm: 0.3,
};

function computeMovingAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Rules-based hub dispatch recommendation.
 * Uses weather impact, historical sales velocity, and current stock.
 */
export function recommendDispatch(input: HubInventory): DispatchRecommendation {
  const avgWeeklySales = computeMovingAverage(input.recentWeeklySales ?? []);
  const weatherMultiplier = WEATHER_IMPACT[(input.regionForecastRain ?? '').toLowerCase()] ?? 1.0;
  const tempMultiplier = input.regionForecastTemp > 30 ? 1.2 : input.regionForecastTemp > 25 ? 1.1 : 1.0;

  const baseQuota = Math.max(avgWeeklySales, 50);
  const weatherAdjusted = Math.round(baseQuota * weatherMultiplier * tempMultiplier);
  const stockCapped = Math.min(weatherAdjusted, input.currentSachetStock);
  const perVendorQuota = input.vendorCount > 0 ? Math.round(stockCapped / input.vendorCount) : stockCapped;
  const finalQuota = Math.max(perVendorQuota, 10);

  const sales = input.recentWeeklySales ?? [];
  let confidence: DispatchRecommendation['confidence'] = 'high';
  if (sales.length < 2) confidence = 'low';
  else if (sales.length < 4) confidence = 'medium';

  const rationale = `Weather: ${input.regionForecastRain} (${weatherMultiplier.toFixed(1)}x), Temp: ${input.regionForecastTemp}°C (${tempMultiplier.toFixed(1)}x), Historical avg: ${avgWeeklySales.toFixed(0)}/wk, Stock: ${input.currentSachetStock}, Vendors: ${input.vendorCount}`;

  return { hubId: input.hubId, recommendedQuota: finalQuota, confidence, rationale };
}

/**
 * Optional LLM enrichment for the dispatch recommendation.
 */
export async function enrichDispatchRecommendation(input: HubInventory, recommendation: DispatchRecommendation): Promise<string | undefined> {
  if (!env.GEMINI_API_KEY) return undefined;

  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    const prompt = `You are a logistics planner for Akudha Enterprises in Zimbabwe.

A dispatch recommendation has been generated for hub "${input.hubName}" (${input.hubId}):

- Current stock: ${input.currentSachetStock} sachets
- Active vendors: ${input.vendorCount}
- Recent weekly sales trend: [${input.recentWeeklySales.join(', ')}]
- Weather forecast: ${input.regionForecastTemp}°C, ${input.regionForecastRain}
- Recommended per-vendor quota: ${recommendation.recommendedQuota} sachets

Provide 2-3 practical operational insights in plain bullet points to help the hub manager.
Focus on real Zimbabwe informal market considerations (avoiding stockouts, managing spoilage in heat, vendor payment cycles).
Prefix each point with a brief emoji indicator.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text || undefined;
  } catch (error) {
    console.error('[HubRouter] Gemini enrichment failed:', error);
    return 'Enrichment unavailable: LLM call failed.';
  }
}
