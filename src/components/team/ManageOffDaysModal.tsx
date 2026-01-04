import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTeammateTimeOff, useAddTimeOff, useRemoveTimeOff } from '@/hooks/useTimeOff';
import { useUpdateTeammate } from '@/hooks/useTeammates';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarOff, X, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

interface ManageOffDaysModalProps {
  open: boolean;
  onClose: () => void;
  teammateId: string;
  teammateName: string;
  workingDays: number[];
}

export function ManageOffDaysModal({
  open,
  onClose,
  teammateId,
  teammateName,
  workingDays: initialWorkingDays,
}: ManageOffDaysModalProps) {
  const { data: timeOffDays = [], isLoading } = useTeammateTimeOff(teammateId);
  const addTimeOff = useAddTimeOff();
  const removeTimeOff = useRemoveTimeOff();
  const updateTeammate = useUpdateTeammate();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState('');
  const [workingDays, setWorkingDays] = useState<number[]>(initialWorkingDays);

  // Reset working days when modal opens with new teammate
  useEffect(() => {
    setWorkingDays(initialWorkingDays);
  }, [initialWorkingDays, teammateId]);

  const handleAddOffDay = async () => {
    if (!selectedDate) return;
    
    await addTimeOff.mutateAsync({
      teammateId,
      date: format(selectedDate, 'yyyy-MM-dd'),
      reason: reason || undefined,
    });
    
    setSelectedDate(undefined);
    setReason('');
  };

  const handleRemoveOffDay = async (id: string) => {
    await removeTimeOff.mutateAsync(id);
  };

  const handleToggleWorkingDay = (day: number) => {
    const newDays = workingDays.includes(day)
      ? workingDays.filter((d) => d !== day)
      : [...workingDays, day].sort();
    setWorkingDays(newDays);
  };

  const handleSaveWorkingDays = async () => {
    await updateTeammate.mutateAsync({
      id: teammateId,
      updates: { working_days: workingDays },
    });
  };

  // Dates that are already marked as off
  const offDates = timeOffDays.map(to => new Date(to.date));
  
  // Check if working days have changed from initial
  const hasWorkingDaysChanged = JSON.stringify(workingDays.sort()) !== JSON.stringify([...initialWorkingDays].sort());

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Manage Off Days - {teammateName}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="weekly" className="rounded-lg">Weekly Off Days</TabsTrigger>
            <TabsTrigger value="specific" className="rounded-lg">Specific Dates</TabsTrigger>
          </TabsList>
          
          {/* Weekly Off Days Tab */}
          <TabsContent value="weekly" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select working days</Label>
              <p className="text-sm text-muted-foreground">
                Unchecked days will be treated as weekly off days
              </p>
              <div className="grid grid-cols-7 gap-2">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day.value}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                      workingDays.includes(day.value)
                        ? 'bg-primary/10 border-primary'
                        : 'bg-secondary/50 border-border opacity-60'
                    }`}
                    onClick={() => handleToggleWorkingDay(day.value)}
                  >
                    <Checkbox
                      checked={workingDays.includes(day.value)}
                      onCheckedChange={() => handleToggleWorkingDay(day.value)}
                      className="pointer-events-none"
                    />
                    <span className="text-xs font-medium">{day.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Button
              onClick={handleSaveWorkingDays}
              disabled={!hasWorkingDaysChanged || updateTeammate.isPending}
              className="w-full rounded-xl shadow-lg shadow-primary/25"
            >
              {updateTeammate.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Working Days'
              )}
            </Button>
          </TabsContent>
          
          {/* Specific Dates Tab */}
          <TabsContent value="specific" className="space-y-6 mt-4">
            {/* Add new off day */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => offDates.some(d => 
                  d.toDateString() === date.toDateString()
                )}
                className="rounded-xl border"
              />
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Reason (optional)</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Vacation, Sick leave, Personal day"
                  className="h-11 rounded-xl"
                />
              </div>
              
              <Button
                onClick={handleAddOffDay}
                disabled={!selectedDate || addTimeOff.isPending}
                className="w-full rounded-xl shadow-lg shadow-primary/25"
              >
                {addTimeOff.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Off Day'
                )}
              </Button>
            </div>
            
            {/* Existing off days */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Scheduled Off Days</Label>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : timeOffDays.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No off days scheduled
                </p>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {timeOffDays.map((to) => (
                      <div
                        key={to.id}
                        className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="rounded-lg">
                            {format(new Date(to.date), 'MMM d, yyyy')}
                          </Badge>
                          {to.reason && (
                            <span className="text-sm text-muted-foreground">
                              {to.reason}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          onClick={() => handleRemoveOffDay(to.id)}
                          disabled={removeTimeOff.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
