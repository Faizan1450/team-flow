import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LayoutGrid, Loader2 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long')
});

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user, authUser, loading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupFullName, setSignupFullName] = useState('');

  useEffect(() => {
    // Only navigate when authUser is fully loaded (not just user)
    if (authUser && !loading) {
      navigate('/');
    }
  }, [authUser, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else {
        setError(error.message);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    const validation = signupSchema.safeParse({
      email: signupEmail,
      password: signupPassword,
      username: signupUsername,
      fullName: signupFullName
    });
    
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupUsername, signupFullName);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(error.message);
      }
    } else {
      setSuccess('Account created successfully! You can now sign in.');
      setSignupEmail('');
      setSignupPassword('');
      setSignupUsername('');
      setSignupFullName('');
    }
  };

  // Show loading while auth is initializing OR while user exists but authUser is still loading
  if (loading || (user && !authUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/25">
            <LayoutGrid className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Capacify</h1>
            <p className="text-muted-foreground mt-2">
              Team capacity planning made simple
            </p>
          </div>
        </div>

        <Card className="shadow-elevated border-border/50 rounded-2xl overflow-hidden">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4 pt-6 px-6">
              <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl bg-secondary p-1">
                <TabsTrigger value="login" className="rounded-lg font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg font-medium">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent className="px-6 pb-6">
              {error && (
                <Alert variant="destructive" className="mb-4 rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="mb-4 border-capacity-low/30 bg-capacity-low/10 rounded-xl">
                  <AlertDescription className="text-capacity-low">{success}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl font-semibold shadow-lg shadow-primary/25" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-username" className="text-sm font-medium">Username</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="johndoe"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl font-semibold shadow-lg shadow-primary/25" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
