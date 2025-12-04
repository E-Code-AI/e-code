import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Code2, Users, Zap, Sparkles, Shield, Github } from "lucide-react";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address").default(""),
  displayName: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      displayName: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  return (
    <div 
      className="min-h-screen flex flex-col md:flex-row bg-[var(--ecode-background)]"
      style={{ fontFamily: 'var(--ecode-font-sans)' }}
      data-testid="page-auth"
    >
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <Card 
          className="w-full max-w-md border border-[var(--ecode-border)] bg-[var(--ecode-surface)] shadow-lg transition-all duration-300 hover:shadow-xl" 
          data-testid="card-auth"
        >
          <CardHeader className="p-5 sm:p-6 pb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F26207] to-[#FF8534] flex items-center justify-center shadow-md">
                <Code2 className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-[var(--ecode-text)]">
                Welcome to E-Code
              </CardTitle>
            </div>
            <CardDescription className="text-sm sm:text-base text-[var(--ecode-text-muted)]">
              Sign in to your account or create a new one to get started.
            </CardDescription>
            
            <div className="mt-4 p-3 sm:p-4 bg-[var(--ecode-surface-tertiary)] dark:bg-[#1c2333] rounded-xl border border-[var(--ecode-border)] transition-colors duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-[#F26207]" />
                <p className="text-sm font-medium text-[var(--ecode-text)]">Quick Access</p>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2">
                  <div className="text-xs sm:text-sm text-[var(--ecode-text-muted)]">
                    <span>Email: <code className="bg-[#F26207]/10 dark:bg-[#F26207]/20 text-[#F26207] px-1.5 py-0.5 rounded font-mono text-xs">admin@test.com</code></span><br/>
                    <span>Password: <code className="bg-[#F26207]/10 dark:bg-[#F26207]/20 text-[#F26207] px-1.5 py-0.5 rounded font-mono text-xs">adminpass123</code></span>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="min-h-[40px] text-xs sm:text-sm px-4 bg-[#F26207]/10 hover:bg-[#F26207]/20 text-[#F26207] border-0 font-medium transition-all duration-200"
                    onClick={() => {
                      loginForm.setValue('email', 'admin@test.com');
                      loginForm.setValue('password', 'adminpass123');
                      setActiveTab('login');
                    }}
                    data-testid="button-use-admin"
                  >
                    Use Admin
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-5 sm:p-6 pt-4">
            <Tabs defaultValue="login" value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-5 sm:mb-6 bg-[var(--ecode-surface-tertiary)] dark:bg-[#1c2333] p-1 rounded-xl border border-[var(--ecode-border)]">
                <TabsTrigger 
                  value="login" 
                  className="rounded-lg data-[state=active]:bg-[#F26207] data-[state=active]:text-white data-[state=active]:shadow-md font-medium transition-all duration-200"
                  data-testid="tab-login"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="rounded-lg data-[state=active]:bg-[#F26207] data-[state=active]:text-white data-[state=active]:shadow-md font-medium transition-all duration-200"
                  data-testid="tab-register"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[var(--ecode-text)]">Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="your@email.com" 
                              className="min-h-[44px] border-[var(--ecode-border)] bg-[var(--ecode-surface)] focus:ring-2 focus:ring-[#F26207]/20 focus:border-[#F26207]/40 transition-all duration-200 rounded-lg"
                              data-testid="input-login-email"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[var(--ecode-text)]">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              className="min-h-[44px] border-[var(--ecode-border)] bg-[var(--ecode-surface)] focus:ring-2 focus:ring-[#F26207]/20 focus:border-[#F26207]/40 transition-all duration-200 rounded-lg"
                              data-testid="input-login-password"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-3 pt-2">
                      <Button 
                        type="submit" 
                        className="w-full min-h-[48px] bg-[#F26207] hover:bg-[#D04E00] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200" 
                        disabled={loginMutation.isPending}
                        data-testid="button-login-submit"
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                      
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-[var(--ecode-border)]" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-[var(--ecode-surface)] px-3 text-[var(--ecode-text-muted)]">Quick access</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col xs:flex-row gap-2 w-full">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="flex-1 min-h-[44px] text-xs sm:text-sm border-[#F26207]/30 bg-[#F26207]/5 hover:bg-[#F26207]/10 hover:border-[#F26207]/50 text-[#F26207] font-medium transition-all duration-200 rounded-lg"
                          onClick={() => {
                            loginForm.setValue('email', 'admin@test.com');
                            loginForm.setValue('password', 'adminpass123');
                            loginForm.handleSubmit(onLoginSubmit)();
                          }}
                          data-testid="button-oneclick-admin"
                        >
                          <Zap className="h-4 w-4 mr-1.5" />
                          One-Click Admin
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="flex-1 min-h-[44px] text-xs sm:text-sm border-[var(--ecode-border)] hover:border-[#F26207]/30 hover:bg-[#F26207]/5 text-[var(--ecode-text)] font-medium transition-all duration-200 rounded-lg"
                          onClick={() => {
                            loginForm.setValue('email', 'admin@test.com');
                            loginForm.setValue('password', 'adminpass123');
                            loginForm.handleSubmit(onLoginSubmit)();
                          }}
                          data-testid="button-oneclick-demo"
                        >
                          <Sparkles className="h-4 w-4 mr-1.5" />
                          Demo Account
                        </Button>
                      </div>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full min-h-[44px] text-sm border-[var(--ecode-border)] hover:border-[var(--ecode-border-strong)] text-[var(--ecode-text)] font-medium transition-all duration-200 rounded-lg mt-2"
                        onClick={() => {}}
                        data-testid="button-github-login"
                      >
                        <Github className="h-4 w-4 mr-2" />
                        Continue with GitHub
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[var(--ecode-text)]">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Choose a username" 
                              className="min-h-[44px] border-[var(--ecode-border)] bg-[var(--ecode-surface)] focus:ring-2 focus:ring-[#F26207]/20 focus:border-[#F26207]/40 transition-all duration-200 rounded-lg"
                              data-testid="input-register-username"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[var(--ecode-text)]">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              className="min-h-[44px] border-[var(--ecode-border)] bg-[var(--ecode-surface)] focus:ring-2 focus:ring-[#F26207]/20 focus:border-[#F26207]/40 transition-all duration-200 rounded-lg"
                              data-testid="input-register-password"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[var(--ecode-text)]">Email <span className="text-[var(--ecode-text-muted)]">(optional)</span></FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="your@email.com" 
                              className="min-h-[44px] border-[var(--ecode-border)] bg-[var(--ecode-surface)] focus:ring-2 focus:ring-[#F26207]/20 focus:border-[#F26207]/40 transition-all duration-200 rounded-lg"
                              data-testid="input-register-email"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[var(--ecode-text)]">Display Name <span className="text-[var(--ecode-text-muted)]">(optional)</span></FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your display name" 
                              className="min-h-[44px] border-[var(--ecode-border)] bg-[var(--ecode-surface)] focus:ring-2 focus:ring-[#F26207]/20 focus:border-[#F26207]/40 transition-all duration-200 rounded-lg"
                              data-testid="input-register-displayname"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full min-h-[48px] bg-[#F26207] hover:bg-[#D04E00] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 mt-2" 
                      disabled={registerMutation.isPending}
                      data-testid="button-register-submit"
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="flex justify-center p-5 pt-0">
            <p className="text-sm text-[var(--ecode-text-muted)]">
              {activeTab === "login" ? (
                <>
                  Don't have an account?{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-[#F26207] hover:text-[#D04E00] font-medium transition-colors duration-200" 
                    onClick={() => setActiveTab("register")}
                    data-testid="link-switch-register"
                  >
                    Register
                  </Button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-[#F26207] hover:text-[#D04E00] font-medium transition-colors duration-200" 
                    onClick={() => setActiveTab("login")}
                    data-testid="link-switch-login"
                  >
                    Login
                  </Button>
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>

      <div 
        className="flex-1 p-8 lg:p-12 flex flex-col justify-center hidden md:flex relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(135deg, #F26207 0%, #FF8534 50%, #F99D25 100%)',
        }}
        data-testid="hero-section"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 opacity-50" />
        </div>
        
        <div className="max-w-xl mx-auto space-y-6 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Code2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-white/90 font-medium text-lg">E-Code Platform</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Code, collaborate, and deploy with{" "}
            <span className="relative">
              <span className="relative z-10">E-Code</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-white/30 -z-0 rounded" />
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-white/90 leading-relaxed">
            E-Code is a browser-based IDE that lets you write code with friends in real-time.
            Create projects, share them, and deploy them with just a few clicks.
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-6">
            <div 
              className="rounded-xl p-5 bg-white/15 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-[1.02]"
              data-testid="feature-collaboration"
            >
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-3">
                <Users className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold mb-1.5 text-white">Real-time Collaboration</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Work together with friends or colleagues in real-time on the same project.
              </p>
            </div>
            
            <div 
              className="rounded-xl p-5 bg-white/15 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-[1.02]"
              data-testid="feature-deployment"
            >
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-3">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold mb-1.5 text-white">One-Click Deployment</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Deploy your applications with a single click and share them with the world.
              </p>
            </div>
            
            <div 
              className="rounded-xl p-5 bg-white/15 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-[1.02]"
              data-testid="feature-languages"
            >
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-3">
                <Code2 className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold mb-1.5 text-white">Multiple Languages</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Support for JavaScript, Python, HTML, CSS, and many more languages.
              </p>
            </div>
            
            <div 
              className="rounded-xl p-5 bg-white/15 backdrop-blur-sm border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-[1.02]"
              data-testid="feature-ai"
            >
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-3">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold mb-1.5 text-white">AI-Powered</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Get AI assistance for code completion, debugging, and more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
