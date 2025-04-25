export interface User {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  name?: string;
  email?: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  user: User;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  requested_reviewers: User[];
  base: {
    repo: Repository;
  };
}

export interface Review {
  id: number;
  user: User;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  submitted_at: string;
  html_url: string;
  pull_request_url: string;
}

export interface ReviewMetrics {
  userId: number;
  login: string;
  name?: string;
  avatarUrl: string;
  assignedCount: number;
  approvedCount: number;
  changesRequestedCount: number;
  commentedCount: number;
  totalReviewedCount: number;
  openAgainstCount: number;
  openedCount?: number;
  pendingCount?: number;
}

export interface TimeRange {
  label: string;
  value: TimeRangeValue;
  startDate: Date;
  endDate: Date;
}

export type TimeRangeValue = 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface ReviewStats {
  timeRange: TimeRange;
  metrics: ReviewMetrics[];
}
