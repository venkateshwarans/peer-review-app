'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { syncHistoricalGitHubData, needsHistoricalSync } from '@/lib/supabase/historical-data-sync';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export function HistoricalDataSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNeeded, setSyncNeeded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Check if historical sync is needed
  React.useEffect(() => {
    async function checkSyncStatus() {
      try {
        const needed = await needsHistoricalSync();
        setSyncNeeded(needed);
        
        // Get last sync time from localStorage
        const lastSync = localStorage.getItem('historicalSyncTime');
        if (lastSync) {
          setLastSyncTime(lastSync);
        }
      } catch (err) {
        console.error('Error checking sync status:', err);
      }
    }
    
    checkSyncStatus();
  }, []);

  // Start historical data sync
  const startSync = async () => {
    setIsSyncing(true);
    setProgress(0);
    setError(null);
    setStatus('Starting historical data sync...');
    
    try {
      // Set up progress updates
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        // Simulate progress updates since we can't get real-time updates from the sync process
        if (currentProgress < 95) {
          currentProgress += Math.random() * 5;
          setProgress(Math.min(currentProgress, 95));
        }
      }, 2000);
      
      // Start the sync
      await syncHistoricalGitHubData();
      
      // Sync completed
      clearInterval(progressInterval);
      setProgress(100);
      setStatus('Historical data sync completed successfully!');
      setSyncNeeded(false);
      
      // Save sync time to localStorage
      const now = new Date().toISOString();
      localStorage.setItem('historicalSyncTime', now);
      setLastSyncTime(now);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setStatus('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Historical Data Sync
        </CardTitle>
        <CardDescription>
          Sync GitHub data for the past year to populate all achievement data
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {lastSyncTime && (
          <div className="text-sm text-muted-foreground">
            Last sync: {new Date(lastSyncTime).toLocaleString()}
          </div>
        )}
        
        {isSyncing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{status}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {error && (
          <div className="bg-destructive/10 p-3 rounded-md flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
        
        {!isSyncing && progress === 100 && (
          <div className="bg-green-50 dark:bg-green-950/10 p-3 rounded-md flex items-start gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>Sync completed successfully! All achievement data has been updated.</div>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={startSync} 
          disabled={isSyncing}
          variant={syncNeeded ? "default" : "outline"}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : syncNeeded ? (
            'Sync Historical Data (Recommended)'
          ) : (
            'Sync Historical Data'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
