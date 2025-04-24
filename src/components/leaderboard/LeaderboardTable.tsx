'use client';

import { useState } from 'react';
import { ReviewMetrics } from '@/types/github';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LeaderboardTableProps {
  metrics: ReviewMetrics[];
  isLoading: boolean;
}

type SortKey = 
  | 'totalReviewedCount' 
  | 'approvedCount' 
  | 'changesRequestedCount' 
  | 'commentedCount' 
  | 'assignedCount';

type SortDirection = 'asc' | 'desc';

export function LeaderboardTable({ metrics, isLoading }: LeaderboardTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>('totalReviewedCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort metrics by the selected key and direction
  const sortedMetrics = [...metrics].sort((a, b) => {
    const valueA = a[sortBy];
    const valueB = b[sortBy];
    return sortDirection === 'desc' ? valueB - valueA : valueA - valueB;
  });

  const handleSortChange = (value: string) => {
    setSortBy(value as SortKey);
  };
  
  const handleColumnSort = (key: SortKey) => {
    if (sortBy === key) {
      // Toggle direction if already sorting by this column
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      // Set new sort column and default to descending
      setSortBy(key);
      setSortDirection('desc');
    }
  };
  
  // Helper to render sort indicator
  const getSortIcon = (key: SortKey) => {
    if (sortBy !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === 'desc' ? 
      <ArrowDown className="ml-2 h-4 w-4" /> : 
      <ArrowUp className="ml-2 h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Leaderboard</CardTitle>
          <div className="w-[180px] h-10 bg-muted rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Leaderboard</CardTitle>
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="totalReviewedCount">Total Reviews</SelectItem>
            <SelectItem value="approvedCount">Approvals</SelectItem>
            <SelectItem value="changesRequestedCount">Changes Requested</SelectItem>
            <SelectItem value="commentedCount">Comments</SelectItem>
            <SelectItem value="assignedCount">Assigned Reviews</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Rank</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleColumnSort('assignedCount')}
                  className="h-8 px-2 flex items-center justify-end w-full"
                >
                  Assigned
                  {getSortIcon('assignedCount')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleColumnSort('approvedCount')}
                  className="h-8 px-2 flex items-center justify-end w-full"
                >
                  Approved
                  {getSortIcon('approvedCount')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleColumnSort('changesRequestedCount')}
                  className="h-8 px-2 flex items-center justify-end w-full"
                >
                  Changes
                  {getSortIcon('changesRequestedCount')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleColumnSort('commentedCount')}
                  className="h-8 px-2 flex items-center justify-end w-full"
                >
                  Comments
                  {getSortIcon('commentedCount')}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleColumnSort('totalReviewedCount')}
                  className="h-8 px-2 flex items-center justify-end w-full"
                >
                  Total
                  {getSortIcon('totalReviewedCount')}
                </Button>
              </TableHead>
              <TableHead className="text-right">Completion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMetrics.map((user, index) => {
              const completionRate = user.assignedCount > 0
                ? Math.round((user.totalReviewedCount / user.assignedCount) * 100)
                : 0;
                
              return (
                <TableRow key={user.userId}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.login} />
                        <AvatarFallback>
                          {user.name?.charAt(0) || user.login.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.name || user.login}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{user.assignedCount}</TableCell>
                  <TableCell className="text-right">{user.approvedCount}</TableCell>
                  <TableCell className="text-right">{user.changesRequestedCount}</TableCell>
                  <TableCell className="text-right">{user.commentedCount}</TableCell>
                  <TableCell className="text-right font-medium">{user.totalReviewedCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      <span className="mr-2">{completionRate}%</span>
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            completionRate >= 75
                              ? 'bg-green-500'
                              : completionRate >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {sortedMetrics.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  No review data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
