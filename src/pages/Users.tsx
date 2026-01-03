import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAllUsersWithRoles, useAddUserRole, useRemoveUserRole } from '@/hooks/useUserRoles';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Users, Shield, ShieldCheck, UserCheck } from 'lucide-react';
import { AppRole } from '@/types';

export default function UsersPage() {
  const { authUser, loading, isOwner } = useAuth();
  const { data: usersWithRoles = [], isLoading } = useAllUsersWithRoles();
  const addRole = useAddUserRole();
  const removeRole = useRemoveUserRole();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'add' | 'remove';
    userId: string;
    role: AppRole;
    userName: string;
  } | null>(null);

  // Unique users (deduplicated by user_id), sorted by role priority
  const uniqueUsers = useMemo(() => {
    const userMap = new Map<string, typeof usersWithRoles[0]>();
    
    // Sort by role priority first
    const sorted = [...usersWithRoles].sort((a, b) => {
      const roleOrder = { owner: 0, leader: 1, teammate: 2 };
      return roleOrder[a.role] - roleOrder[b.role];
    });
    
    // Keep first occurrence (highest priority role)
    sorted.forEach(u => {
      if (!userMap.has(u.user_id)) {
        userMap.set(u.user_id, u);
      }
    });
    
    return Array.from(userMap.values());
  }, [usersWithRoles]);

  // Get all roles for a user
  const getUserRoles = (userId: string) => {
    const roles = usersWithRoles.filter(u => u.user_id === userId).map(u => u.role);
    // Remove duplicates
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
    setConfirmDialog({
      open: true,
      action: 'add',
      userId,
      role: 'leader',
      userName,
    });
  };

  const handleDemoteFromLeader = (userId: string, userName: string) => {
    setConfirmDialog({
      open: true,
      action: 'remove',
      userId,
      role: 'leader',
      userName,
    });
  };

  const handleConfirm = async () => {
    if (!confirmDialog) return;

    if (confirmDialog.action === 'add') {
      await addRole.mutateAsync({ userId: confirmDialog.userId, role: confirmDialog.role });
    } else {
      await removeRole.mutateAsync({ userId: confirmDialog.userId, role: confirmDialog.role });
    }
    setConfirmDialog(null);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="space-y-8 animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground text-lg">View all registered users and manage their roles</p>
          </div>

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
                <p className="text-sm">Users will appear here after they sign up</p>
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
                              onClick={() => handleDemoteFromLeader(userRole.user_id, displayName)}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Remove Leader Role
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={confirmDialog?.open ?? false} onOpenChange={(open) => !open && setConfirmDialog(null)}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {confirmDialog?.action === 'add' ? 'Promote to Leader' : 'Remove Leader Role'}
              </DialogTitle>
              <DialogDescription>
                {confirmDialog?.action === 'add'
                  ? `Are you sure you want to promote ${confirmDialog?.userName} to Leader? They will be able to assign tasks but won't appear in the capacity grid.`
                  : `Are you sure you want to remove the Leader role from ${confirmDialog?.userName}?`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirmDialog(null)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={addRole.isPending || removeRole.isPending}
                className="rounded-xl shadow-lg shadow-primary/25"
              >
                {addRole.isPending || removeRole.isPending ? 'Processing...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
