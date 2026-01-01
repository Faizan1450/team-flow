import { useMemo, useState } from 'react';
import { format, addDays, isToday, parseISO } from 'date-fns';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Clock, User, Calendar } from 'lucide-react';
import { calculateDayCapacity, getCapacityPercentage, getCapacityStatus } from '@/lib/capacity';
import { cn } from '@/lib/utils';

export function TeammateView() {
  const { currentUser, teammates, tasks } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Find the teammate profile for current user
  const myProfile = teammates.find((t) => t.id === currentUser?.id);
  
  // Get tasks for current user only
  const myTasks = useMemo(() => {
    return tasks.filter((t) => t.assignedTo === currentUser?.id);
  }, [tasks, currentUser?.id]);

  // Generate next 7 days
  const dates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  }, []);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const capacity = myProfile
    ? calculateDayCapacity(myProfile, selectedDateStr, tasks)
    : null;
  const percentage = capacity ? getCapacityPercentage(capacity) : 0;
  const status = capacity ? getCapacityStatus(capacity) : 'empty';

  const tasksForSelectedDay = myTasks.filter(
    (t) => t.date === selectedDateStr
  );

  const statusColors = {
    low: 'text-capacity-low',
    medium: 'text-capacity-medium',
    high: 'text-capacity-high',
    empty: 'text-muted-foreground',
  };

  if (!myProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Welcome back, {myProfile.name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">
          Here's your schedule for the upcoming days
        </p>
      </div>

      {/* Date Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {dates.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayCapacity = calculateDayCapacity(myProfile, dateStr, tasks);
          const dayStatus = getCapacityStatus(dayCapacity);
          const dayPercentage = getCapacityPercentage(dayCapacity);
          const isSelected = dateStr === selectedDateStr;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(date)}
              className={cn(
                'flex flex-col items-center min-w-[72px] p-3 rounded-lg border transition-all',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 bg-card',
                isToday(date) && !isSelected && 'ring-1 ring-primary/30'
              )}
            >
              <span className="text-xs text-muted-foreground">
                {format(date, 'EEE')}
              </span>
              <span className={cn(
                'text-lg font-semibold',
                isToday(date) && 'text-primary'
              )}>
                {format(date, 'd')}
              </span>
              <div className="w-full h-1 rounded-full bg-muted mt-2 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    dayStatus === 'low' && 'bg-capacity-low',
                    dayStatus === 'medium' && 'bg-capacity-medium',
                    dayStatus === 'high' && 'bg-capacity-high',
                    dayStatus === 'empty' && 'bg-muted-foreground/30'
                  )}
                  style={{ width: `${dayPercentage}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Capacity Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(selectedDate, 'EEEE, MMMM d')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Daily Capacity</span>
                <span className={cn('font-semibold', statusColors[status])}>
                  {capacity?.usedCapacity || 0}h / {capacity?.totalCapacity || 0}h
                </span>
              </div>
              <Progress
                value={percentage}
                className={cn(
                  'h-3',
                  status === 'high' && '[&>div]:bg-capacity-high',
                  status === 'medium' && '[&>div]:bg-capacity-medium',
                  status === 'low' && '[&>div]:bg-capacity-low'
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{tasksForSelectedDay.length}</div>
                <div className="text-xs text-muted-foreground">Tasks</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">
                  {Math.max(0, (capacity?.totalCapacity || 0) - (capacity?.usedCapacity || 0))}h
                </div>
                <div className="text-xs text-muted-foreground">Available</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasks for this day</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksForSelectedDay.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No tasks scheduled for this day</p>
                <p className="text-xs">Enjoy some free time!</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {tasksForSelectedDay.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors animate-slide-in"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{task.title}</h4>
                            <Badge
                              variant={task.status === 'completed' ? 'default' : 'secondary'}
                              className="shrink-0"
                            >
                              {task.status}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                          <Clock className="h-4 w-4" />
                          {task.estimatedHours}h
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        Assigned by {task.assignedByName}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
