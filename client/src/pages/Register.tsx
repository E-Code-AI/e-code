import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, Code, AlertCircle, ArrowRight, Eye, EyeOff,
  Mail, Lock, User, Github, Chrome, Twitter, CheckCircle2,
  X, Shield, Sparkles, ChevronLeft, Zap, CheckCircle
} from 'lucide-react';
import { Link } from 'wouter';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ECodeLogo } from '@/components/ECodeLogo';

import codingWorkspaceImg from '@assets/stock_images/coding_programming_l_3c65a90d.jpg';

const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  const percentage = (score / 6) * 100;
  
  if (percentage <= 25) return { score: percentage, label: 'Weak', color: 'bg-red-500' };
  if (percentage <= 50) return { score: percentage, label: 'Fair', color: 'bg-orange-500' };
  if (percentage <= 75) return { score: percentage, label: 'Good', color: 'bg-yellow-500' };
  return { score: percentage, label: 'Strong', color: 'bg-green-500' };
};

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: 'bg-gray-300' });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  const passwordRequirements = [
    { met: formData.password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(formData.password), text: 'One uppercase letter' },
    { met: /[a-z]/.test(formData.password), text: 'One lowercase letter' },
    { met: /[0-9]/.test(formData.password), text: 'One number' },
    { met: /[^a-zA-Z0-9]/.test(formData.password), text: 'One special character' }
  ];

  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    } else {
      setPasswordStrength({ score: 0, label: '', color: 'bg-gray-300' });
    }
  }, [formData.password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    
    const validationErrors: string[] = [];
    
    if (!formData.username || !formData.email || !formData.password) {
      validationErrors.push('Please fill in all required fields');
    }
    
    if (formData.password !== formData.confirmPassword) {
      validationErrors.push('Passwords do not match');
    }
    
    if (formData.password.length < 8) {
      validationErrors.push('Password must be at least 8 characters long');
    }

    if (!acceptTerms) {
      validationErrors.push('Please accept the terms and conditions');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    
    try {
      const data = await apiRequest('POST', '/api/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName || formData.username
      });
      
      toast({
        title: 'Success!',
        description: data.message || 'Account created successfully. Please check your email to verify.',
      });
      
      const pendingAppDescription = sessionStorage.getItem('pendingAppDescription');
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get('redirect');
      
      if (redirectParam === 'build-from-prompt' && pendingAppDescription) {
        sessionStorage.setItem('triggerBuildOnLanding', 'true');
        navigate('/');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      try {
        const errorText = error.message || String(error);
        
        const jsonMatch = errorText.match(/\d+:\s*(\{.*\})/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[1]);
          if (errorData.errors && Array.isArray(errorData.errors)) {
            setErrors(errorData.errors.map((e: any) => e.message || e));
          } else if (errorData.message) {
            setErrors([errorData.message]);
          } else {
            setErrors(['Registration failed. Please try again.']);
          }
        } else {
          setErrors([errorText || 'Something went wrong. Please try again.']);
        }
      } catch (parseError) {
        setErrors(['Something went wrong. Please try again.']);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSocialSignup = (provider: string) => {
    toast({
      title: "Coming Soon",
      description: `${provider} signup will be available soon!`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-gray-50/50 to-background dark:from-background dark:via-gray-900/50 dark:to-background flex">
      {/* Left Side - Form - Mobile Optimized */}
      <motion.div 
        className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-16 overflow-y-auto"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="w-full max-w-md space-y-4 sm:space-y-6">
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
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Create your account</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Get started with a free account. No credit card required.
            </p>
          </div>

          {/* Errors */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form - Mobile Responsive */}
          <form onSubmit={handleRegister} className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="johndoe"
                    className="pl-10 h-12 sm:h-11 text-base sm:text-sm"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    required
                    data-testid="input-username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm font-medium">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  placeholder="John Doe"
                  className="h-12 sm:h-11 text-base sm:text-sm"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  className="pl-10 h-12 sm:h-11 text-base sm:text-sm"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                  data-testid="input-register-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  className="pl-10 pr-12 h-12 sm:h-11 text-base sm:text-sm"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                  data-testid="input-register-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 -mr-2 sm:mr-0 flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="h-5 w-5 sm:h-4 sm:w-4" /> : <Eye className="h-5 w-5 sm:h-4 sm:w-4" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Password strength</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength.color.replace('bg-', 'text-')
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <Progress value={passwordStrength.score} className="h-2" />
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {passwordRequirements.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-xs">
                        {req.met ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <X className="h-3 w-3 text-gray-300" />
                        )}
                        <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  className="pl-10 pr-12 h-12 sm:h-11 text-base sm:text-sm"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 -mr-2 sm:mr-0 flex items-center justify-center"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5 sm:h-4 sm:w-4" /> : <Eye className="h-5 w-5 sm:h-4 sm:w-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              />
              <label 
                htmlFor="terms" 
                className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
              >
                I agree to the{' '}
                <Link href="/terms" className="text-orange-600 dark:text-orange-400 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-orange-600 dark:text-orange-400 hover:underline">
                  Privacy Policy
                </Link>
              </label>
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
              disabled={isLoading || !acceptTerms}
              data-testid="button-register"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create free account
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
                <span className="bg-background px-2 text-gray-500">Or sign up with</span>
              </div>
            </div>

            {/* Social Signup */}
            <div className="grid grid-cols-3 gap-3">
              <Button 
                type="button"
                variant="outline" 
                className="h-12 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSocialSignup('GitHub')}
              >
                <Github className="h-5 w-5" />
              </Button>
              <Button 
                type="button"
                variant="outline" 
                className="h-12 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSocialSignup('Google')}
              >
                <Chrome className="h-5 w-5" />
              </Button>
              <Button 
                type="button"
                variant="outline" 
                className="h-12 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSocialSignup('Twitter')}
              >
                <Twitter className="h-5 w-5" />
              </Button>
            </div>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-orange-600 dark:text-orange-400 hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </p>

          {/* Terms */}
          <p className="text-center text-xs text-gray-500">
            By signing up, you agree to our{' '}
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
            src={codingWorkspaceImg} 
            alt="Coding Workspace"
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
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">Get Started in Seconds</span>
              </div>
              
              <h2 className="text-4xl font-bold leading-tight">
                Join millions of developers worldwide
              </h2>
              
              <p className="text-lg opacity-90">
                Start building production-ready applications with AI assistance, enterprise security, and unlimited scalability.
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
