'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface SyncStatus {
  organization: string;
  sync_type: string;
  last_sync_time: string;
  status?: string;
  duration_ms?: number;
  error_message?: string;
}

export default function SyncStatusPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sync status
  const fetchSyncStatus = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('github_sync_status')
        .select('*')
        .order('last_sync_time', { ascending: false });

      if (error) throw error;
      setSyncStatus(data || []);
    } catch (err) {
      console.error('Error fetching sync status:', err);
      setError('Failed to fetch sync status');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger manual sync
  const triggerSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      
      const response = await fetch('/api/cron/sync');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to trigger sync');
      }
      
      // Refresh the status after a short delay
      setTimeout(fetchSyncStatus, 2000);
    } catch (err) {
      console.error('Error triggering sync:', err);
      setError(err instanceof Error ? err.message : 'Failed to trigger sync');
    } finally {
      setIsSyncing(false);
    }
  };

  // Get status badge color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    
    // Set up polling to refresh status every 10 seconds
    const interval = setInterval(fetchSyncStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">GitHub Sync Status</h1>
        <Button 
          onClick={triggerSync} 
          disabled={isSyncing}
        >
          {isSyncing ? 'Syncing...' : 'Trigger Manual Sync'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {syncStatus.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">No sync history found</p>
              </CardContent>
            </Card>
          ) : (
            syncStatus.map((status, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>
                      {status.sync_type.charAt(0).toUpperCase() + status.sync_type.slice(1)} Sync
                    </CardTitle>
                    <Badge className={getStatusColor(status.status)}>
                      {status.status || 'unknown'}
                    </Badge>
                  </div>
                  <CardDescription>
                    Organization: {status.organization}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Last sync: </span>
                      {new Date(status.last_sync_time).toLocaleString()} 
                      ({formatDistanceToNow(new Date(status.last_sync_time), { addSuffix: true })})
                    </div>
                    {status.duration_ms && (
                      <div>
                        <span className="font-medium">Duration: </span>
                        {(status.duration_ms / 1000).toFixed(2)} seconds
                      </div>
                    )}
                    {status.error_message && (
                      <div className="text-red-600">
                        <span className="font-medium">Error: </span>
                        {status.error_message}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
