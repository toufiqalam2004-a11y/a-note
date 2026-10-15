export interface Client {
  id: string;
  name: string;
  totalBudget: number;
  ratePerVideo: number;
  createdAt: string;
}

export interface VideoItem {
  id: string;
  clientId: string;
  videoNumber: number;
  title?: string;
  isCompleted: boolean;
  completedAt?: string | null;
}

export interface ClientCalculations {
  totalVideos: number;
  completedVideos: number;
  remainingVideos: number;
  completedValue: number;
  remainingValue: number;
  unusedBudget: number;
  totalBudget: number;
  ratePerVideo: number;
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
  completedDate: string;
  createdAt: string;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

export interface PendingVoiceAction {
  type: 'ADD_CLIENT' | 'COMPLETE_VIDEO';
  description: string;
  clientName: string;
  clientId?: string;
  totalBudget?: number;
  ratePerVideo?: number;
  videoNumber?: number;
  videoId?: string;
}
