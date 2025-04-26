import { NextResponse } from 'next/server';
import { syncHistoricalGitHubData } from '@/lib/supabase/historical-data-sync';
import { syncIncrementalData } from '@/lib/supabase/incremental-sync';
import { supabase } from '@/lib/supabase/client';

// Ensure this route is always dynamically evaluated
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET handler for the cron job
 * This endpoint will be called by Vercel's cron job system every hour
 */
export async function GET(request: Request) {
  try {
    // Check if we have a secret key in the request headers
    // This adds a basic layer of security to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    // Verify the token if it's set in the environment
    if (expectedToken && (!authHeader || authHeader !== `Bearer ${expectedToken}`)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Starting scheduled GitHub data sync...');
    
    // Record the start of the sync
    const syncStartTime = new Date();
    
    // Update the sync status to indicate we're starting
    await supabase
      .from('github_sync_status')
      .upsert({
        organization: process.env.NEXT_PUBLIC_GITHUB_ORG || 'sarasanalytics-com',
        sync_type: 'scheduled',
        last_sync_time: syncStartTime.toISOString(),
        status: 'in_progress'
      });
    
    // Determine if we should do a full sync or incremental sync
    // We'll do a full sync once a day and incremental syncs hourly
    const { data: lastFullSync } = await supabase
      .from('github_sync_status')
      .select('last_sync_time')
      .eq('organization', process.env.NEXT_PUBLIC_GITHUB_ORG || 'sarasanalytics-com')
      .eq('sync_type', 'historical')
      .eq('status', 'completed')
      .order('last_sync_time', { ascending: false })
      .limit(1)
      .single();
    
    const now = new Date();
    const lastFullSyncDate = lastFullSync?.last_sync_time ? new Date(lastFullSync.last_sync_time) : null;
    const daysSinceLastFullSync = lastFullSyncDate 
      ? (now.getTime() - lastFullSyncDate.getTime()) / (1000 * 60 * 60 * 24) 
      : Infinity;
    
    // If it's been more than a day since the last full sync, or if there's never been a full sync
    if (daysSinceLastFullSync >= 1) {
      console.log('Starting full historical sync...');
      await syncHistoricalGitHubData();
    } else {
      console.log('Starting incremental sync...');
      await syncIncrementalData();
    }
    
    // Update the sync status to indicate completion
    await supabase
      .from('github_sync_status')
      .upsert({
        organization: process.env.NEXT_PUBLIC_GITHUB_ORG || 'sarasanalytics-com',
        sync_type: 'scheduled',
        last_sync_time: new Date().toISOString(),
        status: 'completed',
        duration_ms: new Date().getTime() - syncStartTime.getTime()
      });
    
    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Scheduled sync failed:', error);
    
    // Update the sync status to indicate failure
    await supabase
      .from('github_sync_status')
      .upsert({
        organization: process.env.NEXT_PUBLIC_GITHUB_ORG || 'sarasanalytics-com',
        sync_type: 'scheduled',
        last_sync_time: new Date().toISOString(),
        status: 'failed',
        error_message: String(error)
      });
    
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
