export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: AchievementTier;
  requiredValue: number;
  isSecret?: boolean;
  progress?: number;
  isComplete?: boolean;
  earnedAt?: string;
}

export interface UserAchievement {
  id: string;
  userid: number;
  achievementid: string;
  earnedat: string;
  progress: number;
  iscomplete: boolean;
}

export type AchievementCategory = 
  | 'review_count'
  | 'approval_count'
  | 'changes_requested_count'
  | 'comment_count'
  | 'streak'
  | 'speed'
  | 'cross_team'
  | 'special';

export type AchievementTier = 
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum';

export interface Level {
  id: number;
  name: string;
  requiredXP: number;
  icon: string;
}

export interface UserProfile {
  userid: number;
  login: string;
  name?: string;
  avatarurl: string;
  currentxp: number;
  level: number;
  title?: string;
  joinedat: string;
  lastactive: string;
  streak: number;
  longeststreak: number;
  badges: string[];
  selectedbadges: string[];
  reviewstyle?: ReviewStyle;
}

export interface ReviewStyle {
  thoroughness: number;
  speed: number;
  helpfulness: number;
  consistency: number;
}

export interface TeamChallenge {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  goal: number;
  currentProgress: number;
  teamId: string;
  type: 'review_count' | 'approval_rate' | 'response_time';
  reward: string;
}

export interface Notification {
  id: string;
  userId: number;
  type: 'achievement' | 'level_up' | 'streak' | 'challenge' | 'recognition';
  title: string;
  message: string;
  icon: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}
