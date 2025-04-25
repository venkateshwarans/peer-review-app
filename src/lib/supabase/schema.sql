-- Schema for GitHub PR Review Gamification App

-- Users table to store GitHub users
CREATE TABLE IF NOT EXISTS github_users (
  id BIGINT PRIMARY KEY,
  login TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  html_url TEXT,
  email TEXT,
  organization TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repositories table to store GitHub repositories
CREATE TABLE IF NOT EXISTS github_repositories (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  html_url TEXT,
  description TEXT,
  organization TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pull requests table to store GitHub PRs
CREATE TABLE IF NOT EXISTS github_pull_requests (
  id BIGINT PRIMARY KEY,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  html_url TEXT,
  state TEXT NOT NULL,
  user_id BIGINT REFERENCES github_users(id),
  repository_id BIGINT REFERENCES github_repositories(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE,
  merged_at TIMESTAMP WITH TIME ZONE,
  organization TEXT NOT NULL
);

-- PR reviewers table to store requested reviewers
CREATE TABLE IF NOT EXISTS github_pr_reviewers (
  id SERIAL PRIMARY KEY,
  pull_request_id BIGINT REFERENCES github_pull_requests(id),
  user_id BIGINT REFERENCES github_users(id),
  organization TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pull_request_id, user_id)
);

-- PR reviews table to store review data
CREATE TABLE IF NOT EXISTS github_pr_reviews (
  id BIGINT PRIMARY KEY,
  pull_request_id BIGINT REFERENCES github_pull_requests(id),
  user_id BIGINT REFERENCES github_users(id),
  state TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  html_url TEXT,
  organization TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync status table to track last sync time
CREATE TABLE IF NOT EXISTS github_sync_status (
  id SERIAL PRIMARY KEY,
  organization TEXT NOT NULL,
  last_sync_time TIMESTAMP WITH TIME ZONE NOT NULL,
  sync_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization, sync_type)
);

-- Activity logs table to track user activities for achievement calculations
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  userid INTEGER NOT NULL,
  reviewid INTEGER,
  xpawarded INTEGER DEFAULT 0,
  activitytype TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a unique constraint to activity_logs to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS activity_logs_unique_idx ON activity_logs (userid, reviewid, activitytype) WHERE reviewid IS NOT NULL AND activitytype IS NOT NULL;

-- Drop any foreign key constraints on activity_logs if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'activity_logs_reviewid_fkey' 
    AND table_name = 'activity_logs'
  ) THEN
    ALTER TABLE activity_logs DROP CONSTRAINT activity_logs_reviewid_fkey;
  END IF;
END$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_github_users_updated_at') THEN
    CREATE TRIGGER update_github_users_updated_at
    BEFORE UPDATE ON github_users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_activity_logs_updated_at') THEN
    CREATE TRIGGER update_activity_logs_updated_at
    BEFORE UPDATE ON activity_logs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_github_repositories_updated_at') THEN
    CREATE TRIGGER update_github_repositories_updated_at
    BEFORE UPDATE ON github_repositories
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_github_pull_requests_updated_at') THEN
    CREATE TRIGGER update_github_pull_requests_updated_at
    BEFORE UPDATE ON github_pull_requests
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_github_pr_reviews_updated_at') THEN
    CREATE TRIGGER update_github_pr_reviews_updated_at
    BEFORE UPDATE ON github_pr_reviews
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_github_pr_reviewers_updated_at') THEN
    CREATE TRIGGER update_github_pr_reviewers_updated_at
    BEFORE UPDATE ON github_pr_reviewers
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_github_sync_status_updated_at') THEN
    CREATE TRIGGER update_github_sync_status_updated_at
    BEFORE UPDATE ON github_sync_status
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END$$;

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pull_requests_user_id ON github_pull_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_repository_id ON github_pull_requests(repository_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_created_at ON github_pull_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_pr_reviewers_user_id ON github_pr_reviewers(user_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_user_id ON github_pr_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_pull_request_id ON github_pr_reviews(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_submitted_at ON github_pr_reviews(submitted_at);
-- Create separate organization indexes for each table
CREATE INDEX IF NOT EXISTS idx_users_organization ON github_users(organization);
CREATE INDEX IF NOT EXISTS idx_repositories_organization ON github_repositories(organization);
CREATE INDEX IF NOT EXISTS idx_pull_requests_organization ON github_pull_requests(organization);
CREATE INDEX IF NOT EXISTS idx_pr_reviewers_organization ON github_pr_reviewers(organization);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_organization ON github_pr_reviews(organization);
CREATE INDEX IF NOT EXISTS idx_sync_status_organization ON github_sync_status(organization);
