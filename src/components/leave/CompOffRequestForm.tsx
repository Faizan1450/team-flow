import { useState } from 'react';
import { format } from 'date-fns';
import { useCreateCompOffRequest } from '@/hooks/useLeaveManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock, Loader2, CalendarDays, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompOffRequestFormProps {
  teammateId: string;
}

export function CompOffRequestForm({ teammateId }: CompOffRequestFormProps) {
  const createRequest = useCreateCompOffRequest();
  
  const [workDate, setWorkDate] = useState<Date | undefined>(undefined);
  const [hoursWorked, setHoursWorked] = useState<string>('');
  const [reason, setReason] = useState('');
  
  const today = new Date();
  const parsedHours = parseFloat(hoursWorked) || 0;
  const isValid = workDate && parsedHours > 0 && parsedHours <= 24 && reason.trim().length > 0;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workDate || !teammateId || parsedHours <= 0) return;
    
    await createRequest.mutateAsync({
      teammateId,
      workDate: format(workDate, 'yyyy-MM-dd'),
      hoursWorked: parsedHours,
      reason
    });
    
    // Reset form
    setWorkDate(undefined);
    setHoursWorked('');
    setReason('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Request Comp-Off
        </CardTitle>
        <CardDescription>
          Earn leave hours by working on your off days (weekends/holidays)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date Worked</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !workDate && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {workDate ? format(workDate, 'PPP') : 'Select the date you worked'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={workDate}
                  onSelect={setWorkDate}
                  disabled={(date) => date > today}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-sm text-muted-foreground">
              Select a past date when you worked on your off day
            </p>
          </div>

          {/* Hours Worked */}
          <div className="space-y-2">
            <Label htmlFor="hoursWorked">Hours Worked</Label>
            <Input
              id="hoursWorked"
              type="number"
              min="1"
              max="24"
              step="1"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(e.target.value)}
              placeholder="Enter hours worked"
            />
            <p className="text-sm text-muted-foreground">
              These hours will be added to your leave balance upon approval
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="compOffReason">Work Description *</Label>
            <Textarea
              id="compOffReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the work you did on your off day..."
              className="resize-none"
              rows={3}
              required
            />
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm">How Comp-Off Works</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Work on your weekly off or holiday</li>
                  <li>• Submit a request with hours worked</li>
                  <li>• Once approved, hours are added to your balance</li>
                  <li>• Use these hours for future leave</li>
                </ul>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={!isValid || createRequest.isPending}
          >
            {createRequest.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Comp-Off Request'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
