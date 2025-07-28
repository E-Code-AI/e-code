import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Code } from 'lucide-react';
import { Link } from 'wouter';

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, loginMutation } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Check if there's a pending app description
      const pendingAppDescription = sessionStorage.getItem('pendingAppDescription');
      const urlParams = new URLSearchParams(window.location.search);
      const shouldRedirectToAgent = urlParams.get('build') === 'true';
      
      if (shouldRedirectToAgent && pendingAppDescription) {
        // Clear the stored description
        sessionStorage.removeItem('pendingAppDescription');
        // Navigate to agent with the app description
        navigate('/agent?build=' + encodeURIComponent(pendingAppDescription));
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast({
        title: 'Error',
        description: 'Please enter both username and password',
        variant: 'destructive'
      });
      return;
    }

    try {
      await loginMutation.mutateAsync(formData);
      // Navigation will happen automatically via the useEffect when user is set
    } catch (error) {
      // Error handling is done by the mutation in use-auth hook
      console.error('Login error:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="font-bold text-2xl">E-Code</span>
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={loginMutation.isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loginMutation.isPending}
                  required
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
              
              {process.env.NODE_ENV === 'development' && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/dev-login')}
                >
                  Dev Login (Development Only)
                </Button>
              )}
              
              <div className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground mt-4">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-primary">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}