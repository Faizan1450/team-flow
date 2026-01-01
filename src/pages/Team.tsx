import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeammates, useCreateTeammate, useDeleteTeammate } from '@/hooks/useTeammates';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Trash2, Loader2, Users } from 'lucide-react';

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <main className="container py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Team Management</h1>
              <p className="text-muted-foreground">Add and manage your team members</p>
            </div>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Teammate
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : teammates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-lg mb-1">No teammates yet</p>
                <p className="text-sm">Add team members to start planning capacity</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teammates.map((tm) => (
                <Card key={tm.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(tm.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{tm.name}</div>
                          <div className="text-sm text-muted-foreground">{tm.job_role}</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteTeammate.mutate(tm.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Badge variant="outline">{tm.daily_capacity}h/day</Badge>
                      {tm.email && (
                        <Badge variant="secondary" className="truncate max-w-[150px]">
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Teammate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Job Role</Label>
                <Input value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="Developer" />
              </div>
              <div className="space-y-2">
                <Label>Daily Capacity (hours)</Label>
                <Input type="number" value={dailyCapacity} onChange={(e) => setDailyCapacity(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAddTeammate} disabled={!name || !jobRole || createTeammate.isPending}>
                {createTeammate.isPending ? 'Adding...' : 'Add Teammate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
