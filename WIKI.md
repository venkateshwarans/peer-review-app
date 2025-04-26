# GitHub PR Review - Developer Wiki

## Overview

GitHub PR Review is a web application built to track and gamify GitHub pull request reviews for organizations. It helps teams encourage participation in code reviews through gamification mechanics like achievements, XP, and leaderboards.

## Architecture

The application is built with:
- **Next.js**: App Router for frontend and API routes
- **Supabase**: For database and authentication
- **GitHub API**: For fetching PR and review data

## Data Synchronization

The application uses a hybrid approach to synchronize data between GitHub and Supabase:

### 1. Daily Scheduled Sync

A cron job runs daily at midnight UTC to sync all GitHub data to Supabase. This ensures that even without user activity, the data stays fresh.

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync?token=$CRON_SECRET_TOKEN",
    "schedule": "0 0 * * *"
  }]
}
```

### 2. GitHub Webhooks

Real-time updates are handled via GitHub webhooks. When PR events occur, GitHub sends a notification to our webhook endpoint, which triggers an incremental sync.

Supported events:
- `pull_request` (opened, closed, reopened)
- `pull_request_review` (submitted)
- `push` (to default branch)
Includes security verification for webhook payloads
3. Client-side Fallback System
Added a useSyncCheck hook that detects stale data when users visit
Automatically triggers sync when data is older than 8 hours
Shows sync status and allows manual refresh in the dashboard
4. Admin Interface Improvements
Added a sync status page to monitor sync operations
Created a webhook setup guide with security key generation
Redesigned the admin dashboard for better navigation
Key Files Created/Modified
Webhook Handler: /api/webhooks/github/route.ts
Incremental Sync: /lib/supabase/incremental-sync.ts
Sync Status Page: /app/admin/sync/page.tsx
Webhook Setup Guide: /app/admin/webhooks/page.tsx
Dashboard Integration: Updated with sync status indicators