import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Calendar, Clock } from 'lucide-react';
import { useTeammates } from '@/hooks/useTeammates';
import { 
  useLeaveBalances, 
  useLeaveRequests, 
  useCompOffRequests 
} from '@/hooks/useLeaveManagement';
import { LeaveBalanceCard } from '@/components/leave/LeaveBalanceCard';
import { LeaveRequestForm } from '@/components/leave/LeaveRequestForm';
import { CompOffRequestForm } from '@/components/leave/CompOffRequestForm';
import { LeaveRequestsTable } from '@/components/leave/LeaveRequestsTable';
import { CompOffRequestsTable } from '@/components/leave/CompOffRequestsTable';

export default function Leave() {
  const { user, loading, isOwner, isLeader } = useAuth();
  const { data: teammates = [], isLoading: teammatesLoading } = useTeammates();
  const { data: leaveBalances = [], isLoading: balancesLoading } = useLeaveBalances();
  const { data: leaveRequests = [], isLoading: requestsLoading } = useLeaveRequests();
  const { data: compOffRequests = [], isLoading: compOffLoading } = useCompOffRequests();

  const [selectedTeammateId, setSelectedTeammateId] = useState<string>('all');
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [compOffFormOpen, setCompOffFormOpen] = useState(false);

  const currentYear = new Date().getFullYear();

  // Filter data based on selected teammate
  const filteredBalances = useMemo(() => {
    if (selectedTeammateId === 'all') return leaveBalances;
    return leaveBalances.filter(b => b.teammate_id === selectedTeammateId);
  }, [leaveBalances, selectedTeammateId]);

  const filteredLeaveRequests = useMemo(() => {
    if (selectedTeammateId === 'all') return leaveRequests;
    return leaveRequests.filter(r => r.teammate_id === selectedTeammateId);
  }, [leaveRequests, selectedTeammateId]);

  const filteredCompOffRequests = useMemo(() => {
    if (selectedTeammateId === 'all') return compOffRequests;
    return compOffRequests.filter(r => r.teammate_id === selectedTeammateId);
  }, [compOffRequests, selectedTeammateId]);

  // Get balance for selected teammate
  const selectedBalance = useMemo(() => {
    if (selectedTeammateId === 'all') {
      // Calculate totals
      const yearBalances = leaveBalances.filter(b => b.year === currentYear);
      return {
        casual: yearBalances.reduce((sum, b) => sum + Number(b.casual_leave_balance), 0),
        sick: yearBalances.reduce((sum, b) => sum + Number(b.sick_leave_balance), 0),
        compOff: yearBalances.reduce((sum, b) => sum + Number(b.comp_off_balance), 0),
      };
    }
    const balance = leaveBalances.find(
      b => b.teammate_id === selectedTeammateId && b.year === currentYear
    );
    return {
      casual: balance ? Number(balance.casual_leave_balance) : 0,
      sick: balance ? Number(balance.sick_leave_balance) : 0,
      compOff: balance ? Number(balance.comp_off_balance) : 0,
    };
  }, [leaveBalances, selectedTeammateId, currentYear]);

  // Pending counts
  const pendingLeaveCount = leaveRequests.filter(r => r.status === 'pending').length;
  const pendingCompOffCount = compOffRequests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isLoading = teammatesLoading || balancesLoading || requestsLoading || compOffLoading;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <main className="container py-8">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
              <p className="text-muted-foreground">Manage leave requests and balances</p>
            </div>
            
            <div className="flex items-center gap-3">
              {(isOwner || isLeader) && (
                <Select value={selectedTeammateId} onValueChange={setSelectedTeammateId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by teammate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teammates</SelectItem>
                    {teammates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Button onClick={() => setLeaveFormOpen(true)}>
                <Calendar className="mr-2 h-4 w-4" />
                Request Leave
              </Button>
              <Button variant="outline" onClick={() => setCompOffFormOpen(true)}>
                <Clock className="mr-2 h-4 w-4" />
                Request Comp-Off
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Balance Card */}
              <LeaveBalanceCard
                casualLeave={selectedBalance.casual}
                sickLeave={selectedBalance.sick}
                compOff={selectedBalance.compOff}
                year={currentYear}
              />

              {/* Requests Tabs */}
              <Tabs defaultValue="leave" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="leave" className="relative">
                    Leave Requests
                    {pendingLeaveCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {pendingLeaveCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="compoff" className="relative">
                    Comp-Off Requests
                    {pendingCompOffCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {pendingCompOffCount}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="leave" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Leave Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LeaveRequestsTable requests={filteredLeaveRequests} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="compoff" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Comp-Off Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CompOffRequestsTable requests={filteredCompOffRequests} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>

      <LeaveRequestForm 
        open={leaveFormOpen} 
        onOpenChange={setLeaveFormOpen}
        preselectedTeammateId={selectedTeammateId !== 'all' ? selectedTeammateId : undefined}
      />
      <CompOffRequestForm 
        open={compOffFormOpen} 
        onOpenChange={setCompOffFormOpen}
        preselectedTeammateId={selectedTeammateId !== 'all' ? selectedTeammateId : undefined}
      />
    </div>
  );
}
