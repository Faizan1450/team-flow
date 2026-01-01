import { useState, useEffect } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useTeammates } from '@/hooks/useTeammates';
import { useTasks, useCreateTask } from '@/hooks/useTasks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, AlertTriangle, CheckCircle } from 'lucide-react';
import { calculateDayCapacity, canAssignTask, getRemainingCapacity } from '@/lib/capacity';
import { cn } from '@/lib/utils';

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  defaultTeammateId?: string;
  defaultDate?: string;
}

export function AddTaskModal({
  open,
  onClose,
  defaultTeammateId,
  defaultDate,
}: AddTaskModalProps) {
  const { authUser } = useAuth();
  const { data: teammates = [] } = useTeammates();
  const { data: tasks = [] } = useTasks();
  const createTask = useCreateTask();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teammateId, setTeammateId] = useState(defaultTeammateId || '');
  const [date, setDate] = useState<Date | undefined>(
    defaultDate ? parseISO(defaultDate) : new Date()
  );
  const [estimatedHours, setEstimatedHours] = useState('');
  const [validationResult, setValidationResult] = useState<{
    allowed: boolean;
    warning?: string;
  } | null>(null);

  useEffect(() => {
    if (defaultTeammateId) setTeammateId(defaultTeammateId);
    if (defaultDate) setDate(parseISO(defaultDate));
  }, [defaultTeammateId, defaultDate]);

  useEffect(() => {
    if (teammateId && date && estimatedHours) {
      const teammate = teammates.find((t) => t.id === teammateId);
      if (teammate) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const capacity = calculateDayCapacity(teammate, dateStr, tasks);
        const result = canAssignTask(capacity, parseFloat(estimatedHours));
        setValidationResult(result);
      }
    } else {
      setValidationResult(null);
    }
  }, [teammateId, date, estimatedHours, teammates, tasks]);

  const handleSubmit = async () => {
    if (!authUser || !title || !teammateId || !date || !estimatedHours) return;
    if (validationResult && !validationResult.allowed) return;

    await createTask.mutateAsync({
      title,
      description,
      assigned_to: teammateId,
      date: format(date, 'yyyy-MM-dd'),
      estimated_hours: parseFloat(estimatedHours),
      status: 'pending',
      is_self_assigned: false,
      sort_order: 0,
      assigned_by_name: authUser.profile?.full_name || 'Unknown'
    });

    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setTeammateId('');
    setDate(new Date());
    setEstimatedHours('');
    setValidationResult(null);
    onClose();
  };

  const selectedTeammate = teammates.find((t) => t.id === teammateId);
  const remainingCapacity = selectedTeammate && date
    ? getRemainingCapacity(calculateDayCapacity(selectedTeammate, format(date, 'yyyy-MM-dd'), tasks))
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the task"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={teammateId} onValueChange={setTeammateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teammate" />
                </SelectTrigger>
                <SelectContent>
                  {teammates.map((tm) => (
                    <SelectItem key={tm.id} value={tm.id}>
                      {tm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Estimated Hours</Label>
            <div className="flex items-center gap-2">
              <Input
                id="hours"
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                placeholder="e.g., 4"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="flex-1"
              />
              {remainingCapacity !== null && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {remainingCapacity}h available
                </span>
              )}
            </div>
          </div>

          {validationResult?.warning && (
            <Alert variant={validationResult.allowed ? 'default' : 'destructive'}>
              {validationResult.allowed ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>{validationResult.warning}</AlertDescription>
            </Alert>
          )}

          {validationResult?.allowed && !validationResult?.warning && estimatedHours && (
            <Alert className="border-capacity-low/50 bg-capacity-low/10">
              <CheckCircle className="h-4 w-4 text-capacity-low" />
              <AlertDescription className="text-capacity-low">
                Task can be assigned within capacity limits.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !title ||
              !teammateId ||
              !date ||
              !estimatedHours ||
              (validationResult && !validationResult.allowed) ||
              createTask.isPending
            }
          >
            {createTask.isPending ? 'Assigning...' : 'Assign Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
