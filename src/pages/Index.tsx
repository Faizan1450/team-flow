import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { CapacityGrid } from '@/components/capacity/CapacityGrid';
import { TeammateView } from '@/components/teammate/TeammateView';
import { Navigate } from 'react-router-dom';
import { Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

const Index = () => {
  const { authUser, user, loading, isOwner, isLeader, isTeammate } = useAuth();

  // Check if user has a pending registration
  const { data: pendingStatus } = useQuery({
    queryKey: ['my-pending-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('pending_registrations')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is pending approval
  const isPending = pendingStatus?.status === 'pending';
  const isRejected = pendingStatus?.status === 'rejected';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        {isOwner || isLeader ? (
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Team Capacity</h1>
              <p className="text-muted-foreground text-lg">
                View and manage your team's workload
              </p>
            </div>
            <CapacityGrid />
          </div>
        ) : isTeammate ? (
          <TeammateView />
        ) : isPending ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-fade-in">
            <Card className="rounded-2xl shadow-card p-8 text-center max-w-md">
              <div className="h-16 w-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-warning" />
              </div>
              <p className="text-xl mb-2 font-semibold text-foreground">Pending Approval</p>
              <p className="text-sm">
                Your registration is being reviewed by the owner. You'll get access once approved.
              </p>
            </Card>
          </div>
        ) : isRejected ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-fade-in">
            <Card className="rounded-2xl shadow-card p-8 text-center max-w-md">
              <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-xl mb-2 font-semibold text-foreground">Registration Rejected</p>
              <p className="text-sm">
                Your registration was not approved. Please contact the administrator.
              </p>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-fade-in">
            <Card className="rounded-2xl shadow-card p-8 text-center max-w-md">
              <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-xl mb-2 font-semibold text-foreground">No role assigned</p>
              <p className="text-sm">Contact the owner to get access to the system</p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
