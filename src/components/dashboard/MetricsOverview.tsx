'use client';

import { ReviewMetrics } from '@/types/github';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricsOverviewProps {
  metrics: ReviewMetrics[];
  isLoading: boolean;
}

export function MetricsOverview({ metrics, isLoading }: MetricsOverviewProps) {
  // Calculate total metrics across all users
  const totalAssigned = metrics.reduce((sum, user) => sum + user.assignedCount, 0);
  const totalApproved = metrics.reduce((sum, user) => sum + user.approvedCount, 0);
  const totalChangesRequested = metrics.reduce((sum, user) => sum + user.changesRequestedCount, 0);
  const totalCommented = metrics.reduce((sum, user) => sum + user.commentedCount, 0);
  const totalReviewed = metrics.reduce((sum, user) => sum + user.totalReviewedCount, 0);
  
  // Calculate top reviewers
  const sortedByReviews = [...metrics].sort((a, b) => b.totalReviewedCount - a.totalReviewedCount);
  const topReviewers = sortedByReviews.slice(0, 3);
  
  // Calculate completion rate
  const completionRate = totalAssigned > 0 
    ? Math.round((totalReviewed / totalAssigned) * 100) 
    : 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium font-sans tracking-tight">
              Total PRs Assigned for Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssigned}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total PRs Reviewed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReviewed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Review Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Changes Requested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChangesRequested}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Review Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-sans">Approvals</span>
                <span className="font-medium font-sans">{totalApproved}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-pink-500 dark:bg-pink-400 h-2.5 rounded-full" 
                  style={{ 
                    width: `${totalApproved + totalChangesRequested + totalCommented > 0 
                      ? (totalApproved / (totalApproved + totalChangesRequested + totalCommented)) * 100 
                      : 0}%` 
                  }}
                ></div>
              </div>
              
              <div className="flex justify-between">
                <span className="font-sans">Changes Requested</span>
                <span className="font-medium font-sans">{totalChangesRequested}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-pink-300 dark:bg-pink-600 h-2.5 rounded-full" 
                  style={{ 
                    width: `${totalApproved + totalChangesRequested + totalCommented > 0 
                      ? (totalChangesRequested / (totalApproved + totalChangesRequested + totalCommented)) * 100 
                      : 0}%` 
                  }}
                ></div>
              </div>
              
              <div className="flex justify-between">
                <span className="font-sans">Comments</span>
                <span className="font-medium font-sans">{totalCommented}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-pink-200 dark:bg-pink-800 h-2.5 rounded-full" 
                  style={{ 
                    width: `${totalApproved + totalChangesRequested + totalCommented > 0 
                      ? (totalCommented / (totalApproved + totalChangesRequested + totalCommented)) * 100 
                      : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="font-sans tracking-tight">Top Reviewers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topReviewers.map((reviewer, index) => (
                <div key={reviewer.userId} className="flex items-center">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      {index + 1}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {reviewer.name || reviewer.login}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {reviewer.totalReviewedCount} reviews
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-300">
                      {reviewer.approvedCount} approvals
                    </span>
                  </div>
                </div>
              ))}
              
              {topReviewers.length === 0 && (
                <p className="text-muted-foreground">No review data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
