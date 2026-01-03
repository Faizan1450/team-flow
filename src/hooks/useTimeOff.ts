import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TimeOff {
  id: string;
  teammate_id: string;
  date: string;
  reason?: string;
  created_by?: string;
  created_at: string;
}

export function useTimeOff() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['time-off'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off')
        .select('*')
        .order('date');
      
      if (error) throw error;
      return data as TimeOff[];
    },
    enabled: !!user
  });
}

export function useAddTimeOff() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ teammateId, date, reason }: { teammateId: string; date: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('time_off')
        .insert({
          teammate_id: teammateId,
          date,
          reason,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off'] });
      toast.success('Off day added');
    },
    onError: (error: Error) => {
      toast.error('Failed to add off day: ' + error.message);
    }
  });
}

export function useRemoveTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_off')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off'] });
      toast.success('Off day removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove off day: ' + error.message);
    }
  });
}

export function useTeammateTimeOff(teammateId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['time-off', teammateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_off')
        .select('*')
        .eq('teammate_id', teammateId)
        .order('date');
      
      if (error) throw error;
      return data as TimeOff[];
    },
    enabled: !!user && !!teammateId
  });
}
