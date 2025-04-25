'use client';

import React, { useState, useEffect } from 'react';
import { useGitHub } from '@/lib/github/context';
import { getUserProfile, getUserAchievements, syncUserProfiles, syncAchievements } from '@/lib/supabase/gamification-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Award, 
  Trophy, 
  Medal, 
  MessageCircle,
  CheckCircle
} from 'lucide-react';
import { levels } from '@/data/achievements';
import { AchievementTier, UserProfile, Achievement } from '@/types/gamification';
import { TimeRangeValue } from '@/types/github';

export function ReviewerProfile() {
  const { reviewMetrics, isLoading, timeRange, setTimeRange } = useGitHub();
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userAchievements, setUserAchievements] = useState<(Achievement & { progress: number; isComplete: boolean; earnedAt?: string; maxProgress?: number })[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  // Extract unique reviewers from metrics
  const reviewers = reviewMetrics?.map(metric => ({
    id: metric.userId,
    login: metric.login,
    avatarUrl: metric.avatarUrl
  })) || [];
    
  // Set first reviewer as default when data loads
  useEffect(() => {
    if (reviewers.length > 0 && !selectedReviewerId) {
      setSelectedReviewerId(reviewers[0].login);
    }
  }, [reviewers, selectedReviewerId]);
  
  // Get selected reviewer's metrics
  const selectedReviewerMetrics = reviewMetrics?.find(
    metric => metric.login === selectedReviewerId
  );
  
  // Fetch user profile and achievements from Supabase
  useEffect(() => {
    async function fetchProfileData() {
      if (!selectedReviewerMetrics || !reviewMetrics) return;
      
      setLoadingProfile(true);
      try {
        // First ensure all user profiles are synced
        console.log('Syncing user profiles with IDs:', reviewMetrics.map(m => m.userId));
        await syncUserProfiles(reviewMetrics.map(m => ({
          id: m.userId,
          login: m.login,
          name: m.name || m.login,
          avatar_url: m.avatarUrl,
          html_url: `https://github.com/${m.login}`
        })));
        
        // Then sync achievements based on metrics
        await syncAchievements(reviewMetrics, timeRange.value);
        
        // Now fetch the user profile
        console.log('Fetching user profile for ID:', selectedReviewerMetrics.userId);
        const profile = await getUserProfile(selectedReviewerMetrics.userId);
        console.log('Received profile:', profile);
        setUserProfile(profile);
        
        // Fetch achievements with time filtering
        console.log('Fetching achievements for ID:', selectedReviewerMetrics.userId, 'with time range:', timeRange.value);
        const achievements = await getUserAchievements(
          selectedReviewerMetrics.userId, 
          timeRange.value
        );
        console.log('Received achievements:', achievements);
        setUserAchievements(achievements);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoadingProfile(false);
      }
    }
    
    fetchProfileData();
  }, [selectedReviewerMetrics, timeRange.value, reviewMetrics]);

  if (isLoading || loadingProfile || !selectedReviewerMetrics) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-sans tracking-tight">Reviewer Profile</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] animate-pulse bg-muted rounded" />
      </Card>
    );
  }
  
  // If no profile data exists yet, use metrics to generate a temporary profile
  const profile = userProfile || {
    userid: selectedReviewerMetrics.userId,
    login: selectedReviewerMetrics.login,
    name: selectedReviewerMetrics.name || selectedReviewerMetrics.login,
    avatarurl: selectedReviewerMetrics.avatarUrl,
    level: Math.min(Math.floor((selectedReviewerMetrics.totalReviewedCount || 0) / 10) + 1, 10),
    currentxp: (selectedReviewerMetrics.totalReviewedCount || 0) * 10,
    streak: 0,
    longeststreak: 0,
    joinedat: new Date().toISOString(),
    lastactive: new Date().toISOString(),
    badges: [],
    selectedbadges: []
  };
  
  // Get current level and next level
  const currentLevel = levels.find(l => l.id === profile.level) || levels[0];
  const nextLevel = levels.find(l => l.id === profile.level + 1);
  
  // Calculate progress to next level
  const currentLevelXP = currentLevel.requiredXP;
  const nextLevelXP = nextLevel ? nextLevel.requiredXP : currentLevel.requiredXP * 2;
  const progressPercentage = ((profile.currentxp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  
  // Use fetched achievements or generate from metrics if none exist
  const achievements = userAchievements.length > 0 ? userAchievements : [
    {
      id: 'review-novice',
      name: 'Review Novice',
      description: 'Complete your first PR review',
      icon: 'award',
      tier: 'bronze' as AchievementTier,
      category: 'review_count',
      requiredValue: 1,
      isComplete: selectedReviewerMetrics.totalReviewedCount >= 1,
      progress: Math.min(selectedReviewerMetrics.totalReviewedCount, 1),
      earnedAt: selectedReviewerMetrics.totalReviewedCount >= 1 ? new Date().toISOString() : undefined
    },
    {
      id: 'review-pro',
      name: 'Review Pro',
      description: 'Complete 50 PR reviews',
      icon: 'trophy',
      tier: 'silver' as AchievementTier,
      category: 'review_count',
      requiredValue: 50,
      isComplete: selectedReviewerMetrics.totalReviewedCount >= 50,
      progress: Math.min(selectedReviewerMetrics.totalReviewedCount, 50),
      earnedAt: selectedReviewerMetrics.totalReviewedCount >= 50 ? new Date().toISOString() : undefined
    },
    {
      id: 'review-master',
      name: 'Review Master',
      description: 'Complete 100 PR reviews',
      icon: 'medal',
      tier: 'gold' as AchievementTier,
      category: 'review_count',
      requiredValue: 100,
      isComplete: selectedReviewerMetrics.totalReviewedCount >= 100,
      progress: Math.min(selectedReviewerMetrics.totalReviewedCount, 100),
      earnedAt: selectedReviewerMetrics.totalReviewedCount >= 100 ? new Date().toISOString() : undefined
    },
    {
      id: 'approval-expert',
      name: 'Approval Expert',
      description: 'Approve 25 PRs',
      icon: 'check-circle',
      tier: 'silver' as AchievementTier,
      category: 'approval_count',
      requiredValue: 25,
      isComplete: selectedReviewerMetrics.approvedCount >= 25,
      progress: Math.min(selectedReviewerMetrics.approvedCount, 25),
      earnedAt: selectedReviewerMetrics.approvedCount >= 25 ? new Date().toISOString() : undefined
    },
    {
      id: 'feedback-guru',
      name: 'Feedback Guru',
      description: 'Request changes on 10 PRs',
      icon: 'message-circle',
      tier: 'silver' as AchievementTier,
      category: 'changes_requested_count',
      requiredValue: 10,
      isComplete: selectedReviewerMetrics.changesRequestedCount >= 10,
      progress: Math.min(selectedReviewerMetrics.changesRequestedCount, 10),
      earnedAt: selectedReviewerMetrics.changesRequestedCount >= 10 ? new Date().toISOString() : undefined
    }
  ];
  
  // Group achievements by category
  const achievementsByCategory = achievements.reduce<Record<string, typeof achievements[0][]>>((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {});
  
  // Count completed achievements
  const completedAchievements = achievements.filter(a => a.isComplete).length;
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-2">
            <CardTitle className="font-sans tracking-tight">Reviewer Profile</CardTitle>
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0 w-full max-w-md">
              <div className="relative w-full">
                <select 
                  value={selectedReviewerId} 
                  onChange={(e) => setSelectedReviewerId(e.target.value)}
                  className="w-full appearance-none rounded-lg border-2 border-pink-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium shadow-sm hover:border-pink-300 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200 dark:border-pink-800 dark:bg-gray-900 dark:hover:border-pink-700 dark:focus:border-pink-600 dark:focus:ring-pink-900">
                  {reviewers.map(reviewer => (
                    <option key={reviewer.login} value={reviewer.login}>{reviewer.login}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-pink-500">
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-sm font-medium">Time Period:</span>
              <select
                value={timeRange.value}
                onChange={(e) => setTimeRange({ 
                  ...timeRange, 
                  value: e.target.value as TimeRangeValue,
                  label: e.target.options[e.target.selectedIndex].text
                })}
                className="px-2 py-1 rounded-md border border-pink-200 text-sm font-medium"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
          <Badge variant="outline" className="font-sans text-xs">
            Level {currentLevel.id}: {currentLevel.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="font-sans">Overview</TabsTrigger>
            <TabsTrigger value="achievements" className="font-sans">Achievements</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="flex flex-col items-center p-4 bg-card rounded-lg border shadow-sm">
                <Avatar className="h-20 w-20 mb-2">
                  <AvatarImage src={profile.avatarurl || ''} alt={profile.login} />
                  <AvatarFallback>{profile.login.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-bold font-sans">{profile.name}</h3>
                <p className="text-sm text-muted-foreground font-sans">@{profile.login}</p>
                
                <div className="flex flex-wrap gap-1 mt-4 justify-center">
                  <Badge variant="secondary" className="font-sans">
                    Level {currentLevel.id}
                  </Badge>
                  <Badge variant="outline" className="font-sans">
                    {currentLevel.name}
                  </Badge>
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium font-sans">Level Progress</h4>
                    <span className="text-sm font-medium font-sans">
                      {profile.currentxp - currentLevelXP} / {nextLevelXP - currentLevelXP} XP
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-yellow-50 dark:bg-yellow-950/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium font-sans">Reviews</h4>
                      <MessageCircle className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold mt-2 font-sans">{selectedReviewerMetrics.totalReviewedCount}</p>
                    <p className="text-xs text-muted-foreground font-sans">Total reviews completed</p>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium font-sans">Achievements</h4>
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    </div>
                    <p className="text-2xl font-bold mt-2 font-sans">{completedAchievements}</p>
                    <p className="text-xs text-muted-foreground font-sans">
                      {completedAchievements} of {achievements.length} unlocked
                    </p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-950/10 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium font-sans">Approval Rate</h4>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold mt-2 font-sans">
                      {selectedReviewerMetrics.totalReviewedCount > 0 
                        ? Math.round((selectedReviewerMetrics.approvedCount / selectedReviewerMetrics.totalReviewedCount) * 100) 
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground font-sans">
                      {selectedReviewerMetrics.approvedCount} approvals
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="achievements" className="space-y-6">
            {Object.entries(achievementsByCategory).map(([category, categoryAchievements]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-bold capitalize font-sans">
                  {category} ({categoryAchievements.filter(a => a.isComplete).length}/{categoryAchievements.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAchievements.map((achievement) => (
                    <div 
                      key={achievement.id} 
                      className={`p-4 rounded-lg border ${
                        achievement.isComplete 
                          ? 'bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-800' 
                          : 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full flex items-center justify-center ${
                          achievement.isComplete 
                            ? achievement.tier === 'gold' 
                              ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' 
                              : achievement.tier === 'silver' 
                                ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' 
                                : 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                        }`}>
                          {achievement.icon === 'award' ? <Award className="h-6 w-6" /> : 
                           achievement.icon === 'trophy' ? <Trophy className="h-6 w-6" /> : 
                           achievement.icon === 'medal' ? <Medal className="h-6 w-6" /> : 
                           achievement.icon === 'check-circle' ? <CheckCircle className="h-6 w-6" /> : 
                           achievement.icon === 'message-circle' ? <MessageCircle className="h-6 w-6" /> : 
                           <Award className="h-6 w-6" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium font-sans">{achievement.name}</h4>
                          <p className="text-sm text-muted-foreground font-sans">{achievement.description}</p>
                          
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span>{achievement.progress || 0} / {achievement.requiredValue}</span>
                              <span>{Math.round(((achievement.progress || 0) / achievement.requiredValue) * 100)}%</span>
                            </div>
                            <Progress 
                              value={((achievement.progress || 0) / achievement.requiredValue) * 100} 
                              className="h-1.5" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}