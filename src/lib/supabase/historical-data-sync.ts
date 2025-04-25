'use client';

import { supabase } from './client';
import { Octokit } from '@octokit/rest';
import { ReviewMetrics } from '@/types/github';
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
 * Fetch all pull requests for a repository
 */
async function fetchPullRequests(octokit: Octokit, owner: string, repo: string): Promise<PullRequestData[]> {
  try {
    const pullRequests: PullRequestData[] = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const response = await octokit.rest.pulls.list({
        owner: owner,
        repo: repo,
        state: 'all',
        per_page: 100,
        page
      });
      
      if (response.data.length === 0) {
        hasMorePages = false;
      } else {
        // Cast the response data to our simplified PullRequestData type
        const typedPRs = response.data.map(pr => ({
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
    console.error(`Error fetching pull requests for ${owner}/${repo}:`, error);
    return [];
  }
}

/**
 * Ensure the required database tables exist
 */
async function ensureTablesExist(): Promise<void> {
  try {
    console.log('Checking if required tables exist...');
    
    // Check if activity_logs table exists
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.error('Error checking tables:', error);
      return;
    }
    
    const tableNames = tables?.map(t => t.table_name) || [];
    
    // Create activity_logs table if it doesn't exist
    if (!tableNames.includes('activity_logs')) {
      console.log('Creating activity_logs table...');
      
      // Instead of trying to create the table directly (which requires admin privileges),
      // we'll just insert a record and let Supabase handle the error gracefully
      try {
        const { error: insertError } = await supabase
          .from('activity_logs')
          .insert({
            userid: 0, // Dummy user ID
            type: 'test',
            pr_number: 0,
            repository: 'test',
            created_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error('Error inserting test record:', insertError);
        }
      } catch (err) {
        console.error('Error testing activity_logs table:', err);
      }
        
    } else {
      console.log('activity_logs table already exists');
    }
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
  }
}

/**
 * Fetch historical GitHub data for the past year for all users
 * This is a comprehensive sync that will populate all achievement data
 */
export async function syncHistoricalGitHubData(
  token: string = GITHUB_TOKEN,
  organization: string = DEFAULT_ORG
): Promise<void> {
  try {
    console.log('Starting historical GitHub data sync (past year)...');
    
    // Ensure required tables exist
    await ensureTablesExist();
    
    // Get Octokit instance
    const octokit = getOctokit(token);
    
    // Step 1: Get all organization members
    const members = await fetchAllOrgMembers(octokit, organization);
    console.log(`Found ${members.length} organization members`);
    
    // Step 2: Get all repositories in the organization
    const repos = await fetchAllRepositories(octokit, organization);
    console.log(`Found ${repos.length} repositories`);
    
    // Step 3: For each repository, get all pull requests from the past year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // Store all metrics by user ID
    const metricsByUser: Record<number, ReviewMetrics> = {};
    
    // Process repositories in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < repos.length; i += batchSize) {
      const repoBatch = repos.slice(i, i + batchSize);
      
      // Process each repo in the batch
      await Promise.all(repoBatch.map(async (repo: {name: string; id: number}) => {
        try {
          console.log(`Processing repository: ${repo.name}`);
          
          // Get all pull requests for this repo
          const prs = await fetchPullRequests(octokit, organization, repo.name);
          console.log(`Found ${prs.length} pull requests in ${repo.name}`);
          
          // Process each pull request
          for (const pr of prs) {
            // Get all reviews for this PR
            const reviews = await fetchPullRequestReviews(octokit, organization, repo.name, pr.number);
            
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
                  avatarUrl: '', // We don't have avatar_url in our simplified type
                  totalReviewedCount: 0,
                  approvedCount: 0,
                  changesRequestedCount: 0,
                  commentedCount: 0,
                  pendingCount: 0,
                  openedCount: 0,
                  assignedCount: 0,
                  openAgainstCount: 0 // Add the missing property
                };
              }
              
              // Update metrics based on review state
              metricsByUser[reviewer.id].totalReviewedCount++;
              
              // Record the review activity (always record this for all reviews)
              await recordActivity(
                reviewer.id,
                reviewer.login,
                'review', // Use lowercase to match optimized-data-service
                review.id,
                repo.name,
                new Date(review.submitted_at || Date.now()).toISOString()
              );
              
              // Record specific review state activities
              switch (review.state) {
                case 'APPROVED':
                  metricsByUser[reviewer.id].approvedCount++;
                  await recordActivity(
                    reviewer.id,
                    reviewer.login,
                    'approval', // Use lowercase to match optimized-data-service
                    review.id,
                    repo.name,
                    new Date(review.submitted_at || Date.now()).toISOString()
                  );
                  break;
                case 'CHANGES_REQUESTED':
                  metricsByUser[reviewer.id].changesRequestedCount++;
                  await recordActivity(
                    reviewer.id,
                    reviewer.login,
                    'changes_requested', // Use lowercase with underscore to match optimized-data-service
                    review.id,
                    repo.name,
                    new Date(review.submitted_at || Date.now()).toISOString()
                  );
                  break;
                case 'COMMENTED':
                  metricsByUser[reviewer.id].commentedCount++;
                  await recordActivity(
                    reviewer.id,
                    reviewer.login,
                    'comment', // Use lowercase to match optimized-data-service
                    review.id,
                    repo.name,
                    new Date(review.submitted_at || Date.now()).toISOString()
                  );
                  break;
              }
            }
          }
        } catch (error) {
          console.error(`Error processing repository ${repo.name}:`, error);
        }
      }));
      
      // Add a delay between batches to avoid rate limits
      if (i + batchSize < repos.length) {
        console.log('Pausing to avoid rate limits...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Step 4: Sync GitHub users and user profiles
    const metrics = Object.values(metricsByUser);
    
    // First safely sync GitHub users
    await safelySyncGitHubUsers(metrics.map(m => ({
      id: m.userId,
      login: m.login,
      name: m.name || m.login,
      avatar_url: m.avatarUrl,
      html_url: `https://github.com/${m.login}`
    })), organization);
    console.log('GitHub users synced successfully');
    
    // Then sync user profiles
    await syncUserProfiles(metrics.map(m => ({
      id: m.userId,
      login: m.login,
      name: m.name || m.login,
      avatar_url: m.avatarUrl,
      html_url: `https://github.com/${m.login}`
    })));
    console.log('User profiles synced successfully');
    
    // Step 5: Generate and sync achievements for all users
    await syncHistoricalAchievements(metrics);
    console.log('Historical achievements synced successfully');
    
    // Step 6: Update sync status
    await updateHistoricalSyncStatus(organization);
    console.log('Historical data sync completed successfully');
    
  } catch (error) {
    console.error('Error during historical data sync:', error);
    throw error;
  }
}

/**
 * Fetch all organization members
 */
async function fetchAllOrgMembers(octokit: Octokit, organization: string): Promise<Array<{ id: number; login: string }>> {
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
 * Fetch all organization repositories
 */
async function fetchAllRepositories(octokit: Octokit, organization: string): Promise<Array<{ id: number; name: string; full_name: string }>> {
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
        // Add the repositories to our array
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
 * Type definition for review data
 */
type ReviewData = {
  id: number;
  user: { id: number; login: string };
  state: string;
  submitted_at: string;
};

/**
 * Fetch all reviews for a pull request
 */
async function fetchPullRequestReviews(octokit: Octokit, owner: string, repo: string, prNumber: number): Promise<ReviewData[]> {
  try {
    const reviews: ReviewData[] = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const response = await octokit.rest.pulls.listReviews({
        owner: owner,
        repo: repo,
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
 * Record activity in the activity_logs table
 */
async function recordActivity(
  userId: number,
  login: string, 
  type: string,
  prNumber: number,
  repo: string,
  timestamp: string
): Promise<void> {
  try {
    // Check if record exists first
    const { data: existingRecord, error: checkError } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('userid', userId)
      .eq('reviewid', prNumber)
      .eq('activitytype', type)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking for existing activity record:', checkError);
      return;
    }
    
    // If record exists, don't insert again
    if (existingRecord) {
      console.log(`Activity record already exists for user ${userId}, PR #${prNumber}, type: ${type}`);
      return;
    }
    
    try {
      // First check if the PR exists in pull_requests table
      // We don't use this value but keep the query for future reference
      await supabase
        .from('pull_requests')
        .select('id')
        .eq('pr_number', prNumber)
        .eq('repository', repo)
        .single();
      
      // Insert new record
      const { error: insertError } = await supabase
        .from('activity_logs')
        .insert({
          userid: userId,
          reviewid: prNumber,
          activitytype: type,
          xpawarded: 0, 
          timestamp: timestamp 
        });
      
      if (insertError) {
        console.error('Error recording activity:', insertError);
      }
    } catch (innerError) {
      console.error('Error recording activity (inner try/catch):', innerError);
    }
  } catch (outerError) {
    console.error('Error recording activity (outer try/catch):', outerError);
  }
}

/**
 * Sync achievements based on historical metrics
 */
async function syncHistoricalAchievements(metrics: ReviewMetrics[]): Promise<void> {
  try {
    // Import achievements from data
    const { achievements } = await import('@/data/achievements');
    
    // Process each user
    for (const metric of metrics) {
      try {
        // Generate user achievements based on metrics
        const userAchievements = achievements.map(achievement => {
          let progress = 0;
          let isComplete = false;
          
          // Calculate progress based on achievement type
          switch (achievement.category) {
            case 'review_count':
              progress = Math.min(metric.totalReviewedCount, achievement.requiredValue);
              isComplete = metric.totalReviewedCount >= achievement.requiredValue;
              break;
            case 'approval_count':
              progress = Math.min(metric.approvedCount, achievement.requiredValue);
              isComplete = metric.approvedCount >= achievement.requiredValue;
              break;
            case 'changes_requested_count':
              progress = Math.min(metric.changesRequestedCount, achievement.requiredValue);
              isComplete = metric.changesRequestedCount >= achievement.requiredValue;
              break;
            case 'comment_count':
              progress = Math.min(metric.commentedCount, achievement.requiredValue);
              isComplete = metric.commentedCount >= achievement.requiredValue;
              break;
            // Add other achievement types as needed
          }
          
          return {
            userid: metric.userId,
            achievementid: achievement.id,
            progress,
            iscomplete: isComplete,
            earnedat: isComplete ? new Date().toISOString() : null
          };
        });
        
        // Upsert achievements to database
        for (const achievement of userAchievements) {
          const { error } = await supabase
            .from('user_achievements')
            .upsert(achievement, { onConflict: 'userid,achievementid' });
          
          if (error) {
            console.error(`Error upserting achievement ${achievement.achievementid} for user ${achievement.userid}:`, error);
          }
        }
        
        console.log(`Synced ${userAchievements.length} achievements for user ${metric.login}`);
      } catch (err) {
        console.error(`Error syncing achievements for user ${metric.login}:`, err);
      }
    }
  } catch (error) {
    console.error('Error syncing historical achievements:', error);
  }
}

/**
 * Update the historical sync status
 */
async function updateHistoricalSyncStatus(organization: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('github_sync_status')
      .upsert({
        organization,
        sync_type: 'historical',
        last_sync_time: new Date().toISOString()
      }, { onConflict: 'organization,sync_type' });
    
    if (error) {
      console.error('Error updating historical sync status:', error);
    }
  } catch (error) {
    console.error('Error updating historical sync status:', error);
  }
}

/**
 * Check if historical sync is needed
 */
export async function needsHistoricalSync(
  organization: string = DEFAULT_ORG,
  threshold: number = 7 * 24 * 60 // 7 days in minutes
): Promise<boolean> {
  try {
    // Get the last sync time
    const { data: syncStatus, error: syncError } = await supabase
      .from('github_sync_status')
      .select('last_sync_time')
      .eq('organization', organization)
      .eq('sync_type', 'historical')
      .maybeSingle(); // Use maybeSingle instead of single to handle no rows case
    
    if (syncError) {
      console.error('Error getting sync status:', syncError);
      // Don't throw an error, just return true to indicate sync is needed
      return true;
    }
    
    if (!syncStatus) {
      // If no sync status record is found, consider it as needing a sync
      return true;
    }
    
    const lastSyncTime = new Date(syncStatus.last_sync_time);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);
    
    return diffMinutes > threshold;
  } catch (error) {
    console.error('Error checking if historical sync is needed:', error);
    return true; // Default to needing a sync if there's an error
  }
}
