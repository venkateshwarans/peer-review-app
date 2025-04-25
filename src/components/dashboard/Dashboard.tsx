'use client';

import { useState } from 'react';
import { useGitHub } from '@/lib/github/context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { MetricsOverview } from '@/components/dashboard/MetricsOverview';
import { ReviewActivityChart } from '@/components/dashboard/ReviewActivityChart';

export function Dashboard() {
  const { 
    timeRanges, 
    timeRange, 
    setTimeRange, 
    reviewMetrics, 
    isLoading, 
    error 
  } = useGitHub();
  
  const [activeTab, setActiveTab] = useState('overview');

  const handleTimeRangeChange = (value: string) => {
    const selectedRange = timeRanges.find(range => range.value === value);
    if (selectedRange) {
      setTimeRange(selectedRange);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-4xl font-semibold tracking-tight font-sans">Dashboard</h1>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground font-sans letter-spacing-wide">Time Period:</span>
          <Tabs 
            value={timeRange.value} 
            onValueChange={handleTimeRangeChange}
            className="w-[400px]"
          >
            <TabsList className="grid grid-cols-4">
              {timeRanges.map((range) => (
                <TabsTrigger key={range.value} value={range.value}>
                  {range.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="gamified">Gamified</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <MetricsOverview metrics={reviewMetrics} isLoading={isLoading} />
        </TabsContent>
        
        <TabsContent value="leaderboard">
          <LeaderboardTable metrics={reviewMetrics} isLoading={isLoading} />
        </TabsContent>
        
        <TabsContent value="gamified">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Gamified Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8">
                <a href="/gamification" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  Go to Gamified Dashboard
                </a>
                <p className="mt-4 text-sm text-muted-foreground max-w-md text-center">
                  View your achievements, track your progress, and compete with your team in our gamified PR review experience.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity">
          <ReviewActivityChart metrics={reviewMetrics} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
