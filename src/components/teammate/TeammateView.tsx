import { useMemo, useState } from 'react';
import { format, addDays, isToday } from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/contexts/AuthContext';
import { useMyTeammateProfile } from '@/hooks/useTeammates';
import { useTasks, useCreateTask, useUpdateTask, useUpdateTaskOrder } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Clock, User, Calendar, Plus, GripVertical, CheckCircle, Loader2, PlayCircle, Circle } from 'lucide-react';
import { calculateDayCapacity, getCapacityPercentage, getCapacityStatus } from '@/lib/capacity';
import { cn } from '@/lib/utils';
import { Task } from '@/types';

interface SortableTaskCardProps {
  task: Task;
  onMarkComplete: (task: Task) => void;
}

function SortableTaskCard({ task, onMarkComplete }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed': return <CheckCircle className="h-5 w-5" />;
      case 'in-progress': return <PlayCircle className="h-5 w-5" />;
      default: return <Circle className="h-5 w-5" />;
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'completed': return 'text-capacity-low';
      case 'in-progress': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadgeVariant = () => {
    switch (task.status) {
      case 'completed': return 'default' as const;
      case 'in-progress': return 'outline' as const;
      default: return 'secondary' as const;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-4 rounded-xl border-2 border-border/50 bg-card shadow-card transition-all",
        isDragging && "opacity-50 shadow-elevated",
        task.status === 'completed' && "opacity-60",
        task.status === 'in-progress' && "border-primary/50"
      )}
    >
      <div className="flex items-start gap-3">
        <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className={cn("font-semibold truncate", task.status === 'completed' && "line-through")}>{task.title}</h4>
                <Badge variant={getStatusBadgeVariant()} className={cn("shrink-0 rounded-lg", task.status === 'in-progress' && "border-primary text-primary")}>{task.status}</Badge>
                {task.is_self_assigned && <Badge variant="outline" className="shrink-0 rounded-lg">Self</Badge>}
              </div>
              {task.description && <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-lg", getStatusColor())} onClick={() => onMarkComplete(task)} title="Click to change status">
                {getStatusIcon()}
              </Button>
              <Badge variant="secondary" className="rounded-lg"><Clock className="h-3 w-3 mr-1" />{task.estimated_hours}h</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {task.is_self_assigned ? 'Self-assigned' : `Assigned by ${task.assigned_by_name}`}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TeammateView() {
  const { authUser } = useAuth();
  const { data: myProfile, isLoading: loadingProfile } = useMyTeammateProfile();
  const { data: allTasks = [], isLoading: loadingTasks } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateTaskOrder = useUpdateTaskOrder();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskHours, setNewTaskHours] = useState('');

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const myTasks = useMemo(() => myProfile ? allTasks.filter((t) => t.assigned_to === myProfile.id) : [], [allTasks, myProfile?.id]);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)), []);
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const capacity = myProfile ? calculateDayCapacity(myProfile, selectedDateStr, allTasks) : null;
  const percentage = capacity ? getCapacityPercentage(capacity) : 0;
  const status = capacity ? getCapacityStatus(capacity) : 'empty';
  const tasksForSelectedDay = useMemo(() => myTasks.filter((t) => t.date === selectedDateStr).sort((a, b) => a.sort_order - b.sort_order), [myTasks, selectedDateStr]);

  const statusColors = { low: 'text-capacity-low', medium: 'text-capacity-medium', high: 'text-capacity-high', empty: 'text-muted-foreground' };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tasksForSelectedDay.findIndex((t) => t.id === active.id);
      const newIndex = tasksForSelectedDay.findIndex((t) => t.id === over.id);
      const reorderedTasks = arrayMove(tasksForSelectedDay, oldIndex, newIndex);
      updateTaskOrder.mutate(reorderedTasks.map((task, index) => ({ id: task.id, sort_order: index })));
    }
  };

  const handleStatusChange = (task: Task) => {
    const nextStatus = task.status === 'pending' ? 'in-progress' : task.status === 'in-progress' ? 'completed' : 'pending';
    updateTask.mutate({ id: task.id, updates: { status: nextStatus } });
  };

  const handleAddSelfTask = async () => {
    if (!myProfile || !newTaskTitle || !newTaskHours) return;
    await createTask.mutateAsync({ title: newTaskTitle, description: newTaskDescription, assigned_to: myProfile.id, date: selectedDateStr, estimated_hours: parseFloat(newTaskHours), status: 'pending', is_self_assigned: true, is_recurring: false, sort_order: tasksForSelectedDay.length, assigned_by_name: authUser?.profile?.full_name || 'Self' });
    setNewTaskTitle(''); setNewTaskDescription(''); setNewTaskHours(''); setShowAddTask(false);
  };

  if (loadingProfile || loadingTasks) return <Card className="flex items-center justify-center h-64 shadow-card rounded-2xl"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Card>;
  if (!myProfile) return <Card className="flex flex-col items-center justify-center h-64 text-muted-foreground shadow-card rounded-2xl"><p className="text-lg mb-2 font-medium">No teammate profile found</p><p className="text-sm">Contact your team owner to set up your profile</p></Card>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2"><h1 className="text-3xl font-bold">Welcome back, {myProfile.name.split(' ')[0]}</h1><p className="text-muted-foreground text-lg">Here's your schedule for the upcoming days</p></div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {dates.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayCapacity = calculateDayCapacity(myProfile, dateStr, allTasks);
          const dayStatus = getCapacityStatus(dayCapacity);
          const dayPercentage = getCapacityPercentage(dayCapacity);
          return (
            <button key={dateStr} onClick={() => setSelectedDate(date)} className={cn('flex flex-col items-center min-w-[80px] p-3 rounded-xl border-2 transition-all shadow-card', dateStr === selectedDateStr ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50 bg-card', isToday(date) && dateStr !== selectedDateStr && 'ring-2 ring-primary/30')}>
              <span className="text-xs font-medium text-muted-foreground uppercase">{format(date, 'EEE')}</span>
              <span className={cn('text-xl font-bold', isToday(date) && 'text-primary')}>{format(date, 'd')}</span>
              <div className="w-full h-1.5 rounded-full bg-muted mt-2 overflow-hidden"><div className={cn('h-full rounded-full', dayStatus === 'low' && 'bg-capacity-low', dayStatus === 'medium' && 'bg-capacity-medium', dayStatus === 'high' && 'bg-capacity-high', dayStatus === 'empty' && 'bg-muted-foreground/30')} style={{ width: `${dayPercentage}%` }} /></div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-card rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />{format(selectedDate, 'EEEE, MMMM d')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Daily Capacity</span><span className={cn('font-bold', statusColors[status])}>{capacity?.usedCapacity || 0}h / {capacity?.totalCapacity || 0}h</span></div><Progress value={percentage} className={cn('h-3 rounded-lg', status === 'high' && '[&>div]:bg-capacity-high', status === 'medium' && '[&>div]:bg-capacity-medium', status === 'low' && '[&>div]:bg-capacity-low')} /></div>
            <div className="grid grid-cols-2 gap-4 pt-2"><div className="text-center p-4 rounded-xl bg-secondary"><div className="text-2xl font-bold">{tasksForSelectedDay.length}</div><div className="text-xs text-muted-foreground font-medium">Tasks</div></div><div className="text-center p-4 rounded-xl bg-secondary"><div className="text-2xl font-bold">{Math.max(0, (capacity?.totalCapacity || 0) - (capacity?.usedCapacity || 0))}h</div><div className="text-xs text-muted-foreground font-medium">Available</div></div></div>
            <Button className="w-full rounded-xl" variant="outline" onClick={() => setShowAddTask(true)}><Plus className="mr-2 h-4 w-4" />Add My Task</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-card rounded-2xl">
          <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">Tasks for this day</CardTitle><span className="text-xs text-muted-foreground">Drag to reorder</span></div></CardHeader>
          <CardContent>
            {tasksForSelectedDay.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Clock className="h-12 w-12 mb-3 opacity-30" /><p className="text-sm font-medium">No tasks scheduled</p></div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={tasksForSelectedDay.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">{tasksForSelectedDay.map((task) => <SortableTaskCard key={task.id} task={task} onMarkComplete={handleStatusChange} />)}</div>
                  </SortableContext>
                </DndContext>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle className="text-xl font-bold">Add Your Own Task</DialogTitle></DialogHeader>
          <div className="space-y-4"><div className="space-y-2"><Label>Task Title</Label><Input placeholder="What did you work on?" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="h-11 rounded-xl" /></div><div className="space-y-2"><Label>Description (optional)</Label><Textarea placeholder="Brief description" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} rows={2} className="rounded-xl" /></div><div className="space-y-2"><Label>Hours Spent</Label><Input type="number" min="0.5" max="24" step="0.5" placeholder="e.g., 2" value={newTaskHours} onChange={(e) => setNewTaskHours(e.target.value)} className="h-11 rounded-xl" /></div></div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setShowAddTask(false)} className="rounded-xl">Cancel</Button><Button onClick={handleAddSelfTask} disabled={!newTaskTitle || !newTaskHours || createTask.isPending} className="rounded-xl shadow-lg shadow-primary/25">{createTask.isPending ? 'Adding...' : 'Add Task'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
