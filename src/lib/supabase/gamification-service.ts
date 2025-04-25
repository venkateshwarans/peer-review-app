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
  for (const user of users) {
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('userid', user.id)
      .single();
    
    if (!existingProfile) {
      // Create new profile
      await supabase.from('user_profiles').insert({
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
        longeststreak: 0
      });
    } else {
      // Update existing profile
      await supabase
        .from('user_profiles')
        .update({
          login: user.login,
          name: user.name || user.login,
          avatarurl: user.avatar_url,
          lastactive: new Date().toISOString()
        })
        .eq('userid', user.id);
    }
  }
}

/**
 * Syncs achievement data with Supabase
 * Updates achievement progress based on review metrics
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function syncAchievements(metrics: ReviewMetrics[], timeRange: string): Promise<void> {
  for (const metric of metrics) {
    // First ensure user profile exists
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('userid', metric.userId)
      .single();
    
    if (!userProfile) {
      console.error(`User profile not found for userId: ${metric.userId}`);
      continue;
    }
    
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
      
      // Check if achievement already exists
      const { data: existingAchievement } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('userid', metric.userId)
        .eq('achievementid', achievement.id)
        .single();
      
      if (!existingAchievement) {
        // Create new achievement record
        await supabase.from('user_achievements').insert({
          userid: metric.userId,
          achievementid: achievement.id,
          progress,
          iscomplete: isComplete,
          earnedat: isComplete ? new Date().toISOString() : null
        });
        
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
      } else if (progress > existingAchievement.progress) {
        // Update existing achievement with new progress
        const wasComplete = existingAchievement.iscomplete;
        
        await supabase
          .from('user_achievements')
          .update({
            progress,
            iscomplete: isComplete,
            earnedat: isComplete && !wasComplete ? new Date().toISOString() : existingAchievement.earnedat,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAchievement.id);
        
        // Award XP if achievement was just completed
        if (isComplete && !wasComplete) {
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
    }
    
    // Update user XP and level based on review metrics
    await updateUserXPAndLevel(metric);
  }
}

/**
 * Updates user XP and level based on review metrics
 */
async function updateUserXPAndLevel(metric: ReviewMetrics): Promise<void> {
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
    reviewId,
    xpAwarded: xp,
    activityType,
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
  // Get all user achievements
  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('userid', userId);
  
  if (!userAchievements) return [];
  
  // Get activity logs for time filtering
  let startDate = new Date(0); // Default to epoch start
  
  switch (timeRange) {
    case 'week':
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'year':
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    // 'all' uses the default startDate
  }
  
  // Filter achievements by time range if not 'all'
  if (timeRange !== 'all') {
    const { data: activityLogs } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('userid', userId)
      .gte('timestamp', startDate.toISOString());
    
    if (!activityLogs || activityLogs.length === 0) return [];
    
    // Only include achievements with activity in the time range
    return userAchievements
      .filter(achievement => {
        if (!achievement.earnedat) return false;
        
        const earnedDate = new Date(achievement.earnedat);
        return earnedDate >= startDate;
      })
      .map(achievement => {
        // Find the corresponding achievement definition
        const achievementDef = achievements.find(a => a.id === achievement.achievementid);
        if (!achievementDef) return null;
        
        return {
          ...achievementDef,
          progress: achievement.progress,
          isComplete: achievement.iscomplete,
          earnedAt: achievement.earnedat
        };
      })
      .filter(Boolean) as (Achievement & { progress: number; isComplete: boolean; earnedAt?: string })[];
  }
  
  // Return all achievements with their definitions
  return userAchievements
    .map(achievement => {
      // Find the corresponding achievement definition
      const achievementDef = achievements.find(a => a.id === achievement.achievementid);
      if (!achievementDef) return null;
      
      return {
        ...achievementDef,
        progress: achievement.progress,
        isComplete: achievement.iscomplete,
        earnedAt: achievement.earnedat
      };
    })
    .filter(Boolean) as (Achievement & { progress: number; isComplete: boolean; earnedAt?: string })[];
}

/**
 * Gets user profile with achievements
 */
export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('userid', userId)
    .single();
  
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
}
