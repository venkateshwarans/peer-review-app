-- Gamification Schema for GitHub PR Review App

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User profiles table for gamification data
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  userid BIGINT NOT NULL REFERENCES github_users(id),
  login TEXT NOT NULL,
  name TEXT,
  avatarurl TEXT,
  currentxp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  title TEXT,
  joinedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  lastactive TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  streak INTEGER NOT NULL DEFAULT 0,
  longeststreak INTEGER NOT NULL DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  selectedbadges TEXT[] DEFAULT '{}',
  reviewstyle JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(userid)
);

-- Achievements table to store user achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid BIGINT NOT NULL REFERENCES github_users(id),
  achievementid TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  iscomplete BOOLEAN NOT NULL DEFAULT FALSE,
  earnedat TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(userid, achievementid)
);

-- Activity logs for tracking user actions and XP awards
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  userid BIGINT NOT NULL REFERENCES github_users(id),
  reviewid BIGINT REFERENCES github_pr_reviews(id),
  xpawarded INTEGER NOT NULL DEFAULT 0,
  activitytype TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team challenges table
CREATE TABLE IF NOT EXISTS team_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  startdate TIMESTAMP WITH TIME ZONE NOT NULL,
  enddate TIMESTAMP WITH TIME ZONE NOT NULL,
  goal INTEGER NOT NULL,
  currentprogress INTEGER NOT NULL DEFAULT 0,
  teamid TEXT NOT NULL,
  challengetype TEXT NOT NULL,
  reward TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team challenge participants
CREATE TABLE IF NOT EXISTS challenge_participants (
  id SERIAL PRIMARY KEY,
  challengeid UUID NOT NULL REFERENCES team_challenges(id),
  userid BIGINT NOT NULL REFERENCES github_users(id),
  joinedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  contribution INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(challengeid, userid)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userid BIGINT NOT NULL REFERENCES github_users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  isread BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User recognition (peer nominations)
CREATE TABLE IF NOT EXISTS user_recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fromuserid BIGINT NOT NULL REFERENCES github_users(id),
  touserid BIGINT NOT NULL REFERENCES github_users(id),
  message TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create triggers for updated_at columns
CREATE OR REPLACE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_achievements_updated_at
BEFORE UPDATE ON user_achievements
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_activity_logs_updated_at
BEFORE UPDATE ON activity_logs
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_team_challenges_updated_at
BEFORE UPDATE ON team_challenges
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_challenge_participants_updated_at
BEFORE UPDATE ON challenge_participants
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_recognitions_updated_at
BEFORE UPDATE ON user_recognitions
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_userid ON user_profiles(userid);
CREATE INDEX IF NOT EXISTS idx_user_achievements_userid ON user_achievements(userid);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievementid ON user_achievements(achievementid);
CREATE INDEX IF NOT EXISTS idx_activity_logs_userid ON activity_logs(userid);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_team_challenges_teamid ON team_challenges(teamid);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challengeid ON challenge_participants(challengeid);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_userid ON challenge_participants(userid);
CREATE INDEX IF NOT EXISTS idx_notifications_userid ON notifications(userid);
CREATE INDEX IF NOT EXISTS idx_user_recognitions_fromuserid ON user_recognitions(fromuserid);
CREATE INDEX IF NOT EXISTS idx_user_recognitions_touserid ON user_recognitions(touserid);
