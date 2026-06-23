import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';

export interface AnomalyInput {
  region: string;
  rawWeightKg: number;
  sachetCount: number;
  batchId: string;
  historicalYields: number[];
}

export interface AnomalyResult {
  isAnomalous: boolean;
  yieldRatio: number;
  deviationPercent: number;
  movingAverage: number;
  enrichment?: string;
}

const OPTIMAL_RATIO = 10;
const DEVIATION_THRESHOLD = 15;

function computeMovingAverage(historicalYields: number[]): number {
  if (historicalYields.length === 0) return OPTIMAL_RATIO;
  return historicalYields.reduce((a, b) => a + b, 0) / historicalYields.length;
}

/**
 * Rules-based anomaly detection.
 * Runs synchronously on every batch submission.
 */
export function detectAnomaly(input: AnomalyInput): { isAnomalous: boolean; yieldRatio: number; deviationPercent: number; movingAverage: number } {
  const yieldRatio = input.rawWeightKg > 0
    ? Math.round((input.sachetCount / input.rawWeightKg) * 100) / 100
    : 0;

  const movingAverage = computeMovingAverage(input.historicalYields ?? []);
  const deviationPercent = movingAverage > 0
    ? Math.round(((yieldRatio - movingAverage) / movingAverage) * 100 * 10) / 10
    : 0;

  const isAnomalous = Math.abs(deviationPercent) > DEVIATION_THRESHOLD;
  return { isAnomalous, yieldRatio, deviationPercent, movingAverage };
}

/**
 * Optional Gemini enrichment for flagged anomalies.
 * Only called when isAnomalous is true and GEMINI_API_KEY is set.
 */
export async function enrichAnomaly(input: AnomalyInput, detection: { yieldRatio: number; deviationPercent: number; movingAverage: number }): Promise<string | undefined> {
  if (!env.GEMINI_API_KEY) return undefined;

  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    const prompt = `You are a supply chain quality analyst for Akudha Enterprises, a baobab freezit producer in Zimbabwe.

A processing batch in the ${input.region} region has been flagged as anomalous:

- Batch ID: ${input.batchId}
- Input raw weight: ${input.rawWeightKg} kg
- Output sachet count: ${input.sachetCount}
- Yield ratio: ${detection.yieldRatio} sachets/kg (regional moving average: ${detection.movingAverage})
- Deviation from average: ${detection.deviationPercent}%

The standard optimum yield is 10 sachets per 1kg of baobab pulp.

List 3 possible root causes for this yield deviation in plain bullet points.
Keep each point to 1 sentence. Focus on practical issues relevant to rural Zimbabwe processing (temperature, equipment, moisture, transport, theft).
Prefix each point with a brief emoji indicator.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    return response.text || undefined;
  } catch (error) {
    console.error('[AnomalyAgent] Gemini enrichment failed:', error);
    return 'Enrichment unavailable: LLM call failed.';
  }
}
