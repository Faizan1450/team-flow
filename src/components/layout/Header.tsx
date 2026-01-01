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
import { ThemeToggle } from '@/components/ThemeToggle';
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
    if (isOwner) return <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">Owner</Badge>;
    if (isLeader) return <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">Leader</Badge>;
    return <Badge variant="outline" className="bg-muted text-muted-foreground">Teammate</Badge>;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-xl shadow-card">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
              <LayoutGrid className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Capacify</span>
          </div>
          
          {(isOwner || isLeader) && (
            <nav className="hidden md:flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "text-muted-foreground hover:text-foreground rounded-lg px-4",
                  location.pathname === '/' && "text-foreground bg-secondary font-medium"
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
                    "text-muted-foreground hover:text-foreground rounded-lg px-4",
                    location.pathname === '/team' && "text-foreground bg-secondary font-medium"
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

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {getRoleBadge()}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-border hover:ring-primary/50 transition-all">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-semibold">
                    {authUser?.profile ? getInitials(authUser.profile.full_name) : '?'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-elevated">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold">{authUser?.profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{authUser?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer rounded-lg">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer rounded-lg focus:bg-destructive/10">
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
