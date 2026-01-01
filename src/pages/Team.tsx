import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeammates, useCreateTeammate, useDeleteTeammate } from '@/hooks/useTeammates';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Users, Briefcase, Clock } from 'lucide-react';

export default function Team() {
  const { authUser, loading, isOwner } = useAuth();
  const { data: teammates = [], isLoading } = useTeammates();
  const createTeammate = useCreateTeammate();
  const deleteTeammate = useDeleteTeammate();
  
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [dailyCapacity, setDailyCapacity] = useState('8');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <Navigate to="/auth" replace />;
  }

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  const handleAddTeammate = async () => {
    if (!name || !jobRole) return;

    await createTeammate.mutateAsync({
      name,
      email: email || undefined,
      job_role: jobRole,
      daily_capacity: parseInt(dailyCapacity) || 8,
      working_days: [1, 2, 3, 4, 5],
    });

    setName('');
    setEmail('');
    setJobRole('');
    setDailyCapacity('8');
    setShowAdd(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="space-y-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
              <p className="text-muted-foreground text-lg">Add and manage your team members</p>
            </div>
            <Button onClick={() => setShowAdd(true)} className="rounded-xl shadow-lg shadow-primary/25">
              <Plus className="mr-2 h-4 w-4" />
              Add Teammate
            </Button>
          </div>

          {isLoading ? (
            <Card className="flex justify-center py-16 shadow-card rounded-2xl">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading teammates...</p>
              </div>
            </Card>
          ) : teammates.length === 0 ? (
            <Card className="shadow-card rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-lg mb-1 font-medium">No teammates yet</p>
                <p className="text-sm">Add team members to start planning capacity</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teammates.map((tm) => (
                <Card key={tm.id} className="shadow-card rounded-2xl card-hover overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 ring-2 ring-border">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                            {getInitials(tm.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-lg">{tm.name}</div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Briefcase className="h-3.5 w-3.5" />
                            {tm.job_role}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => deleteTeammate.mutate(tm.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-5 flex gap-2">
                      <Badge variant="secondary" className="rounded-lg px-3 py-1 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {tm.daily_capacity}h/day
                      </Badge>
                      {tm.email && (
                        <Badge variant="outline" className="rounded-lg px-3 py-1 truncate max-w-[180px]">
                          {tm.email}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Teammate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email (optional)</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Job Role</Label>
                <Input value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="Developer" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Daily Capacity (hours)</Label>
                <Input type="number" value={dailyCapacity} onChange={(e) => setDailyCapacity(e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleAddTeammate} disabled={!name || !jobRole || createTeammate.isPending} className="rounded-xl shadow-lg shadow-primary/25">
                {createTeammate.isPending ? 'Adding...' : 'Add Teammate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
