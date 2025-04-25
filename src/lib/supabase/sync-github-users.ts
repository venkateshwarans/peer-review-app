'use client';

import { supabase } from './client';

/**
 * Safely sync GitHub users to the github_users table
 * This function handles the case where there's no proper conflict constraint
 */
export async function safelySyncGitHubUsers(users: Array<{
  id: number;
  login: string;
  name?: string;
  avatar_url?: string;
  html_url?: string;
  organization?: string;
}>, organization: string = 'sarasanalytics-com'): Promise<void> {
  if (!users || users.length === 0) {
    console.log('No users provided for sync');
    return;
  }

  console.log(`Safely syncing ${users.length} GitHub users...`);
  
  // Process users in batches to avoid too many concurrent requests
  const batchSize = 5;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (user) => {
      try {
        // First check if user exists
        const { data: existingUser, error: checkError } = await supabase
          .from('github_users')
          .select('id')
          .eq('id', user.id)
          .eq('organization', organization)
          .maybeSingle();
        
        if (checkError) {
          console.error(`Error checking if user ${user.login} exists:`, checkError);
          return;
        }
        
        const now = new Date().toISOString();
        
        if (existingUser) {
          // Update existing user
          const { error: updateError } = await supabase
            .from('github_users')
            .update({
              login: user.login,
              name: user.name || user.login,
              avatar_url: user.avatar_url,
              html_url: user.html_url,
              organization,
              updated_at: now
            })
            .eq('id', user.id)
            .eq('organization', organization);
          
          if (updateError) {
            console.error(`Error updating user ${user.login}:`, updateError);
          } else {
            console.log(`User ${user.login} updated successfully`);
          }
        } else {
          // Insert new user
          const { error: insertError } = await supabase
            .from('github_users')
            .insert({
              id: user.id,
              login: user.login,
              name: user.name || user.login,
              avatar_url: user.avatar_url,
              html_url: user.html_url,
              organization,
              created_at: now,
              updated_at: now
            });
          
          if (insertError) {
            console.error(`Error inserting user ${user.login}:`, insertError);
          } else {
            console.log(`User ${user.login} inserted successfully`);
          }
        }
      } catch (error) {
        console.error(`Error syncing user ${user.login}:`, error);
      }
    }));
  }
  
  console.log('GitHub users sync completed');
}
