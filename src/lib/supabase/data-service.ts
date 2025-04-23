import { supabase } from './client';
import { Octokit } from '@octokit/rest';
import type { 
  ReviewMetrics, 
  TimeRange 
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

// Check if sync is needed based on last sync time
export const isSyncNeeded = async (
  organization: string = DEFAULT_ORG,
  syncType: string = 'full',
  threshold: number = 60 // minutes
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('github_sync_status')
      .select('last_sync_time')
      .eq('organization', organization)
      .eq('sync_type', syncType)
      .single();
    
    if (error || !data) {
      return true;
    }
    
    const lastSyncTime = new Date(data.last_sync_time);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);
    
    return diffMinutes > threshold;
  } catch (error) {
    console.error('Error checking sync status:', error);
    return true;
  }
};

// Update sync status
export const updateSyncStatus = async (
  organization: string = DEFAULT_ORG,
  syncType: string = 'full'
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('github_sync_status')
      .upsert({
        organization,
        sync_type: syncType,
        last_sync_time: new Date().toISOString()
      }, {
        onConflict: 'organization,sync_type'
      });
    
    if (error) {
      console.error('Error updating sync status:', error);
    }
  } catch (error) {
    console.error('Error updating sync status:', error);
  }
};

// Sync GitHub users
export const syncGitHubUsers = async (
  token: string = GITHUB_TOKEN,
  organization: string = DEFAULT_ORG
): Promise<void> => {
  try {
    const octokit = getOctokit(token);
    
    // First, get existing users from Supabase
    const { data: existingUsers, error: fetchError } = await supabase
      .from('github_users')
      .select('id, login, updated_at')
      .eq('organization', organization);
    
    if (fetchError) {
      console.error('Error fetching existing users:', fetchError);
    }
    
    // Create a map of existing users for quick lookup
    const existingUserMap = new Map();
    if (existingUsers) {
      existingUsers.forEach(user => {
        existingUserMap.set(user.login, {
          id: user.id,
          updated_at: user.updated_at
        });
      });
    }
    
    // Get all org members
    const { data: members } = await octokit.orgs.listMembers({
      org: organization,
      per_page: 100
    });
    
    console.log(`Found ${members.length} members in the organization.`);
    
    // Track which users we've seen to handle deletions later
    const seenUsers = new Set();
    
    // Get detailed user info for each member
    for (const member of members) {
      seenUsers.add(member.login);
      
      // Check if we need to update this user
      const existingUser = existingUserMap.get(member.login);
      const now = new Date();
      
      // Skip if user was updated recently (within the last 24 hours)
      if (existingUser && existingUser.updated_at) {
        const lastUpdate = new Date(existingUser.updated_at);
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 24) {
          console.log(`Skipping user ${member.login} - updated ${Math.round(hoursSinceUpdate)} hours ago`);
          continue;
        }
      }
      
      // Get detailed user info
      const { data: user } = await octokit.users.getByUsername({
        username: member.login
      });
      
      // Insert or update user in Supabase
      const { error } = await supabase
        .from('github_users')
        .upsert({
          id: user.id,
          login: user.login,
          name: user.name,
          avatar_url: user.avatar_url,
          html_url: user.html_url,
          email: user.email,
          organization,
          created_at: existingUser ? undefined : now.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'id,organization'
        });
      
      if (error) {
        console.error(`Error syncing user ${user.login}:`, error);
      } else {
        console.log(`User ${user.login} synced successfully.`);
      }
    }
    
    // Handle users who are no longer in the organization
    if (existingUsers) {
      for (const user of existingUsers) {
        if (!seenUsers.has(user.login)) {
          console.log(`User ${user.login} is no longer in the organization. Marking as inactive.`);
          
          // Update user status to inactive
          const { error } = await supabase
            .from('github_users')
            .update({ 
              active: false,
              updated_at: new Date().toISOString() 
            })
            .eq('id', user.id)
            .eq('organization', organization);
          
          if (error) {
            console.error(`Error updating user ${user.login} status:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error syncing GitHub users:', error);
    throw error;
  }
};

// Sync GitHub repositories
export const syncGitHubRepos = async (
  token: string = GITHUB_TOKEN,
  organization: string = DEFAULT_ORG
): Promise<void> => {
  try {
    const octokit = getOctokit(token);
    
    // First, get existing repositories from Supabase
    const { data: existingRepos, error: fetchError } = await supabase
      .from('github_repositories')
      .select('id, name, updated_at')
      .eq('organization', organization);
    
    if (fetchError) {
      console.error('Error fetching existing repositories:', fetchError);
    }
    
    // Create a map of existing repositories for quick lookup
    const existingRepoMap = new Map();
    if (existingRepos) {
      existingRepos.forEach(repo => {
        existingRepoMap.set(repo.name, {
          id: repo.id,
          updated_at: repo.updated_at
        });
      });
    }
    
    // Get all repositories for the organization
    const { data: repos } = await octokit.repos.listForOrg({
      org: organization,
      per_page: 100
    });
    
    console.log(`Found ${repos.length} repositories in the organization.`);
    
    // Track which repositories we've seen to handle deletions later
    const seenRepos = new Set();
    
    for (const repo of repos) {
      seenRepos.add(repo.name);
      
      // Check if we need to update this repository
      const existingRepo = existingRepoMap.get(repo.name);
      const now = new Date();
      
      // Skip if repository was updated recently (within the last 24 hours)
      if (existingRepo && existingRepo.updated_at) {
        const lastUpdate = new Date(existingRepo.updated_at);
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceUpdate < 24) {
          console.log(`Skipping repository ${repo.name} - updated ${Math.round(hoursSinceUpdate)} hours ago`);
          continue;
        }
      }
      
      // Insert or update repository in Supabase
      const { error } = await supabase
        .from('github_repositories')
        .upsert({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          html_url: repo.html_url,
          description: repo.description,
          organization,
          created_at: existingRepo ? undefined : now.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'id,organization'
        });
      
      if (error) {
        console.error(`Error syncing repository ${repo.name}:`, error);
      } else {
        console.log(`Repository ${repo.name} synced successfully.`);
      }
    }
    
    // Handle repositories that no longer exist in the organization
    if (existingRepos) {
      for (const repo of existingRepos) {
        if (!seenRepos.has(repo.name)) {
          console.log(`Repository ${repo.name} is no longer in the organization. Marking as inactive.`);
          
          // Update repository status to inactive
          const { error } = await supabase
            .from('github_repositories')
            .update({ 
              active: false,
              updated_at: new Date().toISOString() 
            })
            .eq('id', repo.id)
            .eq('organization', organization);
          
          if (error) {
            console.error(`Error updating repository ${repo.name} status:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error syncing GitHub repositories:', error);
    throw error;
  }
};

// Get last sync time for PRs
export const getLastPRSyncTime = async (
  organization: string = DEFAULT_ORG
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('github_sync_status')
      .select('last_sync_time')
      .eq('organization', organization)
      .eq('sync_type', 'pull_requests')
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data.last_sync_time;
  } catch (error) {
    console.error('Error getting last PR sync time:', error);
    return null;
  }
};

// Sync GitHub pull requests
export const syncGitHubPullRequests = async (
  token: string = GITHUB_TOKEN,
  organization: string = DEFAULT_ORG
): Promise<void> => {
  try {
    const octokit = getOctokit(token);
    
    // Get repositories for the organization
    const { data: repos } = await supabase
      .from('github_repositories')
      .select('id, name')
      .eq('organization', organization);
    
    if (!repos || repos.length === 0) {
      console.log('No repositories found. Sync repositories first.');
      return;
    }
    
    // Get last sync time to only fetch PRs updated after that time
    const lastSyncTime = await getLastPRSyncTime(organization);
    const since = lastSyncTime ? new Date(lastSyncTime).toISOString() : undefined;
    
    // Process each repository
    for (const repo of repos) {
      console.log(`Syncing pull requests for ${repo.name}...`);
      
      // Get pull requests for the repository, filtering by last update time if available
      const pullRequestParams: any = {
        owner: organization,
        repo: repo.name,
        state: 'all',
        per_page: 100,
        sort: 'updated',
        direction: 'desc'
      };
      
      // If we have a last sync time, only get PRs updated since then
      if (lastSyncTime) {
        console.log(`Fetching PRs updated since ${lastSyncTime}`);
        // GitHub API doesn't support direct filtering by update time in the request
        // We'll filter the results after fetching
      }
      
      const { data: pullRequests } = await octokit.pulls.list(pullRequestParams);
      
      // If we have a last sync time, filter PRs that were updated after that time
      const filteredPRs = lastSyncTime 
        ? pullRequests.filter(pr => new Date(pr.updated_at) > new Date(lastSyncTime))
        : pullRequests;
        
      if (filteredPRs.length === 0) {
        console.log(`No new or updated PRs for ${repo.name} since last sync.`);
        continue;
      }
      
      console.log(`Found ${filteredPRs.length} new or updated PRs for ${repo.name}.`);
      
      for (const pr of filteredPRs) {
        // Insert or update PR in Supabase
        const { error: prError } = await supabase
          .from('github_pull_requests')
          .upsert({
            id: pr.id,
            number: pr.number,
            title: pr.title,
            html_url: pr.html_url,
            state: pr.state,
            user_id: pr.user?.id || 0, // Handle possible null user
            repository_id: repo.id,
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            closed_at: pr.closed_at,
            merged_at: pr.merged_at,
            organization
          }, {
            onConflict: 'id'
          });
        
        if (prError) {
          console.error(`Error syncing PR #${pr.number} in ${repo.name}:`, prError);
          continue;
        }
        
        // Sync requested reviewers
        if (pr.requested_reviewers && pr.requested_reviewers.length > 0) {
          for (const reviewer of pr.requested_reviewers) {
            const { error: reviewerError } = await supabase
              .from('github_pr_reviewers')
              .upsert({
                pull_request_id: pr.id,
                user_id: reviewer.id,
                organization
              }, {
                onConflict: 'pull_request_id,user_id'
              });
            
            if (reviewerError) {
              console.error(`Error syncing reviewer ${reviewer.login} for PR #${pr.number}:`, reviewerError);
            }
          }
        }
        
        // Sync reviews
        const { data: reviews } = await octokit.pulls.listReviews({
          owner: organization,
          repo: repo.name,
          pull_number: pr.number
        });
        
        for (const review of reviews) {
          const { error: reviewError } = await supabase
            .from('github_pr_reviews')
            .upsert({
              id: review.id,
              pull_request_id: pr.id,
              user_id: review.user?.id || 0, // Handle possible null user
              state: review.state,
              submitted_at: review.submitted_at,
              html_url: review.html_url,
              organization
            }, {
              onConflict: 'id'
            });
          
          if (reviewError) {
            console.error(`Error syncing review for PR #${pr.number}:`, reviewError);
          }
        }
      }
    }
    
    // Update sync status
    await updateSyncStatus(organization, 'pull_requests');
  } catch (error) {
    console.error('Error syncing GitHub pull requests:', error);
    throw error;
  }
};

// Sync GitHub data (incremental where possible)
export const syncAllGitHubData = async (
  token: string = GITHUB_TOKEN,
  organization: string = DEFAULT_ORG
): Promise<void> => {
  try {
    // Check if sync is needed
    const needsSync = await isSyncNeeded(organization);
    
    if (!needsSync) {
      console.log('Data is up to date. Skipping sync.');
      return;
    }
    
    console.log('Starting GitHub data sync (incremental where possible)...');
    
    // Sync users
    await syncGitHubUsers(token, organization);
    console.log('Users synced successfully.');
    
    // Sync repositories
    await syncGitHubRepos(token, organization);
    console.log('Repositories synced successfully.');
    
    // Sync pull requests and reviews (this is incremental based on last sync time)
    await syncGitHubPullRequests(token, organization);
    console.log('Pull requests and reviews synced successfully.');
    
    // Update sync status
    await updateSyncStatus(organization, 'full');
    console.log('Incremental sync completed successfully.');
  } catch (error) {
    console.error('Error during sync:', error);
    throw error;
  }
};

// Calculate review metrics from Supabase data
export const calculateReviewMetricsFromCache = async (
  organization: string = DEFAULT_ORG,
  timeRange: TimeRange
): Promise<ReviewMetrics[]> => {
  try {
    // Ensure data is synced
    await syncAllGitHubData(GITHUB_TOKEN, organization);
    
    // Get all users in the organization
    const { data: users, error: usersError } = await supabase
      .from('github_users')
      .select('id, login, name, avatar_url')
      .eq('organization', organization);
    
    if (usersError || !users) {
      console.error('Error fetching users:', usersError);
      return [];
    }
    
    // Initialize metrics for each user
    const metricsMap = new Map<number, ReviewMetrics>();
    users.forEach(user => {
      metricsMap.set(user.id, {
        userId: user.id,
        login: user.login,
        name: user.name,
        avatarUrl: user.avatar_url,
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
    
    // Convert time range to ISO strings
    const startDate = timeRange.startDate.toISOString();
    const endDate = timeRange.endDate.toISOString();
    
    // Count PRs opened by each user
    const { data: openedPRs, error: openedError } = await supabase.rpc(
      'count_prs_by_user',
      {
        org: organization,
        start_date: startDate,
        end_date: endDate
      }
    );
    
    if (!openedError && openedPRs) {
      (openedPRs as Array<{user_id: number, count: number}>).forEach(item => {
        const metrics = metricsMap.get(item.user_id);
        if (metrics) {
          metrics.openedCount = parseInt(item.count.toString());
        }
      });
    }
    
    // Count PRs assigned for review to each user
    const { data: assignedPRs, error: assignedError } = await supabase.rpc(
      'get_assigned_prs',
      {
        org: organization,
        start_date: startDate,
        end_date: endDate
      }
    );
    
    if (!assignedError && assignedPRs) {
      // Count assigned PRs for each user
      const assignedCounts = new Map<number, Set<number>>();
      (assignedPRs as Array<{user_id: number, pull_request_id: number}>).forEach(item => {
        if (!assignedCounts.has(item.user_id)) {
          assignedCounts.set(item.user_id, new Set());
        }
        assignedCounts.get(item.user_id)?.add(item.pull_request_id);
      });
      
      // Update metrics
      assignedCounts.forEach((prIds, userId) => {
        const metrics = metricsMap.get(userId);
        if (metrics) {
          metrics.assignedCount = prIds.size;
        }
      });
    }
    
    // Count open PRs against each user
    const { data: openPRs, error: openError } = await supabase.rpc(
      'count_open_prs_against_user',
      {
        org: organization
      }
    );
    
    if (!openError && openPRs) {
      (openPRs as Array<{user_id: number, count: number}>).forEach(item => {
        const metrics = metricsMap.get(item.user_id);
        if (metrics) {
          metrics.openAgainstCount = parseInt(item.count.toString());
        }
      });
    }
    
    // Count pending PRs for each user
    const { data: pendingPRs, error: pendingError } = await supabase.rpc(
      'count_pending_prs_by_user',
      {
        org: organization
      }
    );
    
    if (!pendingError && pendingPRs) {
      (pendingPRs as Array<{user_id: number, count: number}>).forEach(item => {
        const metrics = metricsMap.get(item.user_id);
        if (metrics) {
          metrics.pendingCount = parseInt(item.count.toString());
        }
      });
    }
    
    // Count reviews by state
    const { data: reviews, error: reviewsError } = await supabase
      .from('github_pr_reviews')
      .select('user_id, state, pull_request_id')
      .eq('organization', organization)
      .gte('submitted_at', startDate)
      .lte('submitted_at', endDate);
    
    if (!reviewsError && reviews) {
      // Count reviews by state for each user
      const reviewCounts = new Map<number, { 
        approved: number, 
        changesRequested: number, 
        commented: number,
        totalReviewed: Set<number>
      }>();
      
      reviews.forEach(review => {
        if (!reviewCounts.has(review.user_id)) {
          reviewCounts.set(review.user_id, {
            approved: 0,
            changesRequested: 0,
            commented: 0,
            totalReviewed: new Set()
          });
        }
        
        const counts = reviewCounts.get(review.user_id)!;
        counts.totalReviewed.add(review.pull_request_id);
        
        switch (review.state) {
          case 'APPROVED':
            counts.approved += 1;
            break;
          case 'CHANGES_REQUESTED':
            counts.changesRequested += 1;
            break;
          case 'COMMENTED':
            counts.commented += 1;
            break;
        }
      });
      
      // Update metrics
      reviewCounts.forEach((counts, userId) => {
        const metrics = metricsMap.get(userId);
        if (metrics) {
          metrics.approvedCount = counts.approved;
          metrics.changesRequestedCount = counts.changesRequested;
          metrics.commentedCount = counts.commented;
          metrics.totalReviewedCount = counts.totalReviewed.size;
        }
      });
    }
    
    return Array.from(metricsMap.values());
  } catch (error) {
    console.error('Error calculating review metrics from cache:', error);
    return [];
  }
};
