import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AppRole } from '@/types';

export interface PendingRegistration {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export function usePendingRegistrations() {
  const { isOwner } = useAuth();

  return useQuery({
    queryKey: ['pending-registrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PendingRegistration[];
    },
    enabled: isOwner,
    refetchInterval: 30000, // Refresh every 30 seconds for new registrations
  });
}

export function useApproveRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      pendingId, 
      role, 
      dailyCapacity = 8, 
      workingDays = [1, 2, 3, 4, 5] 
    }: { 
      pendingId: string; 
      role: AppRole; 
      dailyCapacity?: number; 
      workingDays?: number[]; 
    }) => {
      const { error } = await supabase.rpc('approve_registration', {
        _pending_id: pendingId,
        _role: role,
        _daily_capacity: dailyCapacity,
        _working_days: workingDays,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['teammates'] });
      toast.success('Registration approved');
    },
    onError: (error: Error) => {
      toast.error('Failed to approve registration: ' + error.message);
    }
  });
}

export function useRejectRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pendingId: string) => {
      const { error } = await supabase.rpc('reject_registration', {
        _pending_id: pendingId,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
      toast.success('Registration rejected');
    },
    onError: (error: Error) => {
      toast.error('Failed to reject registration: ' + error.message);
    }
  });
}
