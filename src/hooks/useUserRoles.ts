import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, UserRole, Profile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;

      // Combine roles with profiles
      const usersWithRoles: UserWithRole[] = (roles as UserRole[]).map(role => ({
        user_id: role.user_id,
        role: role.role,
        profile: (profiles as Profile[]).find(p => p.id === role.user_id)
      }));

      return usersWithRoles;
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
