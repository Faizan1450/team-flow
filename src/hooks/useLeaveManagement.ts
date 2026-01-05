import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LeaveBalance {
  id: string;
  teammate_id: string;
  year: number;
  total_hours: number;
  used_hours: number;
  pending_hours: number;
  earned_hours: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  teammate_id: string;
  start_date: string;
  end_date: string;
  hours_requested: number;
  is_partial: boolean;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompOffRequest {
  id: string;
  teammate_id: string;
  work_date: string;
  hours_worked: number;
  hours_earned: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// Get leave balance for a specific teammate
export function useLeaveBalance(teammateId: string | undefined) {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['leave-balance', teammateId, currentYear],
    queryFn: async () => {
      if (!teammateId) return null;
      
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('teammate_id', teammateId)
        .eq('year', currentYear)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as LeaveBalance | null;
    },
    enabled: !!user && !!teammateId
  });
}

// Get all leave balances (for owner/leader)
export function useAllLeaveBalances() {
  const { user, isOwner, isLeader } = useAuth();
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['all-leave-balances', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('year', currentYear);
      
      if (error) throw error;
      return data as LeaveBalance[];
    },
    enabled: !!user && (isOwner || isLeader)
  });
}

// Get leave requests for a teammate
export function useLeaveRequests(teammateId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leave-requests', teammateId],
    queryFn: async () => {
      if (!teammateId) return [];
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('teammate_id', teammateId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!user && !!teammateId
  });
}

// Get all leave requests (for owner/leader)
export function useAllLeaveRequests() {
  const { user, isOwner, isLeader } = useAuth();

  return useQuery({
    queryKey: ['all-leave-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!user && (isOwner || isLeader)
  });
}

// Get all pending leave requests (for owner approval)
export function usePendingLeaveRequests() {
  const { user, isOwner, isLeader } = useAuth();

  return useQuery({
    queryKey: ['pending-leave-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!user && (isOwner || isLeader)
  });
}

// Get comp-off requests for a teammate
export function useCompOffRequests(teammateId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['comp-off-requests', teammateId],
    queryFn: async () => {
      if (!teammateId) return [];
      
      const { data, error } = await supabase
        .from('comp_off_requests')
        .select('*')
        .eq('teammate_id', teammateId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CompOffRequest[];
    },
    enabled: !!user && !!teammateId
  });
}

// Get all pending comp-off requests (for owner approval)
export function usePendingCompOffRequests() {
  const { user, isOwner, isLeader } = useAuth();

  return useQuery({
    queryKey: ['pending-comp-off-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comp_off_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as CompOffRequest[];
    },
    enabled: !!user && (isOwner || isLeader)
  });
}

// Create leave request
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      teammateId,
      startDate,
      endDate,
      hoursRequested,
      isPartial,
      reason
    }: {
      teammateId: string;
      startDate: string;
      endDate: string;
      hoursRequested: number;
      isPartial: boolean;
      reason?: string;
    }) => {
      // First, update pending_hours in balance
      const currentYear = new Date(startDate).getFullYear();
      const { error: balanceError } = await supabase
        .from('leave_balances')
        .update({ 
          pending_hours: supabase.rpc ? hoursRequested : hoursRequested 
        })
        .eq('teammate_id', teammateId)
        .eq('year', currentYear);

      // Calculate days_count for backwards compatibility
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          teammate_id: teammateId,
          start_date: startDate,
          end_date: endDate,
          hours_requested: hoursRequested,
          is_partial: isPartial,
          reason,
          days_count: daysCount,
          leave_type: 'general', // Default for hour-based system
          requested_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leave-requests'] });
      toast.success('Leave request submitted');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit leave request: ' + error.message);
    }
  });
}

// Create comp-off request (for working on off day)
export function useCreateCompOffRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      teammateId,
      workDate,
      hoursWorked,
      reason
    }: {
      teammateId: string;
      workDate: string;
      hoursWorked: number;
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('comp_off_requests')
        .insert({
          teammate_id: teammateId,
          work_date: workDate,
          hours_worked: hoursWorked,
          hours_earned: hoursWorked, // 1:1 ratio
          days_earned: hoursWorked / 8, // For backwards compatibility
          reason,
          requested_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comp-off-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-comp-off-requests'] });
      toast.success('Comp-off request submitted');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit comp-off request: ' + error.message);
    }
  });
}

// Approve leave request (owner only)
export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('approve_leave_request', {
        _request_id: requestId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      queryClient.invalidateQueries({ queryKey: ['time-off'] });
      toast.success('Leave request approved');
    },
    onError: (error: Error) => {
      toast.error('Failed to approve leave request: ' + error.message);
    }
  });
}

// Reject leave request (owner only)
export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('reject_leave_request', {
        _request_id: requestId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      toast.success('Leave request rejected');
    },
    onError: (error: Error) => {
      toast.error('Failed to reject leave request: ' + error.message);
    }
  });
}

// Approve comp-off request (owner only)
export function useApproveCompOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('approve_comp_off_request', {
        _request_id: requestId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comp-off-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-comp-off-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      toast.success('Comp-off request approved');
    },
    onError: (error: Error) => {
      toast.error('Failed to approve comp-off request: ' + error.message);
    }
  });
}

// Reject comp-off request (owner only)
export function useRejectCompOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('reject_comp_off_request', {
        _request_id: requestId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comp-off-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-comp-off-requests'] });
      toast.success('Comp-off request rejected');
    },
    onError: (error: Error) => {
      toast.error('Failed to reject comp-off request: ' + error.message);
    }
  });
}

// Assign holiday/off day to teammate (owner only)
export function useAssignHoliday() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      teammateId,
      date,
      hours,
      reason
    }: {
      teammateId: string;
      date: string;
      hours?: number;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('time_off')
        .insert({
          teammate_id: teammateId,
          date,
          hours,
          reason: reason || 'Assigned holiday',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off'] });
      toast.success('Holiday assigned');
    },
    onError: (error: Error) => {
      toast.error('Failed to assign holiday: ' + error.message);
    }
  });
}

// Get current user's teammate ID
export function useCurrentTeammateId() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-teammate-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('teammates')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.id || null;
    },
    enabled: !!user?.id
  });
}

// Credit monthly leave (for testing/manual trigger)
export function useCreditMonthlyLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('credit_monthly_leave');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      queryClient.invalidateQueries({ queryKey: ['all-leave-balances'] });
      toast.success('Monthly leave credited to all teammates');
    },
    onError: (error: Error) => {
      toast.error('Failed to credit monthly leave: ' + error.message);
    }
  });
}
