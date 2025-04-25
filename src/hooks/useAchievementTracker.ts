'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { achievements } from '@/data/achievements';
import { supabase } from '@/lib/supabase/client';
import { 
  Achievement, 
  UserAchievement, 
  UserProfile 
} from '@/types/gamification';
import { ReviewMetrics } from '@/types/github';
import { useGitHub } from '@/lib/github/context';

export function useAchievementTracker() {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, metrics } = useGitHub();

  // Calculate XP for different actions
  const XP_VALUES = {
    REVIEW: 10,
    APPROVAL: 15,
    CHANGES_REQUESTED: 20,
    COMMENT: 5,
    ACHIEVEMENT: 50,
    DAILY_STREAK: 5
  };

  // Load user profile and achievements
  useEffect(() => {
    if (!user) return;
    
    const loadUserData = async () => {
      setLoading(true);
      
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('userid', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading user profile:', profileError);
      }
      
      // If profile doesn't exist, create it
      if (!profileData) {
        const newProfile = {
          userid: user.id,
          login: user.login,
          name: user.name || '',
          avatarurl: user.avatar_url,
          currentxp: 0,
          level: 1,
          joinedat: new Date().toISOString(),
          lastactive: new Date().toISOString(),
          streak: 0,
          longeststreak: 0,
          badges: [],
          selectedbadges: []
        };
        
        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating user profile:', createError);
        } else {
          setUserProfile(createdProfile);
        }
      } else {
        setUserProfile(profileData);
      }
      
      // Get user achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('userid', user.id);
        
      if (achievementsError) {
        console.error('Error loading user achievements:', achievementsError);
      } else {
        setUserAchievements(achievementsData || []);
      }
      
      setLoading(false);
    };
    
    loadUserData();
  }, [user]);

  // Check for new achievements when metrics change
  useEffect(() => {
    if (!user || !metrics || !userProfile || loading) return;
    
    const checkAchievements = async () => {
      const userMetrics = metrics.find((m: ReviewMetrics) => m.userId === user.id);
      if (!userMetrics) return;
      
      const newAchievements: UserAchievement[] = [];
      const updatedAchievements: UserAchievement[] = [];
      let xpGained = 0;
      
      // Check each achievement
      for (const achievement of achievements) {
        // Skip achievements that are already completed
        const existingAchievement = userAchievements.find(ua => 
          ua.achievementid === achievement.id && ua.iscomplete);
          
        if (existingAchievement) continue;
        
        // Calculate progress based on achievement category
        let progress = 0;
        switch (achievement.category) {
          case 'review_count':
            progress = userMetrics.totalReviewedCount;
            break;
          case 'approval_count':
            progress = userMetrics.approvedCount;
            break;
          case 'changes_requested_count':
            progress = userMetrics.changesRequestedCount;
            break;
          case 'comment_count':
            progress = userMetrics.commentedCount;
            break;
          case 'streak':
            progress = userProfile.streak;
            break;
          // Other categories handled in separate functions
        }
        
        // Check if achievement is completed
        const isComplete = progress >= achievement.requiredValue;
        
        // If existing but not complete, update progress
        const existing = userAchievements.find(ua => 
          ua.achievementid === achievement.id && !ua.iscomplete);
          
        if (existing) {
          if (existing.progress !== progress || (isComplete && !existing.iscomplete)) {
            const updated = {
              ...existing,
              progress,
              iscomplete: isComplete,
              earnedat: isComplete ? new Date().toISOString() : existing.earnedat
            };
            updatedAchievements.push(updated);
            
            if (isComplete) {
              showAchievementNotification(achievement);
              xpGained += XP_VALUES.ACHIEVEMENT;
            }
          }
        } 
        // If new achievement, create it
        else if (progress > 0) {
          const newAchievement: UserAchievement = {
            id: crypto.randomUUID(),
            userid: user.id,
            achievementid: achievement.id,
            progress,
            iscomplete: isComplete,
            earnedat: isComplete ? new Date().toISOString() : ''
          };
          newAchievements.push(newAchievement);
          
          if (isComplete) {
            showAchievementNotification(achievement);
            xpGained += XP_VALUES.ACHIEVEMENT;
          }
        }
      }
      
      // Save new and updated achievements
      if (newAchievements.length > 0) {
        const { error } = await supabase
          .from('user_achievements')
          .insert(newAchievements);
          
        if (error) {
          console.error('Error saving new achievements:', error);
        } else {
          setUserAchievements(prev => [...prev, ...newAchievements]);
        }
      }
      
      if (updatedAchievements.length > 0) {
        for (const achievement of updatedAchievements) {
          const { error } = await supabase
            .from('user_achievements')
            .update({
              progress: achievement.progress,
              iscomplete: achievement.iscomplete,
              earnedat: achievement.earnedat
            })
            .eq('id', achievement.id);
            
          if (error) {
            console.error('Error updating achievement:', error);
          }
        }
        
        setUserAchievements(prev => 
          prev.map(a => {
            const updated = updatedAchievements.find(ua => ua.id === a.id);
            return updated || a;
          })
        );
      }
      
      // Update XP if needed
      if (xpGained > 0) {
        updateUserXP(xpGained);
      }
    };
    
    checkAchievements();
  }, [metrics, user, userAchievements, userProfile, loading]);

  // Update user streak
  useEffect(() => {
    if (!user || !userProfile) return;
    
    const updateStreak = async () => {
      if (!userProfile || !user) return;
      
      const now = new Date();
      const lastActiveDate = new Date(userProfile.lastactive);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const lastActiveDay = new Date(
        lastActiveDate.getFullYear(), 
        lastActiveDate.getMonth(), 
        lastActiveDate.getDate()
      );
      
      // Check if last active was yesterday or earlier today
      const isConsecutive = 
        (lastActiveDay.getTime() === yesterday.getTime()) || 
        (lastActiveDay.getTime() === today.getTime() && lastActiveDate.getTime() !== now.getTime());
      
      let newStreak = userProfile.streak;
      let xpGained = 0;
      
      if (isConsecutive) {
        newStreak += 1;
        xpGained = XP_VALUES.DAILY_STREAK;
      } else {
        // Reset streak
        newStreak = 1;
      }
      
      // Update profile if streak changed
      if (newStreak !== userProfile.streak) {
        const longestStreak = Math.max(newStreak, userProfile.longeststreak);
        
        const { error } = await supabase
          .from('user_profiles')
          .update({
            streak: newStreak,
            longeststreak: longestStreak,
            lastactive: now.toISOString()
          })
          .eq('userid', user.id);
          
        if (error) {
          console.error('Error updating streak:', error);
        } else {
          setUserProfile(prev => prev ? {
            ...prev,
            streak: newStreak,
            longeststreak: longestStreak,
            lastactive: now.toISOString()
          } : null);
          
          if (xpGained > 0) {
            updateUserXP(xpGained);
          }
        }
      }
    };
    
    updateStreak();
  }, [user, userProfile]);

  // Update user XP and check for level up
  const updateUserXP = async (xpGained: number) => {
    if (!userProfile) return;
    
    const { levels } = await import('@/data/achievements');
    
    const newXP = userProfile.currentxp + xpGained;
    let newLevel = userProfile.level;
    
    // Check for level up
    const nextLevel = levels.find(l => l.id === userProfile.level + 1);
    if (nextLevel && newXP >= nextLevel.requiredXP) {
      newLevel = nextLevel.id;
      
      // Show level up notification
      toast({
        title: "Level Up!",
        description: `Congratulations! You've reached level ${newLevel}: ${nextLevel.name}`,
        duration: 5000
      });
    }
    
    // Update profile
    const { error } = await supabase
      .from('user_profiles')
      .update({
        currentxp: newXP,
        level: newLevel
      })
      .eq('userid', userProfile.userid);
      
    if (error) {
      console.error('Error updating XP:', error);
    } else {
      setUserProfile(prev => prev ? {
        ...prev,
        currentxp: newXP,
        level: newLevel
      } : null);
    }
  };

  // Update user last active date
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateLastActive = async () => {
    if (!userProfile || !user) return;
    
    await supabase
      .from('user_profiles')
      .update({
        lastactive: new Date().toISOString()
      })
      .eq('userid', userProfile.userid);
  };

  // Show achievement notification
  const showAchievementNotification = (achievement: Achievement) => {
    toast({
      title: `Achievement Unlocked: ${achievement.name}`,
      description: achievement.description,
      duration: 5000
    });
  };

  // Get achievement by ID
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const getAchievement = (achievementId: string): Achievement | undefined => {
    // First check if user has already earned it
    const userAchievement = userAchievements.find(ua => ua.achievementid === achievementId);
    
    if (userAchievement) {
      const achievement = achievements.find(a => a.id === achievementId);
      if (achievement) {
        return {
          ...achievement,
          isComplete: userAchievement.iscomplete,
          progress: userAchievement.progress,
          earnedAt: userAchievement.earnedat
        };
      }
    }
  };

  return {
    userAchievements,
    userProfile,
    loading,
    achievements: achievements.map(achievement => {
      const userAchievement = userAchievements.find(ua => 
        ua.achievementid === achievement.id);
      
      return {
        ...achievement,
        progress: userAchievement?.progress || 0,
        isComplete: userAchievement?.iscomplete || false,
        earnedAt: userAchievement?.earnedat || ''
      };
    })
  };
}
