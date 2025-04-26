import { Octokit } from '@octokit/rest';
import { supabase } from './client';
import { syncUserProfiles } from './gamification-service';
import { safelySyncGitHubUsers } from './sync-github-users';

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

/**
 * Type definition for pull request data
 */
type PullRequestData = {
  id: number;
  number: number;
  user: { id: number; login: string };
  created_at: string;
  merged_at: string | null;
  state: string;
};

/**
 * Type definition for review data
 */
type ReviewData = {
  id: number;
  user: { id: number; login: string };
  state: string;
  submitted_at: string;
};

/**
 * Fetch pull requests created or updated since a specific date
 */
async function fetchRecentPullRequests(
  octokit: Octokit, 
  owner: string, 
  repo: string, 
  since: string
): Promise<PullRequestData[]> {
  try {
    const pullRequests: PullRequestData[] = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const response = await octokit.rest.pulls.list({
        owner,
        repo,
        state: 'all',
        per_page: 100,
        page,
        sort: 'updated',
        direction: 'desc'
      });
      
      if (response.data.length === 0) {
        hasMorePages = false;
      } else {
        // Filter PRs updated since the given date
        const recentPRs = response.data.filter(pr => {
          const updatedAt = new Date(pr.updated_at);
          const sinceDate = new Date(since);
          return updatedAt >= sinceDate;
        });
        
        // If we got fewer PRs than requested, we've reached the end of recent PRs
        if (recentPRs.length < response.data.length) {
          hasMorePages = false;
        }
        
        // Cast the response data to our simplified PullRequestData type
        const typedPRs = recentPRs.map(pr => ({
          id: pr.id,
          number: pr.number,
          user: pr.user ? { id: pr.user.id, login: pr.user.login } : { id: 0, login: 'unknown' },
          created_at: pr.created_at,
          merged_at: pr.merged_at,
          state: pr.state
        }));
        
        pullRequests.push(...typedPRs);
        page++;
      }
    }
    
    return pullRequests;
  } catch (error) {
    console.error(`Error fetching recent pull requests for ${owner}/${repo}:`, error);
    return [];
  }
}

/**
 * Fetch all reviews for a pull request
 */
async function fetchPullRequestReviews(
  octokit: Octokit, 
  owner: string, 
  repo: string, 
  prNumber: number
): Promise<ReviewData[]> {
  try {
    const reviews: ReviewData[] = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const response = await octokit.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
        page
      });
      
      if (response.data.length === 0) {
        hasMorePages = false;
      } else {
        // Cast the response data to our simplified ReviewData type
        const typedReviews = response.data.map(review => ({
          id: review.id,
          user: review.user ? { id: review.user.id, login: review.user.login } : { id: 0, login: 'unknown' },
          state: review.state,
          submitted_at: review.submitted_at || ''
        }));
        
        reviews.push(...typedReviews);
        page++;
      }
    }
    
    return reviews;
  } catch (error) {
    console.error(`Error fetching reviews for PR #${prNumber} in ${owner}/${repo}:`, error);
    return [];
  }
}

/**
 * Fetch all organization repositories
 */
async function fetchAllRepositories(
  octokit: Octokit, 
  organization: string
): Promise<Array<{ id: number; name: string; full_name: string }>> {
  try {
    const repos: Array<{ id: number; name: string; full_name: string }> = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const response = await octokit.rest.repos.listForOrg({
        org: organization,
        per_page: 100,
        page
      });
      
      if (response.data.length === 0) {
        hasMorePages = false;
      } else {
        repos.push(...response.data.map(repo => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name
        })));
        page++;
      }
    }
    
    return repos;
  } catch (error) {
    console.error(`Error fetching repositories for ${organization}:`, error);
    return [];
  }
}

/**
 * Fetch all organization members
 */
async function fetchAllOrgMembers(
  octokit: Octokit, 
  organization: string
): Promise<Array<{ id: number; login: string }>> {
  try {
    const members: Array<{ id: number; login: string }> = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const response = await octokit.rest.orgs.listMembers({
        org: organization,
        per_page: 100,
        page
      });
      
      if (response.data.length === 0) {
        hasMorePages = false;
      } else {
        members.push(...response.data);
        page++;
      }
    }
    
    return members;
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return [];
  }
}

/**
 * Get the last sync time or a default fallback
 */
async function getLastSyncTime(
  organization: string = DEFAULT_ORG,
  syncType: string = 'incremental',
  fallbackHours: number = 24
): Promise<string> {
  try {
    const { data } = await supabase
      .from('github_sync_status')
      .select('last_sync_time')
      .eq('organization', organization)
      .eq('sync_type', syncType)
      .eq('status', 'completed')
      .order('last_sync_time', { ascending: false })
      .limit(1)
      .single();
    
    if (data?.last_sync_time) {
      return data.last_sync_time;
    }
  } catch (error) {
    console.warn('Could not get last sync time, using fallback:', error);
  }
  
  // Fallback to X hours ago if no valid last sync time
  const fallbackDate = new Date();
  fallbackDate.setHours(fallbackDate.getHours() - fallbackHours);
  return fallbackDate.toISOString();
}

/**
 * Incremental sync of GitHub data since the last successful sync
 * This is more efficient than a full historical sync
 */
export async function syncIncrementalData(
  organization: string = DEFAULT_ORG,
  token: string = GITHUB_TOKEN
): Promise<void> {
  try {
    console.log(`Starting incremental GitHub data sync for ${organization}...`);
    
    // Get the last successful sync time
    const lastSyncTime = await getLastSyncTime(organization, 'incremental');
    console.log(`Using last sync time: ${lastSyncTime}`);
    
    // Create Octokit instance
    const octokit = getOctokit(token);
    
    // Fetch all org members
    const members = await fetchAllOrgMembers(octokit, organization);
    console.log(`Found ${members.length} members in organization ${organization}`);
    
    // Sync user profiles - add required properties to match User type
    await syncUserProfiles(members.map(member => ({
      id: member.id,
      login: member.login,
      name: member.login,
      avatar_url: '',
      html_url: `https://github.com/${member.login}`
    })));
    
    // Sync GitHub users
    await safelySyncGitHubUsers(
      members.map(m => ({
        id: m.id,
        login: m.login,
        organization
      })),
      organization
    );
    
    // Fetch all repositories
    const repositories = await fetchAllRepositories(octokit, organization);
    console.log(`Found ${repositories.length} repositories in organization ${organization}`);
    
    // Store metrics by user ID
    const metricsByUser: Record<number, {
      userId: number;
      login: string;
      name: string;
      avatarUrl: string;
      totalReviewedCount: number;
      approvedCount: number;
      changesRequestedCount: number;
      commentedCount: number;
      pendingCount: number;
      openedCount: number;
      assignedCount: number;
      openAgainstCount: number;
    }> = {};
    
    // Process repositories in batches to avoid rate limiting
    const BATCH_SIZE = 5;
    for (let i = 0; i < repositories.length; i += BATCH_SIZE) {
      const repoBatch = repositories.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(repositories.length / BATCH_SIZE)}`);
      
      // Process each repo in the batch
      await Promise.all(repoBatch.map(async (repo) => {
        try {
          console.log(`Processing repository: ${repo.name}`);
          
          // Get recent pull requests for this repo
          const prs = await fetchRecentPullRequests(octokit, organization, repo.name, lastSyncTime);
          console.log(`Found ${prs.length} recent pull requests in ${repo.name}`);
          
          // Process each pull request
          for (const pr of prs) {
            // Get all reviews for this PR
            const reviews = await fetchPullRequestReviews(octokit, organization, repo.name, pr.number);
            
            // Record PR creator activity
            if (pr.user && pr.user.id) {
              if (!metricsByUser[pr.user.id]) {
                metricsByUser[pr.user.id] = {
                  userId: pr.user.id,
                  login: pr.user.login,
                  name: pr.user.login,
                  avatarUrl: '',
                  totalReviewedCount: 0,
                  approvedCount: 0,
                  changesRequestedCount: 0,
                  commentedCount: 0,
                  pendingCount: 0,
                  openedCount: 0,
                  assignedCount: 0,
                  openAgainstCount: 0
                };
              }
              
              metricsByUser[pr.user.id].openedCount++;
              
              // Record activity log for opening PR
              await supabase.from('activity_logs').insert({
                userid: pr.user.id,
                login: pr.user.login,
                activity_type: 'opened_pr',
                repository: repo.name,
                pr_number: pr.number,
                timestamp: pr.created_at
              });
            }
            
            // Process reviews and update metrics
            for (const review of reviews) {
              const reviewer = review.user;
              if (!reviewer) continue;
              
              // Find or create metrics for this user
              if (!metricsByUser[reviewer.id]) {
                metricsByUser[reviewer.id] = {
                  userId: reviewer.id,
                  login: reviewer.login,
                  name: reviewer.login,
                  avatarUrl: '',
                  totalReviewedCount: 0,
                  approvedCount: 0,
                  changesRequestedCount: 0,
                  commentedCount: 0,
                  pendingCount: 0,
                  openedCount: 0,
                  assignedCount: 0,
                  openAgainstCount: 0
                };
              }
              
              // Update metrics based on review state
              metricsByUser[reviewer.id].totalReviewedCount++;
              
              // Record the review activity
              await supabase.from('activity_logs').insert({
                userid: reviewer.id,
                login: reviewer.login,
                activity_type: 'reviewed_pr',
                review_state: review.state,
                repository: repo.name,
                pr_number: pr.number,
                timestamp: review.submitted_at
              });
              
              // Update specific metrics based on review state
              switch (review.state) {
                case 'APPROVED':
                  metricsByUser[reviewer.id].approvedCount++;
                  break;
                case 'CHANGES_REQUESTED':
                  metricsByUser[reviewer.id].changesRequestedCount++;
                  break;
                case 'COMMENTED':
                  metricsByUser[reviewer.id].commentedCount++;
                  break;
              }
            }
          }
        } catch (error) {
          console.error(`Error processing repository ${repo.name}:`, error);
        }
      }));
    }
    
    // Update the sync status
    await supabase
      .from('github_sync_status')
      .upsert({
        organization,
        sync_type: 'incremental',
        last_sync_time: new Date().toISOString(),
        status: 'completed'
      });
    
    console.log('Incremental GitHub data sync completed successfully');
  } catch (error) {
    console.error('Error syncing incremental GitHub data:', error);
    
    // Update the sync status to indicate failure
    await supabase
      .from('github_sync_status')
      .upsert({
        organization: DEFAULT_ORG,
        sync_type: 'incremental',
        last_sync_time: new Date().toISOString(),
        status: 'failed',
        error_message: String(error)
      });
  }
}
