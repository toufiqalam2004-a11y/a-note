export interface Client {
  id: string;
  name: string;
  totalBudget: number;
  ratePerVideo: number;
  createdAt: string;
  videoTypes?: string[];
}

export interface VideoItem {
  id: string;
  clientId: string;
  videoNumber: number;
  title?: string;
  videoType?: string | null;
  isCompleted: boolean;
  completedAt?: string | null;
}

export interface ClientCalculations {
  totalVideos: number; // Video capacity = floor(payment / rate)
  completedVideos: number;
  remainingVideos: number;
  completedValue: number; // Money earned through completed videos
  remainingValue: number; // Pending work value
  unusedBudget: number; // Unused payment balance = payment % rate
  totalBudget: number; // Payment received
  ratePerVideo: number; // Agreed rate per video
  // Explicit aliases matching business requirements
  paymentReceived: number;
  videoCapacity: number;
  unusedPaymentBalance: number;
  moneyEarned: number;
  pendingWorkValue: number;
}

export interface ClientWithVideos extends Client {
  videos: VideoItem[];
  calculations: ClientCalculations;
}

export interface DashboardSummary {
  totalVideos: number;
  completedVideos: number;
  remainingVideos: number;
  totalValue: number;
  completedValue: number;
  remainingValue: number;
  totalUnusedBudget: number;
}

export interface CompletionHistoryEntry {
  id: string;
  clientId: string;
  clientName: string;
  videoId: string;
  videoNumber: number;
  completedDate: string; // YYYY-MM-DD
  createdAt: string; // ISO 8601 full timestamp
  timeFormatted?: string;
}

export type HistoryDateFilter = 'all' | 'today' | 'last7' | 'last30';
export type HistoryStatusFilter = 'all' | 'completed' | 'remaining';

export interface ExportReportOptions {
  dateRange: HistoryDateFilter;
  includeCompletedOnly?: boolean;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'confirmation' | 'success' | 'error';

export interface PendingVoiceAction {
  type: 'ADD_CLIENT' | 'COMPLETE_VIDEO' | 'NAVIGATE';
  description: string;
  clientName: string;
  clientId?: string;
  totalBudget?: number;
  ratePerVideo?: number;
  videoNumber?: number;
  videoId?: string;
}

