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
  Sparkles, Check, Loader2, MessageSquare, Bot
} from 'lucide-react';
import { useState } from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { MobileChatInterface } from '@/components/MobileChatInterface';
import { AnimatedPlatformDemo } from '@/components/AnimatedPlatformDemo';
import { useToast } from '@/hooks/use-toast';

export default function Landing() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const features = [
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

  const testimonials = [
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

  const handleGetStarted = () => {
    setChatOpen(true);
  };

  const handleStartBuilding = (description: string) => {
    console.log('Starting to build:', description);
    setChatOpen(false);
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/register');
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
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold">
              Build <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">software</span> fast
              <br className="hidden sm:block" />
              <span className="sm:ml-2">with AI</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4 sm:px-0">
              Code with AI. Deploy instantly. Share with the world. Build and ship software 10x faster.
            </p>
            
            {/* AI Chat Input */}
            <div className="max-w-3xl mx-auto px-4 sm:px-0 mt-10">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/30 via-purple-600/30 to-fuchsia-600/30 blur-2xl group-hover:blur-3xl transition-all animate-pulse" />
                <div className="relative bg-card/90 backdrop-blur-sm border-2 border-primary/30 rounded-3xl p-6 shadow-2xl hover:shadow-3xl transition-all hover:border-primary/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl flex-shrink-0 shadow-lg">
                      <Sparkles className="h-6 w-6 text-white animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Describe your app idea in any language... (e.g., 'Build a recipe finder app with AI suggestions')"
                        className="w-full bg-transparent border-none outline-none text-xl placeholder:text-muted-foreground/70 focus:ring-0 font-medium cursor-pointer"
                        onClick={() => setChatOpen(true)}
                        readOnly
                      />
                    </div>
                    <Button 
                      size="lg" 
                      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-lg hover:shadow-xl transition-all text-lg px-6"
                      onClick={() => setChatOpen(true)}
                    >
                      <Zap className="h-5 w-5 mr-2" />
                      Launch AI
                    </Button>
                  </div>
                  <div className="flex items-center gap-6 mt-4 ml-16 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Free to start
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      No credit card
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      AI builds instantly
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Chat Interface */}
            <MobileChatInterface
              isOpen={chatOpen}
              onClose={() => setChatOpen(false)}
              onStartBuilding={handleStartBuilding}
            />

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full sm:w-auto px-4 sm:px-0 mt-6">
              <Button size="lg" onClick={handleGetStarted} className="gap-2 w-full sm:w-auto">
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
          <div className="mt-8 relative px-4 sm:px-0">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 blur-3xl" />
            <div className="relative">
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
              Just describe your app idea in plain English. Our AI agent builds complete, working applications 
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
                <Button size="lg" onClick={handleGetStarted} className="gap-2">
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
            <h3 className="text-2xl font-bold text-center mb-12">
              Apps our users built in minutes
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="group hover:shadow-xl transition-all">
                <CardHeader>
                  <Badge className="mb-2 w-fit">Built in 45 seconds</Badge>
                  <CardTitle>Personal Finance Tracker</CardTitle>
                  <CardDescription>
                    "Build an expense tracker with graphs and monthly budgets"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg mb-4 overflow-hidden relative group flex items-center justify-center">
                    <div className="text-center space-y-4 p-6">
                      <div className="relative">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center animate-pulse">
                          <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                            <div className="w-4 h-4 bg-green-500 rounded animate-bounce"></div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-pulse w-20 mx-auto" />
                        <div className="h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse delay-100 w-16 mx-auto" />
                        <div className="h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse delay-200 w-24 mx-auto" />
                      </div>
                      <div className="text-xs text-muted-foreground">💰 Building dashboard</div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 text-white font-mono text-xs space-y-1">
                        <div className="animate-pulse delay-100">✓ Dashboard created</div>
                        <div className="animate-pulse delay-200">✓ Charts integrated</div>
                        <div className="animate-pulse delay-300">✓ Budget alerts ready</div>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Try this template
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all">
                <CardHeader>
                  <Badge className="mb-2 w-fit">Built in 30 seconds</Badge>
                  <CardTitle>Team Chat App</CardTitle>
                  <CardDescription>
                    "Create a real-time chat with channels and direct messages"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg mb-4 overflow-hidden relative group flex items-center justify-center">
                    <div className="text-center space-y-4 p-6">
                      <div className="relative">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center animate-pulse">
                          <MessageSquare className="h-8 w-8 text-white animate-bounce" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                      </div>
                      <div className="space-y-1">
                        <div className="h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse w-16 mx-auto" />
                        <div className="h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse delay-100 w-20 mx-auto" />
                      </div>
                      <div className="text-xs text-muted-foreground">💬 Building chat</div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 text-white font-mono text-xs space-y-1">
                        <div className="animate-pulse delay-100">✓ Real-time chat ready</div>
                        <div className="animate-pulse delay-200">✓ Channels configured</div>
                        <div className="animate-pulse delay-300">✓ WebSocket connected</div>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Try this template
                  </Button>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-xl transition-all">
                <CardHeader>
                  <Badge className="mb-2 w-fit">Built in 60 seconds</Badge>
                  <CardTitle>E-commerce Store</CardTitle>
                  <CardDescription>
                    "Make an online store with products, cart, and checkout"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg mb-4 overflow-hidden relative group flex items-center justify-center">
                    <div className="text-center space-y-4 p-6">
                      <div className="relative">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center animate-pulse">
                          <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                            <div className="w-4 h-4 bg-orange-500 rounded animate-spin"></div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-pulse w-24 mx-auto" />
                        <div className="h-2 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-pulse delay-100 w-20 mx-auto" />
                      </div>
                      <div className="text-xs text-muted-foreground">🛒 Building store</div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 text-white font-mono text-xs space-y-1">
                        <div className="animate-pulse delay-100">✓ Product catalog ready</div>
                        <div className="animate-pulse delay-200">✓ Shopping cart working</div>
                        <div className="animate-pulse delay-300">✓ Payment integrated</div>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Try this template
                  </Button>
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
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="group hover:shadow-lg transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">Built with AI</Badge>
                  <span className="text-sm text-muted-foreground">2 min ago</span>
                </div>
                <CardTitle className="text-lg">Recipe Finder</CardTitle>
                <p className="text-sm text-muted-foreground">
                  "Build an app that finds recipes based on ingredients I have at home"
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-3 mb-3 font-mono text-xs">
                  <div className="space-y-1">
                    <div>
                      <span className="text-purple-600 dark:text-purple-400">const</span> {' '}
                      <span className="text-blue-600 dark:text-blue-400">ingredients</span> = [
                      <span className="text-green-600 dark:text-green-400">'carrot'</span>,
                      <span className="text-green-600 dark:text-green-400">'potato'</span>];
                    </div>
                    <div>
                      <span className="text-purple-600 dark:text-purple-400">const</span> {' '}
                      <span className="text-blue-600 dark:text-blue-400">recipes</span> = 
                      <span className="text-yellow-600 dark:text-yellow-400">findRecipes</span>(ingredients);
                    </div>
                    <div className="mt-2 text-green-600 dark:text-green-400">
                      // Found 12 matching recipes!
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                  onClick={() => window.location.href = '/templates'}
                >
                  View Project
                </Button>
              </CardContent>
            </Card>
            
            <Card className="group hover:shadow-lg transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">Built with AI</Badge>
                  <span className="text-sm text-muted-foreground">5 min ago</span>
                </div>
                <CardTitle className="text-lg">Budget Tracker</CardTitle>
                <p className="text-sm text-muted-foreground">
                  "I need a simple app to track my monthly expenses with charts"
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-3 mb-3 font-mono text-xs">
                  <div className="space-y-1">
                    <div>
                      <span className="text-purple-600 dark:text-purple-400">interface</span> {' '}
                      <span className="text-blue-600 dark:text-blue-400">Expense</span> {'{'}
                    </div>
                    <div className="ml-2">
                      <span className="text-blue-600 dark:text-blue-400">amount</span>: number;
                    </div>
                    <div className="ml-2">
                      <span className="text-blue-600 dark:text-blue-400">category</span>: string;
                    </div>
                    <div>{'}'}</div>
                    <div className="mt-2">
                      <span className="text-yellow-600 dark:text-yellow-400">Chart</span>.
                      <span className="text-yellow-600 dark:text-yellow-400">render</span>(expenses);
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                  onClick={() => window.location.href = '/templates'}
                >
                  View Project
                </Button>
              </CardContent>
            </Card>
            
            <Card className="group hover:shadow-lg transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">Built with AI</Badge>
                  <span className="text-sm text-muted-foreground">10 min ago</span>
                </div>
                <CardTitle className="text-lg">Study Timer</CardTitle>
                <p className="text-sm text-muted-foreground">
                  "Create a pomodoro timer with relaxing sounds and break reminders"
                </p>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-3 mb-3 font-mono text-xs">
                  <div className="space-y-1">
                    <div>
                      <span className="text-purple-600 dark:text-purple-400">let</span> {' '}
                      <span className="text-blue-600 dark:text-blue-400">minutes</span> = 25;
                    </div>
                    <div>
                      <span className="text-purple-600 dark:text-purple-400">let</span> {' '}
                      <span className="text-blue-600 dark:text-blue-400">seconds</span> = 0;
                    </div>
                    <div className="mt-2">
                      <span className="text-yellow-600 dark:text-yellow-400">setInterval</span>(() =&gt; {"{"}
                    </div>
                    <div className="ml-2">
                      <span className="text-yellow-600 dark:text-yellow-400">updateTimer</span>();
                    </div>
                    <div>{'}'}, 1000);</div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                  onClick={() => window.location.href = '/templates'}
                >
                  View Project
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-8 text-center">
            <Button size="lg" onClick={handleGetStarted} variant="outline">
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
              Watch code come to life instantly
            </h2>
            <p className="text-lg text-muted-foreground">
              From idea to running app in seconds. No setup, no downloads, just code.
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
                <div className="relative">
                  <img 
                    src="https://cdn.sanity.io/images/bj34pdbp/migration/c7f2a8b9e4d5f6g7h8i9j0k1l2m3n4o5-800x601.gif?w=800&q=80&fit=clip&auto=format"
                    alt="Weather app running live"
                    className="w-full h-auto"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 dark:bg-black/90 rounded-lg px-3 py-2">
                    <p className="text-sm font-medium">🌤️ Weather App - Live</p>
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="group hover:shadow-xl transition-all cursor-pointer">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-t-lg overflow-hidden flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="text-4xl animate-bounce">🐍</div>
                    <div className="font-mono text-xs space-y-1">
                      <div className="animate-pulse text-blue-600 dark:text-blue-400">print("Hello World!")</div>
                      <div className="animate-pulse delay-100 text-green-600 dark:text-green-400">data = [1, 2, 3]</div>
                      <div className="animate-pulse delay-200 text-purple-600 dark:text-purple-400">for i in data:</div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">Python</h3>
                  <p className="text-sm text-muted-foreground">Perfect for beginners, data science, and AI</p>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all cursor-pointer">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-t-lg overflow-hidden flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="text-4xl animate-bounce">⚡</div>
                    <div className="font-mono text-xs space-y-1">
                      <div className="animate-pulse text-blue-600 dark:text-blue-400">const App = () =&gt; {"{}"}</div>
                      <div className="animate-pulse delay-100 text-purple-600 dark:text-purple-400">return {"<div>"}</div>
                      <div className="animate-pulse delay-200 text-green-600 dark:text-green-400">export default App</div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">JavaScript</h3>
                  <p className="text-sm text-muted-foreground">Build websites, apps, and interactive experiences</p>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all cursor-pointer">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-red-50 to-blue-50 dark:from-red-900/20 dark:to-blue-900/20 rounded-t-lg overflow-hidden flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="text-4xl animate-bounce">🎨</div>
                    <div className="font-mono text-xs space-y-1">
                      <div className="animate-pulse text-red-600 dark:text-red-400">{"<div class=\"header\">"}</div>
                      <div className="animate-pulse delay-100 text-blue-600 dark:text-blue-400">.header {"{ color: blue; }"}</div>
                      <div className="animate-pulse delay-200 text-green-600 dark:text-green-400">{"</div>"}</div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">HTML & CSS</h3>
                  <p className="text-sm text-muted-foreground">Create beautiful websites from scratch</p>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all cursor-pointer">
              <CardContent className="p-0">
                <div className="aspect-video bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-900/20 dark:to-purple-900/20 rounded-t-lg overflow-hidden flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="text-4xl animate-bounce">☕</div>
                    <div className="font-mono text-xs space-y-1">
                      <div className="animate-pulse text-purple-600 dark:text-purple-400">@RestController</div>
                      <div className="animate-pulse delay-100 text-blue-600 dark:text-blue-400">public class API {}</div>
                      <div className="animate-pulse delay-200 text-green-600 dark:text-green-400">@GetMapping("/users")</div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">Java</h3>
                  <p className="text-sm text-muted-foreground">Enterprise applications and backend services</p>
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