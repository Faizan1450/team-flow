import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, TrendingUp, TrendingDown, Hourglass } from 'lucide-react';
import { LeaveBalance } from '@/hooks/useLeaveManagement';

interface LeaveBalanceCardProps {
  balance: LeaveBalance | null | undefined;
  isLoading: boolean;
}

export function LeaveBalanceCard({ balance, isLoading }: LeaveBalanceCardProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const totalHours = balance?.total_hours ?? 0;
  const earnedHours = balance?.earned_hours ?? 0;
  const usedHours = balance?.used_hours ?? 0;
  const pendingHours = balance?.pending_hours ?? 0;
  
  const availableHours = totalHours + earnedHours - usedHours - pendingHours;
  const totalBalance = totalHours + earnedHours;
  const usedPercentage = totalBalance > 0 ? (usedHours / totalBalance) * 100 : 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Leave Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main balance display */}
        <div className="text-center py-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl">
          <div className="text-4xl font-bold text-primary">
            {availableHours.toFixed(1)}
            <span className="text-lg font-normal text-muted-foreground ml-1">hrs</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Available</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used</span>
            <span className="font-medium">{usedHours.toFixed(1)} / {totalBalance.toFixed(1)} hrs</span>
          </div>
          <Progress value={usedPercentage} className="h-2" />
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Allocated</p>
              <p className="font-semibold">{totalHours.toFixed(1)} hrs</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Earned (Comp)</p>
              <p className="font-semibold">{earnedHours.toFixed(1)} hrs</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Used</p>
              <p className="font-semibold">{usedHours.toFixed(1)} hrs</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Hourglass className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="font-semibold">{pendingHours.toFixed(1)} hrs</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
