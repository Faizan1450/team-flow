import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LeaveBalance {
  id: string;
  teammate_id: string;
  year: number;
  casual_leave_balance: number;
  sick_leave_balance: number;
  comp_off_balance: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  teammate_id: string;
  leave_type: 'casual' | 'sick' | 'comp_off';
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CompOffRequest {
  id: string;
  teammate_id: string;
  work_date: string;
  hours_worked: number;
  days_earned: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// Fetch all leave balances
export function useLeaveBalances() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leave-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .order('year', { ascending: false });
      
      if (error) throw error;
      return data as LeaveBalance[];
    },
    enabled: !!user
  });
}

// Fetch leave balance for a specific teammate
export function useTeammateLeaveBalance(teammateId: string) {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['leave-balance', teammateId, currentYear],
    queryFn: async () => {
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

// Fetch all leave requests
export function useLeaveRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!user
  });
}

// Fetch all comp-off requests
export function useCompOffRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['comp-off-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comp_off_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CompOffRequest[];
    },
    enabled: !!user
  });
}

// Create leave request
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      teammateId: string;
      leaveType: 'casual' | 'sick' | 'comp_off';
      startDate: string;
      endDate: string;
      daysCount: number;
      reason?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('leave_requests')
        .insert({
          teammate_id: data.teammateId,
          leave_type: data.leaveType,
          start_date: data.startDate,
          end_date: data.endDate,
          days_count: data.daysCount,
          reason: data.reason,
          requested_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Leave request submitted');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit leave request: ' + error.message);
    }
  });
}

// Approve leave request
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
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['time-off'] });
      toast.success('Leave request approved');
    },
    onError: (error: Error) => {
      toast.error('Failed to approve leave request: ' + error.message);
    }
  });
}

// Reject leave request
export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Leave request rejected');
    },
    onError: (error: Error) => {
      toast.error('Failed to reject leave request: ' + error.message);
    }
  });
}

// Create comp-off request
export function useCreateCompOffRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      teammateId: string;
      workDate: string;
      hoursWorked: number;
      daysEarned: number;
      reason: string;
    }) => {
      const { data: result, error } = await supabase
        .from('comp_off_requests')
        .insert({
          teammate_id: data.teammateId,
          work_date: data.workDate,
          hours_worked: data.hoursWorked,
          days_earned: data.daysEarned,
          reason: data.reason,
          requested_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comp-off-requests'] });
      toast.success('Comp-off request submitted');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit comp-off request: ' + error.message);
    }
  });
}

// Approve comp-off request
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
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast.success('Comp-off request approved');
    },
    onError: (error: Error) => {
      toast.error('Failed to approve comp-off request: ' + error.message);
    }
  });
}

// Reject comp-off request
export function useRejectCompOffRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('comp_off_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comp-off-requests'] });
      toast.success('Comp-off request rejected');
    },
    onError: (error: Error) => {
      toast.error('Failed to reject comp-off request: ' + error.message);
    }
  });
}

// Initialize leave balance for a teammate
export function useInitializeLeaveBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teammateId: string) => {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('leave_balances')
        .upsert({
          teammate_id: teammateId,
          year: currentYear,
          casual_leave_balance: 12,
          sick_leave_balance: 12,
          comp_off_balance: 0
        }, { onConflict: 'teammate_id,year' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    }
  });
}
