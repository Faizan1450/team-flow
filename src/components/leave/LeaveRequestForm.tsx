import { useState } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeammates } from '@/hooks/useTeammates';
import { useCreateLeaveRequest } from '@/hooks/useLeaveManagement';
import { useAuth } from '@/contexts/AuthContext';

interface LeaveRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedTeammateId?: string;
}

export function LeaveRequestForm({ open, onOpenChange, preselectedTeammateId }: LeaveRequestFormProps) {
  const { isOwner, isLeader } = useAuth();
  const { data: teammates = [] } = useTeammates();
  const createLeaveRequest = useCreateLeaveRequest();

  const [teammateId, setTeammateId] = useState(preselectedTeammateId || '');
  const [leaveType, setLeaveType] = useState<'casual' | 'sick' | 'comp_off'>('casual');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState('');

  const daysCount = startDate && endDate 
    ? differenceInDays(endDate, startDate) + 1 
    : 0;

  const handleSubmit = async () => {
    if (!teammateId || !startDate || !endDate) return;

    await createLeaveRequest.mutateAsync({
      teammateId,
      leaveType,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      daysCount,
      reason: reason || undefined
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTeammateId(preselectedTeammateId || '');
    setLeaveType('casual');
    setStartDate(undefined);
    setEndDate(undefined);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Leave</DialogTitle>
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
            <Label>Leave Type</Label>
            <Select value={leaveType} onValueChange={(v) => setLeaveType(v as typeof leaveType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual Leave</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="comp_off">Comp Off</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      if (date && (!endDate || endDate < date)) {
                        setEndDate(date);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {daysCount > 0 && (
            <div className="text-sm text-muted-foreground text-center py-2 bg-muted rounded-lg">
              {daysCount} day{daysCount !== 1 ? 's' : ''} of leave
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for leave..."
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
            disabled={!teammateId || !startDate || !endDate || createLeaveRequest.isPending}
          >
            {createLeaveRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
