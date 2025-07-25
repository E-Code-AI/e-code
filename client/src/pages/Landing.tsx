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
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

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

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would subscribe the email
    navigate('/auth');
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
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-muted-foreground">main.py</span>
              </div>
              <div className="p-4 bg-background font-mono text-sm">
                <div className="text-muted-foreground"># Your first line of code!</div>
                <div className="mt-2">
                  <span className="text-blue-400">print</span>(
                  <span className="text-green-400">"Hello! I'm learning to code! 🎉"</span>)
                </div>
                <div className="mt-3 text-muted-foreground"># Click Run to see what happens ▶️</div>
                <div className="mt-2 text-green-400">Output: Hello! I'm learning to code! 🎉</div>
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

      <PublicFooter />
    </div>
  );
}