import { useAllLeaveBalances, useCreditMonthlyLeave } from '@/hooks/useLeaveManagement';
import { Teammate } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, RefreshCw, Loader2, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface OwnerLeaveManagementProps {
  teammates: Teammate[];
}

export function OwnerLeaveManagement({ teammates }: OwnerLeaveManagementProps) {
  const { isOwner } = useAuth();
  const { data: allBalances = [], isLoading } = useAllLeaveBalances();
  const creditLeave = useCreditMonthlyLeave();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getBalanceForTeammate = (teammateId: string) => {
    return allBalances.find(b => b.teammate_id === teammateId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Credit Monthly Leave Action (Owner Only) */}
      {isOwner && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <h3 className="font-medium">Monthly Leave Allocation</h3>
              <p className="text-sm text-muted-foreground">
                Credit 1.5 days worth of hours to all teammates
              </p>
            </div>
            <Button
              onClick={() => creditLeave.mutate()}
              disabled={creditLeave.isPending}
              className="gap-2"
            >
              {creditLeave.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Credit Leave
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Team Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Leave Balances
          </CardTitle>
          <CardDescription>
            Overview of all team members' leave status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teammates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No teammates found
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {teammates.map((teammate) => {
                  const balance = getBalanceForTeammate(teammate.id);
                  const totalHours = (balance?.total_hours ?? 0) + (balance?.earned_hours ?? 0);
                  const usedHours = balance?.used_hours ?? 0;
                  const pendingHours = balance?.pending_hours ?? 0;
                  const availableHours = totalHours - usedHours - pendingHours;
                  const usedPercentage = totalHours > 0 ? (usedHours / totalHours) * 100 : 0;

                  return (
                    <div
                      key={teammate.id}
                      className="p-4 rounded-xl bg-secondary/50 border border-border/50 hover:border-border transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={teammate.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(teammate.name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{teammate.name}</p>
                              <p className="text-sm text-muted-foreground">{teammate.job_role}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">
                                {availableHours.toFixed(1)} hrs
                              </p>
                              <p className="text-xs text-muted-foreground">available</p>
                            </div>
                          </div>
                          
                          <Progress value={usedPercentage} className="h-2 mb-2" />
                          
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Total: {totalHours.toFixed(1)}h
                            </span>
                            <span>Used: {usedHours.toFixed(1)}h</span>
                            {pendingHours > 0 && (
                              <span className="text-amber-600">Pending: {pendingHours.toFixed(1)}h</span>
                            )}
                            {(balance?.earned_hours ?? 0) > 0 && (
                              <span className="text-blue-600">Comp: {balance?.earned_hours?.toFixed(1)}h</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
