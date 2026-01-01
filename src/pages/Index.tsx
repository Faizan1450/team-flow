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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        {isOwner || isLeader ? (
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Team Capacity</h1>
              <p className="text-muted-foreground text-lg">
                View and manage your team's workload across the next 14 days
              </p>
            </div>
            <CapacityGrid />
          </div>
        ) : isTeammate ? (
          <TeammateView />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <div className="bg-card rounded-2xl shadow-card p-8 text-center">
              <p className="text-lg mb-2 font-medium">No role assigned</p>
              <p className="text-sm">Contact the owner to get access to the system</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
