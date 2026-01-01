import { Task, Teammate, DayCapacity, CapacityStatus } from '@/types';
import { parseISO, getDay } from 'date-fns';

export function calculateDayCapacity(
  teammate: Teammate,
  date: string,
  tasks: Task[]
): DayCapacity {
  const dayOfWeek = getDay(parseISO(date));
  const isWorkingDay = teammate.working_days.includes(dayOfWeek);
  
  const dayTasks = tasks.filter(
    (task) => task.assigned_to === teammate.id && task.date === date
  );
  
  const usedCapacity = dayTasks.reduce((sum, task) => sum + task.estimated_hours, 0);
  
  return {
    date,
    totalCapacity: isWorkingDay ? teammate.daily_capacity : 0,
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
