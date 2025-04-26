import { NextResponse } from 'next/server';
import { syncIncrementalData } from '@/lib/supabase/incremental-sync';
import { supabase } from '@/lib/supabase/client';
import crypto from 'crypto';

// Ensure this route is always dynamically evaluated
export const dynamic = 'force-dynamic';

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubWebhook(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  
  const sigHashAlg = 'sha256';
  const hmac = crypto.createHmac(sigHashAlg, secret);
  const digest = Buffer.from(
    sigHashAlg + '=' + hmac.update(payload).digest('hex'),
    'utf8'
  );
  const checksum = Buffer.from(signature, 'utf8');
  
  if (checksum.length !== digest.length) return false;
  return crypto.timingSafeEqual(digest, checksum);
}

/**
 * Process GitHub webhook events
 */
export async function POST(request: Request) {
  try {
    // Get the request body as text for signature verification
    const payload = await request.text();
    const body = JSON.parse(payload) as WebhookPayload;
    
    // Get the signature from the headers
    const signature = request.headers.get('x-hub-signature-256');
    
    // Get the webhook secret from environment variables
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    
    // Verify the webhook signature if a secret is set
    if (webhookSecret) {
      const isValid = verifyGitHubWebhook(payload, signature, webhookSecret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }
    
    // Get the event type from the headers
    const eventType = request.headers.get('x-github-event');
    console.log(`Received GitHub webhook: ${eventType}`);
    
    // Process different event types
    switch (eventType) {
      case 'pull_request':
        await handlePullRequestEvent(body as PullRequestPayload);
        break;
      case 'pull_request_review':
        await handlePullRequestReviewEvent(body as PullRequestReviewPayload);
        break;
      case 'push':
        // Only process push events to the default branch
        if (body.ref === `refs/heads/${body.repository?.default_branch}`) {
          await handlePushEvent(body as PushPayload);
        }
        break;
      default:
        // Ignore other event types
        console.log(`Ignoring unhandled event type: ${eventType}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      event: eventType
    });
  } catch (error) {
    console.error('Error processing GitHub webhook:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// Define webhook payload types
interface WebhookPayload {
  ref?: string;
  repository?: {
    name: string;
    default_branch?: string;
  };
}

interface PullRequestPayload extends WebhookPayload {
  action: string;
  pull_request: {
    user: {
      id: number;
      login: string;
    };
    number: number;
  };
  repository: {
    name: string;
  };
}

interface PullRequestReviewPayload extends WebhookPayload {
  action: string;
  review: {
    user: {
      id: number;
      login: string;
    };
    state: string;
  };
  pull_request: {
    number: number;
  };
  repository: {
    name: string;
  };
}

interface PushPayload extends WebhookPayload {
  ref: string;
  repository: {
    name: string;
    default_branch: string;
  };
}

/**
 * Handle pull request events
 */
async function handlePullRequestEvent(payload: PullRequestPayload) {
  try {
    const { action, pull_request, repository } = payload;
    
    // Only process opened, closed, or reopened events
    if (!['opened', 'closed', 'reopened'].includes(action)) {
      return;
    }
    
    // Record the activity in Supabase
    await supabase.from('activity_logs').insert({
      userid: pull_request.user.id,
      login: pull_request.user.login,
      activity_type: `pr_${action}`,
      repository: repository.name,
      pr_number: pull_request.number,
      timestamp: new Date().toISOString()
    });
    
    // Update the last webhook time
    await updateWebhookStatus('pull_request');
    
    // If this is a high-activity repository, trigger an incremental sync
    const isHighActivity = await checkHighActivityRepo(repository.name);
    if (isHighActivity) {
      await syncIncrementalData();
    }
  } catch (error) {
    console.error('Error handling pull request event:', error);
  }
}

/**
 * Handle pull request review events
 */
async function handlePullRequestReviewEvent(payload: PullRequestReviewPayload) {
  try {
    const { action, review, pull_request, repository } = payload;
    
    // Only process submitted reviews
    if (action !== 'submitted') {
      return;
    }
    
    // Record the review activity in Supabase
    await supabase.from('activity_logs').insert({
      userid: review.user.id,
      login: review.user.login,
      activity_type: 'reviewed_pr',
      review_state: review.state,
      repository: repository.name,
      pr_number: pull_request.number,
      timestamp: new Date().toISOString()
    });
    
    // Update the last webhook time
    await updateWebhookStatus('pull_request_review');
    
    // Always trigger an incremental sync for review events
    // as they're critical for achievement tracking
    await syncIncrementalData();
  } catch (error) {
    console.error('Error handling pull request review event:', error);
  }
}

/**
 * Handle push events
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handlePushEvent(payload: PushPayload) {
  try {
    // Update the last webhook time
    await updateWebhookStatus('push');
    
    // Check if we need to sync based on time since last sync
    const shouldSync = await checkSyncNeeded();
    if (shouldSync) {
      await syncIncrementalData();
    }
  } catch (error) {
    console.error('Error handling push event:', error);
  }
}

/**
 * Check if a repository has high activity (more than 5 events in the last 24 hours)
 */
async function checkHighActivityRepo(repoName: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('repository', repoName)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (error) {
      console.error('Error checking repository activity:', error);
      return false;
    }
    
    return count !== null && count > 5;
  } catch (error) {
    console.error('Error checking repository activity:', error);
    return false;
  }
}

/**
 * Check if we need to perform a sync based on time since last sync
 */
async function checkSyncNeeded(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('github_sync_status')
      .select('last_sync_time')
      .or('sync_type.eq.incremental,sync_type.eq.scheduled')
      .order('last_sync_time', { ascending: false })
      .limit(1);
    
    if (!data || data.length === 0) {
      return true;
    }
    
    const lastSyncTime = new Date(data[0].last_sync_time);
    const now = new Date();
    const hoursSinceLastSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);
    
    // Sync if it's been more than 4 hours since the last sync
    return hoursSinceLastSync > 4;
  } catch (error) {
    console.error('Error checking sync needed:', error);
    return true;
  }
}

/**
 * Update the webhook status in Supabase
 */
async function updateWebhookStatus(eventType: string): Promise<void> {
  try {
    await supabase
      .from('github_sync_status')
      .upsert({
        organization: process.env.NEXT_PUBLIC_GITHUB_ORG || 'sarasanalytics-com',
        sync_type: 'webhook',
        event_type: eventType,
        last_sync_time: new Date().toISOString(),
        status: 'completed'
      });
  } catch (error) {
    console.error('Error updating webhook status:', error);
  }
}
