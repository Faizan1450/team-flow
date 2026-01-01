import { useMemo, useState } from 'react';
import { format, addDays, isToday } from 'date-fns';
import { useTeammates } from '@/hooks/useTeammates';
import { useTasks } from '@/hooks/useTasks';
import { CapacityCell } from './CapacityCell';
import { TaskDetailsModal } from './TaskDetailsModal';
import { AddTaskModal } from './AddTaskModal';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { calculateDayCapacity, getCapacityStatus } from '@/lib/capacity';
import { cn } from '@/lib/utils';

const VISIBLE_DAYS = 14;

export function CapacityGrid() {
  const { data: teammates = [], isLoading: loadingTeammates } = useTeammates();
  const { data: tasks = [], isLoading: loadingTasks } = useTasks();
  const [startDate, setStartDate] = useState(new Date());
  const [selectedCell, setSelectedCell] = useState<{
    teammateId: string;
    date: string;
  } | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskDefaults, setAddTaskDefaults] = useState<{
    teammateId?: string;
    date?: string;
  }>({});

  const dates = useMemo(() => {
    return Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleCellClick = (teammateId: string, date: string) => {
    setSelectedCell({ teammateId, date });
  };

  const handleAddTaskFromCell = (teammateId: string, date: string) => {
    setAddTaskDefaults({ teammateId, date });
    setShowAddTask(true);
    setSelectedCell(null);
  };

  const navigateDays = (direction: 'prev' | 'next') => {
    setStartDate((prev) => addDays(prev, direction === 'next' ? 7 : -7));
  };

  if (loadingTeammates || loadingTasks) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (teammates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-lg mb-2">No teammates yet</p>
        <p className="text-sm">Add teammates from the Team page to start planning capacity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDays('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDays('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">
            {format(startDate, 'MMM d')} - {format(addDays(startDate, VISIBLE_DAYS - 1), 'MMM d, yyyy')}
          </span>
        </div>
        <Button onClick={() => setShowAddTask(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Task
        </Button>
      </div>

      {/* Grid */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Date Headers */}
            <div className="grid grid-cols-[200px_repeat(14,1fr)] border-b border-border bg-muted/30">
              <div className="p-3 font-medium text-sm text-muted-foreground">
                Team Member
              </div>
              {dates.map((date) => (
                <div
                  key={date.toISOString()}
                  className={cn(
                    'p-2 text-center border-l border-border',
                    isToday(date) && 'bg-primary/5'
                  )}
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {format(date, 'EEE')}
                  </div>
                  <div className={cn(
                    'text-sm font-semibold',
                    isToday(date) && 'text-primary'
                  )}>
                    {format(date, 'd')}
                  </div>
                </div>
              ))}
            </div>

            {/* Teammate Rows */}
            {teammates.map((teammate) => (
              <div
                key={teammate.id}
                className="grid grid-cols-[200px_repeat(14,1fr)] border-b border-border last:border-b-0 hover:bg-muted/10 transition-colors"
              >
                {/* Teammate Info */}
                <div className="p-3 flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(teammate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{teammate.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {teammate.job_role} · {teammate.daily_capacity}h/day
                    </div>
                  </div>
                </div>

                {/* Capacity Cells */}
                {dates.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const capacity = calculateDayCapacity(teammate, dateStr, tasks);
                  const status = getCapacityStatus(capacity);

                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        'p-1 border-l border-border',
                        isToday(date) && 'bg-primary/5'
                      )}
                    >
                      <CapacityCell
                        capacity={capacity}
                        status={status}
                        onClick={() => handleCellClick(teammate.id, dateStr)}
                        isToday={isToday(date)}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-capacity-low/40" />
          <span>Under 70%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-capacity-medium/40" />
          <span>70-90%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-capacity-high/40" />
          <span>Over 90%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <span>Empty / Non-working</span>
        </div>
      </div>

      {/* Modals */}
      {selectedCell && (
        <TaskDetailsModal
          teammateId={selectedCell.teammateId}
          date={selectedCell.date}
          onClose={() => setSelectedCell(null)}
          onAddTask={() => handleAddTaskFromCell(selectedCell.teammateId, selectedCell.date)}
        />
      )}

      <AddTaskModal
        open={showAddTask}
        onClose={() => {
          setShowAddTask(false);
          setAddTaskDefaults({});
        }}
        defaultTeammateId={addTaskDefaults.teammateId}
        defaultDate={addTaskDefaults.date}
      />
    </div>
  );
}
