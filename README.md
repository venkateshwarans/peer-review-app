# Peer Review - GitHub PR Review Gamification

A web application that tracks and gamifies GitHub pull request reviews across an organization's repositories. The app helps encourage team members to participate in code reviews by providing metrics and visualizations.

## Features

- Track PR review assignments across repositories
- Monitor review actions (approvals, change requests, comments)
- View metrics by different time periods (weekly, monthly, quarterly, yearly)
- Leaderboards to encourage participation
- Visualization of review activity

## Tech Stack

- **Frontend**: Next.js with App Router, React, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI
- **State Management**: React Context
- **Data Fetching**: TanStack Query
- **Database**: Supabase
- **Charts**: Recharts
- **Form Handling**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- GitHub Personal Access Token with `repo` and `read:org` scopes
- Supabase account and project

### Environment Setup

Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GITHUB_TOKEN=your_github_personal_access_token
NEXT_PUBLIC_GITHUB_ORG=your_github_organization
```

### Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL scripts in `src/lib/supabase/schema.sql`
4. Run the SQL scripts in `src/lib/supabase/functions.sql`

### Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
