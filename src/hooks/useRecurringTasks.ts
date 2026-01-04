import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, addDays, parseISO, isBefore, isEqual } from 'date-fns';
import { RecurrenceType } from '@/types';

interface CreateRecurringTaskParams {
  title: string;
  description?: string;
  assigned_to: string;
  estimated_hours: number;
  is_self_assigned: boolean;
  assigned_by_name: string;
  recurrence_type: RecurrenceType;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_dates?: string[];
  start_date: string;
}

function generateDates(params: {
  recurrence_type: RecurrenceType;
  start_date: string;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_dates?: string[];
}): string[] {
  const { recurrence_type, start_date, recurrence_interval = 1, recurrence_end_date, recurrence_dates } = params;
  
  if (recurrence_type === 'none') {
    return [start_date];
  }
  
  if (recurrence_type === 'custom' && recurrence_dates) {
    return recurrence_dates.sort();
  }
  
  if (recurrence_type === 'daily' && recurrence_end_date) {
    const dates: string[] = [];
    let currentDate = parseISO(start_date);
    const endDate = parseISO(recurrence_end_date);
    
    while (isBefore(currentDate, endDate) || isEqual(currentDate, endDate)) {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = addDays(currentDate, recurrence_interval);
    }
    
    return dates;
  }
  
  return [start_date];
}

export function useCreateRecurringTask() {
  const queryClient = useQueryClient();
  const { user, authUser } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateRecurringTaskParams) => {
      const dates = generateDates({
        recurrence_type: params.recurrence_type,
        start_date: params.start_date,
        recurrence_interval: params.recurrence_interval,
        recurrence_end_date: params.recurrence_end_date,
        recurrence_dates: params.recurrence_dates,
      });

      if (dates.length === 0) {
        throw new Error('No dates generated for recurring task');
      }

      // Create parent task (first occurrence)
      const { data: parentTask, error: parentError } = await supabase
        .from('tasks')
        .insert({
          title: params.title,
          description: params.description,
          assigned_to: params.assigned_to,
          assigned_by: user?.id,
          assigned_by_name: params.assigned_by_name || authUser?.profile?.full_name || 'Unknown',
          date: dates[0],
          estimated_hours: params.estimated_hours,
          status: 'pending',
          is_self_assigned: params.is_self_assigned,
          sort_order: 0,
          is_recurring: params.recurrence_type !== 'none',
          recurrence_type: params.recurrence_type,
          recurrence_interval: params.recurrence_interval || 1,
          recurrence_end_date: params.recurrence_end_date,
          recurrence_dates: params.recurrence_dates,
        })
        .select()
        .single();

      if (parentError) throw parentError;

      // Create child tasks for remaining dates
      if (dates.length > 1) {
        const childTasks = dates.slice(1).map((date) => ({
          title: params.title,
          description: params.description,
          assigned_to: params.assigned_to,
          assigned_by: user?.id,
          assigned_by_name: params.assigned_by_name || authUser?.profile?.full_name || 'Unknown',
          date,
          estimated_hours: params.estimated_hours,
          status: 'pending' as const,
          is_self_assigned: params.is_self_assigned,
          sort_order: 0,
          is_recurring: true,
          recurrence_type: params.recurrence_type,
          parent_task_id: parentTask.id,
        }));

        const { error: childError } = await supabase
          .from('tasks')
          .insert(childTasks);

        if (childError) throw childError;
      }

      return { parentTask, totalTasks: dates.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Created ${data.totalTasks} task${data.totalTasks > 1 ? 's' : ''}`);
    },
    onError: (error: Error) => {
      toast.error('Failed to create recurring task: ' + error.message);
    }
  });
}
