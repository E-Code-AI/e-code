import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  Zap, Globe, Users, Shield, Code, Terminal, GitBranch, 
  Rocket, Package, Database, Cpu, Cloud, Lock, Star,
  ChevronRight, ArrowRight, CheckCircle, PlayCircle,
  Sparkles, Check, Loader2, MessageSquare, Bot, ShoppingCart,
  Play, Pause, Volume2, VolumeX, Maximize, Globe2
} from 'lucide-react';
import { useState, useRef } from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { MobileChatInterface } from '@/components/MobileChatInterface';
import { AnimatedPlatformDemo } from '@/components/AnimatedPlatformDemo';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { 
  SiPython, SiJavascript, SiHtml5, SiCss3,
  SiTypescript, SiGo, SiReact, SiNodedotjs, SiSpring,
  SiRust, SiPhp, SiOpenjdk
} from 'react-icons/si';

export default function Landing() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appDescription, setAppDescription] = useState('');

  // Fetch real templates from database
  const { data: templates = [], isLoading: templatesLoading } = useQuery<any[]>({
    queryKey: ['/api/templates'],
    enabled: true
  });
  
  // Fetch landing page data from backend
  const { data: landingData, isLoading: landingLoading } = useQuery<{
    features: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
    testimonials: Array<{
      quote: string;
      author: string;
      role: string;
      avatar: string;
    }>;
    stats: {
      developers: string;
      projects: string;
      deployments: string;
      languages: string;
    };
  }>({
    queryKey: ['/api/landing']
  });

  // Icon mapping
  const iconMap: Record<string, React.ReactNode> = {
    'Zap': <Zap className="h-6 w-6" />,
    'Globe': <Globe className="h-6 w-6" />,
    'Users': <Users className="h-6 w-6" />,
    'Shield': <Shield className="h-6 w-6" />,
    'Package': <Package className="h-6 w-6" />,
    'Rocket': <Rocket className="h-6 w-6" />
  };

  const features = landingData ? landingData.features.map(feature => ({
    ...feature,
    icon: iconMap[feature.icon] || <Zap className="h-6 w-6" />
  })) : [
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Start in Seconds',
      description: 'No confusing setup or downloads. Just click and start creating. Perfect for beginners!'
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: 'Learn from Anywhere',
      description: 'Use any device with a browser. Your learning progress follows you everywhere.'
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Learn Together',
      description: 'Get help from mentors or learn with friends. See each other\'s code in real-time.'
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Safe Space to Experiment',
      description: 'Make mistakes without breaking anything. We save your work automatically.'
    },
    {
      icon: <Package className="h-6 w-6" />,
      title: 'All Popular Languages',
      description: 'Try Python, JavaScript, HTML, and more. Find the language that clicks with you.'
    },
    {
      icon: <Rocket className="h-6 w-6" />,
      title: 'Share Your Creations',
      description: 'Show your work to the world with one click. No technical knowledge needed.'
    }
  ];

  const testimonials = landingData ? landingData.testimonials : [
    {
      quote: "I went from knowing nothing about code to building my first website in a week!",
      author: "Maria Garcia",
      role: "Small Business Owner",
      avatar: "MG"
    },
    {
      quote: "My 12-year-old daughter learned Python here. The interface is so friendly and encouraging.",
      author: "James Wilson",
      role: "Parent",
      avatar: "JW"
    },
    {
      quote: "Perfect for my art students who want to create interactive digital projects.",
      author: "Lisa Park",
      role: "Art Teacher",
      avatar: "LP"
    }
  ];



  const handleStartBuilding = async (description: string) => {
    console.log('Starting to build:', description);
    // Store the app description to persist across authentication
    sessionStorage.setItem('pendingAppDescription', description);
    setChatOpen(false);
    
    if (user) {
      // If user is logged in, create project and navigate
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
          // Store prompt in sessionStorage for the AI agent
          window.sessionStorage.setItem(`agent-prompt-${project.id}`, description);
          navigate(`/project/${project.id}?agent=true&prompt=${encodeURIComponent(description)}`);
        }
      } catch (error) {
        console.error('Failed to create project:', error);
      }
    } else {
      // If not logged in, go to register and continue after auth
      navigate('/register?redirect=dashboard&build=true');
    }
  };

  const { toast } = useToast();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success!",
          description: data.message,
        });
        setEmail('');
        // Navigate to auth after successful subscription
        setTimeout(() => navigate('/auth'), 1500);
      } else {
        toast({
          title: "Error",
          description: data.message || 'Failed to subscribe',
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to subscribe. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center space-y-4 sm:space-y-6">
            <Badge variant="secondary" className="mb-2 sm:mb-4 animate-pulse text-xs sm:text-sm">
              <Sparkles className="h-3 w-3 mr-1" />
              Build apps and sites with AI
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
              Build <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">anything</span>
              <br className="hidden sm:block" />
              <span className="sm:ml-2">with AI</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0 font-medium">
              Describe your idea and watch AI build it. From simple websites to complex applications.
            </p>
            
            {/* Lovable.dev Exact Style Chat Input */}
            <div className="max-w-3xl mx-auto px-4 sm:px-0 mt-12">
              <div className="relative">
                {/* Exact Lovable.dev style input */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="What would you like to build?"
                        className="w-full bg-transparent border-none outline-none text-base placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-0 px-3 py-3 font-normal text-zinc-900 dark:text-zinc-100"
                        value={appDescription}
                        onChange={(e) => setAppDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && appDescription.trim()) {
                            handleStartBuilding(appDescription);
                          }
                        }}
                      />
                    </div>
                    <Button 
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white shadow-none border-0 rounded-lg px-4 py-2 text-sm font-medium h-auto"
                      onClick={() => {
                        if (appDescription.trim()) {
                          handleStartBuilding(appDescription);
                        }
                      }}
                      disabled={!appDescription.trim()}
                    >
                      Build
                    </Button>
                  </div>
                </div>
                
                {/* Clean feature text */}
                <p className="text-center mt-3 text-sm text-zinc-500 dark:text-zinc-400 font-normal">
                  Free to start • No setup required • Deploy instantly
                </p>
              </div>
            </div>

            {/* Mobile Chat Interface */}
            <MobileChatInterface
              isOpen={chatOpen}
              onClose={() => setChatOpen(false)}
              onStartBuilding={handleStartBuilding}
            />

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full sm:w-auto px-4 sm:px-0 mt-6">
              <Button 
                size="lg" 
                onClick={() => {
                  // Focus on the AI input field
                  const aiInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (aiInput) {
                    aiInput.focus();
                  }
                }} 
                className="gap-2 w-full sm:w-auto"
              >
                Start your journey free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                <PlayCircle className="h-4 w-4" />
                See how it works
              </Button>
            </div>
          </div>

          {/* Watch E-Code in Action */}
          <div className="mt-16 sm:mt-20 md:mt-24 text-center px-4 sm:px-0">
            <div className="mb-8">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
                Watch E-Code 
                <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent"> AI Agent</span> 
                {" "}in Action
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                See how our AI Agent understands your ideas and builds complete applications in seconds. 
                From concept to deployment, all automatically.
              </p>
            </div>
          </div>

          {/* Animated Platform Demo */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-blue-500/10 blur-2xl" />
            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <AnimatedPlatformDemo />
            </div>
          </div>
        </div>
      </section>

      {/* AI Agent Hero Section - New */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container-responsive max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="default" className="mb-4 text-sm px-4 py-1">
              <Sparkles className="h-4 w-4 mr-1" />
              NEW: AI Agent
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Meet your personal
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent"> AI developer</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Just describe your app idea in any language. Our AI agent builds complete, working applications 
              from scratch - handling all the files, code, and setup automatically.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="space-y-6">
              <h3 className="text-3xl font-bold">
                From idea to app in <span className="text-primary">under a minute</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-violet-600/20 dark:bg-violet-400/20 rounded-lg">
                    <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">100% Autonomous</h4>
                    <p className="text-muted-foreground">
                      No step-by-step guidance needed. Just tell it what you want to build.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-violet-600/20 dark:bg-violet-400/20 rounded-lg">
                    <Code className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Production-Ready Code</h4>
                    <p className="text-muted-foreground">
                      Generates clean, professional code following best practices.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-violet-600/20 dark:bg-violet-400/20 rounded-lg">
                    <Zap className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Instant Deployment</h4>
                    <p className="text-muted-foreground">
                      Your app is live and shareable the moment it's built.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  onClick={() => {
                    // Scroll to top and focus on the AI input field
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setTimeout(() => {
                      const aiInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                      if (aiInput) {
                        aiInput.focus();
                      }
                    }, 500);
                  }} 
                  className="gap-2"
                >
                  Start Building
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Watch Demo
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 blur-3xl" />
              <Card className="relative overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-4 text-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">AI Agent</h4>
                      <p className="text-sm opacity-90">Ready to build your idea</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold">You</span>
                      </div>
                      <div className="bg-muted rounded-lg p-3 flex-1">
                        <p className="text-sm">"Build a todo app with categories, due dates, and the ability to mark tasks complete"</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="bg-primary/10 rounded-lg p-3">
                          <p className="text-sm font-medium">I'll build that for you! Creating a todo app with all those features...</p>
                        </div>
                        <div className="rounded-lg overflow-hidden mt-3 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-muted-foreground">Creating components...</span>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded p-3 font-mono text-xs">
                              <div className="text-blue-600 dark:text-blue-400 animate-pulse">// TodoApp.jsx</div>
                              <div className="text-green-600 dark:text-green-400 animate-pulse delay-100">function TodoApp() {'{}'}</div>
                              <div className="text-purple-600 dark:text-purple-400 animate-pulse delay-200">export default TodoApp;</div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                              <span className="text-muted-foreground">Adding categories...</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-150"></div>
                              <span className="text-muted-foreground">Setting up due dates...</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            App built successfully! Ready to deploy.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Example Apps Built with AI */}
          <div className="mt-20">
            <div className="text-center mb-12">
              <Badge className="mb-4 px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                No Coding Knowledge Required
              </Badge>
              <h3 className="text-3xl font-bold mb-3">
                Real Apps Built in Under 60 Seconds
              </h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join thousands who transformed their ideas into working apps by simply describing what they want
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-bl-full" />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                      ⚡ 25 seconds
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Live</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl">Personal Finance Tracker</CardTitle>
                  <CardDescription className="italic">
                    "Create a dashboard to track my expenses with charts and budget alerts"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-xl mb-4 overflow-hidden relative shadow-inner">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                    <div className="relative h-full flex items-center justify-center p-6">
                      <div className="w-full max-w-sm">
                        {/* Dashboard Preview */}
                        <div className="bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-xl p-4 backdrop-blur">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold">Monthly Overview</h4>
                            <Badge variant="secondary" className="text-xs">$2,450</Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded" />
                              <span className="text-xs flex-1">Income</span>
                              <span className="text-xs font-mono">$4,200</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded" />
                              <span className="text-xs flex-1">Expenses</span>
                              <span className="text-xs font-mono">$1,750</span>
                            </div>
                            <div className="h-20 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded flex items-end p-2 gap-1">
                              {[40, 65, 45, 70, 55, 80, 60].map((height, i) => (
                                <div key={i} className="flex-1 bg-gradient-to-t from-green-500 to-blue-500 rounded-t" style={{ height: `${height}%` }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/80 backdrop-blur rounded-lg p-3">
                          <p className="text-white text-xs font-medium mb-2">AI Generated:</p>
                          <div className="space-y-1 text-white/80 text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Complete dashboard UI</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Real-time calculations</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Data visualization</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tech Stack:</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">React</Badge>
                        <Badge variant="outline" className="text-xs">Chart.js</Badge>
                        <Badge variant="outline" className="text-xs">Tailwind</Badge>
                      </div>
                    </div>
                    <Button variant="default" size="sm" className="w-full group-hover:shadow-lg transition-all">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Build Similar App
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-bl-full" />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">
                      ⚡ 18 seconds
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Live</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl">Team Chat App</CardTitle>
                  <CardDescription className="italic">
                    "Build a Slack-like chat app with channels and real-time messaging"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl mb-4 overflow-hidden relative shadow-inner">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                    <div className="relative h-full flex items-center justify-center p-6">
                      <div className="w-full max-w-sm">
                        {/* Chat Preview */}
                        <div className="bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-xl overflow-hidden backdrop-blur">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 text-white">
                            <p className="text-xs font-medium"># general</p>
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="flex gap-2">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-medium">Sarah</p>
                                <p className="text-xs text-muted-foreground">Hey team! The new feature is ready 🚀</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="w-6 h-6 bg-purple-500 rounded-full flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-medium">Mike</p>
                                <p className="text-xs text-muted-foreground">Awesome! Let's deploy it</p>
                              </div>
                            </div>
                            <div className="flex gap-2 items-center">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex-shrink-0" />
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          </div>
                          <div className="border-t p-2">
                            <input className="w-full text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1" placeholder="Type a message..." />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/80 backdrop-blur rounded-lg p-3">
                          <p className="text-white text-xs font-medium mb-2">AI Generated:</p>
                          <div className="space-y-1 text-white/80 text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Real-time WebSocket chat</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Channel management</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>User authentication</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tech Stack:</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">Next.js</Badge>
                        <Badge variant="outline" className="text-xs">Socket.io</Badge>
                        <Badge variant="outline" className="text-xs">Prisma</Badge>
                      </div>
                    </div>
                    <Button variant="default" size="sm" className="w-full group-hover:shadow-lg transition-all">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Build Similar App
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-bl-full" />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">
                      ⚡ 35 seconds
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Live</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl">E-commerce Store</CardTitle>
                  <CardDescription className="italic">
                    "Create an online store with product catalog, cart, and Stripe checkout"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-xl mb-4 overflow-hidden relative shadow-inner">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                    <div className="relative h-full flex items-center justify-center p-6">
                      <div className="w-full max-w-sm">
                        {/* Store Preview */}
                        <div className="bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-xl overflow-hidden backdrop-blur">
                          <div className="p-3">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-sm font-semibold">TechStore</h4>
                              <div className="flex items-center gap-1">
                                <ShoppingCart className="h-4 w-4" />
                                <Badge variant="destructive" className="text-xs h-5 w-5 p-0 flex items-center justify-center">3</Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                                <div className="aspect-square bg-gradient-to-br from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800 rounded mb-2" />
                                <p className="text-xs font-medium truncate">Laptop Pro</p>
                                <p className="text-xs text-muted-foreground">$1,299</p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                                <div className="aspect-square bg-gradient-to-br from-green-200 to-blue-200 dark:from-green-800 dark:to-blue-800 rounded mb-2" />
                                <p className="text-xs font-medium truncate">Wireless Mouse</p>
                                <p className="text-xs text-muted-foreground">$49</p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2">
                            <button className="w-full text-white text-xs font-medium">Checkout - $1,348</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/80 backdrop-blur rounded-lg p-3">
                          <p className="text-white text-xs font-medium mb-2">AI Generated:</p>
                          <div className="space-y-1 text-white/80 text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Full product catalog</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Shopping cart logic</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Stripe integration</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tech Stack:</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">Next.js</Badge>
                        <Badge variant="outline" className="text-xs">Stripe</Badge>
                        <Badge variant="outline" className="text-xs">Tailwind</Badge>
                      </div>
                    </div>
                    <Button variant="default" size="sm" className="w-full group-hover:shadow-lg transition-all">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Build Similar App
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* New App 1: AI Writing Assistant */}
              <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-bl-full" />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
                      ⚡ 22 seconds
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Live</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl">AI Writing Assistant</CardTitle>
                  <CardDescription className="italic">
                    "Make an AI-powered writing tool with grammar check and style suggestions"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl mb-4 overflow-hidden relative shadow-inner">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                    <div className="relative h-full flex items-center justify-center p-6">
                      <div className="w-full max-w-sm">
                        {/* Writing Assistant Preview */}
                        <div className="bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-xl p-4 backdrop-blur">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold">AI Editor</h4>
                            <div className="flex gap-1">
                              <Badge variant="secondary" className="text-xs">✨ AI Active</Badge>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 text-xs">
                              <p className="mb-1">Your text:</p>
                              <p className="text-muted-foreground">"Let's <span className="underline decoration-red-500 decoration-wavy">discus</span> the project details..."</p>
                            </div>
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded p-2">
                              <p className="text-xs font-medium mb-1">AI Suggestions:</p>
                              <div className="space-y-1">
                                <div className="flex items-start gap-1">
                                  <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0 mt-0.5" />
                                  <p className="text-xs">Change "discus" to "discuss"</p>
                                </div>
                                <div className="flex items-start gap-1">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 mt-0.5" />
                                  <p className="text-xs">Consider more formal tone</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/80 backdrop-blur rounded-lg p-3">
                          <p className="text-white text-xs font-medium mb-2">AI Generated:</p>
                          <div className="space-y-1 text-white/80 text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>OpenAI integration</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Real-time suggestions</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Grammar & style check</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tech Stack:</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">React</Badge>
                        <Badge variant="outline" className="text-xs">OpenAI</Badge>
                        <Badge variant="outline" className="text-xs">TipTap</Badge>
                      </div>
                    </div>
                    <Button variant="default" size="sm" className="w-full group-hover:shadow-lg transition-all">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Build Similar App
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* New App 2: Task Management App */}
              <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-bl-full" />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                      ⚡ 15 seconds
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Live</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl">Task Management App</CardTitle>
                  <CardDescription className="italic">
                    "Build a Kanban board for project management with drag and drop"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl mb-4 overflow-hidden relative shadow-inner">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                    <div className="relative h-full flex items-center justify-center p-6">
                      <div className="w-full max-w-sm">
                        {/* Kanban Board Preview */}
                        <div className="bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-xl p-3 backdrop-blur">
                          <h4 className="text-sm font-semibold mb-2">Project Board</h4>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                              <p className="font-medium mb-2 text-gray-600 dark:text-gray-400">To Do</p>
                              <div className="space-y-1">
                                <div className="bg-white dark:bg-gray-700 p-1.5 rounded shadow-sm">
                                  <p className="font-medium">Design UI</p>
                                  <div className="flex items-center gap-1 mt-1">
                                    <div className="w-4 h-4 bg-blue-500 rounded-full" />
                                    <span className="text-[10px] text-muted-foreground">High</span>
                                  </div>
                                </div>
                                <div className="bg-white dark:bg-gray-700 p-1.5 rounded shadow-sm opacity-60">
                                  <p className="font-medium">API Setup</p>
                                  <div className="flex items-center gap-1 mt-1">
                                    <div className="w-4 h-4 bg-yellow-500 rounded-full" />
                                    <span className="text-[10px] text-muted-foreground">Med</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                              <p className="font-medium mb-2 text-blue-600 dark:text-blue-400">In Progress</p>
                              <div className="bg-white dark:bg-gray-700 p-1.5 rounded shadow-sm border-2 border-blue-500 border-dashed">
                                <p className="font-medium">User Auth</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <div className="w-4 h-4 bg-orange-500 rounded-full" />
                                  <span className="text-[10px] text-muted-foreground">High</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                              <p className="font-medium mb-2 text-green-600 dark:text-green-400">Done</p>
                              <div className="bg-white dark:bg-gray-700 p-1.5 rounded shadow-sm opacity-75">
                                <p className="font-medium line-through">Setup DB</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Check className="h-3 w-3 text-green-500" />
                                  <span className="text-[10px] text-muted-foreground">Complete</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/80 backdrop-blur rounded-lg p-3">
                          <p className="text-white text-xs font-medium mb-2">AI Generated:</p>
                          <div className="space-y-1 text-white/80 text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Drag & drop boards</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Task management</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Team collaboration</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tech Stack:</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">React</Badge>
                        <Badge variant="outline" className="text-xs">DnD Kit</Badge>
                        <Badge variant="outline" className="text-xs">Zustand</Badge>
                      </div>
                    </div>
                    <Button variant="default" size="sm" className="w-full group-hover:shadow-lg transition-all">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Build Similar App
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* New App 3: Weather Dashboard */}
              <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-sky-500/10 to-cyan-500/10 rounded-bl-full" />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20">
                      ⚡ 28 seconds
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Live</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl">Weather Dashboard</CardTitle>
                  <CardDescription className="italic">
                    "Create a weather app with forecasts, maps, and location search"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/20 dark:to-cyan-950/20 rounded-xl mb-4 overflow-hidden relative shadow-inner">
                    <div className="relative w-full h-full">
                      <iframe
                        className="absolute top-0 left-0 w-full h-full"
                        src="https://www.youtube.com/embed/nz9BXJwJfCU?autoplay=1&mute=1&loop=1&playlist=nz9BXJwJfCU&controls=0&showinfo=0&rel=0&modestbranding=1"
                        title="Weather Dashboard App Demo"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <button className="bg-white/90 backdrop-blur-md rounded-full p-4 shadow-2xl pointer-events-auto transform hover:scale-110 transition-transform">
                          <Play className="h-8 w-8 text-gray-900" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/80 backdrop-blur rounded-lg p-3">
                          <p className="text-white text-xs font-medium mb-2">AI Generated:</p>
                          <div className="space-y-1 text-white/80 text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Weather API integration</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Location services</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>5-day forecast</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tech Stack:</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">React</Badge>
                        <Badge variant="outline" className="text-xs">OpenWeather</Badge>
                        <Badge variant="outline" className="text-xs">Recharts</Badge>
                      </div>
                    </div>
                    <Button variant="default" size="sm" className="w-full group-hover:shadow-lg transition-all">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Build Similar App
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* New App 4: Portfolio Website */}
              <Card className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-bl-full" />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20">
                      ⚡ 20 seconds
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Live</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl">Portfolio Website</CardTitle>
                  <CardDescription className="italic">
                    "Design a modern portfolio to showcase my work with animations"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 rounded-xl mb-4 overflow-hidden relative shadow-inner">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                    <div className="relative h-full flex items-center justify-center p-6">
                      <div className="w-full max-w-sm">
                        {/* Portfolio Preview */}
                        <div className="bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-xl overflow-hidden backdrop-blur">
                          <div className="relative h-24 bg-gradient-to-br from-indigo-500 to-violet-500">
                            <div className="absolute inset-0 bg-black/20" />
                            <div className="absolute bottom-3 left-3">
                              <div className="w-12 h-12 bg-white rounded-full shadow-lg mb-1" />
                              <p className="text-white text-sm font-semibold">Alex Chen</p>
                              <p className="text-white/80 text-xs">Full Stack Developer</p>
                            </div>
                          </div>
                          <div className="p-3 space-y-3">
                            <div className="flex gap-2 text-xs">
                              <Badge variant="secondary">React</Badge>
                              <Badge variant="secondary">Node.js</Badge>
                              <Badge variant="secondary">TypeScript</Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                                <p className="text-xs font-medium mb-1">Latest Projects</p>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium">E-Commerce Platform</p>
                                      <p className="text-[10px] text-muted-foreground">Next.js • Stripe API</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-600 rounded" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium">Task Manager</p>
                                      <p className="text-[10px] text-muted-foreground">React • GraphQL</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 text-xs">
                              <button className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white py-1 rounded font-medium">View Work</button>
                              <button className="flex-1 border border-gray-300 dark:border-gray-600 py-1 rounded">Contact</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-black/80 backdrop-blur rounded-lg p-3">
                          <p className="text-white text-xs font-medium mb-2">AI Generated:</p>
                          <div className="space-y-1 text-white/80 text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Responsive design</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Project showcase</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-500/30 flex items-center justify-center">✓</div>
                              <span>Contact form</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tech Stack:</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">Next.js</Badge>
                        <Badge variant="outline" className="text-xs">Framer</Badge>
                        <Badge variant="outline" className="text-xs">Tailwind</Badge>
                      </div>
                    </div>
                    <Button variant="default" size="sm" className="w-full group-hover:shadow-lg transition-all">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Build Similar App
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* No-Code Examples Section */}
      <section className="py-20">
        <div className="container-responsive max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              See what people are building with just words
            </h2>
            <p className="text-lg text-muted-foreground">
              Real apps created by describing ideas, no coding required
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {templatesLoading ? (
              // Loading state
              [...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-20 mb-2"></div>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 bg-muted rounded mb-3"></div>
                    <div className="h-9 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Display real templates from database
              templates.slice(0, 4).map((template, index) => (
                <Card key={template.id} className="group hover:shadow-lg transition-all cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">Built with AI</Badge>
                      <span className="text-sm text-muted-foreground">{index + 2} min ago</span>
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-lg p-3 mb-3 font-mono text-xs">
                      <div className="space-y-1">
                        {/* Show code snippet based on template category */}
                        {template.category === 'web' && (
                          <>
                            <div>
                              <span className="text-purple-600 dark:text-purple-400">const</span> {' '}
                              <span className="text-blue-600 dark:text-blue-400">App</span> = () =&gt; {'{'}
                            </div>
                            <div className="ml-2">
                              <span className="text-purple-600 dark:text-purple-400">return</span> {' '}
                              <span className="text-green-600 dark:text-green-400">&lt;div&gt;{template.name}&lt;/div&gt;</span>
                            </div>
                            <div>{'}'}</div>
                          </>
                        )}
                        {template.category === 'api' && (
                          <>
                            <div>
                              <span className="text-purple-600 dark:text-purple-400">app</span>.
                              <span className="text-yellow-600 dark:text-yellow-400">get</span>(
                              <span className="text-green-600 dark:text-green-400">'/api'</span>, 
                            </div>
                            <div className="ml-2">
                              <span className="text-blue-600 dark:text-blue-400">(req, res)</span> =&gt; {'{'}
                            </div>
                            <div className="ml-4">
                              res.<span className="text-yellow-600 dark:text-yellow-400">json</span>({'{'}...{'}'})
                            </div>
                            <div className="ml-2">{'}'});</div>
                          </>
                        )}
                        {template.category === 'data' && (
                          <>
                            <div>
                              <span className="text-purple-600 dark:text-purple-400">const</span> {' '}
                              <span className="text-blue-600 dark:text-blue-400">data</span> = 
                              <span className="text-yellow-600 dark:text-yellow-400">analyze</span>();
                            </div>
                            <div>
                              <span className="text-yellow-600 dark:text-yellow-400">visualize</span>(data);
                            </div>
                          </>
                        )}
                        {/* Default code snippet for other categories */}
                        {!['web', 'api', 'data'].includes(template.category) && (
                          <>
                            <div>
                              <span className="text-purple-600 dark:text-purple-400">function</span> {' '}
                              <span className="text-blue-600 dark:text-blue-400">main</span>() {'{'}
                            </div>
                            <div className="ml-2">
                              <span className="text-green-600 dark:text-green-400">// {template.name}</span>
                            </div>
                            <div>{'}'}</div>
                          </>
                        )}
                        <div className="mt-2 text-green-600 dark:text-green-400">
                          // Ready to customize!
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                      onClick={() => navigate('/templates')}
                    >
                      View Template
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          <div className="mt-8 text-center">
            <Button 
              size="lg" 
              onClick={() => {
                // Scroll to top and focus on the AI input field
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                  const aiInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (aiInput) {
                    aiInput.focus();
                  }
                }, 500);
              }} 
              variant="outline"
            >
              Start building with AI
            </Button>
          </div>
        </div>
      </section>

      {/* Live Coding Demo Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container-responsive max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Watch E-Code in action
            </h2>
            <p className="text-lg text-muted-foreground">
              See how our AI transforms your ideas into fully functional applications in real-time
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Code Editor */}
            <Card className="overflow-hidden">
              <div className="bg-muted/50 p-2 flex items-center justify-between border-b">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-600 dark:bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-600 dark:bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-600 dark:bg-green-400" />
                  </div>
                  <span className="text-xs text-muted-foreground">app.py</span>
                </div>
                <Button size="sm" className="h-7 text-xs gap-1">
                  <PlayCircle className="h-3 w-3" />
                  Run
                </Button>
              </div>
              <div className="p-4 bg-background font-mono text-sm">
                <div className="space-y-2">
                  <div>
                    <span className="text-purple-600 dark:text-purple-400">from</span> {' '}
                    <span className="text-blue-600 dark:text-blue-400">flask</span> {' '}
                    <span className="text-purple-600 dark:text-purple-400">import</span> Flask, render_template
                  </div>
                  <div>
                    <span className="text-purple-600 dark:text-purple-400">import</span> {' '}
                    <span className="text-blue-600 dark:text-blue-400">requests</span>
                  </div>
                  <div className="mt-3">
                    app = <span className="text-yellow-600 dark:text-yellow-400">Flask</span>(__name__)
                  </div>
                  <div className="mt-3">
                    <span className="text-blue-600 dark:text-blue-400">@app.route</span>(<span className="text-green-600 dark:text-green-400">'/'</span>)
                  </div>
                  <div>
                    <span className="text-purple-600 dark:text-purple-400">def</span> {' '}
                    <span className="text-yellow-600 dark:text-yellow-400">home</span>():
                  </div>
                  <div className="ml-4">
                    weather = <span className="text-yellow-600 dark:text-yellow-400">get_weather</span>()
                  </div>
                  <div className="ml-4">
                    <span className="text-purple-600 dark:text-purple-400">return</span> {' '}
                    <span className="text-yellow-600 dark:text-yellow-400">render_template</span>(<span className="text-green-600 dark:text-green-400">'index.html'</span>, weather=weather)
                  </div>
                  <div className="mt-3">
                    <span className="text-purple-600 dark:text-purple-400">if</span> __name__ == <span className="text-green-600 dark:text-green-400">'__main__'</span>:
                  </div>
                  <div className="ml-4">
                    app.<span className="text-yellow-600 dark:text-yellow-400">run</span>(debug=<span className="text-purple-600 dark:text-purple-400">True</span>)
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Live Preview */}
            <div className="space-y-4">
              <Card className="overflow-hidden">
                <div className="bg-muted/50 p-2 flex items-center gap-2 border-b">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground">localhost:5000</span>
                  <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div className="relative bg-gradient-to-br from-gray-900 to-black min-h-[400px] rounded-lg overflow-hidden">
                  {/* Video Container with Aspect Ratio */}
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 Aspect Ratio */ }}>
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src="https://www.youtube.com/embed/IcrbM1l_BoI?autoplay=1&mute=1&loop=1&playlist=IcrbM1l_BoI&controls=0&showinfo=0&rel=0&modestbranding=1"
                      title="E-Code Platform Demo"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Custom Video Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 pointer-events-auto">
                          <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full p-3 transition-all hover:scale-110 shadow-lg">
                            <PlayCircle className="h-6 w-6 text-white" />
                          </button>
                          <div className="text-white">
                            <p className="text-base font-semibold">Watch Full Demo</p>
                            <p className="text-sm opacity-80">See how AI builds apps in seconds</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pointer-events-auto">
                          <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 hover:bg-white/30 transition-colors cursor-pointer">
                            <PlayCircle className="h-3 w-3 mr-1" />
                            3:45
                          </Badge>
                          <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg p-2 transition-all hover:scale-110">
                            <Globe2 className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating annotations */}
                  <div className="absolute top-6 left-6 bg-black/80 backdrop-blur-md rounded-lg px-4 py-2 shadow-xl">
                    <p className="text-sm font-medium flex items-center gap-2 text-white">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
                      Live Coding Demo
                    </p>
                  </div>
                  
                  <div className="absolute top-6 right-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg px-4 py-2 shadow-xl">
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI-Powered
                    </p>
                  </div>
                  
                  {/* Feature Highlights */}
                  <div className="absolute bottom-24 right-6 space-y-2 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur-md rounded-lg px-3 py-2 shadow-xl transform hover:scale-105 transition-transform pointer-events-auto">
                      <p className="text-xs text-white flex items-center gap-2">
                        <Zap className="h-3 w-3 text-yellow-400" />
                        Instant deployment
                      </p>
                    </div>
                    <div className="bg-black/80 backdrop-blur-md rounded-lg px-3 py-2 shadow-xl transform hover:scale-105 transition-transform pointer-events-auto">
                      <p className="text-xs text-white flex items-center gap-2">
                        <Code className="h-3 w-3 text-blue-400" />
                        No setup required
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
              
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="gap-1">
                  <Terminal className="h-3 w-3" />
                  Console
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Server running on http://localhost:5000
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Language Showcase */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Code in your favorite language
            </h2>
            <p className="text-lg text-muted-foreground">
              From Python to JavaScript, from beginners to experts - we support them all
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6 mb-12">
            {/* Python Card */}
            <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105 border-0">
              <CardContent className="p-0">
                <div className="relative h-48 bg-gradient-to-br from-blue-600 via-blue-700 to-yellow-600 overflow-hidden">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  <div className="relative h-full flex flex-col items-center justify-center p-6">
                    <SiPython className="h-16 w-16 text-white mb-3 group-hover:scale-110 transition-transform" />
                    <div className="font-mono text-xs text-white/90 text-center">
                      <div className="animate-pulse">print("Hello!")</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-white/20 backdrop-blur text-white border-white/20 text-xs">
                      Popular
                    </Badge>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                  <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                    Python
                    <span className="text-xs text-muted-foreground">3.11</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">Data Science & AI</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Django</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Flask</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">NumPy</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* JavaScript Card */}
            <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105 border-0">
              <CardContent className="p-0">
                <div className="relative h-48 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 overflow-hidden">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  <div className="relative h-full flex flex-col items-center justify-center p-6">
                    <SiJavascript className="h-16 w-16 text-black mb-3 group-hover:scale-110 transition-transform" />
                    <div className="font-mono text-xs text-black/80 text-center">
                      <div className="animate-pulse">const app = {}</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-black/20 backdrop-blur text-white border-black/20 text-xs">
                      #1 Web
                    </Badge>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                  <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                    JavaScript
                    <span className="text-xs text-muted-foreground">ES2024</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">Web & Full-Stack</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">React</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Node.js</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Vue</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TypeScript Card */}
            <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105 border-0">
              <CardContent className="p-0">
                <div className="relative h-48 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 overflow-hidden">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  <div className="relative h-full flex flex-col items-center justify-center p-6">
                    <SiTypescript className="h-16 w-16 text-white mb-3 group-hover:scale-110 transition-transform" />
                    <div className="font-mono text-xs text-white/90 text-center">
                      <div className="animate-pulse">type Safe = true</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-white/20 backdrop-blur text-white border-white/20 text-xs">
                      Trending
                    </Badge>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                  <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                    TypeScript
                    <span className="text-xs text-muted-foreground">5.3</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">Type-Safe JS</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Next.js</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Nest.js</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Deno</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Go Card */}
            <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105 border-0">
              <CardContent className="p-0">
                <div className="relative h-48 bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600 overflow-hidden">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  <div className="relative h-full flex flex-col items-center justify-center p-6">
                    <SiGo className="h-16 w-16 text-white mb-3 group-hover:scale-110 transition-transform" />
                    <div className="font-mono text-xs text-white/90 text-center">
                      <div className="animate-pulse">go run main.go</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-white/20 backdrop-blur text-white border-white/20 text-xs">
                      Fast
                    </Badge>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                  <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                    Go
                    <span className="text-xs text-muted-foreground">1.21</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">Cloud & Backend</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Gin</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Fiber</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">gRPC</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Java Card */}
            <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105 border-0">
              <CardContent className="p-0">
                <div className="relative h-48 bg-gradient-to-br from-red-600 via-orange-600 to-red-700 overflow-hidden">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  <div className="relative h-full flex flex-col items-center justify-center p-6">
                    <SiOpenjdk className="h-16 w-16 text-white mb-3 group-hover:scale-110 transition-transform" />
                    <div className="font-mono text-xs text-white/90 text-center">
                      <div className="animate-pulse">public class Main</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-white/20 backdrop-blur text-white border-white/20 text-xs">
                      Enterprise
                    </Badge>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                  <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                    Java
                    <span className="text-xs text-muted-foreground">21 LTS</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">Enterprise Apps</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Spring</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Maven</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Gradle</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rust Card */}
            <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105 border-0">
              <CardContent className="p-0">
                <div className="relative h-48 bg-gradient-to-br from-orange-700 via-orange-800 to-red-800 overflow-hidden">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  <div className="relative h-full flex flex-col items-center justify-center p-6">
                    <SiRust className="h-16 w-16 text-white mb-3 group-hover:scale-110 transition-transform" />
                    <div className="font-mono text-xs text-white/90 text-center">
                      <div className="animate-pulse">fn main() {}</div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-white/20 backdrop-blur text-white border-white/20 text-xs">
                      Safe
                    </Badge>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                  <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                    Rust
                    <span className="text-xs text-muted-foreground">1.75</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">Systems & WASM</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Tokio</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Actix</Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Rocket</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button size="lg" variant="outline" onClick={() => navigate('/languages')}>
              Explore all 20+ languages
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-lg text-muted-foreground">
              Friendly features designed to make learning and creating enjoyable for everyone
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-2">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button variant="outline" size="lg" onClick={() => navigate('/features')}>
              Explore all features
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Made for everyone
            </h2>
            <p className="text-lg text-muted-foreground">
              Whether you're curious about code or building the next big thing
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full w-fit mb-2">
                  <Code className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Complete Beginners</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
                        <div className="text-white text-2xl animate-bounce">📚</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground animate-pulse">Step 1: Create your first variable</div>
                      <div className="font-mono text-xs bg-white dark:bg-gray-800 rounded p-2 animate-pulse delay-100">
                        name = "Hello World"
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  Never written code before? Perfect! Start with fun, bite-sized lessons designed for absolute beginners.
                </p>
                <Button variant="link" className="gap-1">
                  Start learning
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto p-3 bg-green-100 dark:bg-green-900/20 rounded-full w-fit mb-2">
                  <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Collaborate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">👤</div>
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse delay-100">👤</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground animate-pulse">2 people coding together</div>
                      <div className="flex gap-1 justify-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-ping delay-100"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  Work together in real-time. Perfect for pair programming and team projects.
                </p>
                <Button variant="link" className="gap-1">
                  Team features
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full w-fit mb-2">
                  <Rocket className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Ship to Production</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                  <img 
                    src="https://cdn.sanity.io/images/bj34pdbp/migration/deployment-one-click-800x601.gif?w=800&q=80&fit=clip&auto=format"
                    alt="One-click deployment demo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-muted-foreground mb-4">
                  Deploy your apps with one click. Automatic SSL, custom domains, and scaling.
                </p>
                <Button variant="link" className="gap-1">
                  Deployment docs
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by developers
            </h2>
            <p className="text-lg text-muted-foreground">
              Join millions of developers who build with E-Code
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-lg mb-4">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to start building?
              </h2>
              <p className="text-lg mb-8 opacity-90">
                Join millions of developers and start coding in seconds
              </p>
              <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                  required
                />
                <Button type="submit" size="lg" variant="secondary" disabled={isSubmitting}>
                  {isSubmitting ? 'Subscribing...' : 'Get started free'}
                </Button>
              </form>
              <p className="text-sm mt-4 opacity-75">
                No credit card required • Free forever for individuals
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}