'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';
import { GitHubProvider } from './github/context';
import { ThemeProvider } from '@/components/theme/theme-provider';

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
          {children}
        </GitHubProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
