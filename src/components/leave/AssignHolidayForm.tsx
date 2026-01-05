import { useState } from 'react';
import { format } from 'date-fns';
import { useAssignHoliday } from '@/hooks/useLeaveManagement';
import { Teammate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssignHolidayFormProps {
  teammates: Teammate[];
}

export function AssignHolidayForm({ teammates }: AssignHolidayFormProps) {
  const assignHoliday = useAssignHoliday();
  
  const [selectedTeammate, setSelectedTeammate] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isPartial, setIsPartial] = useState(false);
  const [hours, setHours] = useState<string>('');
  const [reason, setReason] = useState('');

  const teammate = teammates.find(t => t.id === selectedTeammate);
  const dailyCapacity = teammate?.daily_capacity ?? 8;
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeammate || !selectedDate) return;

    await assignHoliday.mutateAsync({
      teammateId: selectedTeammate,
      date: format(selectedDate, 'yyyy-MM-dd'),
      hours: isPartial ? parseFloat(hours) : undefined,
      reason: reason || undefined
    });

    // Reset form
    setSelectedTeammate('');
    setSelectedDate(undefined);
    setIsPartial(false);
    setHours('');
    setReason('');
  };

  const isValid = selectedTeammate && selectedDate && (!isPartial || (parseFloat(hours) > 0 && parseFloat(hours) <= dailyCapacity));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Teammate Selection */}
      <div className="space-y-2">
        <Label>Select Team Member</Label>
        <Select value={selectedTeammate} onValueChange={setSelectedTeammate}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a teammate" />
          </SelectTrigger>
          <SelectContent>
            {teammates.map((tm) => (
              <SelectItem key={tm.id} value={tm.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={tm.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(tm.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{tm.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Selection */}
      <div className="space-y-2">
        <Label>Holiday Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Partial Day Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
        <div className="space-y-0.5">
          <Label>Partial Day Off</Label>
          <p className="text-sm text-muted-foreground">
            Assign specific hours off instead of full day
          </p>
        </div>
        <Switch checked={isPartial} onCheckedChange={setIsPartial} />
      </div>

      {/* Hours Input */}
      {isPartial && (
        <div className="space-y-2">
          <Label htmlFor="holidayHours">Hours Off</Label>
          <Input
            id="holidayHours"
            type="number"
            min="1"
            max={dailyCapacity}
            step="1"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder={`1 - ${dailyCapacity}`}
          />
          {teammate && (
            <p className="text-sm text-muted-foreground">
              {teammate.name}'s daily capacity is {dailyCapacity} hours
            </p>
          )}
        </div>
      )}

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="holidayReason">Reason (Optional)</Label>
        <Input
          id="holidayReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., National Holiday, Company Event"
        />
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Assigned holidays:</p>
            <ul className="text-muted-foreground mt-1 space-y-1">
              <li>• Will block the employee's capacity for that date</li>
              <li>• Visible to all team members immediately</li>
              <li>• Does not deduct from leave balance</li>
            </ul>
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full"
        disabled={!isValid || assignHoliday.isPending}
      >
        {assignHoliday.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Assigning...
          </>
        ) : (
          'Assign Holiday'
        )}
      </Button>
    </form>
  );
}
