import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import { 
  Loader2, Code, ArrowRight, Eye, EyeOff, 
  Sparkles, Mail, Lock, Github, Chrome,
  Twitter, Shield, CheckCircle, ChevronLeft
} from 'lucide-react';
import { Link } from 'wouter';
import { getProjectUrl } from '@/lib/utils';
import { ECodeLogo } from '@/components/ECodeLogo';

// Import stock images
import modernSoftwareImg from '@assets/stock_images/modern_software_deve_ff7f5fd4.jpg';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  // Function to create project and navigate
  const createProjectAndNavigate = async (description: string) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: description.slice(0, 30),
          description: description,
          language: 'javascript',
          visibility: 'private'
        }),
      });

      if (response.ok) {
        const project = await response.json();
        window.sessionStorage.setItem(`agent-prompt-${project.id}`, description);
        const projectUrl = getProjectUrl(project, project.owner?.username);
        navigate(`${projectUrl}?agent=true&prompt=${encodeURIComponent(description)}`);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      navigate('/dashboard');
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const pendingAppDescription = sessionStorage.getItem('pendingAppDescription');
      const urlParams = new URLSearchParams(window.location.search);
      const shouldRedirectToAgent = urlParams.get('build') === 'true';
      
      if (shouldRedirectToAgent && pendingAppDescription) {
        sessionStorage.removeItem('pendingAppDescription');
        createProjectAndNavigate(pendingAppDescription);
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
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: "Coming Soon",
      description: `${provider} login will be available soon!`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-gray-50/50 to-background dark:from-background dark:via-gray-900/50 dark:to-background flex">
      {/* Left Side - Form - Mobile Optimized */}
      <motion.div 
        className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-16"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Back to Home */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">Back to home</span>
          </button>

          {/* Logo */}
          <div className="flex flex-col items-center justify-center mb-2">
            <ECodeLogo size="lg" showText={true} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Enterprise Development Platform</p>
          </div>

          {/* Welcome Message - Responsive Typography */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Sign in to continue building amazing applications
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username or Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username or email"
                    className="pl-10 h-12 sm:h-11 text-base sm:text-sm"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={loginMutation.isPending}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Link href="/forgot-password" className="text-sm text-orange-600 dark:text-orange-400 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-10 pr-12 h-12 sm:h-11 text-base sm:text-sm"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={loginMutation.isPending}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 -mr-2 sm:mr-0 flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5 sm:h-4 sm:w-4" /> : <Eye className="h-5 w-5 sm:h-4 sm:w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <label 
                    htmlFor="remember" 
                    className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                  >
                    Remember me for 30 days
                  </label>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 sm:h-11 text-base sm:text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, #F26207 0%, #F99D25 100%)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #D85506 0%, #E88D20 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #F26207 0%, #F99D25 100%)';
              }}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-3 gap-3">
              <Button 
                type="button"
                variant="outline" 
                className="h-12 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSocialLogin('GitHub')}
              >
                <Github className="h-5 w-5" />
              </Button>
              <Button 
                type="button"
                variant="outline" 
                className="h-12 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSocialLogin('Google')}
              >
                <Chrome className="h-5 w-5" />
              </Button>
              <Button 
                type="button"
                variant="outline" 
                className="h-12 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSocialLogin('Twitter')}
              >
                <Twitter className="h-5 w-5" />
              </Button>
            </div>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link href="/register" className="font-semibold text-violet-600 dark:text-violet-400 hover:underline">
              Sign up for free
            </Link>
          </p>

          {/* Development Quick Login */}
          {import.meta.env.DEV && (
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFormData({ username: 'testuser', password: 'testpass' });
                    setTimeout(() => {
                      const form = document.querySelector('form') as HTMLFormElement;
                      if (form) form.requestSubmit();
                    }, 100);
                  }}
                >
                  <Code className="mr-2 h-4 w-4" />
                  Quick Login (Dev Mode)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Terms */}
          <p className="text-center text-xs text-gray-500">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-gray-700 dark:hover:text-gray-300">
              Privacy Policy
            </Link>
          </p>
        </div>
      </motion.div>

      {/* Right Side - Image & Features */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-amber-500 relative overflow-hidden"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          background: 'linear-gradient(135deg, #F26207 0%, #F99D25 100%)'
        }}
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={modernSoftwareImg} 
            alt="Modern Software Development"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(135deg, rgba(242, 98, 7, 0.9) 0%, rgba(249, 157, 37, 0.9) 100%)'
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center p-12">
          <div className="max-w-md text-white space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">AI-Powered Development</span>
              </div>
              
              <h2 className="text-4xl font-bold leading-tight">
                Build faster with enterprise-grade tools
              </h2>
              
              <p className="text-lg opacity-90">
                Join millions of developers using E-Code to ship production-ready applications 10x faster.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              {[
                { icon: Shield, text: "SOC 2 Type II Certified" },
                { icon: Sparkles, text: "AI Agent builds complete apps" },
                { icon: Code, text: "Support for 50+ languages" },
                { icon: CheckCircle, text: "99.99% uptime guaranteed" }
              ].map((feature, idx) => (
                <motion.div 
                  key={idx}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                >
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <span className="text-white/90">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 pt-8 border-t border-white/20">
              <div>
                <div className="text-3xl font-bold">2M+</div>
                <div className="text-sm opacity-75">Active developers</div>
              </div>
              <div>
                <div className="text-3xl font-bold">10M+</div>
                <div className="text-sm opacity-75">Apps deployed</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}