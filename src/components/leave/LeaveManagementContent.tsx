import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeammates } from '@/hooks/useTeammates';
import { 
  useCurrentTeammateId, 
  useLeaveBalance, 
  useLeaveRequests,
  usePendingLeaveRequests,
  usePendingCompOffRequests,
  useAllLeaveBalances
} from '@/hooks/useLeaveManagement';
import { LeaveBalanceCard } from './LeaveBalanceCard';
import { LeaveRequestForm } from './LeaveRequestForm';
import { CompOffRequestForm } from './CompOffRequestForm';
import { LeaveHistory } from './LeaveHistory';
import { LeaveApprovalPanel } from './LeaveApprovalPanel';
import { OwnerLeaveManagement } from './OwnerLeaveManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Clock, FileCheck, Users, Loader2 } from 'lucide-react';

export function LeaveManagementContent() {
  const { isOwner, isLeader, isTeammate } = useAuth();
  const { data: teammateId, isLoading: loadingTeammateId } = useCurrentTeammateId();
  const { data: leaveBalance, isLoading: loadingBalance } = useLeaveBalance(teammateId ?? undefined);
  const { data: leaveRequests = [], isLoading: loadingRequests } = useLeaveRequests(teammateId ?? undefined);
  const { data: teammates = [] } = useTeammates();
  const { data: pendingLeaveRequests = [] } = usePendingLeaveRequests();
  const { data: pendingCompOffRequests = [] } = usePendingCompOffRequests();

  const totalPending = pendingLeaveRequests.length + pendingCompOffRequests.length;

  if (loadingTeammateId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Owner/Leader view
  if (isOwner || isLeader) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage team leaves, approvals, and balances
            </p>
          </div>
        </div>

        <Tabs defaultValue="approvals" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:inline-flex">
            <TabsTrigger value="approvals" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Pending Approvals
              {totalPending > 0 && (
                <span className="ml-1 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">
                  {totalPending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team Balances
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger value="assign" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Assign Holidays
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="approvals" className="mt-6">
            <LeaveApprovalPanel 
              pendingLeaveRequests={pendingLeaveRequests}
              pendingCompOffRequests={pendingCompOffRequests}
              teammates={teammates}
            />
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <OwnerLeaveManagement teammates={teammates} />
          </TabsContent>

          {isOwner && (
            <TabsContent value="assign" className="mt-6">
              <AssignHolidaySection teammates={teammates} />
            </TabsContent>
          )}
        </Tabs>

        {/* Personal leave info if user is also a teammate */}
        {teammateId && (
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-xl font-semibold mb-4">Your Leave Status</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <LeaveBalanceCard balance={leaveBalance} isLoading={loadingBalance} />
              <LeaveHistory requests={leaveRequests} isLoading={loadingRequests} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Teammate view
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-muted-foreground mt-1">
          Request leave, track your balance, and view history
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <LeaveBalanceCard balance={leaveBalance} isLoading={loadingBalance} />
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="request" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="request" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Request Leave
              </TabsTrigger>
              <TabsTrigger value="compoff" className="gap-2">
                <Clock className="h-4 w-4" />
                Comp-Off
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <FileCheck className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="request" className="mt-4">
              <LeaveRequestForm 
                teammateId={teammateId ?? ''} 
                availableHours={(leaveBalance?.total_hours ?? 0) + (leaveBalance?.earned_hours ?? 0) - (leaveBalance?.used_hours ?? 0) - (leaveBalance?.pending_hours ?? 0)}
              />
            </TabsContent>

            <TabsContent value="compoff" className="mt-4">
              <CompOffRequestForm teammateId={teammateId ?? ''} />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <LeaveHistory requests={leaveRequests} isLoading={loadingRequests} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Assign Holiday Section for Owner
function AssignHolidaySection({ teammates }: { teammates: any[] }) {
  const [selectedTeammate, setSelectedTeammate] = useState<string>('');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Assign Holiday
        </CardTitle>
        <CardDescription>
          Assign an off day to a team member for a specific date
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AssignHolidayForm teammates={teammates} />
      </CardContent>
    </Card>
  );
}

import { AssignHolidayForm } from './AssignHolidayForm';
