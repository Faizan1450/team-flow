import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useDemoteToTeammate } from '@/hooks/useUserRoles';
import { Profile } from '@/types';

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

interface DemoteToTeammateModalProps {
  user: { user_id: string; profile?: Profile } | null;
  open: boolean;
  onClose: () => void;
}

export function DemoteToTeammateModal({ user, open, onClose }: DemoteToTeammateModalProps) {
  const [dailyCapacity, setDailyCapacity] = useState(8);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  
  const demoteToTeammate = useDemoteToTeammate();

  const handleWorkingDayToggle = (day: number) => {
    setWorkingDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleDemote = async () => {
    if (!user) return;
    
    await demoteToTeammate.mutateAsync({
      userId: user.user_id,
      dailyCapacity,
      workingDays,
    });
    
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Demote to Teammate</DialogTitle>
          <DialogDescription>
            Configure settings for {user.profile?.full_name || 'this user'} as a teammate.
            They will appear in the capacity grid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="dailyCapacity">Daily Capacity (hours)</Label>
            <Input
              id="dailyCapacity"
              type="number"
              min={1}
              max={24}
              value={dailyCapacity}
              onChange={(e) => setDailyCapacity(parseInt(e.target.value) || 8)}
            />
          </div>

          <div className="space-y-2">
            <Label>Working Days</Label>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={workingDays.includes(day.value)}
                    onCheckedChange={() => handleWorkingDayToggle(day.value)}
                  />
                  <Label htmlFor={`day-${day.value}`} className="text-sm font-normal cursor-pointer">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleDemote}
            disabled={demoteToTeammate.isPending || workingDays.length === 0}
          >
            {demoteToTeammate.isPending ? 'Demoting...' : 'Demote to Teammate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
