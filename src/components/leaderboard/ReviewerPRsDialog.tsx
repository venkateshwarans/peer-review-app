'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { ExternalLink, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

interface ReviewerPRsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reviewerId: string;
  reviewerName: string;
}

interface PullRequest {
  id: string;
  number: number;
  title: string;
  html_url: string;
  state: string;
  repository: {
    name: string;
  };
  created_at: string;
  updated_at: string;
}

type SortKey = 'repository.name' | 'number' | 'state' | 'updated_at';
type SortDirection = 'asc' | 'desc';

export function ReviewerPRsDialog({ 
  isOpen, 
  onOpenChange, 
  reviewerId,
  reviewerName 
}: ReviewerPRsDialogProps) {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    if (isOpen && reviewerId) {
      fetchReviewerPRs(reviewerId);
    }
  }, [isOpen, reviewerId]);

  const fetchReviewerPRs = async (userId: string) => {
    setIsLoading(true);
    console.log('Fetching PRs for user ID:', userId);
    try {
      // First approach: Try a simpler query to get all PRs for this user
      const { data: prData, error: prError } = await supabase
        .from('github_pull_requests')
        .select(`
          id,
          number,
          title,
          html_url,
          state,
          repository_id,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (prError) {
        console.error('Error fetching PRs:', prError);
        return;
      }
      
      // Get repository data separately
      const { data: repoData, error: repoError } = await supabase
        .from('github_repositories')
        .select('id, name');
        
      if (repoError) {
        console.error('Error fetching repositories:', repoError);
        return;
      }
      
      // Create a map of repository IDs to names
      const repoMap = new Map();
      repoData?.forEach(repo => {
        repoMap.set(repo.id, repo.name);
      });
      
      // Now get reviews by this user
      const { data: reviewData, error: reviewError } = await supabase
        .from('github_pr_reviews')
        .select('pull_request_id')
        .eq('user_id', userId);
        
      if (reviewError) {
        console.error('Error fetching reviews:', reviewError);
      }
      
      // Create a set of PR IDs that this user has reviewed
      const reviewedPrIds = new Set();
      reviewData?.forEach(review => {
        reviewedPrIds.add(review.pull_request_id);
      });
      
      // Also get PRs where this user was assigned as a reviewer
      const { data: assignedData, error: assignedError } = await supabase
        .from('github_pr_reviewers')
        .select('pull_request_id')
        .eq('user_id', userId);
        
      if (assignedError) {
        console.error('Error fetching assigned PRs:', assignedError);
      }
      
      // Add assigned PR IDs to the set
      assignedData?.forEach(assigned => {
        reviewedPrIds.add(assigned.pull_request_id);
      });
      
      // Filter PRs to only include those that this user has reviewed or was assigned to
      const relevantPrs = prData
        .filter(pr => reviewedPrIds.has(pr.id))
        .map(pr => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          html_url: pr.html_url,
          state: pr.state,
          repository: {
            name: repoMap.get(pr.repository_id) || 'Unknown Repository'
          },
          created_at: pr.created_at,
          updated_at: pr.updated_at
        }));

      console.log('Relevant PRs found:', relevantPrs.length);
      setPullRequests(relevantPrs);
      
      // If no PRs found, show a message
      if (relevantPrs.length === 0) {
        console.log('No PRs found for this user');
      }
    } catch (error) {
      console.error('Error in fetchReviewerPRs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'open':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Open</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Closed</Badge>;
      case 'merged':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">Merged</Badge>;
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  // Handle column sorting
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

  // Sort pull requests based on current sort settings
  const sortedPullRequests = [...pullRequests].sort((a, b) => {
    let valueA, valueB;
    
    if (sortBy === 'repository.name') {
      valueA = a.repository.name.toLowerCase();
      valueB = b.repository.name.toLowerCase();
    } else if (sortBy === 'number') {
      valueA = a.number;
      valueB = b.number;
    } else if (sortBy === 'state') {
      valueA = a.state.toLowerCase();
      valueB = b.state.toLowerCase();
    } else { // updated_at
      valueA = new Date(a.updated_at).getTime();
      valueB = new Date(b.updated_at).getTime();
    }
    
    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[80vh] overflow-y-auto w-[95vw] bubblegum-card">
        <DialogHeader>
          <DialogTitle className="text-xl">Pull Requests for {reviewerName}</DialogTitle>
          <DialogDescription>
            Pull requests where {reviewerName} was assigned as a reviewer or submitted reviews
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary border-r-2 border-r-transparent"></div>
          </div>
        ) : pullRequests.length > 0 ? (
          <div className="table-container rounded-md overflow-hidden">
            <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[20%]">
                  <Button
                    variant="ghost"
                    onClick={() => handleColumnSort('repository.name')}
                    className="h-8 px-2 flex items-center justify-start w-full font-semibold hover:text-primary cursor-pointer"
                  >
                    Repository
                    {getSortIcon('repository.name')}
                  </Button>
                </TableHead>
                <TableHead className="w-[50%]">
                  <Button
                    variant="ghost"
                    onClick={() => handleColumnSort('number')}
                    className="h-8 px-2 flex items-center justify-start w-full font-semibold hover:text-primary cursor-pointer"
                  >
                    PR
                    {getSortIcon('number')}
                  </Button>
                </TableHead>
                <TableHead className="w-[15%]">
                  <Button
                    variant="ghost"
                    onClick={() => handleColumnSort('state')}
                    className="h-8 px-2 flex items-center justify-start w-full font-semibold hover:text-primary cursor-pointer"
                  >
                    Status
                    {getSortIcon('state')}
                  </Button>
                </TableHead>
                <TableHead className="w-[15%]">
                  <Button
                    variant="ghost"
                    onClick={() => handleColumnSort('updated_at')}
                    className="h-8 px-2 flex items-center justify-end w-full font-semibold hover:text-primary cursor-pointer"
                  >
                    Updated
                    {getSortIcon('updated_at')}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPullRequests.map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell className="font-medium truncate">{pr.repository.name}</TableCell>
                  <TableCell>
                    <a 
                      href={pr.html_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center hover:underline text-primary font-medium group"
                      title={`${pr.number} ${pr.title}`}
                    >
                      <div className="flex items-center w-full">
                        <span className="font-medium mr-1">#{pr.number}</span>
                        <span className="truncate inline-block max-w-[calc(100%-50px)]">
                          {pr.title}
                        </span>
                        <ExternalLink className="ml-1 h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </a>
                  </TableCell>
                  <TableCell>{getStatusBadge(pr.state)}</TableCell>
                  <TableCell>{new Date(pr.updated_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No pull requests found for this reviewer
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
