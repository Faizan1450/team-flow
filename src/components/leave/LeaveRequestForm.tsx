import { useState } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import { useCreateLeaveRequest } from '@/hooks/useLeaveManagement';
import { useTeammates } from '@/hooks/useTeammates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, Loader2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LeaveRequestFormProps {
  teammateId: string;
  availableHours: number;
}

export function LeaveRequestForm({ teammateId, availableHours }: LeaveRequestFormProps) {
  const { data: teammates = [] } = useTeammates();
  const createRequest = useCreateLeaveRequest();
  
  const teammate = teammates.find(t => t.id === teammateId);
  const dailyCapacity = teammate?.daily_capacity ?? 8;
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isPartial, setIsPartial] = useState(false);
  const [hours, setHours] = useState<string>('');
  const [reason, setReason] = useState('');
  
  const minDate = addDays(new Date(), 5); // At least 5 days in advance
  
  // Calculate total hours
  const calculateHours = () => {
    if (!startDate) return 0;
    if (isPartial) return parseFloat(hours) || 0;
    
    if (!endDate) return dailyCapacity;
    const days = differenceInDays(endDate, startDate) + 1;
    return days * dailyCapacity;
  };
  
  const totalHours = calculateHours();
  const isValidRequest = totalHours > 0 && totalHours <= availableHours && startDate;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !teammateId) return;
    
    await createRequest.mutateAsync({
      teammateId,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate ?? startDate, 'yyyy-MM-dd'),
      hoursRequested: totalHours,
      isPartial,
      reason: reason || undefined
    });
    
    // Reset form
    setStartDate(undefined);
    setEndDate(undefined);
    setIsPartial(false);
    setHours('');
    setReason('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Request Leave
        </CardTitle>
        <CardDescription>
          Submit a leave request at least 5 days in advance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Selection */}
          <div className="grid gap-4 sm:grid-cols-2">
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
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      if (date && endDate && date > endDate) {
                        setEndDate(date);
                      }
                    }}
                    disabled={(date) => date < minDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {!isPartial && (
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
                      disabled={!startDate}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => date < (startDate ?? minDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Partial Day Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
            <div className="space-y-0.5">
              <Label>Partial Day Leave</Label>
              <p className="text-sm text-muted-foreground">
                Request specific hours instead of full days
              </p>
            </div>
            <Switch 
              checked={isPartial} 
              onCheckedChange={(checked) => {
                setIsPartial(checked);
                if (checked) setEndDate(undefined);
              }}
            />
          </div>

          {/* Hours Input (for partial leave) */}
          {isPartial && (
            <div className="space-y-2">
              <Label htmlFor="hours">Hours Requested</Label>
              <Input
                id="hours"
                type="number"
                min="1"
                max={availableHours}
                step="1"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder={`1 - ${Math.floor(availableHours)}`}
              />
              <p className="text-sm text-muted-foreground">
                Your daily capacity is {dailyCapacity} hours
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason for leave..."
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Summary */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="font-medium">Request Summary</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Hours Requested:</span>
              <span className="font-medium">{totalHours} hrs</span>
              <span className="text-muted-foreground">Available Balance:</span>
              <span className="font-medium">{availableHours.toFixed(1)} hrs</span>
              <span className="text-muted-foreground">Remaining After:</span>
              <span className={cn(
                "font-medium",
                (availableHours - totalHours) < 0 && "text-destructive"
              )}>
                {(availableHours - totalHours).toFixed(1)} hrs
              </span>
            </div>
          </div>

          {/* Validation Alert */}
          {totalHours > availableHours && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have enough leave balance for this request.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={!isValidRequest || createRequest.isPending}
          >
            {createRequest.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Leave Request'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
