import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, UserRole, Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserWithRoles {
  user_id: string;
  roles: AppRole[];
  profile?: Profile;
}

interface UserWithRole {
  user_id: string;
  role: AppRole;
  profile?: Profile;
}

export function useAllUsersWithRoles() {
  const { isOwner } = useAuth();

  return useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      // Get all profiles (all registered users)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;

      // Group roles by user and include profile
      const usersMap = new Map<string, UserWithRoles>();
      
      // First add all profiles
      (profiles as Profile[]).forEach(profile => {
        usersMap.set(profile.id, {
          user_id: profile.id,
          roles: [],
          profile,
        });
      });
      
      // Then add roles to each user
      (roles as UserRole[]).forEach(role => {
        const user = usersMap.get(role.user_id);
        if (user) {
          user.roles.push(role.role);
        }
      });

      // Convert to array and flatten - one entry per role per user
      // Users without roles get 'teammate' as default display
      const result: UserWithRole[] = [];
      usersMap.forEach(user => {
        if (user.roles.length === 0) {
          result.push({
            user_id: user.user_id,
            role: 'teammate',
            profile: user.profile,
          });
        } else {
          user.roles.forEach(role => {
            result.push({
              user_id: user.user_id,
              role,
              profile: user.profile,
            });
          });
        }
      });

      return result;
    },
    enabled: isOwner
  });
}

export function useAddUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Role assigned');
    },
    onError: (error: Error) => {
      toast.error('Failed to assign role: ' + error.message);
    }
  });
}

export function useRemoveUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('Role removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove role: ' + error.message);
    }
  });
}

export function usePromoteToLeader() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      dailyCapacity = 8, 
      workingDays = [1, 2, 3, 4, 5] 
    }: { 
      userId: string; 
      dailyCapacity?: number; 
      workingDays?: number[]; 
    }) => {
      const { error } = await supabase.rpc('promote_to_leader', {
        _user_id: userId,
        _daily_capacity: dailyCapacity,
        _working_days: workingDays,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['teammates'] });
      toast.success('User promoted to leader');
    },
    onError: (error: Error) => {
      toast.error('Failed to promote user: ' + error.message);
    }
  });
}

export function useDemoteToTeammate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      dailyCapacity = 8, 
      workingDays = [1, 2, 3, 4, 5] 
    }: { 
      userId: string; 
      dailyCapacity?: number; 
      workingDays?: number[]; 
    }) => {
      const { error } = await supabase.rpc('demote_to_teammate', {
        _user_id: userId,
        _daily_capacity: dailyCapacity,
        _working_days: workingDays,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['teammates'] });
      toast.success('User demoted to teammate');
    },
    onError: (error: Error) => {
      toast.error('Failed to demote user: ' + error.message);
    }
  });
}
