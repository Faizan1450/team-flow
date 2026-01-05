import { Task, Teammate, DayCapacity, CapacityStatus } from '@/types';
import { parseISO, getDay } from 'date-fns';
import { TimeOff } from '@/hooks/useTimeOff';

export function calculateDayCapacity(
  teammate: Teammate,
  date: string,
  tasks: Task[],
  timeOffDays?: TimeOff[]
): DayCapacity {
  const dayOfWeek = getDay(parseISO(date));
  const isWorkingDay = teammate.working_days.includes(dayOfWeek);
  
  // Check if this is a manual off day or approved leave
  const timeOffEntry = timeOffDays?.find(
    (to) => to.teammate_id === teammate.id && to.date === date
  );
  
  const hasTimeOff = !!timeOffEntry;
  // Check if it's a partial leave (has hours specified)
  const leaveHours = timeOffEntry?.hours ?? null;
  // Check if it's a full day off (no hours specified or hours >= daily capacity)
  const isFullDayOff = hasTimeOff && (leaveHours === null || leaveHours >= teammate.daily_capacity);
  
  const dayTasks = tasks.filter(
    (task) => task.assigned_to === teammate.id && task.date === date
  );
  
  const taskHours = dayTasks.reduce((sum, task) => sum + task.estimated_hours, 0);
  
  // Calculate total capacity - only 0 for non-working days or full day off
  let totalCapacity = 0;
  if (!isWorkingDay) {
    totalCapacity = 0;
  } else if (isFullDayOff) {
    // Full day off - no capacity
    totalCapacity = 0;
  } else {
    // Normal working day or partial leave - keep full daily capacity
    totalCapacity = teammate.daily_capacity;
  }
  
  // Used capacity = task hours + leave hours (for partial leave)
  const leaveUsedHours = (hasTimeOff && !isFullDayOff && leaveHours !== null) ? leaveHours : 0;
  const usedCapacity = taskHours + leaveUsedHours;
  
  return {
    date,
    totalCapacity,
    usedCapacity,
    tasks: dayTasks,
  };
}

export function getCapacityStatus(capacity: DayCapacity): CapacityStatus {
  if (capacity.totalCapacity === 0) {
    return 'empty';
  }
  
  const percentage = (capacity.usedCapacity / capacity.totalCapacity) * 100;
  
  if (percentage === 0) {
    return 'empty';
  } else if (percentage <= 70) {
    return 'low';
  } else if (percentage <= 90) {
    return 'medium';
  } else {
    return 'high';
  }
}

export function getRemainingCapacity(capacity: DayCapacity): number {
  return Math.max(0, capacity.totalCapacity - capacity.usedCapacity);
}

export function getCapacityPercentage(capacity: DayCapacity): number {
  if (capacity.totalCapacity === 0) return 0;
  return Math.min(100, (capacity.usedCapacity / capacity.totalCapacity) * 100);
}

export function canAssignTask(
  capacity: DayCapacity,
  estimatedHours: number
): { allowed: boolean; warning?: string } {
  const remaining = getRemainingCapacity(capacity);
  
  if (capacity.totalCapacity === 0) {
    return {
      allowed: false,
      warning: 'This is not a working day for this teammate.',
    };
  }
  
  if (estimatedHours > remaining) {
    const overload = estimatedHours - remaining;
    return {
      allowed: false,
      warning: `This would overload by ${overload}h. Only ${remaining}h available.`,
    };
  }
  
  const newPercentage = ((capacity.usedCapacity + estimatedHours) / capacity.totalCapacity) * 100;
  
  if (newPercentage > 90) {
    return {
      allowed: true,
      warning: `This will bring capacity to ${Math.round(newPercentage)}%. Consider spreading work.`,
    };
  }
  
  return { allowed: true };
}

export function formatCapacityDisplay(capacity: DayCapacity): string {
  if (capacity.totalCapacity === 0) {
    return 'Off';
  }
  return `${capacity.usedCapacity}/${capacity.totalCapacity}h`;
}
