import { useState } from 'react';
import { format } from 'date-fns';
import { useTeammateTimeOff, useAddTimeOff, useRemoveTimeOff } from '@/hooks/useTimeOff';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarOff, X, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManageOffDaysModalProps {
  open: boolean;
  onClose: () => void;
  teammateId: string;
  teammateName: string;
}

export function ManageOffDaysModal({
  open,
  onClose,
  teammateId,
  teammateName,
}: ManageOffDaysModalProps) {
  const { data: timeOffDays = [], isLoading } = useTeammateTimeOff(teammateId);
  const addTimeOff = useAddTimeOff();
  const removeTimeOff = useRemoveTimeOff();
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState('');

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

  // Dates that are already marked as off
  const offDates = timeOffDays.map(to => new Date(to.date));

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarOff className="h-5 w-5" />
            Manage Off Days - {teammateName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
