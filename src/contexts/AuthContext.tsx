import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Profile, AuthUser } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  authUser: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isOwner: boolean;
  isLeader: boolean;
  isTeammate: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const roles = rolesData?.map(r => r.role as AppRole) || [];

      return {
        profile: profile as Profile | undefined,
        roles
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { profile: undefined, roles: [] };
    }
  };

  useEffect(() => {
    let rolesSubscription: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;
    let initialSessionHandled = false;

    const setupRolesSubscription = (userId: string) => {
      if (rolesSubscription) return; // Prevent duplicate subscriptions
      
      rolesSubscription = supabase
        .channel(`user-roles-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_roles',
            filter: `user_id=eq.${userId}`
          },
          async () => {
            console.log('Role change detected, refreshing user data...');
            const { profile, roles } = await fetchUserData(userId);
            if (isMounted) {
              setAuthUser(prev => prev ? {
                ...prev,
                profile,
                roles
              } : null);
            }
          }
        )
        .subscribe();
    };

    const handleSession = async (session: Session | null, isInitial: boolean = false) => {
      if (!isMounted) return;
      
      // Skip if this is from getSession and we already handled via onAuthStateChange
      if (isInitial && initialSessionHandled) return;
      if (!isInitial) initialSessionHandled = true;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { profile, roles } = await fetchUserData(session.user.id);
        if (isMounted) {
          setAuthUser({
            id: session.user.id,
            email: session.user.email || '',
            profile,
            roles
          });
          setLoading(false);
          setupRolesSubscription(session.user.id);
        }
      } else {
        if (isMounted) {
          setAuthUser(null);
          setLoading(false);
        }
      }
    };

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(() => {
          handleSession(session);
        }, 0);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session, true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (rolesSubscription) {
        supabase.removeChannel(rolesSubscription);
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, username: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
          full_name: fullName
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    const { profile, roles } = await fetchUserData(user.id);
    setAuthUser(prev => prev ? {
      ...prev,
      profile,
      roles
    } : null);
  };

  const isOwner = authUser?.roles.includes('owner') || false;
  const isLeader = authUser?.roles.includes('leader') || isOwner;
  const isTeammate = authUser?.roles.includes('teammate') || false;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authUser,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        isOwner,
        isLeader,
        isTeammate
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
