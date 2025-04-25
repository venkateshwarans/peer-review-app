'use client';

import { Navbar } from '@/components/layout/Navbar';
import { HistoricalDataSync } from '@/components/admin/HistoricalDataSync';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-3xl font-bold mb-6 font-sans tracking-tight">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-1">
            <HistoricalDataSync />
          </div>
          <div className="md:col-span-1">
            <div className="bg-amber-50 dark:bg-amber-950/10 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <h3 className="text-lg font-bold mb-2">About Historical Data Sync</h3>
              <p className="text-sm mb-3">
                This tool fetches a full year of GitHub PR review data for all users in your organization.
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
