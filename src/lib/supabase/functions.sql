-- Stored procedures for GitHub PR Review Gamification App

-- Count PRs opened by each user in a date range
CREATE OR REPLACE FUNCTION count_prs_by_user(org TEXT, start_date TIMESTAMP WITH TIME ZONE, end_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE(user_id BIGINT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.user_id, 
    COUNT(pr.id)::BIGINT
  FROM 
    github_pull_requests pr
  WHERE 
    pr.organization = org
    AND pr.created_at >= start_date
    AND pr.created_at <= end_date
  GROUP BY 
    pr.user_id;
END;
$$ LANGUAGE plpgsql;

-- Get assigned PRs for each user in a date range
CREATE OR REPLACE FUNCTION get_assigned_prs(org TEXT, start_date TIMESTAMP WITH TIME ZONE, end_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE(user_id BIGINT, pull_request_id BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rev.user_id, 
    rev.pull_request_id
  FROM 
    github_pr_reviewers rev
  JOIN 
    github_pull_requests pr ON rev.pull_request_id = pr.id
  WHERE 
    rev.organization = org
    AND pr.created_at >= start_date
    AND pr.created_at <= end_date;
END;
$$ LANGUAGE plpgsql;

-- Count open PRs against each user
CREATE OR REPLACE FUNCTION count_open_prs_against_user(org TEXT)
RETURNS TABLE(user_id BIGINT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rev.user_id, 
    COUNT(DISTINCT rev.pull_request_id)::BIGINT
  FROM 
    github_pr_reviewers rev
  JOIN 
    github_pull_requests pr ON rev.pull_request_id = pr.id
  WHERE 
    rev.organization = org
    AND pr.state = 'open'
  GROUP BY 
    rev.user_id;
END;
$$ LANGUAGE plpgsql;

-- Count pending PRs for each user (assigned but not reviewed)
CREATE OR REPLACE FUNCTION count_pending_prs_by_user(org TEXT)
RETURNS TABLE(user_id BIGINT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rev.user_id, 
    COUNT(DISTINCT rev.pull_request_id)::BIGINT
  FROM 
    github_pr_reviewers rev
  JOIN 
    github_pull_requests pr ON rev.pull_request_id = pr.id
  LEFT JOIN 
    github_pr_reviews r ON r.pull_request_id = pr.id AND r.user_id = rev.user_id
  WHERE 
    rev.organization = org
    AND pr.state = 'open'
    AND r.id IS NULL
  GROUP BY 
    rev.user_id;
END;
$$ LANGUAGE plpgsql;

-- Get review counts by state for each user in a date range
CREATE OR REPLACE FUNCTION get_review_counts_by_state(org TEXT, start_date TIMESTAMP WITH TIME ZONE, end_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE(
  user_id BIGINT, 
  approved_count BIGINT, 
  changes_requested_count BIGINT, 
  commented_count BIGINT, 
  total_prs_reviewed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH review_counts AS (
    SELECT 
      r.user_id,
      COUNT(CASE WHEN r.state = 'APPROVED' THEN 1 END)::BIGINT AS approved,
      COUNT(CASE WHEN r.state = 'CHANGES_REQUESTED' THEN 1 END)::BIGINT AS changes_requested,
      COUNT(CASE WHEN r.state = 'COMMENTED' THEN 1 END)::BIGINT AS commented,
      COUNT(DISTINCT r.pull_request_id)::BIGINT AS total_prs
    FROM 
      github_pr_reviews r
    WHERE 
      r.organization = org
      AND r.submitted_at >= start_date
      AND r.submitted_at <= end_date
    GROUP BY 
      r.user_id
  )
  SELECT 
    rc.user_id,
    rc.approved,
    rc.changes_requested,
    rc.commented,
    rc.total_prs
  FROM 
    review_counts rc;
END;
$$ LANGUAGE plpgsql;
