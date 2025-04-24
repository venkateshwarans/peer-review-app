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
import { ArrowDown, ArrowUp, ArrowUpDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReviewerPRsDialog } from './ReviewerPRsDialog';

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
  const [selectedReviewer, setSelectedReviewer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Sort metrics by the selected key and direction
  const sortedMetrics = [...metrics].sort((a, b) => {
    const valueA = a[sortBy];
    const valueB = b[sortBy];
    
    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle sort change from the select dropdown
  const handleSortChange = (value: string) => {
    setSortBy(value as SortKey);
  };

  // Handle column sort by clicking on column headers
  const handleColumnSort = (key: SortKey) => {
    if (sortBy === key) {
      // If already sorting by this key, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If sorting by a new key, set it and default to descending
      setSortBy(key);
      setSortDirection('desc');
    }
  };

  // Get the appropriate sort icon based on current sort state
  const getSortIcon = (key: SortKey) => {
    if (sortBy !== key) {
      return <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  // Handle click on reviewer name to open dialog
  const handleReviewerClick = (userId: string | number, name: string) => {
    const userIdStr = userId.toString();
    setSelectedReviewer({ id: userIdStr, name: name || userIdStr });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between bg-card p-3 rounded-md border border-border">
          <h2 className="text-xl font-semibold font-sans tracking-tight">Leaderboard</h2>
          <div className="w-[180px] h-10 bg-muted rounded animate-pulse"></div>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="h-[400px] animate-pulse bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-row items-center justify-between bg-card p-3 rounded-md border border-border">
        <h2 className="text-xl font-semibold font-sans tracking-tight">Leaderboard</h2>
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
      </div>
      
      {selectedReviewer && (
        <ReviewerPRsDialog
          isOpen={dialogOpen}
          onOpenChange={setDialogOpen}
          reviewerId={selectedReviewer.id}
          reviewerName={selectedReviewer.name}
        />
      )}
      
      <Card className="overflow-hidden border-border bubblegum-card">
        <CardContent className="p-0">
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-yellow-50 dark:bg-yellow-950/20">
                  <TableHead className="w-[60px] py-2 font-sans">Rank</TableHead>
                  <TableHead className="py-2 font-sans">Reviewer</TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleColumnSort('assignedCount')}
                      className="h-7 px-2 flex items-center justify-end w-full font-semibold hover:text-primary cursor-pointer font-sans"
                    >
                      Assigned
                      {getSortIcon('assignedCount')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleColumnSort('approvedCount')}
                      className="h-7 px-2 flex items-center justify-end w-full font-semibold hover:text-primary cursor-pointer font-sans"
                    >
                      Approved
                      {getSortIcon('approvedCount')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleColumnSort('changesRequestedCount')}
                      className="h-7 px-2 flex items-center justify-end w-full font-semibold hover:text-primary cursor-pointer font-sans"
                    >
                      Changes
                      {getSortIcon('changesRequestedCount')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleColumnSort('commentedCount')}
                      className="h-7 px-2 flex items-center justify-end w-full font-semibold hover:text-primary cursor-pointer font-sans"
                    >
                      Comments
                      {getSortIcon('commentedCount')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleColumnSort('totalReviewedCount')}
                      className="h-7 px-2 flex items-center justify-end w-full font-semibold hover:text-primary cursor-pointer font-sans"
                    >
                      Total
                      {getSortIcon('totalReviewedCount')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right py-2 font-sans">Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMetrics.map((user, index) => {
                  const completionRate = user.assignedCount > 0
                    ? Math.round((user.totalReviewedCount / user.assignedCount) * 100)
                    : 0;
                    
                  return (
                    <TableRow key={user.userId} className="hover:bg-yellow-50/50 dark:hover:bg-yellow-950/10 even:bg-yellow-50/30 dark:even:bg-yellow-950/10">
                      <TableCell className="font-medium py-1.5 font-sans">{index + 1}</TableCell>
                      <TableCell className="py-1.5">
                        <Button
                          variant="ghost"
                          className="flex items-center space-x-2 p-0 h-auto hover:bg-transparent cursor-pointer"
                          onClick={() => handleReviewerClick(user.userId, user.name || user.login || '')}
                        >
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarImage src={user.avatarUrl} alt={user.login} />
                            <AvatarFallback>
                              {user.name?.charAt(0) || user.login.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="ml-2 text-left hover:underline font-sans">{user.name || user.login}</span>
                          <Users className="ml-1 h-3 w-3 text-muted-foreground" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right py-1.5 font-sans">{user.assignedCount}</TableCell>
                      <TableCell className="text-right py-1.5 font-sans">{user.approvedCount}</TableCell>
                      <TableCell className="text-right py-1.5 font-sans">{user.changesRequestedCount}</TableCell>
                      <TableCell className="text-right py-1.5 font-sans">{user.commentedCount}</TableCell>
                      <TableCell className="text-right font-medium py-1.5 font-sans">{user.totalReviewedCount}</TableCell>
                      <TableCell className="text-right py-1.5">
                        <div className="flex items-center justify-end">
                          <span className="mr-2 font-sans">{completionRate}%</span>
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                completionRate >= 75
                                  ? 'bg-pink-500 dark:bg-pink-400'
                                  : completionRate >= 50
                                  ? 'bg-pink-300 dark:bg-pink-600'
                                  : 'bg-pink-200 dark:bg-pink-800'
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
                    <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                      No review data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
