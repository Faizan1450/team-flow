import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Users, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, signOut, isOwner, isLeader } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getRoleBadge = () => {
    if (isOwner) return <Badge>Owner</Badge>;
    if (isLeader) return <Badge variant="secondary">Leader</Badge>;
    return <Badge variant="outline">Teammate</Badge>;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <LayoutGrid className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Capacify</span>
          </div>
          
          {(isOwner || isLeader) && (
            <nav className="hidden md:flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  location.pathname === '/' && "text-foreground bg-muted"
                )}
                onClick={() => navigate('/')}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              {isOwner && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    location.pathname === '/team' && "text-foreground bg-muted"
                  )}
                  onClick={() => navigate('/team')}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Team
                </Button>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {getRoleBadge()}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {authUser?.profile ? getInitials(authUser.profile.full_name) : '?'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{authUser?.profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{authUser?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
