'use client';

import { ReviewMetrics } from '@/types/github';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ReviewActivityChartProps {
  metrics: ReviewMetrics[];
  isLoading: boolean;
}

export function ReviewActivityChart({ metrics, isLoading }: ReviewActivityChartProps) {
  // Transform data for the chart
  const chartData = metrics.map((user) => ({
    name: user.name || user.login,
    assigned: user.assignedCount,
    approved: user.approvedCount,
    changesRequested: user.changesRequestedCount,
    commented: user.commentedCount,
  }));

  // Sort by total activity
  chartData.sort((a, b) => {
    const totalA = a.approved + a.changesRequested + a.commented;
    const totalB = b.approved + b.changesRequested + b.commented;
    return totalB - totalA;
  });

  // Limit to top 10 users for better visualization
  const topUsers = chartData.slice(0, 10);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Review Activity</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] animate-pulse bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Review Activity</CardTitle>
      </CardHeader>
      <CardContent className="h-[500px] chart-container">
        {topUsers.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topUsers}
              layout="vertical"
              margin={{
                top: 20,
                right: 30,
                left: 40,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
              <XAxis type="number" stroke="var(--foreground)" tickLine={false} />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100}
                tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />

              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  borderColor: 'var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--foreground)',
                  boxShadow: 'var(--shadow)'
                }}
                itemStyle={{ color: 'var(--foreground)' }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => <span style={{ color: 'var(--foreground)' }}>{value}</span>}
              />
              <Bar dataKey="approved" stackId="a" fill="var(--chart-1)" name="Approved" />
              <Bar dataKey="changesRequested" stackId="a" fill="var(--chart-2)" name="Changes Requested" />
              <Bar dataKey="commented" stackId="a" fill="var(--chart-3)" name="Commented" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No review data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
