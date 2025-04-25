'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Achievement } from '@/types/gamification';
import { 
  Award, 
  Trophy, 
  Medal, 
  Star, 
  Shield, 
  Zap,
  MessageCircle,
  Users,
  Flame,
  Calendar,
  Moon,
  CheckCircle
} from 'lucide-react';

interface AchievementNotificationProps {
  achievement: Achievement;
  onClose: () => void;
}

export function AchievementNotification({ 
  achievement, 
  onClose 
}: AchievementNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500); // Allow exit animation to complete
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (achievement.icon) {
      case 'trophy':
        return <Trophy className="h-8 w-8 text-yellow-500" />;
      case 'medal':
        return <Medal className="h-8 w-8 text-yellow-500" />;
      case 'star':
        return <Star className="h-8 w-8 text-yellow-500" />;
      case 'shield':
        return <Shield className="h-8 w-8 text-blue-500" />;
      case 'zap':
        return <Zap className="h-8 w-8 text-purple-500" />;
      case 'message-circle':
        return <MessageCircle className="h-8 w-8 text-green-500" />;
      case 'users':
        return <Users className="h-8 w-8 text-blue-500" />;
      case 'flame':
        return <Flame className="h-8 w-8 text-orange-500" />;
      case 'calendar':
        return <Calendar className="h-8 w-8 text-indigo-500" />;
      case 'moon':
        return <Moon className="h-8 w-8 text-indigo-500" />;
      case 'check-circle':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      default:
        return <Award className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getTierColor = () => {
    switch (achievement.tier) {
      case 'bronze':
        return 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700';
      case 'silver':
        return 'bg-slate-100 border-slate-300 dark:bg-slate-800/50 dark:border-slate-600';
      case 'gold':
        return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700';
      case 'platinum':
        return 'bg-cyan-100 border-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-700';
      default:
        return 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700';
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-2 
            ${getTierColor()} max-w-md font-sans`}
        >
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 p-2 bg-white dark:bg-gray-800 rounded-full shadow-inner">
              {getIcon()}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Achievement Unlocked!
              </h3>
              <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                {achievement.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {achievement.description}
              </p>
            </div>
            <button 
              onClick={() => {
                setVisible(false);
                setTimeout(onClose, 500);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              &times;
            </button>
          </div>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-pink-500 dark:bg-pink-400 w-full"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
