'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navbar } from '@/components/layout/Navbar';
import { GamificationDemo } from '@/components/gamification/GamificationDemo';
import { TeamChallenges } from '@/components/gamification/TeamChallenges';
import { ReviewerProfile } from '@/components/profile/ReviewerProfile';

export default function GamificationPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-3xl font-bold mb-6 font-sans tracking-tight">Gamified!!!</h1>
        
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="mb-4">
            <TabsTrigger value="profile" className="font-sans">My Profile</TabsTrigger>
            <TabsTrigger value="achievements" className="font-sans">Achievements</TabsTrigger>
            <TabsTrigger value="challenges" className="font-sans">Team Challenges</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-6">
            <ReviewerProfile />
          </TabsContent>
          
          <TabsContent value="achievements" className="space-y-6">
            <GamificationDemo />
          </TabsContent>
          
          <TabsContent value="challenges" className="space-y-6">
            <TeamChallenges />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
