'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ReviewMetrics, TimeRange } from '@/types/github';
import { generateTimeRanges } from './api';
import { calculateReviewMetricsFromCache, syncAllGitHubData } from '@/lib/supabase/data-service';

interface GitHubContextType {
  organization: string;
  setOrganization: (org: string) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  timeRanges: TimeRange[];
  reviewMetrics: ReviewMetrics[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const defaultTimeRanges = generateTimeRanges();

const GitHubContext = createContext<GitHubContextType>({
  organization: process.env.NEXT_PUBLIC_GITHUB_ORG || 'sarasanalytics-com',
  setOrganization: () => {},
  timeRange: defaultTimeRanges[0],
  setTimeRange: () => {},
  timeRanges: defaultTimeRanges,
  reviewMetrics: [],
  isLoading: false,
  error: null,
  refreshData: async () => {},
});

export const useGitHub = () => useContext(GitHubContext);

export const GitHubProvider = ({ children }: { children: ReactNode }) => {
  const defaultOrg = process.env.NEXT_PUBLIC_GITHUB_ORG || 'sarasanalytics-com';
  const [organization, setOrganization] = useState<string>(defaultOrg);
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRanges[0]);
  const [timeRanges] = useState<TimeRange[]>(defaultTimeRanges);
  const [reviewMetrics, setReviewMetrics] = useState<ReviewMetrics[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data when organization or timeRange changes
  useEffect(() => {
    refreshData();
  }, [organization, timeRange]);

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First, trigger a sync to ensure we have the latest data
      await syncAllGitHubData(undefined, organization);
      
      // Then calculate metrics from the cached data
      const metrics = await calculateReviewMetricsFromCache(organization, timeRange);
      setReviewMetrics(metrics);
    } catch (err: any) {
      console.error('Error fetching GitHub data:', err);
      setError(err?.message || 'Failed to fetch GitHub data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GitHubContext.Provider
      value={{
        organization,
        setOrganization,
        timeRange,
        setTimeRange,
        timeRanges,
        reviewMetrics,
        isLoading,
        error,
        refreshData,
      }}
    >
      {children}
    </GitHubContext.Provider>
  );
};
