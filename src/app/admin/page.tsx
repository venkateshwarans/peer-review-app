'use client';

import { Navbar } from '@/components/layout/Navbar';
import { HistoricalDataSync } from '@/components/admin/HistoricalDataSync';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, RefreshCw, Webhook } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-3xl font-bold mb-6 font-sans tracking-tight">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="col-span-3 md:col-span-1">
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
              <CardDescription>Monitor and manage data synchronization</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                View the status of scheduled and manual data syncs, and trigger syncs when needed.
              </p>
              <Button asChild className="w-full">
                <Link href="/admin/sync" className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>Sync Status</span>
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="col-span-3 md:col-span-1">
            <CardHeader>
              <CardTitle>Webhook Setup</CardTitle>
              <CardDescription>Configure GitHub webhooks for real-time updates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                Set up GitHub webhooks to get real-time updates when PRs are created or reviewed.
              </p>
              <Button asChild className="w-full">
                <Link href="/admin/webhooks" className="flex items-center justify-center gap-2">
                  <Webhook className="h-4 w-4" />
                  <span>Webhook Setup</span>
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card className="col-span-3 md:col-span-1">
            <CardHeader>
              <CardTitle>Historical Sync</CardTitle>
              <CardDescription>Fetch historical GitHub data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                Run a full historical sync to fetch a year of GitHub PR review data for all users.
              </p>
              <div className="w-full">
                <HistoricalDataSync />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-1">
            <div className="bg-amber-50 dark:bg-amber-950/10 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <h3 className="text-lg font-bold mb-2">About Data Synchronization</h3>
              <p className="text-sm mb-3">
                This application uses multiple sync strategies to keep data fresh:
              </p>
              <ul className="text-sm list-disc pl-5 mt-1 space-y-1">
                <li><strong>Daily Scheduled Sync:</strong> Runs automatically every day at midnight UTC</li>
                <li><strong>GitHub Webhooks:</strong> Provides real-time updates when PRs are created or reviewed</li>
                <li><strong>Client-side Fallback:</strong> Checks for stale data when users visit the dashboard</li>
                <li><strong>Manual Sync:</strong> Can be triggered from the Sync Status page</li>
              </ul>
            </div>
          </div>
          
          <div className="md:col-span-1">
            <div className="bg-blue-50 dark:bg-blue-950/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-bold mb-2">About Historical Data Sync</h3>
              <p className="text-sm mb-3">
                The historical sync fetches a full year of GitHub PR review data for all users in your organization.
                It populates the achievement database with complete historical data to ensure users get credit
                for all their past contributions.
              </p>
              <p className="text-sm font-medium">
                When to use:
              </p>
              <ul className="text-sm list-disc pl-5 mt-1 space-y-1">
                <li>After initial setup</li>
                <li>When adding new users to the system</li>
                <li>If achievement data seems incomplete</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
