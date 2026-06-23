import { useState } from 'react';
import { Brain, Lightbulb, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { INITIAL_HUBS } from '../initialData';

interface AnomalyResult {
  isAnomalous: boolean;
  yieldRatio: number;
  deviationPercent: number;
  movingAverage: number;
  enrichment?: string;
}

interface HubRecommendation {
  hubId: string;
  recommendedQuota: number;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
  enrichment?: string;
}

export function AiInsightsPanel() {
  const [hubId, setHubId] = useState('HUB-HARARE');
  const [stock, setStock] = useState('500');
  const [vendors, setVendors] = useState('10');
  const [salesHistory, setSalesHistory] = useState('250,300,280');
  const [temp, setTemp] = useState('32');
  const [weather, setWeather] = useState('sunny');

  const [anomalyResult, setAnomalyResult] = useState<AnomalyResult | null>(null);
  const [hubResult, setHubResult] = useState<HubRecommendation | null>(null);
  const [loading, setLoading] = useState<'anomaly' | 'hub' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnomalyCheck = async () => {
    setLoading('anomaly');
    setError(null);
    try {
      const res = await fetch('/api/ai/anomaly/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region: 'Chimanimani',
          rawWeightKg: 25,
          sachetCount: 180,
          batchId: 'B-SIM-' + Date.now(),
          historicalYields: [10, 9.8, 10.2, 9.5],
        }),
      });
      if (!res.ok) throw new Error('API returned ' + res.status);
      const data = await res.json();
      setAnomalyResult(data);
    } catch (err: any) {
      setError(err.message || 'Anomaly check failed');
    } finally {
      setLoading(null);
    }
  };

  const runHubRecommend = async () => {
    setLoading('hub');
    setError(null);
    try {
      const sales = salesHistory.split(',').map(Number).filter(n => !isNaN(n));
      const res = await fetch('/api/ai/hub/recommend-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hubId,
          hubName: INITIAL_HUBS.find(h => h.id === hubId)?.name || hubId,
          currentSachetStock: parseInt(stock) || 0,
          vendorCount: parseInt(vendors) || 0,
          recentWeeklySales: sales,
          regionForecastTemp: parseInt(temp) || 25,
          regionForecastRain: weather,
        }),
      });
      if (!res.ok) throw new Error('API returned ' + res.status);
      const data = await res.json();
      setHubResult(data);
    } catch (err: any) {
      setError(err.message || 'Hub recommendation failed');
    } finally {
      setLoading(null);
    }
  };

  const confidenceColor = hubResult?.confidence === 'high' ? 'text-emerald-600 bg-emerald-50'
    : hubResult?.confidence === 'medium' ? 'text-amber-600 bg-amber-50'
    : 'text-rose-600 bg-rose-50';

  return (
    <div className="space-y-6" id="ai-insights-panel">
      <div className="flex items-center gap-2 border-b border-charcoal-200 pb-3 mb-4">
        <Brain className="h-5 w-5 text-purple-600" />
        <h3 className="font-display text-base font-bold text-charcoal-900">AI Intelligence Agents</h3>
        <span className="rounded-full bg-purple-50 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-700 border border-purple-200">HYBRID</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Anomaly Agent */}
        <div className="rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h4 className="font-display font-bold text-sm text-charcoal-900">Supply &amp; Anomaly Agent</h4>
            </div>
            <span className="text-[10px] font-mono text-charcoal-500 bg-charcoal-100 px-2 py-0.5 rounded">Auto-triggered</span>
          </div>
          <p className="text-xs text-charcoal-700 mb-4">
            Detects yield deviations &gt;15% and enriches flagged batches with Gemini root-cause analysis.
          </p>
          <div className="bg-charcoal-50 rounded-lg p-3 border border-charcoal-200 mb-3 text-xs space-y-1">
            <p><strong>Demo:</strong> 25kg input, 180 sachets output (7.2 ratio, 28% below average)</p>
          </div>
          <button
            onClick={runAnomalyCheck}
            disabled={loading === 'anomaly'}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-charcoal-900 font-bold py-2 px-3 rounded-lg text-xs uppercase transition-all"
          >
            {loading === 'anomaly' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
            {loading === 'anomaly' ? 'Analyzing...' : 'Run Anomaly Detection'}
          </button>
          {anomalyResult && (
            <div className={`mt-4 p-3 rounded-lg border text-xs ${anomalyResult.isAnomalous ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`h-2 w-2 rounded-full ${anomalyResult.isAnomalous ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span className="font-bold uppercase tracking-wider">{anomalyResult.isAnomalous ? 'ANOMALOUS' : 'NORMAL'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div><span className="text-gray-500 block">Yield</span><span className="font-mono font-bold">{anomalyResult.yieldRatio} /kg</span></div>
                <div><span className="text-gray-500 block">Deviation</span><span className="font-mono font-bold">{anomalyResult.deviationPercent}%</span></div>
                <div><span className="text-gray-500 block">Avg</span><span className="font-mono font-bold">{anomalyResult.movingAverage} /kg</span></div>
              </div>
              {anomalyResult.enrichment && (
                <div className="mt-2 pt-2 border-t border-amber-200">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-purple-700">Gemini Insights</span>
                  <div className="mt-1 text-[11px] text-charcoal-800 whitespace-pre-wrap">{anomalyResult.enrichment}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hub Router */}
        <div className="rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h4 className="font-display font-bold text-sm text-charcoal-900">Predictive Hub Router</h4>
            </div>
            <span className="text-[10px] font-mono text-charcoal-500 bg-charcoal-100 px-2 py-0.5 rounded">Manual trigger</span>
          </div>
          <p className="text-xs text-charcoal-700 mb-4">
            Recommends per-vendor dispatch quotas based on weather, inventory, and sales trends.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-charcoal-700 mb-0.5">Hub</label>
              <select value={hubId} onChange={e => setHubId(e.target.value)} className="w-full rounded border border-charcoal-200 px-2 py-1 text-xs">
                {INITIAL_HUBS.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-charcoal-700 mb-0.5">Stock</label>
              <input type="number" value={stock} onChange={e => setStock(e.target.value)} className="w-full rounded border border-charcoal-200 px-2 py-1 text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-charcoal-700 mb-0.5">Vendors</label>
              <input type="number" value={vendors} onChange={e => setVendors(e.target.value)} className="w-full rounded border border-charcoal-200 px-2 py-1 text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-charcoal-700 mb-0.5">Temp °C</label>
              <input type="number" value={temp} onChange={e => setTemp(e.target.value)} className="w-full rounded border border-charcoal-200 px-2 py-1 text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-charcoal-700 mb-0.5">Weather</label>
              <select value={weather} onChange={e => setWeather(e.target.value)} className="w-full rounded border border-charcoal-200 px-2 py-1 text-xs">
                <option value="sunny">Sunny</option>
                <option value="partly cloudy">Partly Cloudy</option>
                <option value="cloudy">Cloudy</option>
                <option value="rainy">Rainy</option>
                <option value="storm">Storm</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-charcoal-700 mb-0.5">Sales (CSV)</label>
              <input type="text" value={salesHistory} onChange={e => setSalesHistory(e.target.value)} className="w-full rounded border border-charcoal-200 px-2 py-1 text-xs" placeholder="250,300,280" />
            </div>
          </div>

          <button
            onClick={runHubRecommend}
            disabled={loading === 'hub'}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs uppercase transition-all"
          >
            {loading === 'hub' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
            {loading === 'hub' ? 'Calculating...' : 'Get Dispatch Recommendation'}
          </button>

          {hubResult && (
            <div className="mt-4 p-3 rounded-lg border bg-blue-50 border-blue-200 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold uppercase tracking-wider">Recommendation</span>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${confidenceColor}`}>{hubResult.confidence}</span>
              </div>
              <div className="font-display text-2xl font-bold text-charcoal-900 mb-1">
                {hubResult.recommendedQuota} <span className="font-sans text-sm font-normal text-charcoal-700">sachets/vendor</span>
              </div>
              <p className="text-[10px] text-charcoal-500 mt-1">{hubResult.rationale}</p>
              {hubResult.enrichment && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-purple-700">Gemini Insights</span>
                  <div className="mt-1 text-[11px] text-charcoal-800 whitespace-pre-wrap">{hubResult.enrichment}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-300 p-3 text-xs text-rose-800">
          <span className="font-bold">Agent Error:</span> {error}
          <p className="text-[10px] mt-1 text-rose-600">Ensure the server is running (<code className="font-mono bg-rose-100 px-1 rounded">npm run dev:server</code>)</p>
        </div>
      )}

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-charcoal-700">
        <div className="flex items-center gap-1.5 mb-2">
          <Brain className="h-4 w-4 text-purple-600" />
          <span className="font-bold text-purple-800">How it works</span>
        </div>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Anomaly Agent:</strong> Rules-based detection runs on every batch submission (<code className="font-mono bg-purple-100 px-1 rounded">lib/yield.ts</code>). If flagged, Gemini suggests root causes.</li>
          <li><strong>Hub Router:</strong> Weighs weather multipliers (<code className="font-mono bg-purple-100 px-1 rounded">sunny=1.3x</code>, <code className="font-mono bg-purple-100 px-1 rounded">rainy=0.6x</code>), temperature bonuses, and historical sales velocity against available stock.</li>
          <li><strong>Hybrid:</strong> Both agents work without Gemini if no API key is set — rules-only fallback.</li>
        </ul>
      </div>
    </div>
  );
}
