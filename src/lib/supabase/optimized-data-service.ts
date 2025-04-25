'use client';

import { supabase } from './client';
import { Achievement, UserAchievement, UserProfile } from '@/types/gamification';
import { ReviewMetrics } from '@/types/github';
import { syncUserProfiles } from './gamification-service';

// Cache storage
interface CacheStore {
  profiles: Map<string, UserProfile>;
  achievements: Map<string, Map<string, Achievement[]>>;
  lastSync: Date | null;
}

// Global cache
const cache: CacheStore = {
  profiles: new Map(),
  achievements: new Map(),
  lastSync: null
};

// Throttling mechanism to prevent too many concurrent requests
const requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

/**
 * Process the request queue with throttling
 */
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  try {
    // Process up to 3 requests at a time
    while (requestQueue.length > 0) {
      const batch = requestQueue.splice(0, 3);
      await Promise.all(batch.map(request => request()));
      
      // Add a small delay between batches
      if (requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Add a request to the queue and process it
 */
function enqueueRequest(request: () => Promise<void>): void {
  requestQueue.push(request);
  processQueue();
}

/**
 * Optimized function to get user profiles for multiple users at once
 * @param userIds Array of user IDs to fetch profiles for
 */
export async function getOptimizedUserProfiles(userIds: number[]): Promise<Map<number, UserProfile>> {
  // Check which users we need to fetch
  const idsToFetch = userIds.filter(id => !cache.profiles.has(id.toString()));
  
  if (idsToFetch.length > 0) {
    // Fetch profiles in a single query
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .in('userid', idsToFetch);
    
    if (error) {
      console.error('Error fetching user profiles:', error);
    } else if (profiles) {
      // Update cache
      profiles.forEach(profile => {
        const formattedProfile: UserProfile = {
          userid: profile.userid,
          login: profile.login,
          name: profile.name || profile.login,
          avatarurl: profile.avatarurl,
          level: profile.level,
          currentxp: profile.currentxp,
          joinedat: profile.joinedat,
          lastactive: profile.lastactive,
          streak: profile.streak,
          longeststreak: profile.longeststreak,
          badges: profile.badges || [],
          selectedbadges: profile.selectedbadges || []
        };
        cache.profiles.set(profile.userid.toString(), formattedProfile);
      });
    }
  }
  
  // Return profiles from cache
  const result = new Map<number, UserProfile>();
  userIds.forEach(id => {
    const profile = cache.profiles.get(id.toString());
    if (profile) {
      result.set(id, profile);
    }
  });
  
  return result;
}

/**
 * Optimized function to get achievements for multiple users at once
 * @param userIds Array of user IDs to fetch achievements for
 * @param timeRange Time range to filter achievements by ('week', 'month', 'quarter', 'year', 'all')
 */
export async function getOptimizedUserAchievements(
  userIds: number[],
  timeRange: string = 'all'
): Promise<Map<number, Achievement[]>> {
  console.log(`Getting achievements for ${userIds.length} users with time range: ${timeRange}`);
  
  // When time range changes, we need to fetch fresh data
  // Check which users we need to fetch
  const idsToFetch = userIds.filter(id => {
    const userId = id.toString();
    return !cache.achievements.has(userId) || !cache.achievements.get(userId)?.has(timeRange);
  });
  
  console.log(`Need to fetch achievements for ${idsToFetch.length} users`);
  
  if (idsToFetch.length > 0) {
    // Fetch all achievements in a single query
    const { data: achievements, error } = await supabase
      .from('user_achievements')
      .select('*')
      .in('userid', idsToFetch);
    
    if (error) {
      console.error('Error fetching user achievements:', error);
    } else if (achievements) {
      // Group achievements by user
      const achievementsByUser = new Map<number, UserAchievement[]>();
      achievements.forEach(achievement => {
        if (!achievementsByUser.has(achievement.userid)) {
          achievementsByUser.set(achievement.userid, []);
        }
        achievementsByUser.get(achievement.userid)?.push(achievement);
      });
      
      // Process each user's achievements
      for (const [userId, userAchievements] of achievementsByUser.entries()) {
        // Process achievements for this user and time range
        const processedAchievements = await processUserAchievements(userId, userAchievements, timeRange);
        
        // Update cache
        if (!cache.achievements.has(userId.toString())) {
          cache.achievements.set(userId.toString(), new Map());
        }
        cache.achievements.get(userId.toString())?.set(timeRange, processedAchievements);
      }
    }
  }
  
  // Return achievements from cache
  const result = new Map<number, Achievement[]>();
  userIds.forEach(id => {
    const userAchievements = cache.achievements.get(id.toString())?.get(timeRange);
    if (userAchievements) {
      result.set(id, userAchievements);
    }
  });
  
  return result;
}

/**
 * Process achievements for a single user
 */
async function processUserAchievements(
  userId: number,
  userAchievements: UserAchievement[],
  timeRange: string
): Promise<Achievement[]> {
  // Import achievements from data
  const { achievements } = await import('@/data/achievements');
  
  // Always use the stored achievement values from the database for UI display
  // This ensures users see their actual progress regardless of time filter
  console.log('Using stored achievement values from database');
  return achievements.map(achievement => {
    const userAchievement = userAchievements.find(ua => ua.achievementid === achievement.id);
    
    // Log the achievement data for debugging
    if (userAchievement) {
      console.log(`Achievement ${achievement.id}: progress=${userAchievement.progress}, isComplete=${userAchievement.iscomplete}`);
    }
    
    return {
      ...achievement,
      progress: userAchievement?.progress || 0,
      isComplete: userAchievement?.iscomplete || false,
      earnedAt: userAchievement?.earnedat
    };
  });
  
  // We still need to fetch activity logs for other purposes (like charts and metrics)
  // but we won't use them for achievement display
  if (timeRange !== 'all') {
    const startDate = new Date();
    console.log(`Processing time-filtered data for range: ${timeRange}`);
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    // Get all activity logs for this time period in a single query
    console.log(`Fetching activity logs since ${startDate.toISOString()} for user ${userId}`);
    const { data: activityLogs, error: logsError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('userid', userId)
      .gte('timestamp', startDate.toISOString());
      
    if (logsError) {
      console.error('Error fetching activity logs:', logsError);
    } else {
      console.log(`Found ${activityLogs?.length || 0} activity logs for user ${userId} in time range ${timeRange}`);
    }
    
    // We're still calculating these metrics for other UI elements that might need them
    // but we're not using them for achievement display
    const safeActivityLogs = activityLogs || [];
    if (safeActivityLogs.length > 0) {
      const metrics = {
        reviewCount: safeActivityLogs.filter((log) => log.activitytype === 'review').length,
        approvalCount: safeActivityLogs.filter((log) => log.activitytype === 'approval').length,
        changesRequestedCount: safeActivityLogs.filter((log) => log.activitytype === 'changes_requested').length,
        commentCount: safeActivityLogs.filter((log) => log.activitytype === 'comment').length,
      };
      console.log(`Time-filtered metrics: ${JSON.stringify(metrics)}`);
    }
  }
}

/**
 * Optimized function to sync user profiles and achievements
 * @param reviewMetrics Array of review metrics for users to sync (can be just one user)
 * @param timeRange Time range to filter achievements by
 */
export async function syncOptimizedUserData(
  reviewMetrics: ReviewMetrics[],
  timeRange: string = 'all'
): Promise<void> {
  // If no metrics provided, exit early
  if (!reviewMetrics || reviewMetrics.length === 0) {
    console.log('No user metrics provided for sync. Skipping.');
    return;
  }
  
  // For single user operations, we can skip the time check to ensure fresh data
  const now = new Date();
  const isSingleUserSync = reviewMetrics.length === 1;
  
  // Only apply time-based throttling for multi-user syncs
  if (!isSingleUserSync && cache.lastSync && (now.getTime() - cache.lastSync.getTime() < 5 * 60 * 1000)) {
    console.log('Data was synced recently. Skipping sync.');
    return;
  }
  
  try {
    const userCount = reviewMetrics.length;
    console.log(`Starting optimized data sync for ${userCount} user(s)...`);
    
    // Sync user profiles first
    await syncUserProfiles(reviewMetrics.map(m => ({
      id: m.userId,
      login: m.login,
      name: m.name || m.login,
      avatar_url: m.avatarUrl,
      html_url: `https://github.com/${m.login}`
    })));
    console.log(`User profiles synced successfully for ${userCount} user(s)`);
    
    // Generate and sync achievements based on metrics
    // This ensures achievements are properly created in the database
    for (const metric of reviewMetrics) {
      try {
        // Import achievements data
        const { achievements } = await import('@/data/achievements');
        
        // Generate user achievements based on metrics
        const userAchievements = achievements.map(achievement => {
          let progress = 0;
          let isComplete = false;
          
          // Calculate progress based on achievement type and time range
          // For 'all' time range, use the total metrics
          // For other time ranges, we'll calculate based on activity in that period
          if (timeRange === 'all') {
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
          } else {
            // For time-filtered views, we need to calculate based on the time range
            // First, determine the start date for the time range
            const startDate = new Date();
            switch (timeRange) {
              case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
              case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
              case 'quarter':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
              case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            }
            
            // We'll set progress and isComplete when we have activity data
            // For now, just use the base values
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
    
    // Update last sync time
    cache.lastSync = now;
    console.log('Optimized data sync completed successfully');
  } catch (error) {
    console.error('Error in syncOptimizedUserData:', error);
  }
}

/**
 * Preload data for the home page to avoid excessive API calls
 * This is only used for initial page load - individual profile views will use their own optimized fetching
 */
export async function preloadHomePageData(
  reviewMetrics: ReviewMetrics[],
  timeRange: string = 'all'
): Promise<void> {
  // Only sync if needed and if we have metrics
  if (reviewMetrics.length > 0 && (!cache.lastSync || (new Date().getTime() - cache.lastSync.getTime() > 15 * 60 * 1000))) {
    console.log('Preloading data for home page - this is a background operation');
    
    // We'll only preload the top 3 most active reviewers to minimize API calls
    const topReviewers = [...reviewMetrics]
      .sort((a, b) => b.totalReviewedCount - a.totalReviewedCount)
      .slice(0, 3);
    
    enqueueRequest(async () => {
      await syncOptimizedUserData(topReviewers, timeRange);
    });
    
    // Preload user profiles for all users (lightweight operation)
    const userIds = reviewMetrics.map(m => m.userId);
    enqueueRequest(async () => {
      await getOptimizedUserProfiles(userIds);
    });
  } else {
    console.log('Skipping preload - data is fresh or no metrics available');
  }
}
