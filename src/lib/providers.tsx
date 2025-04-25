'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode, createContext, useContext } from 'react';
import { GitHubProvider } from './github/context';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { useAchievementTracker } from '@/hooks/useAchievementTracker';
import { useActivityTracker } from '@/hooks/useActivityTracker';

// Create contexts for achievements and activity tracking
const AchievementContext = createContext<ReturnType<typeof useAchievementTracker> | null>(null);
const ActivityContext = createContext<ReturnType<typeof useActivityTracker> | null>(null);

// Export hooks to use these contexts
export const useAchievements = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  return context;
};

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};

// Achievement Provider component
function AchievementProvider({ children }: { children: ReactNode }) {
  const achievementData = useAchievementTracker();
  
  return (
    <AchievementContext.Provider value={achievementData}>
      {children}
    </AchievementContext.Provider>
  );
}

// Activity Provider component
function ActivityProvider({ children }: { children: ReactNode }) {
  const activityData = useActivityTracker();
  
  return (
    <ActivityContext.Provider value={activityData}>
      {children}
    </ActivityContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <ThemeProvider defaultTheme="light" storageKey="pr-review-theme">
      <QueryClientProvider client={queryClient}>
        <GitHubProvider>
          <ActivityProvider>
            <AchievementProvider>
              {children}
            </AchievementProvider>
          </ActivityProvider>
        </GitHubProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
