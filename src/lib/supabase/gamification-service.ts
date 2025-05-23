'use client';

import { supabase } from './client';
import { User, ReviewMetrics } from '@/types/github';
import { Achievement, UserProfile } from '@/types/gamification';
import { achievements } from '@/data/achievements';

/**
 * Syncs user profile data with Supabase
 * Creates or updates user profiles based on GitHub data
 */
export async function syncUserProfiles(users: User[]): Promise<void> {
  // Process users in batches to avoid too many concurrent requests
  const batchSize = 5;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (user) => {
        try {
          // First check if user exists
          const { data: existingUser } = await supabase
            .from('user_profiles')
            .select('userid')
            .eq('userid', user.id)
            .single();
          
          if (!existingUser) {
            // Insert new user
            const { error } = await supabase
              .from('user_profiles')
              .insert({
                userid: user.id,
                login: user.login,
                name: user.name || user.login,
                avatarurl: user.avatar_url,
                currentxp: 0,
                level: 1,
                title: 'Novice Reviewer',
                joinedat: new Date().toISOString(),
                lastactive: new Date().toISOString(),
                streak: 0,
                longeststreak: 0,
                badges: [],
                selectedbadges: []
              });
              
            if (error) {
              console.error(`Error creating profile for user ${user.login}:`, error);
            }
          } else {
            // Update existing user
            const { error } = await supabase
              .from('user_profiles')
              .update({
                login: user.login,
                name: user.name || user.login,
                avatarurl: user.avatar_url,
                lastactive: new Date().toISOString()
              })
              .eq('userid', user.id);
              
            if (error) {
              console.error(`Error updating profile for user ${user.login}:`, error);
            }
          }
        } catch (err) {
          console.error(`Exception syncing profile for user ${user.login}:`, err);
        }
      })
    );
    
    // Add a small delay between batches to reduce server load
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Syncs achievement data with Supabase
 * Updates achievement progress based on review metrics
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function syncAchievements(metrics: ReviewMetrics[], timeRange: string): Promise<void> {
  // Process metrics in batches to avoid too many concurrent requests
  const batchSize = 3;
  for (let i = 0; i < metrics.length; i += batchSize) {
    const batch = metrics.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (metric) => {
        try {
          // First ensure user profile exists
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('userid', metric.userId)
            .single();
          
          if (!userProfile) {
            console.error(`User profile not found for userId: ${metric.userId}`);
            return;
          }
          
          // Get existing achievements for this user
          const { data: existingAchievements } = await supabase
            .from('user_achievements')
            .select('*')
            .eq('userid', metric.userId);
          
          // Process each achievement
          for (const achievement of achievements) {
            let progress = 0;
            let isComplete = false;
      
      // Calculate progress based on achievement criteria
      switch (achievement.id) {
        case 'review-novice':
          progress = Math.min(metric.totalReviewedCount, 1);
          isComplete = metric.totalReviewedCount >= 1;
          break;
        case 'review-pro':
          progress = Math.min(metric.totalReviewedCount, 50);
          isComplete = metric.totalReviewedCount >= 50;
          break;
        case 'review-master':
          progress = Math.min(metric.totalReviewedCount, 100);
          isComplete = metric.totalReviewedCount >= 100;
          break;
        case 'approval-expert':
          progress = Math.min(metric.approvedCount, 25);
          isComplete = metric.approvedCount >= 25;
          break;
        case 'feedback-guru':
          progress = Math.min(metric.changesRequestedCount, 10);
          isComplete = metric.changesRequestedCount >= 10;
          break;
        case 'comment-king':
          progress = Math.min(metric.commentedCount, 30);
          isComplete = metric.commentedCount >= 30;
          break;
        // Add more achievement calculations here
      }
      
            // Find if achievement already exists for this user
            const existingAchievement = existingAchievements?.find(
              (a) => a.achievementid === achievement.id
            );
            
            try {
              if (existingAchievement) {
                // Only update if there's a change to avoid unnecessary operations
                if (existingAchievement.progress !== progress || (isComplete && !existingAchievement.iscomplete)) {
                  const { error } = await supabase
                    .from('user_achievements')
                    .update({
                      progress,
                      iscomplete: isComplete,
                      earnedat: isComplete && !existingAchievement.iscomplete ? new Date().toISOString() : existingAchievement.earnedat
                    })
                    .eq('id', existingAchievement.id);
                    
                  if (error) {
                    console.error(`Error updating achievement ${achievement.id} for user ${metric.userId}:`, error);
                  }
                }
              } else if (progress > 0) {
                // Create new achievement with a unique ID
                const { error } = await supabase.from('user_achievements').insert({
                  userid: metric.userId,
                  achievementid: achievement.id,
                  progress,
                  iscomplete: isComplete,
                  earnedat: isComplete ? new Date().toISOString() : null
                });
                
                if (error) {
                  console.error(`Error creating achievement ${achievement.id} for user ${metric.userId}:`, error);
                }
              }
            } catch (err) {
              console.error(`Exception processing achievement ${achievement.id} for user ${metric.userId}:`, err);
            }
            
            // Award XP if achievement is completed
            if (isComplete) {
              await awardXP(metric.userId, 50, 'achievement_earned');
              
              // Create notification
              await supabase.from('notifications').insert({
                userid: metric.userId,
                type: 'achievement',
                title: `Achievement Unlocked: ${achievement.name}`,
                message: achievement.description,
                data: { achievementid: achievement.id },
                isread: false
              });
            }
          }
        } catch (err) {
          console.error(`Exception syncing achievements for user ${metric.userId}:`, err);
        }
      })
    );
    
    // Add a small delay between batches to reduce server load
    if (i + batchSize < metrics.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Updates user XP and level based on review metrics
 */
export async function updateUserXPAndLevel(metric: ReviewMetrics): Promise<void> {
  // Calculate XP based on review activities
  const reviewXP = metric.totalReviewedCount * 10;
  const approvalXP = metric.approvedCount * 15;
  const changesXP = metric.changesRequestedCount * 20;
  const commentXP = metric.commentedCount * 5;
  
  const totalXP = reviewXP + approvalXP + changesXP + commentXP;
  
  // Get current user profile
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('userid', metric.userId)
    .single();
  
  if (!userProfile) return;
  
  // Only update if XP has increased
  if (totalXP > userProfile.currentXP) {
    // Calculate level based on XP
    const level = calculateLevel(totalXP);
    const levelUp = level > userProfile.level;
    
    await supabase
      .from('user_profiles')
      .update({
        currentxp: totalXP,
        level,
        updated_at: new Date().toISOString()
      })
      .eq('userid', metric.userId);
    
    // Create notification for level up
    if (levelUp) {
      await supabase.from('notifications').insert({
        userid: metric.userId,
        type: 'level_up',
        title: `Level Up! You're now level ${level}`,
        message: `Congratulations! You've reached level ${level}. Keep up the great work!`,
        data: { level },
        isRead: false
      });
    }
  }
}

/**
 * Awards XP to a user and logs the activity
 */
export async function awardXP(userId: number, xp: number, activityType: string, reviewId?: number): Promise<void> {
  // Log the activity
  await supabase.from('activity_logs').insert({
    userid: userId,
    reviewid: reviewId,
    xpawarded: xp,
    activitytype: activityType,
    timestamp: new Date().toISOString()
  });
  
  // Update user XP
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('currentXP, level')
    .eq('userid', userId)
    .single();
  
  if (userProfile) {
    const newXP = userProfile.currentXP + xp;
    const newLevel = calculateLevel(newXP);
    const levelUp = newLevel > userProfile.level;
    
    await supabase
      .from('user_profiles')
      .update({
        currentXP: newXP,
        level: newLevel,
        updated_at: new Date().toISOString()
      })
      .eq('userid', userId);
    
    // Create notification for level up
    if (levelUp) {
      await supabase.from('notifications').insert({
        userid: userId,
        type: 'level_up',
        title: `Level Up! You're now level ${newLevel}`,
        message: `Congratulations! You've reached level ${newLevel}. Keep up the great work!`,
        data: { level: newLevel },
        isRead: false
      });
    }
  }
}

/**
 * Calculates level based on XP
 */
function calculateLevel(xp: number): number {
  // Simple level calculation: level = 1 + floor(xp / 100)
  // This means each level requires 100 XP
  const level = 1 + Math.floor(xp / 100);
  
  // Cap at level 50
  return Math.min(level, 50);
}

/**
 * Updates user streak based on activity
 */
export async function updateUserStreak(userId: number): Promise<void> {
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('userid', userId)
    .single();
  
  if (!userProfile) return;
  
  const lastActiveDate = new Date(userProfile.lastActive);
  const currentDate = new Date();
  
  // Check if last active was yesterday
  const isYesterday = 
    lastActiveDate.getDate() === currentDate.getDate() - 1 &&
    lastActiveDate.getMonth() === currentDate.getMonth() &&
    lastActiveDate.getFullYear() === currentDate.getFullYear();
  
  // Check if last active was today
  const isToday = 
    lastActiveDate.getDate() === currentDate.getDate() &&
    lastActiveDate.getMonth() === currentDate.getMonth() &&
    lastActiveDate.getFullYear() === currentDate.getFullYear();
  
  let newStreak = userProfile.streak;
  
  if (isYesterday) {
    // Increment streak if last active was yesterday
    newStreak += 1;
  } else if (!isToday) {
    // Reset streak if not active yesterday or today
    newStreak = 1;
  }
  
  // Update longest streak if needed
  const longestStreak = Math.max(userProfile.longestStreak, newStreak);
  
  await supabase
    .from('user_profiles')
    .update({
      streak: newStreak,
      longestStreak,
      lastActive: currentDate.toISOString(),
      updated_at: currentDate.toISOString()
    })
    .eq('userid', userId);
  
  // Award XP for streak milestones
  if (newStreak > 0 && newStreak % 7 === 0) {
    await awardXP(userId, 25, 'streak_milestone');
    
    // Create notification for streak milestone
    await supabase.from('notifications').insert({
      userid: userId,
      type: 'streak',
      title: `${newStreak} Day Streak!`,
      message: `You've been active for ${newStreak} days in a row. Keep it up!`,
      data: { streak: newStreak },
      isRead: false
    });
  }
}

/**
 * Gets user achievements with time filtering
 */
export async function getUserAchievements(
  userId: number, 
  timeRange: string = 'all'
): Promise<(Achievement & { progress: number; isComplete: boolean; earnedAt?: string })[]> {
  try {
    // Get all user achievements in a single query
    const { data: userAchievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('userid', userId);
    
    if (achievementsError) {
      console.error('Error fetching user achievements:', achievementsError);
      return [];
    }
    
    if (!userAchievements || userAchievements.length === 0) {
      // If no achievements exist yet, return all achievements with zero progress
      return achievements.map(achievement => ({
        ...achievement,
        progress: 0,
        isComplete: false
      }));
    }
    
    // For 'all' time range, just return the achievements as they are in the database
    if (timeRange === 'all') {
      return achievements.map(achievement => {
        const userAchievement = userAchievements.find(ua => ua.achievementid === achievement.id);
        return {
          ...achievement,
          progress: userAchievement?.progress || 0,
          isComplete: userAchievement?.iscomplete || false,
          earnedAt: userAchievement?.earnedat
        };
      });
    }
    
    // For time-filtered views, we need to get activity logs
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
    
    // Get all activity logs for this time period in a single query
    const { data: activityLogs, error: logsError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('userid', userId)
      .gte('created_at', startDate.toISOString());
    
    if (logsError) {
      console.error('Error fetching activity logs:', logsError);
      // Fall back to using the stored achievements
      return achievements.map(achievement => {
        const userAchievement = userAchievements.find(ua => ua.achievementid === achievement.id);
        return {
          ...achievement,
          progress: userAchievement?.progress || 0,
          isComplete: userAchievement?.iscomplete || false,
          earnedAt: userAchievement?.earnedat
        };
      });
    }
    
    if (!activityLogs || activityLogs.length === 0) {
      // No activity in this time range, return achievements with zero progress
      return achievements.map(achievement => ({
        ...achievement,
        progress: 0,
        isComplete: false
      }));
    }
    
    // Calculate all metrics at once from the activity logs
    const metrics = {
      reviewCount: activityLogs.filter(log => log.type === 'review').length,
      approvalCount: activityLogs.filter(log => log.type === 'approval').length,
      changesRequestedCount: activityLogs.filter(log => log.type === 'changes_requested').length,
      commentCount: activityLogs.filter(log => log.type === 'comment').length,
      // Add other metrics as needed
    };
    
    // Map achievements with progress based on filtered activity
    return achievements.map(achievement => {
      const userAchievement = userAchievements.find(ua => ua.achievementid === achievement.id);
      let progress = 0;
      let isComplete = false;
      
      // Calculate progress based on achievement type
      switch (achievement.category) {
        case 'review_count':
          progress = Math.min(metrics.reviewCount, achievement.requiredValue);
          isComplete = metrics.reviewCount >= achievement.requiredValue;
          break;
        case 'approval_count':
          progress = Math.min(metrics.approvalCount, achievement.requiredValue);
          isComplete = metrics.approvalCount >= achievement.requiredValue;
          break;
        case 'changes_requested_count':
          progress = Math.min(metrics.changesRequestedCount, achievement.requiredValue);
          isComplete = metrics.changesRequestedCount >= achievement.requiredValue;
          break;
        case 'comment_count':
          progress = Math.min(metrics.commentCount, achievement.requiredValue);
          isComplete = metrics.commentCount >= achievement.requiredValue;
          break;
        // Handle other achievement categories
        default:
          // Use stored values for achievement types we can't calculate from activity logs
          progress = userAchievement?.progress || 0;
          isComplete = userAchievement?.iscomplete || false;
      }
      
      return {
        ...achievement,
        progress,
        isComplete,
        earnedAt: userAchievement?.earnedat
      };
    });
  } catch (error) {
    console.error('Error in getUserAchievements:', error);
    return [];
  }
}

/**
 * Gets user profile with achievements
 */
export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('userid', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    if (!profile) return null;
    
    return {
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
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}
