import { Achievement } from '@/types/gamification';

export const achievements: Achievement[] = [
  // Review Count Achievements
  {
    id: 'review_count_bronze',
    name: 'Review Novice',
    description: 'Complete 10 PR reviews',
    icon: 'medal',
    category: 'review_count',
    tier: 'bronze',
    requiredValue: 10
  },
  {
    id: 'review_count_silver',
    name: 'Review Enthusiast',
    description: 'Complete 50 PR reviews',
    icon: 'medal',
    category: 'review_count',
    tier: 'silver',
    requiredValue: 50
  },
  {
    id: 'review_count_gold',
    name: 'Review Expert',
    description: 'Complete 100 PR reviews',
    icon: 'medal',
    category: 'review_count',
    tier: 'gold',
    requiredValue: 100
  },
  {
    id: 'review_count_platinum',
    name: 'Review Master',
    description: 'Complete 500 PR reviews',
    icon: 'trophy',
    category: 'review_count',
    tier: 'platinum',
    requiredValue: 500
  },

  // Approval Count Achievements
  {
    id: 'approval_count_bronze',
    name: 'Approver Initiate',
    description: 'Approve 5 PRs',
    icon: 'check-circle',
    category: 'approval_count',
    tier: 'bronze',
    requiredValue: 5
  },
  {
    id: 'approval_count_silver',
    name: 'Approver Adept',
    description: 'Approve 25 PRs',
    icon: 'check-circle',
    category: 'approval_count',
    tier: 'silver',
    requiredValue: 25
  },
  {
    id: 'approval_count_gold',
    name: 'Approver Virtuoso',
    description: 'Approve 75 PRs',
    icon: 'check-circle',
    category: 'approval_count',
    tier: 'gold',
    requiredValue: 75
  },

  // Changes Requested Achievements
  {
    id: 'changes_requested_bronze',
    name: 'Code Guardian',
    description: 'Request changes on 5 PRs',
    icon: 'shield',
    category: 'changes_requested_count',
    tier: 'bronze',
    requiredValue: 5
  },
  {
    id: 'changes_requested_silver',
    name: 'Code Sentinel',
    description: 'Request changes on 25 PRs',
    icon: 'shield',
    category: 'changes_requested_count',
    tier: 'silver',
    requiredValue: 25
  },
  {
    id: 'changes_requested_gold',
    name: 'Code Defender',
    description: 'Request changes on 50 PRs',
    icon: 'shield',
    category: 'changes_requested_count',
    tier: 'gold',
    requiredValue: 50
  },

  // Comment Count Achievements
  {
    id: 'comment_count_bronze',
    name: 'Helpful Commenter',
    description: 'Comment on 10 PRs',
    icon: 'message-circle',
    category: 'comment_count',
    tier: 'bronze',
    requiredValue: 10
  },
  {
    id: 'comment_count_silver',
    name: 'Insightful Commenter',
    description: 'Comment on 50 PRs',
    icon: 'message-circle',
    category: 'comment_count',
    tier: 'silver',
    requiredValue: 50
  },
  {
    id: 'comment_count_gold',
    name: 'Prolific Commenter',
    description: 'Comment on 100 PRs',
    icon: 'message-circle',
    category: 'comment_count',
    tier: 'gold',
    requiredValue: 100
  },

  // Streak Achievements
  {
    id: 'streak_bronze',
    name: 'Consistent Reviewer',
    description: 'Review PRs for 5 consecutive days',
    icon: 'flame',
    category: 'streak',
    tier: 'bronze',
    requiredValue: 5
  },
  {
    id: 'streak_silver',
    name: 'Dedicated Reviewer',
    description: 'Review PRs for 10 consecutive days',
    icon: 'flame',
    category: 'streak',
    tier: 'silver',
    requiredValue: 10
  },
  {
    id: 'streak_gold',
    name: 'Unstoppable Reviewer',
    description: 'Review PRs for 20 consecutive days',
    icon: 'flame',
    category: 'streak',
    tier: 'gold',
    requiredValue: 20
  },

  // Cross-Team Achievements
  {
    id: 'cross_team_bronze',
    name: 'Team Player',
    description: 'Review PRs from 3 different repositories',
    icon: 'users',
    category: 'cross_team',
    tier: 'bronze',
    requiredValue: 3
  },
  {
    id: 'cross_team_silver',
    name: 'Collaborator',
    description: 'Review PRs from 5 different repositories',
    icon: 'users',
    category: 'cross_team',
    tier: 'silver',
    requiredValue: 5
  },
  {
    id: 'cross_team_gold',
    name: 'Organization Ambassador',
    description: 'Review PRs from 10 different repositories',
    icon: 'users',
    category: 'cross_team',
    tier: 'gold',
    requiredValue: 10
  },

  // Special Achievements
  {
    id: 'first_review',
    name: 'First Steps',
    description: 'Complete your first PR review',
    icon: 'star',
    category: 'special',
    tier: 'bronze',
    requiredValue: 1
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Review a PR within 30 minutes of assignment',
    icon: 'zap',
    category: 'speed',
    tier: 'silver',
    requiredValue: 1
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Review a PR after 10 PM',
    icon: 'moon',
    category: 'special',
    tier: 'silver',
    requiredValue: 1,
    isSecret: true
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Review PRs on both Saturday and Sunday',
    icon: 'calendar',
    category: 'special',
    tier: 'gold',
    requiredValue: 1,
    isSecret: true
  }
];

export const levels = [
  { id: 1, name: 'Novice Reviewer', requiredXP: 0, icon: 'user' },
  { id: 2, name: 'Apprentice Reviewer', requiredXP: 100, icon: 'user' },
  { id: 3, name: 'Adept Reviewer', requiredXP: 300, icon: 'shield' },
  { id: 4, name: 'Expert Reviewer', requiredXP: 600, icon: 'shield' },
  { id: 5, name: 'Master Reviewer', requiredXP: 1000, icon: 'award' },
  { id: 6, name: 'Grandmaster Reviewer', requiredXP: 1500, icon: 'award' },
  { id: 7, name: 'Legendary Reviewer', requiredXP: 2500, icon: 'crown' },
  { id: 8, name: 'Mythic Reviewer', requiredXP: 4000, icon: 'crown' },
  { id: 9, name: 'Divine Reviewer', requiredXP: 6000, icon: 'star' },
  { id: 10, name: 'Transcendent Reviewer', requiredXP: 10000, icon: 'star' }
];

export const titles = [
  'Code Connoisseur',
  'Bug Hunter',
  'Syntax Sage',
  'Logic Luminary',
  'Algorithm Artisan',
  'Pattern Protector',
  'Refactoring Royalty',
  'Documentation Deity',
  'Test Tactician',
  'Performance Prodigy',
  'Security Sentinel',
  'UI Virtuoso',
  'Database Dynamo',
  'API Architect',
  'Dependency Detective',
  'Git Guardian',
  'Merge Master',
  'Pull Request Prodigy',
  'Commit Connoisseur',
  'Branch Bard'
];
