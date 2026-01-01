import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { CapacityGrid } from '@/components/capacity/CapacityGrid';
import { TeammateView } from '@/components/teammate/TeammateView';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { authUser, loading, isOwner, isLeader, isTeammate } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authUser) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6">
        {isOwner || isLeader ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Team Capacity</h1>
              <p className="text-muted-foreground">
                View and manage your team's workload across the next 14 days
              </p>
            </div>
            <CapacityGrid />
          </div>
        ) : isTeammate ? (
          <TeammateView />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg mb-2">No role assigned</p>
            <p className="text-sm">Contact the owner to get access to the system</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
