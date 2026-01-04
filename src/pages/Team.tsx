import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeammates, useCreateTeammate, useDeleteTeammate } from '@/hooks/useTeammates';
import { Header } from '@/components/layout/Header';
import { ManageOffDaysModal } from '@/components/team/ManageOffDaysModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, Loader2, Users, Briefcase, Clock, CalendarOff, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [createLoginCredentials, setCreateLoginCredentials] = useState(false);
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [offDaysModal, setOffDaysModal] = useState<{
    open: boolean;
    teammateId: string;
    teammateName: string;
    workingDays: number[];
  } | null>(null);

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
    if (createLoginCredentials && (!email || !password)) {
      toast.error('Email and password are required to create login credentials');
      return;
    }
    if (createLoginCredentials && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsCreating(true);
    let userId: string | undefined;

    try {
      // If creating login credentials, call the edge function first
      if (createLoginCredentials && email && password) {
        const { data: session } = await supabase.auth.getSession();
        
        const response = await supabase.functions.invoke('create-teammate-user', {
          body: {
            email,
            password,
            fullName: name,
            username: email
          }
        });

        if (response.error) {
          throw new Error(response.error.message || 'Failed to create user');
        }

        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        userId = response.data.userId;
        toast.success(`Login credentials created for ${name}`);
      }

      // Create the teammate record
      await createTeammate.mutateAsync({
        name,
        email: email || undefined,
        job_role: jobRole,
        daily_capacity: parseInt(dailyCapacity) || 8,
        working_days: [1, 2, 3, 4, 5],
        user_id: userId,
      });

      // Reset form
      setName('');
      setEmail('');
      setJobRole('');
      setDailyCapacity('8');
      setPassword('');
      setCreateLoginCredentials(false);
      setShowAdd(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add teammate');
    } finally {
      setIsCreating(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 md:px-8 py-4 md:py-8">
        <div className="space-y-4 md:space-y-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 md:space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Team Management</h1>
              <p className="text-muted-foreground text-sm md:text-lg">Add and manage your team members</p>
            </div>
            <Button onClick={() => setShowAdd(true)} className="rounded-xl shadow-lg shadow-primary/25 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Teammate
            </Button>
          </div>

          {isLoading ? (
            <Card className="flex justify-center py-12 md:py-16 shadow-card rounded-2xl">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading teammates...</p>
              </div>
            </Card>
          ) : teammates.length === 0 ? (
            <Card className="shadow-card rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-12 md:py-16 text-muted-foreground">
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-2xl bg-secondary flex items-center justify-center mb-3 md:mb-4">
                  <Users className="h-6 w-6 md:h-8 md:w-8 opacity-50" />
                </div>
                <p className="text-base md:text-lg mb-1 font-medium">No teammates yet</p>
                <p className="text-xs md:text-sm text-center">Add team members to start planning capacity</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teammates.map((tm) => (
                <Card key={tm.id} className="shadow-card rounded-2xl card-hover overflow-hidden">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 md:h-12 md:w-12 ring-2 ring-border shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold text-sm md:text-base">
                            {getInitials(tm.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-base md:text-lg truncate">{tm.name}</div>
                          <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                            <Briefcase className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
                            <span className="truncate">{tm.job_role}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-8 w-8 md:h-9 md:w-9 shrink-0"
                        onClick={() => deleteTeammate.mutate(tm.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-4 md:mt-5 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-lg px-2 md:px-3 py-1 flex items-center gap-1 md:gap-1.5 text-xs">
                        <Clock className="h-3 w-3" />
                        {tm.daily_capacity}h/day
                      </Badge>
                      {tm.email && (
                        <Badge variant="outline" className="rounded-lg px-2 md:px-3 py-1 truncate max-w-[140px] md:max-w-[180px] text-xs">
                          {tm.email}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 md:mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl text-xs md:text-sm h-9 md:h-10"
                        onClick={() => setOffDaysModal({
                          open: true,
                          teammateId: tm.id,
                          teammateName: tm.name,
                          workingDays: tm.working_days,
                        })}
                      >
                        <CalendarOff className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
                        Manage Off Days
                      </Button>
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
                <Label className="text-sm font-medium">Email {createLoginCredentials ? '' : '(optional)'}</Label>
                <Input 
                  type="email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="john@example.com" 
                  className="h-11 rounded-xl"
                  required={createLoginCredentials}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Job Role</Label>
                <Input value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="Developer" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Daily Capacity (hours)</Label>
                <Input type="number" value={dailyCapacity} onChange={(e) => setDailyCapacity(e.target.value)} className="h-11 rounded-xl" />
              </div>
              
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Checkbox 
                    id="createLogin" 
                    checked={createLoginCredentials}
                    onCheckedChange={(checked) => setCreateLoginCredentials(checked === true)}
                  />
                  <Label htmlFor="createLogin" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Create login credentials
                  </Label>
                </div>
                
                {createLoginCredentials && (
                  <div className="space-y-2 animate-fade-in">
                    <Label className="text-sm font-medium">Password</Label>
                    <Input 
                      type="password"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Min 6 characters" 
                      className="h-11 rounded-xl"
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Share these credentials with the teammate so they can login
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
              <Button 
                onClick={handleAddTeammate} 
                disabled={!name || !jobRole || isCreating || (createLoginCredentials && (!email || !password))} 
                className="rounded-xl shadow-lg shadow-primary/25"
              >
                {isCreating ? 'Creating...' : 'Add Teammate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {offDaysModal && (
          <ManageOffDaysModal
            open={offDaysModal.open}
            onClose={() => setOffDaysModal(null)}
            teammateId={offDaysModal.teammateId}
            teammateName={offDaysModal.teammateName}
            workingDays={offDaysModal.workingDays}
          />
        )}
      </main>
    </div>
  );
}
