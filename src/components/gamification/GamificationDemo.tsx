'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AchievementNotification } from './AchievementNotification';
import { achievements } from '@/data/achievements';
import { Achievement } from '@/types/gamification';
import { 
  Award, 
  Trophy, 
  Medal, 
  Shield, 
  Zap, 
  CheckCircle, 
  Flame, 
  Users, 
  Target, 
  Crown 
} from 'lucide-react';

export function GamificationDemo() {
  const setActiveTab = useState('overview')[1];
  const [notification, setNotification] = useState<Achievement | null>(null);

  // Demo function to show achievement notification
  const showRandomAchievement = () => {
    const randomIndex = Math.floor(Math.random() * achievements.length);
    setNotification(achievements[randomIndex]);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-sans tracking-tight">Gamification Features</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="achievements" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="achievements" className="font-sans">Achievements</TabsTrigger>
            <TabsTrigger value="levels" className="font-sans">Levels</TabsTrigger>
            <TabsTrigger value="challenges" className="font-sans">Challenges</TabsTrigger>
            <TabsTrigger value="rewards" className="font-sans">Rewards</TabsTrigger>
          </TabsList>
          
          <TabsContent value="achievements" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold font-sans tracking-tight">Achievement System</h3>
              <Button onClick={showRandomAchievement} className="font-sans">
                Demo Achievement
              </Button>
            </div>
            
            <p className="text-muted-foreground font-sans">
              Achievements reward users for specific actions and milestones in their PR review journey.
              They provide visual recognition and XP rewards.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* Bronze Achievement */}
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Medal className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-medium font-sans">Review Novice</h4>
                    <p className="text-sm text-muted-foreground font-sans">Complete 10 PR reviews</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-sans">7 / 10</span>
                    <span className="text-xs font-sans">70%</span>
                  </div>
                  <Progress value={70} className="h-1.5" />
                </div>
              </div>
              
              {/* Silver Achievement */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="font-medium font-sans">Code Sentinel</h4>
                    <p className="text-sm text-muted-foreground font-sans">Request changes on 25 PRs</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-sans">12 / 25</span>
                    <span className="text-xs font-sans">48%</span>
                  </div>
                  <Progress value={48} className="h-1.5" />
                </div>
              </div>
              
              {/* Gold Achievement */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="font-medium font-sans">Review Expert</h4>
                    <p className="text-sm text-muted-foreground font-sans">Complete 100 PR reviews</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-sans">100 / 100</span>
                    <span className="text-xs font-sans">100%</span>
                  </div>
                  <Progress value={100} className="h-1.5" />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium mb-3 font-sans">Achievement Categories</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-pink-200 bg-pink-50 dark:bg-pink-900/20 dark:border-pink-800">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-pink-500" />
                    <span className="font-medium font-sans">Review Count</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-sans">
                    Achievements for completing PR reviews
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <span className="font-medium font-sans">Code Quality</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-sans">
                    Achievements for requesting changes
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
                  <div className="flex items-center space-x-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <span className="font-medium font-sans">Streaks</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-sans">
                    Achievements for consistent reviewing
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    <span className="font-medium font-sans">Collaboration</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-sans">
                    Achievements for cross-team reviews
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="levels" className="space-y-4">
            <h3 className="text-lg font-semibold font-sans tracking-tight">Level System</h3>
            <p className="text-muted-foreground font-sans">
              Users gain XP through reviews and achievements, leveling up as they progress.
              Higher levels unlock titles and recognition.
            </p>
            
            <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-lg border border-pink-200 dark:border-pink-800 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium font-sans">Current Level</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700">
                      Level 4
                    </Badge>
                    <span className="text-sm font-sans">Expert Reviewer</span>
                  </div>
                </div>
                <Shield className="h-8 w-8 text-pink-500" />
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-sans">Level 4</span>
                  <span className="text-sm font-sans">Level 5</span>
                </div>
                <Progress value={65} className="h-2" />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground font-sans">600 XP</span>
                  <span className="text-xs text-muted-foreground font-sans">850 / 1000 XP</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium mb-3 font-sans">Level Progression</h4>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mr-3">
                    <span className="font-semibold text-amber-800 dark:text-amber-300 font-sans">1</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h5 className="font-medium font-sans">Novice Reviewer</h5>
                      <Badge variant="outline" className="ml-2 text-xs">0 XP</Badge>
                    </div>
                    <Progress value={100} className="h-1.5 mt-1" />
                  </div>
                </div>
                
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mr-3">
                    <span className="font-semibold text-amber-800 dark:text-amber-300 font-sans">2</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h5 className="font-medium font-sans">Apprentice Reviewer</h5>
                      <Badge variant="outline" className="ml-2 text-xs">100 XP</Badge>
                    </div>
                    <Progress value={100} className="h-1.5 mt-1" />
                  </div>
                </div>
                
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mr-3">
                    <span className="font-semibold text-slate-800 dark:text-slate-300 font-sans">3</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h5 className="font-medium font-sans">Adept Reviewer</h5>
                      <Badge variant="outline" className="ml-2 text-xs">300 XP</Badge>
                    </div>
                    <Progress value={100} className="h-1.5 mt-1" />
                  </div>
                </div>
                
                <div className="p-3 rounded-lg border border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-900/20 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mr-3">
                    <span className="font-semibold text-slate-800 dark:text-slate-300 font-sans">4</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h5 className="font-medium font-sans">Expert Reviewer</h5>
                      <Badge variant="outline" className="ml-2 text-xs">600 XP</Badge>
                    </div>
                    <Progress value={65} className="h-1.5 mt-1" />
                  </div>
                </div>
                
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center opacity-70">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mr-3">
                    <span className="font-semibold text-yellow-800 dark:text-yellow-300 font-sans">5</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h5 className="font-medium font-sans">Master Reviewer</h5>
                      <Badge variant="outline" className="ml-2 text-xs">1000 XP</Badge>
                    </div>
                    <Progress value={0} className="h-1.5 mt-1" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="challenges" className="space-y-4">
            <h3 className="text-lg font-semibold font-sans tracking-tight">Team Challenges</h3>
            <p className="text-muted-foreground font-sans">
              Collaborative goals for teams to work together and improve code review participation.
              Complete challenges to earn team rewards and recognition.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium font-sans">Weekly Review Sprint</h4>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 font-sans">
                  Complete 50 team reviews this week
                </p>
                <div className="mt-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-sans">32 / 50 reviews</span>
                    <span className="text-xs font-sans">64%</span>
                  </div>
                  <Progress value={64} className="h-1.5" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-sans">Ends in 2 days</span>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 font-sans">Team Reward: 500 XP</span>
                </div>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium font-sans">Cross-Team Collaboration</h4>
                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-300">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 font-sans">
                  Review 20 PRs from other teams this month
                </p>
                <div className="mt-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-sans">15 / 20 reviews</span>
                    <span className="text-xs font-sans">75%</span>
                  </div>
                  <Progress value={75} className="h-1.5" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-sans">Ends in 12 days</span>
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400 font-sans">Team Reward: Special Badge</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium mb-3 font-sans">Upcoming Challenges</h4>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mr-3">
                    <Zap className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium font-sans">Quick Response Challenge</h5>
                    <p className="text-xs text-muted-foreground font-sans">
                      Respond to PR review requests within 4 hours
                    </p>
                  </div>
                  <Badge variant="outline">Starts in 5 days</Badge>
                </div>
                
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mr-3">
                    <Target className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium font-sans">Bug Hunter Challenge</h5>
                    <p className="text-xs text-muted-foreground font-sans">
                      Find and report bugs during code reviews
                    </p>
                  </div>
                  <Badge variant="outline">Starts in 2 weeks</Badge>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="rewards" className="space-y-4">
            <h3 className="text-lg font-semibold font-sans tracking-tight">Rewards & Recognition</h3>
            <p className="text-muted-foreground font-sans">
              Earn badges, titles, and recognition for your code review contributions.
              Showcase your expertise and achievements to the team.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-medium font-sans">Titles & Badges</h4>
                <p className="text-sm text-muted-foreground mt-1 font-sans">
                  Earn special titles and badges to display on your profile
                </p>
                
                <div className="mt-4 space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                      <Crown className="h-4 w-4 text-yellow-500" />
                    </div>
                    <span className="font-medium font-sans">Code Connoisseur</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="font-medium font-sans">Security Sentinel</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-purple-500" />
                    </div>
                    <span className="font-medium font-sans">Performance Prodigy</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium font-sans">Monthly Recognition</h4>
                <p className="text-sm text-muted-foreground mt-1 font-sans">
                  Top reviewers are featured on the team dashboard
                </p>
                
                <div className="mt-4 space-y-3">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mr-3">
                      <span className="font-semibold text-pink-800 dark:text-pink-300 font-sans">1</span>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium font-sans">Top Reviewer</h5>
                      <p className="text-xs text-muted-foreground font-sans">
                        Most reviews completed this month
                      </p>
                    </div>
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  </div>
                  
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                      <span className="font-semibold text-blue-800 dark:text-blue-300 font-sans">2</span>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium font-sans">Quality Champion</h5>
                      <p className="text-xs text-muted-foreground font-sans">
                        Most valuable review comments
                      </p>
                    </div>
                    <Award className="h-5 w-5 text-blue-500" />
                  </div>
                  
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                      <span className="font-semibold text-green-800 dark:text-green-300 font-sans">3</span>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium font-sans">Team Player</h5>
                      <p className="text-xs text-muted-foreground font-sans">
                        Most cross-team reviews
                      </p>
                    </div>
                    <Users className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {notification && (
        <AchievementNotification 
          achievement={notification} 
          onClose={() => setNotification(null)} 
        />
      )}
    </Card>
  );
}
