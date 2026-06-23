import { describe, it, expect } from 'vitest';
import { recommendDispatch } from '../../server/services/ai/hubRouter';

describe('Hub Router — Dispatch Recommendations', () => {
  it('recommends higher quota in hot sunny weather', () => {
    const result = recommendDispatch({
      hubId: 'HUB-HARARE',
      hubName: 'Harare Central',
      currentSachetStock: 500,
      vendorCount: 10,
      recentWeeklySales: [250, 300, 280],
      regionForecastTemp: 32,
      regionForecastRain: 'sunny',
    });
    expect(result.recommendedQuota).toBeGreaterThan(25);
    expect(result.confidence).toBe('medium'); // 3 data points < 4 threshold
    expect(result.hubId).toBe('HUB-HARARE');
  });

  it('recommends lower quota in rainy weather', () => {
    const result = recommendDispatch({
      hubId: 'HUB-MUTARE',
      hubName: 'Mutare East',
      currentSachetStock: 300,
      vendorCount: 5,
      recentWeeklySales: [150, 120, 140],
      regionForecastTemp: 22,
      regionForecastRain: 'rainy',
    });
    expect(result.recommendedQuota).toBeLessThan(150);
    expect(result.confidence).toBe('medium'); // 3 data points < 4 threshold
  });

  it('caps recommendation to available stock', () => {
    const result = recommendDispatch({
      hubId: 'HUB-HARARE',
      hubName: 'Harare Central',
      currentSachetStock: 50, // very low stock
      vendorCount: 10,
      recentWeeklySales: [300, 350],
      regionForecastTemp: 28,
      regionForecastRain: 'sunny',
    });
    expect(result.recommendedQuota).toBeLessThanOrEqual(50);
  });

  it('gives low confidence with insufficient history', () => {
    const result = recommendDispatch({
      hubId: 'HUB-BYO',
      hubName: 'Bulawayo',
      currentSachetStock: 200,
      vendorCount: 4,
      recentWeeklySales: [100],
      regionForecastTemp: 26,
      regionForecastRain: 'partly cloudy',
    });
    expect(result.confidence).toBe('low');
  });

  it('handles extreme heat with bonus multiplier', () => {
    const result = recommendDispatch({
      hubId: 'HUB-HARARE',
      hubName: 'Harare',
      currentSachetStock: 1000,
      vendorCount: 20,
      recentWeeklySales: [400, 380, 420, 390],
      regionForecastTemp: 38,
      regionForecastRain: 'sunny',
    });
    expect(result.recommendedQuota).toBeGreaterThan(20);
  });
});
