import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  Zap, Globe, Users, Shield, Code, Terminal, GitBranch, 
  Rocket, Package, Database, Cpu, Cloud, Lock, Star,
  ChevronRight, ArrowRight, CheckCircle, PlayCircle
} from 'lucide-react';
import { useState } from 'react';

export default function Landing() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [email, setEmail] = useState('');

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Instant Development',
      description: 'Start coding in seconds with zero setup. No downloads, no configuration.'
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: 'Code from Anywhere',
      description: 'Access your projects from any device with a browser. Your workspace follows you.'
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Real-time Collaboration',
      description: 'Code together with your team in real-time. See changes as they happen.'
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with automatic backups and version control.'
    },
    {
      icon: <Package className="h-6 w-6" />,
      title: '50+ Languages',
      description: 'Support for Python, JavaScript, Go, Rust, and dozens more languages.'
    },
    {
      icon: <Rocket className="h-6 w-6" />,
      title: 'Deploy Instantly',
      description: 'Go from code to production with one click. Automatic SSL and scaling.'
    }
  ];

  const testimonials = [
    {
      quote: "Replit transformed how our team collaborates. We ship features 3x faster now.",
      author: "Sarah Chen",
      role: "CTO at TechStart",
      avatar: "SC"
    },
    {
      quote: "The best online IDE I've ever used. It just works, no matter what language.",
      author: "Marcus Johnson",
      role: "Full Stack Developer",
      avatar: "MJ"
    },
    {
      quote: "Teaching programming has never been easier. My students love it!",
      author: "Dr. Emily Rodriguez",
      role: "CS Professor",
      avatar: "ER"
    }
  ];

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would subscribe the email
    navigate('/auth');
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Code className="h-6 w-6" />
                <span className="font-bold text-xl">Replit</span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
                  Features
                </a>
                <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
                  Pricing
                </a>
                <a href="#testimonials" className="text-sm font-medium hover:text-primary transition-colors">
                  Testimonials
                </a>
                <Button variant="ghost" size="sm" onClick={() => navigate('/templates')}>
                  Templates
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Log in
              </Button>
              <Button onClick={handleGetStarted}>
                Start coding
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="mb-4">
              <Star className="h-3 w-3 mr-1" />
              Used by 20M+ developers worldwide
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold">
              Build software faster,{' '}
              <span className="text-primary">together</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              The collaborative browser-based IDE that makes coding accessible to everyone. 
              Write, run, and deploy code in 50+ languages — no setup required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" onClick={handleGetStarted} className="gap-2">
                Start coding for free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <PlayCircle className="h-4 w-4" />
                Watch demo
              </Button>
            </div>
          </div>

          {/* IDE Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 blur-3xl" />
            <Card className="relative overflow-hidden border-2">
              <div className="bg-muted/50 p-2 flex items-center gap-2 border-b">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-muted-foreground">main.py</span>
              </div>
              <div className="p-4 bg-background font-mono text-sm">
                <div className="text-muted-foreground"># Welcome to Replit!</div>
                <div>
                  <span className="text-blue-400">def</span>{' '}
                  <span className="text-yellow-400">hello_world</span>():
                </div>
                <div className="pl-4">
                  <span className="text-blue-400">print</span>(
                  <span className="text-green-400">"Hello from the cloud! 🌍"</span>)
                </div>
                <div className="mt-2">
                  <span className="text-yellow-400">hello_world</span>()
                </div>
                <div className="mt-2 text-green-400"># Output: Hello from the cloud! 🌍</div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to build
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features that make development faster and more enjoyable
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
              Built for every developer
            </h2>
            <p className="text-lg text-muted-foreground">
              From learning to launching, Replit scales with you
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full w-fit mb-2">
                  <Code className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Learn to Code</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Perfect for beginners. Start with interactive tutorials and learn at your own pace.
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
              Join millions of developers who build with Replit
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
                <Button type="submit" size="lg" variant="secondary">
                  Get started free
                </Button>
              </form>
              <p className="text-sm mt-4 opacity-75">
                No credit card required • Free forever for individuals
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Code className="h-6 w-6" />
                <span className="font-bold text-xl">Replit</span>
              </div>
              <p className="text-muted-foreground mb-4">
                The collaborative browser-based IDE
              </p>
              <div className="flex gap-4">
                <Button variant="ghost" size="icon">
                  <GitBranch className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Globe className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/features" className="hover:text-foreground">Features</a></li>
                <li><a href="/pricing" className="hover:text-foreground">Pricing</a></li>
                <li><a href="/templates" className="hover:text-foreground">Templates</a></li>
                <li><a href="/deployments" className="hover:text-foreground">Deployments</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/docs" className="hover:text-foreground">Documentation</a></li>
                <li><a href="/blog" className="hover:text-foreground">Blog</a></li>
                <li><a href="/community" className="hover:text-foreground">Community</a></li>
                <li><a href="/support" className="hover:text-foreground">Support</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/about" className="hover:text-foreground">About</a></li>
                <li><a href="/careers" className="hover:text-foreground">Careers</a></li>
                <li><a href="/privacy" className="hover:text-foreground">Privacy</a></li>
                <li><a href="/terms" className="hover:text-foreground">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Replit Clone. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}