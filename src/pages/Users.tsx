import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAllUsersWithRoles, usePromoteToLeader, useDeleteUser } from '@/hooks/useUserRoles';
import { usePendingRegistrations, useRejectRegistration } from '@/hooks/usePendingRegistrations';
import { ApproveRegistrationModal } from '@/components/users/ApproveRegistrationModal';
import { DemoteToTeammateModal } from '@/components/users/DemoteToTeammateModal';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Loader2, Users, Shield, ShieldCheck, UserCheck, 
  Clock, Check, X, UserPlus, Trash2 
} from 'lucide-react';
import { AppRole, Profile } from '@/types';
import { format } from 'date-fns';
import { PendingRegistration } from '@/hooks/usePendingRegistrations';

export default function UsersPage() {
  const { authUser, loading, isOwner } = useAuth();
  const { data: usersWithRoles = [], isLoading } = useAllUsersWithRoles();
  const { data: pendingRegistrations = [], isLoading: loadingPending } = usePendingRegistrations();
  const promoteToLeader = usePromoteToLeader();
  const rejectRegistration = useRejectRegistration();
  const deleteUser = useDeleteUser();

  const [promoteDialog, setPromoteDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  } | null>(null);

  const [demoteModal, setDemoteModal] = useState<{
    open: boolean;
    user: { user_id: string; profile?: Profile } | null;
  }>({ open: false, user: null });

  const [approveModal, setApproveModal] = useState<{
    open: boolean;
    registration: PendingRegistration | null;
  }>({ open: false, registration: null });

  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    registration: PendingRegistration | null;
  }>({ open: false, registration: null });

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  } | null>(null);

  // Unique users (deduplicated by user_id), sorted by role priority
  const uniqueUsers = useMemo(() => {
    const userMap = new Map<string, typeof usersWithRoles[0]>();
    
    const sorted = [...usersWithRoles].sort((a, b) => {
      const roleOrder = { owner: 0, leader: 1, teammate: 2 };
      return roleOrder[a.role] - roleOrder[b.role];
    });
    
    sorted.forEach(u => {
      if (!userMap.has(u.user_id)) {
        userMap.set(u.user_id, u);
      }
    });
    
    return Array.from(userMap.values());
  }, [usersWithRoles]);

  const getUserRoles = (userId: string) => {
    const roles = usersWithRoles.filter(u => u.user_id === userId).map(u => u.role);
    return [...new Set(roles)];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading users...</p>
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

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handlePromoteToLeader = (userId: string, userName: string) => {
    setPromoteDialog({
      open: true,
      userId,
      userName,
    });
  };

  const handleDemoteFromLeader = (userRole: typeof usersWithRoles[0]) => {
    setDemoteModal({
      open: true,
      user: { user_id: userRole.user_id, profile: userRole.profile },
    });
  };

  const handleConfirmPromotion = async () => {
    if (!promoteDialog) return;
    await promoteToLeader.mutateAsync({ userId: promoteDialog.userId });
    setPromoteDialog(null);
  };

  const handleReject = async () => {
    if (!rejectDialog.registration) return;
    await rejectRegistration.mutateAsync(rejectDialog.registration.id);
    setRejectDialog({ open: false, registration: null });
  };

  const handleDeleteUser = async () => {
    if (!deleteDialog) return;
    await deleteUser.mutateAsync(deleteDialog.userId);
    setDeleteDialog(null);
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case 'owner':
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30 rounded-lg px-3 py-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            Owner
          </Badge>
        );
      case 'leader':
        return (
          <Badge className="bg-accent/20 text-accent-foreground border-accent/30 rounded-lg px-3 py-1 flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            Leader
          </Badge>
        );
      case 'teammate':
        return (
          <Badge variant="secondary" className="rounded-lg px-3 py-1 flex items-center gap-1.5">
            <UserCheck className="h-3 w-3" />
            Teammate
          </Badge>
        );
    }
  };

  const pendingCount = pendingRegistrations.length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="space-y-8 animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground text-lg">Manage registrations and user roles</p>
          </div>

          <Tabs defaultValue={pendingCount > 0 ? 'pending' : 'approved'} className="space-y-6">
            <TabsList className="h-12 rounded-xl bg-secondary p-1">
              <TabsTrigger value="pending" className="rounded-lg px-6 data-[state=active]:shadow-md relative">
                <UserPlus className="mr-2 h-4 w-4" />
                Pending
                {pendingCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="rounded-lg px-6 data-[state=active]:shadow-md">
                <Users className="mr-2 h-4 w-4" />
                All Users
              </TabsTrigger>
            </TabsList>

            {/* Pending Registrations Tab */}
            <TabsContent value="pending">
              {loadingPending ? (
                <Card className="flex justify-center py-16 shadow-card rounded-2xl">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading pending registrations...</p>
                  </div>
                </Card>
              ) : pendingRegistrations.length === 0 ? (
                <Card className="shadow-card rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                      <Clock className="h-8 w-8 opacity-50" />
                    </div>
                    <p className="text-lg mb-1 font-medium">No pending registrations</p>
                    <p className="text-sm">New user registrations will appear here for approval</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingRegistrations.map((reg) => (
                    <Card key={reg.id} className="shadow-card rounded-2xl card-hover overflow-hidden border-l-4 border-l-warning">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12 ring-2 ring-border">
                            <AvatarFallback className="bg-gradient-to-br from-warning to-warning/60 text-warning-foreground font-semibold">
                              {getInitials(reg.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-lg truncate">{reg.full_name}</div>
                            <div className="text-sm text-muted-foreground truncate">@{reg.username}</div>
                            <div className="text-xs text-muted-foreground truncate">{reg.email}</div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Registered {format(new Date(reg.created_at), 'MMM d, yyyy')}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            className="rounded-xl flex-1 shadow-lg shadow-primary/25"
                            onClick={() => setApproveModal({ open: true, registration: reg })}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setRejectDialog({ open: true, registration: reg })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* All Users Tab */}
            <TabsContent value="approved">
              {isLoading ? (
                <Card className="flex justify-center py-16 shadow-card rounded-2xl">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading users...</p>
                  </div>
                </Card>
              ) : uniqueUsers.length === 0 ? (
                <Card className="shadow-card rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 opacity-50" />
                    </div>
                    <p className="text-lg mb-1 font-medium">No users yet</p>
                    <p className="text-sm">Approved users will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {uniqueUsers.map((userRole) => {
                    const displayName = userRole.profile?.full_name || userRole.profile?.username || 'Unknown User';
                    const userRoles = getUserRoles(userRole.user_id);
                    const isLeader = userRoles.includes('leader');
                    const isOwnerUser = userRoles.includes('owner');
                    const canPromote = !isOwnerUser && !isLeader;
                    const canDemote = isLeader;

                    return (
                      <Card key={userRole.user_id} className="shadow-card rounded-2xl card-hover overflow-hidden">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 ring-2 ring-border">
                                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                                  {getInitials(displayName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-lg">{displayName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {userRole.profile?.username || 'No username'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-5 flex flex-wrap gap-2">
                            {userRoles.map(role => (
                              <span key={role}>{getRoleBadge(role)}</span>
                            ))}
                          </div>
                          {!isOwnerUser && (
                            <div className="mt-4 space-y-2">
                              {canPromote && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl w-full"
                                  onClick={() => handlePromoteToLeader(userRole.user_id, displayName)}
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Promote to Leader
                                </Button>
                              )}
                              {canDemote && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl w-full text-destructive hover:text-destructive"
                                  onClick={() => handleDemoteFromLeader(userRole)}
                                >
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Demote to Teammate
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteDialog({
                                  open: true,
                                  userId: userRole.user_id,
                                  userName: displayName,
                                })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove User
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Approve Registration Modal */}
        <ApproveRegistrationModal
          registration={approveModal.registration}
          open={approveModal.open}
          onClose={() => setApproveModal({ open: false, registration: null })}
        />

        {/* Reject Confirmation Dialog */}
        <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, registration: null })}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Reject Registration</DialogTitle>
              <DialogDescription>
                Are you sure you want to reject <strong>{rejectDialog.registration?.full_name}</strong>? 
                They will not be able to access the application.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRejectDialog({ open: false, registration: null })} className="rounded-xl">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectRegistration.isPending}
                className="rounded-xl"
              >
                {rejectRegistration.isPending ? 'Rejecting...' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Promote to Leader Dialog */}
        <Dialog open={promoteDialog?.open ?? false} onOpenChange={(open) => !open && setPromoteDialog(null)}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Promote to Leader</DialogTitle>
              <DialogDescription>
                Are you sure you want to promote <strong>{promoteDialog?.userName}</strong> to Leader? 
                They will be able to assign tasks but won't appear in the capacity grid.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPromoteDialog(null)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPromotion}
                disabled={promoteToLeader.isPending}
                className="rounded-xl shadow-lg shadow-primary/25"
              >
                {promoteToLeader.isPending ? 'Promoting...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Demote to Teammate Modal */}
        <DemoteToTeammateModal
          user={demoteModal.user}
          open={demoteModal.open}
          onClose={() => setDemoteModal({ open: false, user: null })}
        />

        {/* Delete User Dialog */}
        <Dialog open={deleteDialog?.open ?? false} onOpenChange={(open) => !open && setDeleteDialog(null)}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Remove User</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently remove <strong>{deleteDialog?.userName}</strong>? 
                This action cannot be undone. All their data including tasks will be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteDialog(null)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={deleteUser.isPending}
                className="rounded-xl"
              >
                {deleteUser.isPending ? 'Removing...' : 'Remove User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
