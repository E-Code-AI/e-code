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
  Sparkles, Check, Loader2
} from 'lucide-react';
import { useState } from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useToast } from '@/hooks/use-toast';

export default function Landing() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [email, setEmail] = useState('');

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
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <section className="py-responsive">
        <div className="container-responsive max-w-6xl">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="mb-4">
              <Star className="h-3 w-3 mr-1" />
              Used by 20M+ learners, creators & professionals
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold">
              Create, learn, and explore{' '}
              <span className="text-primary">code together</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              The friendly platform where anyone can start their coding journey. No experience needed, 
              no complex setup. Just open your browser and begin creating.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" onClick={handleGetStarted} className="gap-2">
                Start your journey free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <PlayCircle className="h-4 w-4" />
                See how it works
              </Button>
            </div>
          </div>

          {/* IDE Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 blur-3xl" />
            <Card className="relative overflow-hidden border-2">
              <div className="bg-muted/50 p-2 flex items-center gap-2 border-b">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-600 dark:bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-600 dark:bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-600 dark:bg-green-400" />
                </div>
                <span className="text-xs text-muted-foreground">main.py</span>
              </div>
              <div className="p-4 bg-background font-mono text-sm">
                <div className="text-muted-foreground"># Your first line of code!</div>
                <div className="mt-2">
                  <span className="text-blue-600 dark:text-blue-400">print</span>(
                  <span className="text-green-600 dark:text-green-400">"Hello! I'm learning to code! 🎉"</span>)
                </div>
                <div className="mt-3 text-muted-foreground"># Click Run to see what happens ▶️</div>
                <div className="mt-2 text-green-600 dark:text-green-400">Output: Hello! I'm learning to code! 🎉</div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* AI Build Section - New */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container-responsive max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="secondary" className="mb-2">
                <Sparkles className="h-3 w-3 mr-1" />
                Powered by AI
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold">
                Just describe what you want.
                <span className="text-primary block">We'll build it instantly.</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                No coding experience? No problem. Tell us your idea in plain English, 
                and watch as E-Code's AI creates a working app in seconds.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-600/20 dark:bg-green-400/20 rounded">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Natural Language</h4>
                    <p className="text-sm text-muted-foreground">
                      Type "Build me a todo app with dark mode" and watch it happen
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-600/20 dark:bg-green-400/20 rounded">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Instant Results</h4>
                    <p className="text-sm text-muted-foreground">
                      See your app running live in seconds, not hours
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-600/20 dark:bg-green-400/20 rounded">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Full Control</h4>
                    <p className="text-sm text-muted-foreground">
                      Edit the generated code or let AI refine it with more instructions
                    </p>
                  </div>
                </div>
              </div>
              
              <Button size="lg" onClick={handleGetStarted} className="gap-2">
                Try AI Builder
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="relative">
              <Card className="overflow-hidden">
                <div className="bg-muted p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <Input
                      value="Create a weather app that shows 5-day forecast with beautiful animations"
                      readOnly
                      className="flex-1"
                    />
                    <Button size="sm">Generate</Button>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI is building your app...
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm">Created weather API integration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm">Added 5-day forecast display</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Implemented smooth animations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Styling the interface...</span>
                    </div>
                  </div>
                </div>
              </Card>
              
              <div className="absolute -bottom-4 -right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                30 seconds to build!
              </div>
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
                <div className="bg-muted rounded-lg p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                  <p className="text-sm">🥕 Carrot, 🥔 Potato, 🧅 Onion</p>
                  <p className="text-sm font-semibold mt-2">Found 12 recipes!</p>
                </div>
                <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
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
                <div className="bg-muted rounded-lg p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                  <div className="h-20 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded" />
                </div>
                <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
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
                <div className="bg-muted rounded-lg p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">25:00</p>
                    <p className="text-xs text-muted-foreground">Focus Time</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
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