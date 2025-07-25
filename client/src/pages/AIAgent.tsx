import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  Sparkles, Zap, Code, Terminal, Package, GitBranch, 
  Rocket, ArrowRight, CheckCircle, PlayCircle, Timer,
  Brain, Cpu, Globe, Shield, Users, Star, TrendingUp,
  MessageSquare, FileCode, Folder, Settings, Database
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useState } from 'react';

export default function AIAgent() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      window.location.href = '/api/login';
    }
  };

  const capabilities = [
    {
      title: 'Natural Language Understanding',
      description: 'Just tell it what you want in plain English',
      examples: [
        '"Build a todo app with dark mode"',
        '"Create a portfolio website with animations"',
        '"Make a chat app with real-time messages"',
        '"Build an e-commerce store with cart"'
      ]
    },
    {
      title: 'Complete Project Generation',
      description: 'Creates entire project structures automatically',
      examples: [
        'Generates all necessary files and folders',
        'Sets up proper project configuration',
        'Installs required dependencies',
        'Creates responsive layouts'
      ]
    },
    {
      title: 'Smart Code Decisions',
      description: 'Makes intelligent architectural choices',
      examples: [
        'Chooses the right framework for your needs',
        'Implements best practices automatically',
        'Adds error handling and validation',
        'Optimizes for performance'
      ]
    },
    {
      title: 'Continuous Improvement',
      description: 'Refines and updates based on feedback',
      examples: [
        '"Add a search feature to the app"',
        '"Make the design more colorful"',
        '"Add user authentication"',
        '"Connect it to a database"'
      ]
    }
  ];

  const useCases = [
    {
      category: 'Business',
      apps: [
        { name: 'Landing Pages', time: '30s', icon: <Globe className="h-4 w-4" /> },
        { name: 'Contact Forms', time: '20s', icon: <MessageSquare className="h-4 w-4" /> },
        { name: 'Admin Dashboards', time: '45s', icon: <Settings className="h-4 w-4" /> },
        { name: 'Analytics Tools', time: '40s', icon: <TrendingUp className="h-4 w-4" /> }
      ]
    },
    {
      category: 'Personal',
      apps: [
        { name: 'Portfolio Sites', time: '35s', icon: <Star className="h-4 w-4" /> },
        { name: 'Blogs', time: '25s', icon: <FileCode className="h-4 w-4" /> },
        { name: 'Task Managers', time: '30s', icon: <CheckCircle className="h-4 w-4" /> },
        { name: 'Budget Trackers', time: '35s', icon: <Database className="h-4 w-4" /> }
      ]
    },
    {
      category: 'Education',
      apps: [
        { name: 'Quiz Apps', time: '40s', icon: <Brain className="h-4 w-4" /> },
        { name: 'Flashcards', time: '25s', icon: <Package className="h-4 w-4" /> },
        { name: 'Study Timers', time: '20s', icon: <Timer className="h-4 w-4" /> },
        { name: 'Note Takers', time: '30s', icon: <FileCode className="h-4 w-4" /> }
      ]
    },
    {
      category: 'Games',
      apps: [
        { name: 'Memory Games', time: '35s', icon: <Brain className="h-4 w-4" /> },
        { name: 'Puzzle Games', time: '40s', icon: <Cpu className="h-4 w-4" /> },
        { name: 'Word Games', time: '30s', icon: <MessageSquare className="h-4 w-4" /> },
        { name: 'Drawing Apps', time: '45s', icon: <Star className="h-4 w-4" /> }
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10" />
        <div className="container-responsive max-w-6xl relative">
          <div className="text-center space-y-6">
            <Badge variant="default" className="text-sm px-4 py-1">
              <Sparkles className="h-4 w-4 mr-1" />
              Powered by Advanced AI
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold">
              The AI that builds
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent"> complete apps</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              No coding experience? No problem. Our AI agent is like having a senior developer 
              who understands exactly what you want and builds it perfectly, every time.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={handleGetStarted} className="gap-2">
                Try AI Agent Free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <PlayCircle className="h-4 w-4" />
                Watch It Build
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Building apps is now as easy as having a conversation
            </h2>
            <p className="text-lg text-muted-foreground">
              Just describe what you want. Watch it come to life.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">1. Describe Your Idea</h3>
              <p className="text-muted-foreground">
                Type what you want in plain English. "Build me a recipe app with search and favorites"
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">2. AI Builds Everything</h3>
              <p className="text-muted-foreground">
                Watch as the AI creates files, writes code, and sets up your entire project
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Rocket className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">3. Your App is Ready</h3>
              <p className="text-muted-foreground">
                In under a minute, your app is running and ready to share with the world
              </p>
            </div>
          </div>

          {/* Live Demo */}
          <Card className="overflow-hidden max-w-4xl mx-auto">
            <CardHeader className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6" />
                  <div>
                    <CardTitle>Live AI Building Demo</CardTitle>
                    <CardDescription className="text-white/80">
                      Watch the AI build a weather app in real-time
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  <Timer className="h-3 w-3 mr-1" />
                  0:42
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 bg-black">
              <div className="space-y-3 font-mono text-sm">
                <div className="text-green-400">$ AI: Starting to build your weather app...</div>
                <div className="text-blue-400">✓ Created project structure</div>
                <div className="text-blue-400">✓ Set up weather API integration</div>
                <div className="text-blue-400">✓ Built location search feature</div>
                <div className="text-blue-400">✓ Added 5-day forecast display</div>
                <div className="text-blue-400">✓ Implemented responsive design</div>
                <div className="text-yellow-400">→ Installing dependencies...</div>
                <div className="text-green-400 animate-pulse">✓ App is ready and running!</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Capabilities Tabs */}
      <section className="py-20">
        <div className="container-responsive max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              More than just code generation
            </h2>
            <p className="text-lg text-muted-foreground">
              A complete development partner that thinks, designs, and builds
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>
              <TabsTrigger value="comparison">Why E-Code?</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {capabilities.map((cap, idx) => (
                  <Card key={idx}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {cap.title}
                      </CardTitle>
                      <CardDescription>{cap.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {cap.examples.map((example, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                            <span className="text-sm">{example}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="capabilities" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <Code className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Multi-Language Support</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Builds apps in any language or framework
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">JavaScript</Badge>
                      <Badge variant="secondary">Python</Badge>
                      <Badge variant="secondary">HTML/CSS</Badge>
                      <Badge variant="secondary">React</Badge>
                      <Badge variant="secondary">Node.js</Badge>
                      <Badge variant="secondary">More...</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Brain className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Smart Architecture</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Makes intelligent decisions about structure
                    </p>
                    <ul className="space-y-1 text-sm">
                      <li>• Proper file organization</li>
                      <li>• Best practice patterns</li>
                      <li>• Scalable architecture</li>
                      <li>• Security considerations</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Zap className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Lightning Fast</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Complete apps in under a minute
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Simple apps</span>
                        <span className="font-semibold">20-30s</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Complex apps</span>
                        <span className="font-semibold">45-60s</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>With database</span>
                        <span className="font-semibold">+15s</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="examples" className="space-y-6">
              <div className="space-y-8">
                {useCases.map((category, idx) => (
                  <div key={idx}>
                    <h3 className="text-xl font-semibold mb-4">{category.category} Apps</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {category.apps.map((app, i) => (
                        <Card key={i} className="hover:shadow-lg transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              {app.icon}
                              <Badge variant="outline" className="text-xs">
                                {app.time}
                              </Badge>
                            </div>
                            <h4 className="font-semibold">{app.name}</h4>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="comparison" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-semibold mb-6">Traditional Coding</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-600 dark:text-red-400 text-xs">✗</span>
                      </div>
                      <span>Months to learn programming basics</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-600 dark:text-red-400 text-xs">✗</span>
                      </div>
                      <span>Hours to set up development environment</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-600 dark:text-red-400 text-xs">✗</span>
                      </div>
                      <span>Days to build a simple app</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-600 dark:text-red-400 text-xs">✗</span>
                      </div>
                      <span>Constant debugging and fixing errors</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-6">E-Code AI Agent</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                      </div>
                      <span>Zero coding knowledge required</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                      </div>
                      <span>Instant setup, no installation needed</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                      </div>
                      <span>Complete apps in under a minute</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                      </div>
                      <span>Clean, working code every time</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-12 text-center">
                <Card className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white max-w-2xl mx-auto">
                  <CardContent className="p-8">
                    <h3 className="text-2xl font-bold mb-4">Ready to build something amazing?</h3>
                    <p className="mb-6">Join thousands who are building apps without writing code</p>
                    <Button 
                      size="lg" 
                      variant="secondary" 
                      onClick={handleGetStarted}
                      className="gap-2"
                    >
                      Start Building Now
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50K+</div>
              <div className="text-muted-foreground">Apps Built</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">30s</div>
              <div className="text-muted-foreground">Average Build Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <div className="text-muted-foreground">No Code Required</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">AI Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container-responsive max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Stop dreaming. Start building.
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Your ideas deserve to exist. Let our AI bring them to life.
          </p>
          <Button size="lg" onClick={handleGetStarted} className="gap-2">
            Build Your First App
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}