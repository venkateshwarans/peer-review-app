# GitHub PR Review - Developer Wiki

## 1. Tech Stack

### Frontend
- **Next.js 14+**: React framework with App Router
- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: Component library based on Radix UI
- **Recharts**: Charting library for visualizations
- **React Hook Form**: Form handling
- **Zod**: Schema validation

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **Supabase**: PostgreSQL database and authentication
- **Octokit**: GitHub API client
- **Vercel**: Hosting and serverless functions

### DevOps
- **Vercel Cron Jobs**: Scheduled tasks
- **GitHub Webhooks**: Real-time event processing
- **Environment Variables**: Configuration management

## 2. Database Schema

### Tables

#### `users`
- `id`: Primary key (GitHub user ID)
- `login`: GitHub username
- `name`: Full name
- `avatar_url`: Profile image URL
- `html_url`: GitHub profile URL
- `xp`: Experience points
- `level`: Current level
- `created_at`: Timestamp
- `updated_at`: Timestamp

#### `achievements`
- `id`: Primary key
- `user_id`: Foreign key to users
- `achievement_type`: Type of achievement
- `achievement_data`: JSON data about the achievement
- `unlocked_at`: When the achievement was earned
- `created_at`: Timestamp

#### `activity_logs`
- `id`: Primary key
- `userid`: GitHub user ID
- `login`: GitHub username
- `activity_type`: Type of activity (review, comment, etc.)
- `repository`: Repository name
- `pr_number`: Pull request number
- `review_state`: State of review (approved, changes_requested, etc.)
- `timestamp`: When the activity occurred

#### `sync_status`
- `id`: Primary key
- `sync_type`: Type of sync (full, incremental, webhook)
- `status`: Success or error
- `start_time`: When sync started
- `end_time`: When sync completed
- `duration_ms`: Time taken in milliseconds
- `records_processed`: Number of records processed
- `error_message`: Error details if failed

#### `webhook_events`
- `id`: Primary key
- `event_type`: GitHub event type
- `payload_summary`: Summary of webhook payload
- `processed_at`: When the event was processed
- `status`: Processing status

## 3. API Endpoints

### Public API Routes

#### `/api/github/users`
- **GET**: Fetch all GitHub users with their stats
- **Query Parameters**: `timeRange` (week, month, quarter, year)

#### `/api/github/achievements`
- **GET**: Fetch achievements for all users or a specific user
- **Query Parameters**: `userId` (optional)

#### `/api/github/metrics`
- **GET**: Fetch review metrics
- **Query Parameters**: `timeRange`, `userId` (optional)

### Protected API Routes

#### `/api/cron/sync`
- **GET**: Trigger a full or incremental sync
- **Query Parameters**: `token` (for authentication), `type` (full or incremental)
- **Security**: Protected by `CRON_SECRET_TOKEN`

#### `/api/webhooks/github`
- **POST**: Process GitHub webhook events
- **Headers**: `x-hub-signature-256` (for verification)
- **Security**: Verifies payload signature using `GITHUB_WEBHOOK_SECRET`

## 4. Sync Strategies

### Full Historical Sync

A complete sync of all historical data from GitHub to Supabase.

**Implementation**: `syncHistoricalGitHubData()` in `historical-data-sync.ts`

**Process**:
1. Fetch all organization members
2. Fetch all repositories
3. For each repository, fetch all pull requests
4. For each PR, fetch all reviews
5. Process and store data in Supabase

**When Used**:
- Initial application setup
- Manual trigger from admin page
- Fallback when incremental sync fails
- Weekly full refresh (configurable)

### Incremental Sync

Syncs only data that has changed since the last successful sync.

**Implementation**: `syncIncrementalData()` in `incremental-sync.ts`

**Process**:
1. Get timestamp of last successful sync
2. Fetch only PRs and reviews created or updated since that time
3. Process and update data in Supabase

**When Used**:
- Daily scheduled cron job
- After webhook events
- When client detects stale data

### Real-time Webhook Sync

Processes GitHub events as they happen and updates specific data.

**Implementation**: Webhook handler in `/api/webhooks/github/route.ts`

**Supported Events**:
- `pull_request`: When PRs are opened, closed, or reopened
- `pull_request_review`: When reviews are submitted
- `push`: When code is pushed to the default branch

**Process**:
1. Verify webhook signature
2. Process event based on type
3. Update activity logs
4. Trigger incremental sync if needed

### Client-side Staleness Check

Checks if data is stale when users visit the application.

**Implementation**: `useSyncCheck()` hook in `useSyncCheck.ts`

**Process**:
1. Check timestamp of last sync
2. If older than threshold (default: 8 hours), mark as stale
3. Optionally trigger automatic sync
4. Provide manual sync button

## 5. Gaps and Limitations

### Technical Limitations

1. **GitHub API Rate Limits**
   - 5,000 requests per hour limit on GitHub API
   - Large organizations may hit this limit during full syncs
   - Mitigation: Incremental syncs and throttling

2. **Vercel Hobby Plan Constraints**
   - Limited to one cron job per day
   - Function execution timeout of 10 seconds
   - Mitigation: Efficient incremental syncs and client-side fallbacks

3. **Data Freshness Trade-offs**
   - Real-time data requires webhooks to be properly configured
   - First visitor after long periods may experience delay
   - Mitigation: Hybrid sync approach with fallbacks

### Feature Gaps

1. **Advanced Analytics**
   - Limited historical trend analysis
   - No predictive metrics for review workload
   - Opportunity: Add time-series analytics and forecasting

2. **User Customization**
   - Fixed achievement criteria
   - No personalized goals or challenges
   - Opportunity: Add customizable goals and team challenges

3. **Integration Limitations**
   - Only supports GitHub (no GitLab, Bitbucket)
   - No integration with project management tools
   - Opportunity: Expand to additional platforms

4. **Notification System**
   - In-app notifications only
   - No email or Slack integration
   - Opportunity: Add external notification channels

### Security Considerations

1. **GitHub Token Scope**
   - Current implementation uses a single token
   - Recommendation: Use fine-grained tokens with minimal permissions

2. **Webhook Security**
   - Relies on secret verification only
   - Recommendation: Add IP allowlisting for GitHub webhook sources

## 6. Environment Setup

```
# Required Environment Variables
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_GITHUB_TOKEN=your-github-token
NEXT_PUBLIC_GITHUB_ORG=your-github-org
CRON_SECRET_TOKEN=your-cron-secret
GITHUB_WEBHOOK_SECRET=your-webhook-secret
```

## 7. Deployment Guide

1. **Deploy to Vercel**
   - Connect GitHub repository
   - Configure environment variables
   - Deploy application

2. **Set Up Supabase**
   - Create tables using provided schema
   - Set up row-level security policies
   - Configure authentication

3. **Configure GitHub Webhook**
   - Go to GitHub organization settings
   - Add webhook pointing to `/api/webhooks/github`
   - Generate and configure secret key
   - Select events: Pull requests, Pull request reviews, Pushes
   - Save webhook

4. **Verify Setup**
   - Check webhook deliveries in GitHub
   - Verify data in Supabase
   - Test client-side sync check
Dashboard Integration: Updated with sync status indicators