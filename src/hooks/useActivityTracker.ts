'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useGitHub } from '@/lib/github/context';
import { Review } from '@/types/github';

export function useActivityTracker() {
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Review[]>([]);
  const { user, organization } = useGitHub();

  // XP values for different activities
  const XP_VALUES = {
    REVIEW: 10,
    APPROVAL: 15,
    CHANGES_REQUESTED: 20,
    COMMENT: 5
  };

  // Track user activity
  useEffect(() => {
    if (!user || !organization) return;

    const trackActivity = async () => {
      setLoading(true);

      try {
        // Get recent reviews from the last 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { data: recentReviews, error } = await supabase
          .from('github_reviews')
          .select('*')
          .eq('organization', organization)
          .eq('user_id', user.id)
          .gte('submitted_at', oneDayAgo.toISOString())
          .order('submitted_at', { ascending: false });

        if (error) {
          console.error('Error fetching recent activity:', error);
          return;
        }

        // Process recent reviews for XP
        if (recentReviews && recentReviews.length > 0) {
          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('userid', user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching user profile:', profileError);
            return;
          }

          // Calculate XP from recent reviews
          let xpGained = 0;
          for (const review of recentReviews) {
            // Check if XP already awarded for this review
            const { data: existingXP } = await supabase
              .from('activity_logs')
              .select('*')
              .eq('userid', user.id)
              .eq('reviewid', review.id)
              .single();

            if (!existingXP) {
              // Award XP based on review type
              let xpAmount = XP_VALUES.REVIEW;
              
              switch (review.state) {
                case 'APPROVED':
                  xpAmount += XP_VALUES.APPROVAL;
                  break;
                case 'CHANGES_REQUESTED':
                  xpAmount += XP_VALUES.CHANGES_REQUESTED;
                  break;
                case 'COMMENTED':
                  xpAmount += XP_VALUES.COMMENT;
                  break;
              }

              xpGained += xpAmount;

              // Log activity
              await supabase.from('activity_logs').insert({
                userid: user.id,
                reviewid: review.id,
                xpawarded: xpAmount,
                activitytype: review.state,
                timestamp: new Date().toISOString()
              });
            }
          }

          // Update user XP if needed
          if (xpGained > 0 && profile) {
            const newXP = (profile.currentxp || 0) + xpGained;
            
            await supabase
              .from('user_profiles')
              .update({ currentxp: newXP })
              .eq('userid', user.id);
          }

          // Format reviews for display
          setRecentActivity(recentReviews.map(review => ({
            id: review.id,
            user: {
              id: review.user_id,
              login: review.user_login,
              avatar_url: review.user_avatar_url,
              html_url: review.user_html_url
            },
            state: review.state,
            submitted_at: review.submitted_at,
            html_url: review.html_url,
            pull_request_url: review.pull_request_url
          })));
        }
      } catch (err) {
        console.error('Error in activity tracking:', err);
      } finally {
        setLoading(false);
      }
    };

    trackActivity();
    
    // Set up interval to check periodically (every 5 minutes)
    const interval = setInterval(trackActivity, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, organization]);

  return {
    loading,
    recentActivity
  };
}
