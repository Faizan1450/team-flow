import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeammates } from '@/hooks/useTeammates';
import { useCreateCompOffRequest } from '@/hooks/useLeaveManagement';
import { useAuth } from '@/contexts/AuthContext';

interface CompOffRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedTeammateId?: string;
}

export function CompOffRequestForm({ open, onOpenChange, preselectedTeammateId }: CompOffRequestFormProps) {
  const { isOwner, isLeader } = useAuth();
  const { data: teammates = [] } = useTeammates();
  const createCompOffRequest = useCreateCompOffRequest();

  const [teammateId, setTeammateId] = useState(preselectedTeammateId || '');
  const [workDate, setWorkDate] = useState<Date>();
  const [hoursWorked, setHoursWorked] = useState('8');
  const [reason, setReason] = useState('');

  // Calculate days earned based on hours worked (8 hours = 1 day)
  const daysEarned = Math.round((parseFloat(hoursWorked) || 0) / 8 * 10) / 10;

  const handleSubmit = async () => {
    if (!teammateId || !workDate || !reason) return;

    await createCompOffRequest.mutateAsync({
      teammateId,
      workDate: format(workDate, 'yyyy-MM-dd'),
      hoursWorked: parseFloat(hoursWorked),
      daysEarned,
      reason
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTeammateId(preselectedTeammateId || '');
    setWorkDate(undefined);
    setHoursWorked('8');
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Comp-Off</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {(isOwner || isLeader) && !preselectedTeammateId && (
            <div className="space-y-2">
              <Label>Teammate</Label>
              <Select value={teammateId} onValueChange={setTeammateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teammate" />
                </SelectTrigger>
                <SelectContent>
                  {teammates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Work Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !workDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {workDate ? format(workDate, "MMM d, yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={workDate}
                  onSelect={setWorkDate}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Hours Worked</Label>
            <Input
              type="number"
              min="1"
              max="24"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(e.target.value)}
              placeholder="8"
            />
            <p className="text-xs text-muted-foreground">
              {daysEarned} day{daysEarned !== 1 ? 's' : ''} of comp-off will be credited
            </p>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the extra work performed..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!teammateId || !workDate || !reason || createCompOffRequest.isPending}
          >
            {createCompOffRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
