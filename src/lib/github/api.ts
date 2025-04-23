import { Octokit } from '@octokit/rest';
import { 
  PullRequest, 
  Repository, 
  Review, 
  ReviewMetrics, 
  TimeRange, 
  User 
} from '@/types/github';

// GitHub token from environment variables
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN || '';
// Default organization
const DEFAULT_ORG = process.env.NEXT_PUBLIC_GITHUB_ORG || 'sarasanalytics-com';

// Create Octokit instance with GitHub token
const getOctokit = (token: string = GITHUB_TOKEN) => {
  if (!token) {
    throw new Error('GitHub token is required. Please set NEXT_PUBLIC_GITHUB_TOKEN in your .env.local file.');
  }
  return new Octokit({ auth: token });
};

// Get organization repositories
export const getOrgRepos = async (
  token: string = GITHUB_TOKEN,
  org: string = DEFAULT_ORG
): Promise<Repository[]> => {
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.repos.listForOrg({
      org,
      per_page: 100,
    });
    
    return data as unknown as Repository[];
  } catch (error) {
    console.error('Error fetching organization repositories:', error);
    return [];
  }
};

// Get pull requests for a repository
export const getRepoPullRequests = async (
  token: string = GITHUB_TOKEN,
  owner: string = DEFAULT_ORG,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'all',
  since?: string
): Promise<PullRequest[]> => {
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state,
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
      ...(since && { since }),
    });
    
    return data as unknown as PullRequest[];
  } catch (error) {
    console.error(`Error fetching pull requests for ${owner}/${repo}:`, error);
    return [];
  }
};

// Get reviews for a pull request
export const getPullRequestReviews = async (
  token: string = GITHUB_TOKEN,
  owner: string = DEFAULT_ORG,
  repo: string,
  pullNumber: number
): Promise<Review[]> => {
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
    });
    
    return data as unknown as Review[];
  } catch (error) {
    console.error(`Error fetching reviews for PR #${pullNumber} in ${owner}/${repo}:`, error);
    return [];
  }
};

// Get organization members
export const getOrgMembers = async (
  token: string = GITHUB_TOKEN,
  org: string = DEFAULT_ORG
): Promise<User[]> => {
  try {
    const octokit = getOctokit(token);
    const { data } = await octokit.orgs.listMembers({
      org,
      per_page: 100,
    });
    
    return data as unknown as User[];
  } catch (error) {
    console.error(`Error fetching members for organization ${org}:`, error);
    return [];
  }
};

// Calculate review metrics for a time range
export const calculateReviewMetrics = async (
  token: string = GITHUB_TOKEN,
  org: string = DEFAULT_ORG,
  timeRange: TimeRange
): Promise<ReviewMetrics[]> => {
  // Get all org members
  const members = await getOrgMembers(token, org);
  
  // Get all repos in the org
  const repos = await getOrgRepos(token, org);
  
  // Initialize metrics for each member
  const metricsMap = new Map<number, ReviewMetrics>();
  members.forEach(member => {
    metricsMap.set(member.id, {
      userId: member.id,
      login: member.login,
      name: member.name,
      avatarUrl: member.avatar_url,
      assignedCount: 0,
      approvedCount: 0,
      changesRequestedCount: 0,
      commentedCount: 0,
      totalReviewedCount: 0,
      openAgainstCount: 0,
      openedCount: 0,
      pendingCount: 0,
    });
  });
  
  // Process each repository
  for (const repo of repos) {
    // Get PRs updated since the start of the time range
    const prs = await getRepoPullRequests(
      token,
      org,
      repo.name,
      'all',
      timeRange.startDate.toISOString()
    );
    
    // Process each PR
    for (const pr of prs) {
      const prCreatedAt = new Date(pr.created_at);
      
      // Skip PRs created outside the time range
      if (prCreatedAt < timeRange.startDate || prCreatedAt > timeRange.endDate) {
        continue;
      }
      
      // Count PRs opened by each user
      const opener = metricsMap.get(pr.user.id);
      if (opener) {
        opener.openedCount = (opener.openedCount || 0) + 1;
      }
      
      // Count open PRs against each user
      if (pr.state === 'open') {
        pr.requested_reviewers.forEach(reviewer => {
          const metrics = metricsMap.get(reviewer.id);
          if (metrics) {
            metrics.openAgainstCount += 1;
            metrics.pendingCount = (metrics.pendingCount || 0) + 1;
          }
        });
      }
      
      // Get reviews for this PR
      const reviews = await getPullRequestReviews(token, org, repo.name, pr.number);
      
      // Process reviews within the time range
      const reviewsInRange = reviews.filter(review => {
        const reviewDate = new Date(review.submitted_at);
        return reviewDate >= timeRange.startDate && reviewDate <= timeRange.endDate;
      });
      
      // Count assigned reviewers
      pr.requested_reviewers.forEach(reviewer => {
        const metrics = metricsMap.get(reviewer.id);
        if (metrics) {
          metrics.assignedCount += 1;
        }
      });
      
      // Count reviews by state
      const reviewsByUser = new Map<number, Review[]>();
      reviewsInRange.forEach(review => {
        if (!reviewsByUser.has(review.user.id)) {
          reviewsByUser.set(review.user.id, []);
        }
        reviewsByUser.get(review.user.id)?.push(review);
      });
      
      // Update metrics for each reviewer
      reviewsByUser.forEach((userReviews, userId) => {
        const metrics = metricsMap.get(userId);
        if (metrics) {
          metrics.totalReviewedCount += 1;
          
          userReviews.forEach(review => {
            switch (review.state) {
              case 'APPROVED':
                metrics.approvedCount += 1;
                break;
              case 'CHANGES_REQUESTED':
                metrics.changesRequestedCount += 1;
                break;
              case 'COMMENTED':
                metrics.commentedCount += 1;
                break;
              default:
                break;
            }
          });
        }
      });
    }
  }
  
  return Array.from(metricsMap.values());
};

// Generate time ranges
export const generateTimeRanges = (): TimeRange[] => {
  const now = new Date();
  
  // Weekly range (last 7 days)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  
  // Monthly range (last 30 days)
  const monthStart = new Date(now);
  monthStart.setDate(now.getDate() - 30);
  
  // Quarterly range (last 90 days)
  const quarterStart = new Date(now);
  quarterStart.setDate(now.getDate() - 90);
  
  // Yearly range (last 365 days)
  const yearStart = new Date(now);
  yearStart.setDate(now.getDate() - 365);
  
  return [
    {
      label: 'This Week',
      value: 'week',
      startDate: weekStart,
      endDate: now,
    },
    {
      label: 'This Month',
      value: 'month',
      startDate: monthStart,
      endDate: now,
    },
    {
      label: 'This Quarter',
      value: 'quarter',
      startDate: quarterStart,
      endDate: now,
    },
    {
      label: 'This Year',
      value: 'year',
      startDate: yearStart,
      endDate: now,
    },
  ];
};
