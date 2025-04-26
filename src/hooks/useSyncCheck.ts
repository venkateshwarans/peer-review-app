'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface UseSyncCheckOptions {
  /**
   * Maximum hours since last sync before triggering a new sync
   * Default: 8 hours
   */
  maxStaleness?: number;
  
  /**
   * Whether to automatically trigger a sync if data is stale
   * Default: true
   */
  autoSync?: boolean;
  
  /**
   * Callback function to run when sync is complete
   */
  onSyncComplete?: () => void;
}

interface SyncCheckResult {
  /**
   * Whether a sync is currently in progress
   */
  isSyncing: boolean;
  
  /**
   * Whether the data is considered stale
   */
  isStale: boolean;
  
  /**
   * Hours since the last sync
   */
  hoursSinceLastSync: number | null;
  
  /**
   * Last sync time as an ISO string
   */
  lastSyncTime: string | null;
  
  /**
   * Manually trigger a sync
   */
  triggerSync: () => Promise<void>;
}

/**
 * Hook to check if GitHub data needs to be synced
 * Will automatically trigger a sync if data is stale
 */
export function useSyncCheck({
  maxStaleness = 8,
  autoSync = true,
  onSyncComplete
}: UseSyncCheckOptions = {}): SyncCheckResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [hoursSinceLastSync, setHoursSinceLastSync] = useState<number | null>(null);

  // Check if data is stale
  const checkStaleness = async () => {
    try {
      // Get the last sync time from any sync type (scheduled, incremental, or webhook)
      const { data } = await supabase
        .from('github_sync_status')
        .select('last_sync_time, status')
        .or('sync_type.eq.scheduled,sync_type.eq.incremental,sync_type.eq.webhook')
        .eq('status', 'completed')
        .order('last_sync_time', { ascending: false })
        .limit(1);
      
      if (!data || data.length === 0) {
        setIsStale(true);
        setLastSyncTime(null);
        setHoursSinceLastSync(null);
        return true;
      }
      
      const lastSync = new Date(data[0].last_sync_time);
      const now = new Date();
      const hours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
      
      setLastSyncTime(data[0].last_sync_time);
      setHoursSinceLastSync(hours);
      setIsStale(hours > maxStaleness);
      
      return hours > maxStaleness;
    } catch (error) {
      console.error('Error checking data staleness:', error);
      setIsStale(true);
      return true;
    }
  };
  
  // Trigger a sync
  const triggerSync = async () => {
    try {
      setIsSyncing(true);
      
      // Call the sync API endpoint
      const response = await fetch('/api/cron/sync');
      
      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }
      
      // Wait a moment for the sync to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check staleness again to update the UI
      await checkStaleness();
      
      // Call the onSyncComplete callback if provided
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Error triggering sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Check staleness on mount and auto-sync if needed
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      const stale = await checkStaleness();
      
      // Auto-sync if data is stale and autoSync is enabled
      if (isMounted && stale && autoSync && !isSyncing) {
        triggerSync();
      }
    };
    
    initialize();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  return {
    isSyncing,
    isStale,
    hoursSinceLastSync,
    lastSyncTime,
    triggerSync
  };
}
