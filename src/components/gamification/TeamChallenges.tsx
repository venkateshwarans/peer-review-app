'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Users, 
  Clock, 
  Target, 
  Award,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useGitHub } from '@/lib/github/context';
import { TeamChallenge } from '@/types/gamification';

export function TeamChallenges() {
  const [challenges, setChallenges] = useState<TeamChallenge[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<TeamChallenge[]>([]);
  const [upcomingChallenges, setUpcomingChallenges] = useState<TeamChallenge[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<TeamChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization } = useGitHub();

  useEffect(() => {
    if (!organization) return;

    const fetchChallenges = async () => {
      setLoading(true);
      try {
        // In a real implementation, we would filter by teamId based on the user's team
        const { data, error } = await supabase
          .from('team_challenges')
          .select('*')
          .order('endDate', { ascending: true });

        if (error) {
          console.error('Error fetching team challenges:', error);
          return;
        }

        if (data) {
          const now = new Date();
          
          // Format challenges
          const formattedChallenges = data.map(challenge => ({
            id: challenge.id,
            name: challenge.name,
            description: challenge.description,
            startDate: challenge.startDate,
            endDate: challenge.endDate,
            goal: challenge.goal,
            currentProgress: challenge.currentProgress,
            teamId: challenge.teamId,
            type: challenge.type as 'review_count' | 'approval_rate' | 'response_time',
            reward: challenge.reward,
            isActive: challenge.isActive
          }));
          
          setChallenges(formattedChallenges);
          
          // Filter challenges by status
          setActiveChallenges(formattedChallenges.filter(c => 
            new Date(c.startDate) <= now && 
            new Date(c.endDate) >= now &&
            c.isActive
          ));
          
          setUpcomingChallenges(formattedChallenges.filter(c => 
            new Date(c.startDate) > now &&
            c.isActive
          ));
          
          setCompletedChallenges(formattedChallenges.filter(c => 
            new Date(c.endDate) < now || 
            !c.isActive
          ));
        }
      } catch (err) {
        console.error('Error in challenge fetching:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [organization]);

  // For demo purposes, let's create some sample challenges if none exist
  useEffect(() => {
    if (!loading && challenges.length === 0) {
      const now = new Date();
      const oneWeekLater = new Date();
      oneWeekLater.setDate(now.getDate() + 7);
      
      const twoWeeksLater = new Date();
      twoWeeksLater.setDate(now.getDate() + 14);
      
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(now.getMonth() + 1);
      
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      
      const sampleChallenges: TeamChallenge[] = [
        {
          id: '1',
          name: 'Weekly Review Sprint',
          description: 'Complete 50 team reviews this week',
          startDate: now.toISOString(),
          endDate: oneWeekLater.toISOString(),
          goal: 50,
          currentProgress: 32,
          teamId: 'engineering',
          type: 'review_count',
          reward: '500 XP for all participants'
        },
        {
          id: '2',
          name: 'Cross-Team Collaboration',
          description: 'Review 20 PRs from other teams this month',
          startDate: now.toISOString(),
          endDate: oneMonthLater.toISOString(),
          goal: 20,
          currentProgress: 15,
          teamId: 'engineering',
          type: 'review_count',
          reward: 'Special Badge'
        },
        {
          id: '3',
          name: 'Quick Response Challenge',
          description: 'Respond to PR review requests within 4 hours',
          startDate: oneWeekLater.toISOString(),
          endDate: twoWeeksLater.toISOString(),
          goal: 15,
          currentProgress: 0,
          teamId: 'engineering',
          type: 'response_time',
          reward: '300 XP + Speed Badge'
        },
        {
          id: '4',
          name: 'Bug Hunter Challenge',
          description: 'Find and report bugs during code reviews',
          startDate: twoWeeksLater.toISOString(),
          endDate: oneMonthLater.toISOString(),
          goal: 10,
          currentProgress: 0,
          teamId: 'engineering',
          type: 'review_count',
          reward: 'Bug Hunter Badge'
        },
        {
          id: '5',
          name: 'Perfect Approval Rate',
          description: 'Maintain 90% approval rate for the week',
          startDate: yesterday.toISOString(),
          endDate: yesterday.toISOString(),
          goal: 90,
          currentProgress: 95,
          teamId: 'engineering',
          type: 'approval_rate',
          reward: 'Quality Champion Badge'
        }
      ];
      
      setChallenges(sampleChallenges);
      setActiveChallenges(sampleChallenges.filter(c => c.id === '1' || c.id === '2'));
      setUpcomingChallenges(sampleChallenges.filter(c => c.id === '3' || c.id === '4'));
      setCompletedChallenges(sampleChallenges.filter(c => c.id === '5'));
    }
  }, [loading, challenges.length]);

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'review_count':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'approval_rate':
        return <Award className="h-5 w-5 text-green-500" />;
      case 'response_time':
        return <Clock className="h-5 w-5 text-purple-500" />;
      default:
        return <Target className="h-5 w-5 text-pink-500" />;
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Ended';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min(100, Math.round((current / goal) * 100));
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-sans tracking-tight">Team Challenges</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] animate-pulse bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-sans tracking-tight">Team Challenges</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeChallenges.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 font-sans tracking-tight">Active Challenges</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeChallenges.map(challenge => (
                <div 
                  key={challenge.id}
                  className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium font-sans">{challenge.name}</h4>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300">
                      Active
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 font-sans">
                    Let&apos;s make this month&apos;s code quality the best it&apos;s ever been!
                  </p>
                  <div className="mt-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-sans">
                        {challenge.currentProgress} / {challenge.goal} {challenge.type === 'approval_rate' ? '%' : ''}
                      </span>
                      <span className="text-xs font-sans">
                        {getProgressPercentage(challenge.currentProgress, challenge.goal)}%
                      </span>
                    </div>
                    <Progress value={getProgressPercentage(challenge.currentProgress, challenge.goal)} className="h-1.5" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-sans flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {getTimeRemaining(challenge.endDate)}
                    </span>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 font-sans flex items-center">
                      <Trophy className="h-3 w-3 mr-1" />
                      {challenge.reward}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {upcomingChallenges.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 font-sans tracking-tight">Upcoming Challenges</h3>
            <div className="space-y-3">
              {upcomingChallenges.map(challenge => (
                <div 
                  key={challenge.id}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center"
                >
                  <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mr-3">
                    {getChallengeIcon(challenge.type)}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium font-sans">{challenge.name}</h5>
                    <p className="text-xs text-muted-foreground font-sans">
                      {challenge.description}
                    </p>
                  </div>
                  <Badge variant="outline">
                    Starts in {Math.ceil((new Date(challenge.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {completedChallenges.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 font-sans tracking-tight">Completed Challenges</h3>
            <div className="space-y-3">
              {completedChallenges.map(challenge => {
                const isSuccessful = challenge.currentProgress >= challenge.goal;
                
                return (
                  <div 
                    key={challenge.id}
                    className={`p-3 rounded-lg border flex items-center ${
                      isSuccessful 
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${
                      isSuccessful 
                        ? 'bg-white dark:bg-gray-800' 
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {isSuccessful 
                        ? <Trophy className="h-5 w-5 text-yellow-500" /> 
                        : getChallengeIcon(challenge.type)
                      }
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium font-sans">{challenge.name}</h5>
                      <div className="flex items-center">
                        <Progress 
                          value={getProgressPercentage(challenge.currentProgress, challenge.goal)} 
                          className="h-1.5 w-24 mr-2" 
                        />
                        <span className="text-xs text-muted-foreground font-sans">
                          {challenge.currentProgress}/{challenge.goal} 
                          {challenge.type === 'approval_rate' ? '%' : ''}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={isSuccessful ? 'text-green-600' : 'text-gray-500'}>
                      {isSuccessful ? 'Completed' : 'Failed'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {activeChallenges.length === 0 && upcomingChallenges.length === 0 && completedChallenges.length === 0 && (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2 font-sans">No Challenges Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4 font-sans">
              {`Your team hasn't created any challenges yet. Challenges help motivate your team to improve code review participation.`}
            </p>
            <Button className="font-sans">
              Create Challenge
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
