import { ClientCalculations, ClientWithVideos, DashboardSummary, VideoItem } from '../types/index';

/**
 * Calculates video counts, financial values, and unused budget for a single client.
 * 
 * Rules:
 * - Total video count = floor(total budget / per-video rate)
 * - Remaining videos = total videos - completed videos
 * - Completed video value = completed videos * per-video rate
 * - Remaining video value = remaining videos * per-video rate
 * - Unused budget = total budget - (total video count * per-video rate)
 */
export function calculateClientMetrics(
  totalBudget: number,
  ratePerVideo: number,
  videos: VideoItem[]
): ClientCalculations {
  const safeRate = ratePerVideo > 0 ? ratePerVideo : 1;
  const safeBudget = Math.max(0, totalBudget);

  const totalVideos = Math.floor(safeBudget / safeRate);
  const completedVideos = videos.filter((v) => v.isCompleted).length;
  const remainingVideos = Math.max(0, totalVideos - completedVideos);

  const completedValue = completedVideos * safeRate;
  const remainingValue = remainingVideos * safeRate;
  const unusedBudget = Math.max(0, safeBudget - totalVideos * safeRate);

  return {
    totalVideos,
    completedVideos,
    remainingVideos,
    completedValue,
    remainingValue,
    unusedBudget,
    totalBudget: safeBudget,
    ratePerVideo: safeRate,
  };
}

/**
 * Aggregates all client metrics into a global dashboard summary.
 */
export function calculateDashboardSummary(clients: ClientWithVideos[]): DashboardSummary {
  return clients.reduce<DashboardSummary>(
    (acc, client) => {
      acc.totalVideos += client.calculations.totalVideos;
      acc.completedVideos += client.calculations.completedVideos;
      acc.remainingVideos += client.calculations.remainingVideos;
      acc.totalValue += client.calculations.totalBudget;
      acc.completedValue += client.calculations.completedValue;
      acc.remainingValue += client.calculations.remainingValue;
      acc.totalUnusedBudget += client.calculations.unusedBudget;
      return acc;
    },
    {
      totalVideos: 0,
      completedVideos: 0,
      remainingVideos: 0,
      totalValue: 0,
      completedValue: 0,
      remainingValue: 0,
      totalUnusedBudget: 0,
    }
  );
}

/**
 * Formats a number as Indian Rupee (₹) currency.
 */
export function formatCurrency(amount: number): string {
  try {
    return '₹' + Math.round(amount).toLocaleString('en-IN');
  } catch {
    return `₹${Math.round(amount)}`;
  }
}
