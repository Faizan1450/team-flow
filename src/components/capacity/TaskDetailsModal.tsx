import { format, parseISO } from 'date-fns';
import { useTeammates } from '@/hooks/useTeammates';
import { useTasks, useDeleteTask, useUpdateTask } from '@/hooks/useTasks';
import { useTimeOff } from '@/hooks/useTimeOff';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Clock, User, Trash2, CheckCircle, PlayCircle, Circle, CalendarOff } from 'lucide-react';
import { calculateDayCapacity, getCapacityPercentage, getRemainingCapacity, getCapacityStatus } from '@/lib/capacity';
import { cn } from '@/lib/utils';
import { Task } from '@/types';

interface TaskDetailsModalProps {
  teammateId: string;
  date: string;
  onClose: () => void;
  onAddTask: () => void;
}

export function TaskDetailsModal({
  teammateId,
  date,
  onClose,
  onAddTask,
}: TaskDetailsModalProps) {
  const { data: teammates = [] } = useTeammates();
  const { data: tasks = [] } = useTasks();
  const { data: timeOff = [] } = useTimeOff();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  
  const teammate = teammates.find((t) => t.id === teammateId);
  const capacity = teammate ? calculateDayCapacity(teammate, date, tasks, timeOff) : null;
  
  // Get approved leave for this date
  const approvedLeave = timeOff.find(
    (t) => t.teammate_id === teammateId && t.date === date && t.is_approved_leave
  );
  
  if (!teammate || !capacity) return null;

  const percentage = getCapacityPercentage(capacity);
  const remaining = getRemainingCapacity(capacity);
  const status = getCapacityStatus(capacity);

  const statusColors = {
    low: 'text-capacity-low',
    medium: 'text-capacity-medium',
    high: 'text-capacity-high',
    empty: 'text-muted-foreground',
  };

  const handleStatusChange = (task: Task) => {
    const nextStatus = task.status === 'pending' ? 'in-progress' : task.status === 'in-progress' ? 'completed' : 'pending';
    updateTask.mutate({ id: task.id, updates: { status: nextStatus } });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in-progress': return <PlayCircle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-capacity-low hover:text-capacity-low hover:bg-capacity-low/10';
      case 'in-progress': return 'text-primary hover:text-primary hover:bg-primary/10';
      default: return 'text-muted-foreground hover:text-primary hover:bg-primary/10';
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{teammate.name}</span>
            <Badge variant="outline">
              {format(parseISO(date), 'EEEE, MMM d')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Capacity Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Daily Capacity</span>
              <span className={cn('font-medium', statusColors[status])}>
                {capacity.usedCapacity}h / {capacity.totalCapacity}h
              </span>
            </div>
            <Progress
              value={percentage}
              className={cn(
                'h-2',
                status === 'high' && '[&>div]:bg-capacity-high',
                status === 'medium' && '[&>div]:bg-capacity-medium',
                status === 'low' && '[&>div]:bg-capacity-low'
              )}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{Math.round(percentage)}% allocated</span>
              <span>{remaining}h remaining</span>
            </div>
          </div>

          {/* Approved Leave Block */}
          {approvedLeave && (
            <div className="p-4 rounded-lg border-2 border-amber-500/50 bg-amber-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <CalendarOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-700 dark:text-amber-300">Approved Leave</span>
                    <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                      {approvedLeave.hours || teammate.daily_capacity}h blocked
                    </Badge>
                  </div>
                  {approvedLeave.reason && (
                    <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
                      {approvedLeave.reason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Task List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Tasks ({capacity.tasks.length})</h4>
              <Button size="sm" variant="outline" onClick={onAddTask}>
                <Plus className="mr-1 h-3 w-3" />
                Add Task
              </Button>
            </div>

            {capacity.tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No tasks assigned for this day</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {capacity.tasks.map((task) => (
                    <div
                      key={task.id}
                        className={cn(
                          "group flex items-start justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors",
                          task.status === 'completed' && "opacity-60",
                          task.status === 'in-progress' && "border-primary/50"
                      )}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-medium text-sm truncate",
                            task.status === 'completed' && "line-through"
                          )}>
                            {task.title}
                          </span>
                          <Badge 
                            variant={task.status === 'in-progress' ? 'outline' : 'secondary'} 
                            className={cn("text-xs", task.status === 'in-progress' && "border-primary text-primary")}
                          >
                            {task.status}
                          </Badge>
                          {task.is_self_assigned && (
                            <Badge variant="secondary" className="text-xs">Self</Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estimated_hours}h
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assigned_by_name}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity", getStatusColor(task.status))}
                          onClick={() => handleStatusChange(task)}
                          title="Click to change status"
                        >
                          {getStatusIcon(task.status)}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteTask.mutate(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
