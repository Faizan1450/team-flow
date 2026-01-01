import { useApp } from '@/contexts/AppContext';
import { Header } from '@/components/layout/Header';
import { CapacityGrid } from '@/components/capacity/CapacityGrid';
import { TeammateView } from '@/components/teammate/TeammateView';

const Index = () => {
  const { currentUser } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6">
        {currentUser?.role === 'leader' ? (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Team Capacity</h1>
              <p className="text-muted-foreground">
                View and manage your team's workload across the next 14 days
              </p>
            </div>
            <CapacityGrid />
          </div>
        ) : (
          <TeammateView />
        )}
      </main>
    </div>
  );
};

export default Index;
