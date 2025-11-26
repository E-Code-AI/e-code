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
import { Loader2 } from "lucide-react";

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

  // Redirect to home if user is already logged in
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
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md" data-testid="card-auth">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl font-bold">Welcome to E-Code</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Sign in to your account or create a new one to get started.
            </CardDescription>
            <div className="mt-2 p-2 sm:p-3 bg-muted rounded-md text-xs sm:text-sm">
              <p className="mb-1"><strong>Demo accounts:</strong></p>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2">
                  <div className="text-[10px] xs:text-xs sm:text-sm">
                    <span>Email: <code className="bg-slate-700 px-1 rounded">admin@replit.com</code></span><br/>
                    <span>Password: <code className="bg-slate-700 px-1 rounded">admin</code></span>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="min-h-[44px] text-xs sm:text-sm px-3"
                    onClick={() => {
                      loginForm.setValue('email', 'admin@replit.com');
                      loginForm.setValue('password', 'admin');
                      setActiveTab('login');
                    }}
                    data-testid="button-use-admin"
                  >
                    Use Admin
                  </Button>
                </div>
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-2 mt-1">
                  <div className="text-[10px] xs:text-xs sm:text-sm">
                    <span>Email: <code className="bg-slate-700 px-1 rounded">test@ecode.com</code></span><br/>
                    <span>Password: <code className="bg-slate-700 px-1 rounded">admin123</code></span>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="min-h-[44px] text-xs sm:text-sm px-3"
                    onClick={() => {
                      loginForm.setValue('email', 'test@ecode.com');
                      loginForm.setValue('password', 'admin123');
                      setActiveTab('login');
                    }}
                    data-testid="button-use-demo"
                  >
                    Use Demo
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <Tabs defaultValue="login" value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
                <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-3 sm:space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Your email" 
                              className="min-h-[44px]"
                              data-testid="input-login-email"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Your password" 
                              className="min-h-[44px]"
                              data-testid="input-login-password"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2 sm:space-y-3">
                      <Button 
                        type="submit" 
                        className="w-full min-h-[44px]" 
                        disabled={loginMutation.isPending}
                        data-testid="button-login-submit"
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging in...
                          </>
                        ) : (
                          "Login"
                        )}
                      </Button>
                      
                      <div className="flex flex-col xs:flex-row gap-2 w-full">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="flex-1 min-h-[44px] text-xs sm:text-sm"
                          onClick={() => {
                            loginForm.setValue('email', 'admin@replit.com');
                            loginForm.setValue('password', 'admin');
                            loginForm.handleSubmit(onLoginSubmit)();
                          }}
                          data-testid="button-oneclick-admin"
                        >
                          One-Click Admin
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="flex-1 min-h-[44px] text-xs sm:text-sm"
                          onClick={() => {
                            loginForm.setValue('email', 'test@ecode.com');
                            loginForm.setValue('password', 'admin123');
                            loginForm.handleSubmit(onLoginSubmit)();
                          }}
                          data-testid="button-oneclick-demo"
                        >
                          One-Click Demo
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3 sm:space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Choose a username" 
                              className="min-h-[44px]"
                              data-testid="input-register-username"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Choose a password" 
                              className="min-h-[44px]"
                              data-testid="input-register-password"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Email (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="Your email address" 
                              className="min-h-[44px]"
                              data-testid="input-register-email"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Display Name (optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your display name" 
                              className="min-h-[44px]"
                              data-testid="input-register-displayname"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full min-h-[44px]" 
                      disabled={registerMutation.isPending}
                      data-testid="button-register-submit"
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        "Register"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              {activeTab === "login" ? (
                <>
                  Don't have an account?{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab("register")}>
                    Register
                  </Button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab("login")}>
                    Login
                  </Button>
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>

      <div className="flex-1 bg-gradient-to-br from-primary/20 to-primary/10 p-8 flex flex-col justify-center hidden md:flex">
        <div className="max-w-xl mx-auto space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Code, collaborate, and deploy with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">PLOT</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            PLOT is a browser-based IDE that lets you write code with friends in real-time.
            Create projects, share them, and deploy them with just a few clicks.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-medium mb-2">Real-time Collaboration</h3>
              <p className="text-sm text-muted-foreground">
                Work together with friends or colleagues in real-time on the same project.
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-medium mb-2">One-Click Deployment</h3>
              <p className="text-sm text-muted-foreground">
                Deploy your applications with a single click and share them with the world.
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-medium mb-2">Multiple Languages</h3>
              <p className="text-sm text-muted-foreground">
                Support for JavaScript, Python, HTML, CSS, and many more languages.
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="font-medium mb-2">Free to Use</h3>
              <p className="text-sm text-muted-foreground">
                Get started for free and upgrade as your needs grow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}