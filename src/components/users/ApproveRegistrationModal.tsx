import { useState } from 'react';
import { PendingRegistration, useApproveRegistration } from '@/hooks/usePendingRegistrations';
import { AppRole } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, UserCheck, Loader2 } from 'lucide-react';

interface ApproveRegistrationModalProps {
  registration: PendingRegistration | null;
  open: boolean;
  onClose: () => void;
}

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export function ApproveRegistrationModal({ registration, open, onClose }: ApproveRegistrationModalProps) {
  const [role, setRole] = useState<AppRole>('teammate');
  const [dailyCapacity, setDailyCapacity] = useState(8);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const approveRegistration = useApproveRegistration();

  const handleWorkingDayToggle = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleApprove = async () => {
    if (!registration) return;

    await approveRegistration.mutateAsync({
      pendingId: registration.id,
      role,
      dailyCapacity: role === 'teammate' ? dailyCapacity : 8,
      workingDays: role === 'teammate' ? workingDays : [1, 2, 3, 4, 5],
    });
    onClose();
    // Reset form
    setRole('teammate');
    setDailyCapacity(8);
    setWorkingDays([1, 2, 3, 4, 5]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Approve Registration</DialogTitle>
          <DialogDescription>
            Approve <strong>{registration?.full_name}</strong> and assign them a role
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Assign Role</Label>
            <RadioGroup value={role} onValueChange={(v) => setRole(v as AppRole)} className="grid grid-cols-2 gap-3">
              <div>
                <RadioGroupItem
                  value="teammate"
                  id="role-teammate"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="role-teammate"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                >
                  <UserCheck className="mb-2 h-6 w-6" />
                  <span className="font-medium">Teammate</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    Can view & manage own tasks
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="leader"
                  id="role-leader"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="role-leader"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                >
                  <Shield className="mb-2 h-6 w-6" />
                  <span className="font-medium">Leader</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    Can assign tasks to others
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Teammate Options */}
          {role === 'teammate' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="daily-capacity" className="text-sm font-medium">
                  Daily Capacity (hours)
                </Label>
                <Input
                  id="daily-capacity"
                  type="number"
                  min={1}
                  max={24}
                  value={dailyCapacity}
                  onChange={(e) => setDailyCapacity(Number(e.target.value))}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Working Days</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={workingDays.includes(day.value)}
                        onCheckedChange={() => handleWorkingDayToggle(day.value)}
                        className="rounded"
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={approveRegistration.isPending}
            className="rounded-xl shadow-lg shadow-primary/25"
          >
            {approveRegistration.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              'Approve'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
