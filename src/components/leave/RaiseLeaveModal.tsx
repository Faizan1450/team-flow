import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarIcon, Loader2, Calendar as CalendarDays, Thermometer, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyTeammateProfile } from '@/hooks/useTeammates';
import { useTeammateLeaveBalance, useCreateLeaveRequest } from '@/hooks/useLeaveManagement';
import { Badge } from '@/components/ui/badge';

interface RaiseLeaveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RaiseLeaveModal({ open, onOpenChange }: RaiseLeaveModalProps) {
  const { data: myProfile } = useMyTeammateProfile();
  const { data: leaveBalance } = useTeammateLeaveBalance(myProfile?.id || '');
  const createLeaveRequest = useCreateLeaveRequest();

  const [leaveType, setLeaveType] = useState<'casual' | 'sick' | 'comp_off'>('casual');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState('');

  const daysCount = startDate && endDate 
    ? differenceInDays(endDate, startDate) + 1 
    : 0;

  const currentYear = new Date().getFullYear();
  const casualBalance = leaveBalance ? Number(leaveBalance.casual_leave_balance) : 0;
  const sickBalance = leaveBalance ? Number(leaveBalance.sick_leave_balance) : 0;
  const compOffBalance = leaveBalance ? Number(leaveBalance.comp_off_balance) : 0;

  const handleSubmit = async () => {
    if (!myProfile || !startDate || !endDate) return;

    await createLeaveRequest.mutateAsync({
      teammateId: myProfile.id,
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
    setLeaveType('casual');
    setStartDate(undefined);
    setEndDate(undefined);
    setReason('');
  };

  if (!myProfile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Raise Leave</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <p>No teammate profile found.</p>
            <p className="text-sm mt-2">Contact your team owner to set up your profile.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raise Leave</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Leave Balance Summary */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-3 rounded-xl bg-primary/10 border border-primary/20">
              <CalendarDays className="h-4 w-4 text-primary mb-1" />
              <span className="text-lg font-bold text-primary">{casualBalance}</span>
              <span className="text-[10px] text-muted-foreground">Casual</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Thermometer className="h-4 w-4 text-orange-500 mb-1" />
              <span className="text-lg font-bold text-orange-500">{sickBalance}</span>
              <span className="text-[10px] text-muted-foreground">Sick</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-accent/10 border border-accent/20">
              <Clock className="h-4 w-4 text-accent mb-1" />
              <span className="text-lg font-bold text-accent">{compOffBalance}</span>
              <span className="text-[10px] text-muted-foreground">Comp Off</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select value={leaveType} onValueChange={(v) => setLeaveType(v as typeof leaveType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual Leave ({casualBalance} available)</SelectItem>
                <SelectItem value="sick">Sick Leave ({sickBalance} available)</SelectItem>
                <SelectItem value="comp_off">Comp Off ({compOffBalance} available)</SelectItem>
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
            disabled={!startDate || !endDate || createLeaveRequest.isPending}
          >
            {createLeaveRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}