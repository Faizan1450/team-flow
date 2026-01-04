import { useMemo, useState } from 'react';
import { format, addDays, isToday } from 'date-fns';
import { useTeammates } from '@/hooks/useTeammates';
import { useTasks } from '@/hooks/useTasks';
import { useTimeOff } from '@/hooks/useTimeOff';
import { useAllUsersWithRoles } from '@/hooks/useUserRoles';
import { CapacityCell } from './CapacityCell';
import { TaskDetailsModal } from './TaskDetailsModal';
import { AddTaskModal } from './AddTaskModal';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight, Loader2, Calendar } from 'lucide-react';
import { calculateDayCapacity, getCapacityStatus } from '@/lib/capacity';
import { cn } from '@/lib/utils';

const DAYS_BEFORE = 2;
const DAYS_AFTER = 5;
const VISIBLE_DAYS = DAYS_BEFORE + DAYS_AFTER + 1; // 2 previous + today + 5 future = 8 days

export function CapacityGrid() {
  const { data: allTeammates = [], isLoading: loadingTeammates } = useTeammates();
  const { data: tasks = [], isLoading: loadingTasks } = useTasks();
  const { data: timeOffDays = [] } = useTimeOff();
  const { data: usersWithRoles = [] } = useAllUsersWithRoles();
  const [startDate, setStartDate] = useState(() => addDays(new Date(), -DAYS_BEFORE));
  const [selectedCell, setSelectedCell] = useState<{
    teammateId: string;
    date: string;
  } | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskDefaults, setAddTaskDefaults] = useState<{
    teammateId?: string;
    date?: string;
  }>({});

  // Filter out teammates who are leaders (they shouldn't appear in capacity grid)
  const teammates = useMemo(() => {
    const leaderUserIds = usersWithRoles
      .filter(ur => ur.role === 'leader')
      .map(ur => ur.user_id);
    
    return allTeammates.filter(tm => !tm.user_id || !leaderUserIds.includes(tm.user_id));
  }, [allTeammates, usersWithRoles]);

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
      <Card className="flex items-center justify-center h-64 shadow-card rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading capacity data...</p>
        </div>
      </Card>
    );
  }

  if (teammates.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center h-64 text-muted-foreground shadow-card rounded-2xl">
        <Calendar className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-lg mb-1 font-medium">No teammates yet</p>
        <p className="text-sm">Add teammates from the Team page to start planning capacity</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header Controls */}
      <Card className="p-3 md:p-4 shadow-card rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-1 bg-secondary rounded-xl p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateDays('prev')}
                className="h-8 w-8 md:h-9 md:w-9 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateDays('next')}
                className="h-8 w-8 md:h-9 md:w-9 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
              <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(startDate, 'MMM d')} - {format(addDays(startDate, VISIBLE_DAYS - 1), 'MMM d')}
              </span>
            </div>
          </div>
          <Button onClick={() => setShowAddTask(true)} className="rounded-xl shadow-lg shadow-primary/25 w-full sm:w-auto text-sm">
            <Plus className="mr-2 h-4 w-4" />
            Assign Task
          </Button>
        </div>
      </Card>

      {/* Grid */}
      <Card className="shadow-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[600px] md:min-w-max">
            {/* Date Headers */}
            <div className="grid border-b border-border bg-secondary/50" style={{ gridTemplateColumns: `140px md:220px repeat(${VISIBLE_DAYS}, minmax(70px, 1fr))` }}>
              <div className="p-2 md:p-4 font-semibold text-xs md:text-sm text-muted-foreground">
                Team Member
              </div>
              {dates.map((date) => (
                <div
                  key={date.toISOString()}
                  className={cn(
                    'p-2 md:p-3 text-center border-l border-border/50',
                    isToday(date) && 'bg-primary/5'
                  )}
                >
                  <div className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase">
                    {format(date, 'EEE')}
                  </div>
                  <div className={cn(
                    'text-sm md:text-lg font-bold',
                    isToday(date) && 'text-primary'
                  )}>
                    {format(date, 'd')}
                  </div>
                </div>
              ))}
            </div>

            {/* Teammate Rows */}
            {teammates.map((teammate, index) => (
              <div
                key={teammate.id}
                className={cn(
                  "grid border-b border-border/50 last:border-b-0 transition-colors",
                  "hover:bg-secondary/30"
                )}
                style={{ gridTemplateColumns: `140px md:220px repeat(${VISIBLE_DAYS}, minmax(70px, 1fr))` }}
              >
                {/* Teammate Info */}
                <div className="p-2 md:p-4 flex items-center gap-2 md:gap-3">
                  <Avatar className="h-8 w-8 md:h-10 md:w-10 ring-2 ring-border shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs md:text-sm font-semibold">
                      {getInitials(teammate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 hidden sm:block">
                    <div className="text-xs md:text-sm font-semibold truncate">{teammate.name}</div>
                    <div className="text-[10px] md:text-xs text-muted-foreground truncate">
                      {teammate.job_role} · {teammate.daily_capacity}h
                    </div>
                  </div>
                </div>

                {/* Capacity Cells */}
                {dates.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const capacity = calculateDayCapacity(teammate, dateStr, tasks, timeOffDays);
                  const status = getCapacityStatus(capacity);

                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        'p-1 md:p-1.5 border-l border-border/50',
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
      </Card>

      {/* Legend */}
      <Card className="p-3 md:p-4 shadow-card rounded-2xl">
        <div className="flex flex-wrap items-center gap-3 md:gap-8 text-xs md:text-sm">
          <span className="text-muted-foreground font-medium w-full sm:w-auto">Capacity:</span>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded-md bg-capacity-low/30 border border-capacity-low/50" />
            <span>&lt;70%</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded-md bg-capacity-medium/30 border border-capacity-medium/50" />
            <span>70-90%</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded-md bg-capacity-high/30 border border-capacity-high/50" />
            <span>&gt;90%</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded-md bg-muted border border-border" />
            <span>Empty</span>
          </div>
        </div>
      </Card>

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
