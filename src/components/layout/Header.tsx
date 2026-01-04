import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { LayoutGrid, Users, Settings, LogOut, Bell, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, signOut, isOwner, isLeader } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: pendingRegistrations = [] } = usePendingRegistrations();
  const pendingCount = pendingRegistrations.length;

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

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const getRoleBadge = () => {
    if (isOwner) return <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-xs">Owner</Badge>;
    if (isLeader) return <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20 text-xs">Leader</Badge>;
    return <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">Teammate</Badge>;
  };

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className={cn(
          "text-muted-foreground hover:text-foreground rounded-lg px-4",
          location.pathname === '/' && "text-foreground bg-secondary font-medium",
          mobile && "w-full justify-start h-12"
        )}
        onClick={() => handleNavigation('/')}
      >
        <LayoutGrid className="mr-2 h-4 w-4" />
        Dashboard
      </Button>
      {isOwner && (
        <>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "text-muted-foreground hover:text-foreground rounded-lg px-4",
              location.pathname === '/team' && "text-foreground bg-secondary font-medium",
              mobile && "w-full justify-start h-12"
            )}
            onClick={() => handleNavigation('/team')}
          >
            <Users className="mr-2 h-4 w-4" />
            Team
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "text-muted-foreground hover:text-foreground rounded-lg px-4 relative",
              location.pathname === '/users' && "text-foreground bg-secondary font-medium",
              mobile && "w-full justify-start h-12"
            )}
            onClick={() => handleNavigation('/users')}
          >
            <Bell className="mr-2 h-4 w-4" />
            Users
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 md:-top-1 md:-right-1 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </Button>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-xl shadow-card">
      <div className="container flex h-14 md:h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
              <LayoutGrid className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight">Capacify</span>
          </div>
          
          {(isOwner || isLeader) && (
            <nav className="hidden md:flex items-center gap-1">
              <NavItems />
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />
          <div className="hidden sm:block">
            {getRoleBadge()}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 md:h-10 md:w-10 rounded-full ring-2 ring-border hover:ring-primary/50 transition-all">
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarImage src={authUser?.profile?.avatar_url || undefined} alt={authUser?.profile?.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs md:text-sm font-semibold">
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
              <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer rounded-lg">
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

          {/* Mobile menu */}
          {(isOwner || isLeader) && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Navigation</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 mt-6">
                  <NavItems mobile />
                </div>
              </SheetContent>
            </Sheet>
          )}

          <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
      </div>
    </header>
  );
}
