import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Teammate } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useTeammates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teammates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teammates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Teammate[];
    },
    enabled: !!user
  });
}

export function useMyTeammateProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-teammate-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('teammates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Teammate | null;
    },
    enabled: !!user
  });
}

export function useCreateTeammate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (teammate: Omit<Teammate, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('teammates')
        .insert({
          ...teammate,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teammates'] });
      toast.success('Teammate added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add teammate: ' + error.message);
    }
  });
}

export function useUpdateTeammate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Teammate> }) => {
      const { data, error } = await supabase
        .from('teammates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teammates'] });
      toast.success('Teammate updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update teammate: ' + error.message);
    }
  });
}

export function useDeleteTeammate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teammates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teammates'] });
      toast.success('Teammate removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove teammate: ' + error.message);
    }
  });
}
