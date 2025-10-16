// @ts-nocheck
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  Code, Terminal, Users, Shield, Rocket, Package, Database, 
  Globe, GitBranch, Zap, Lock, Cloud, Cpu, HardDrive, Network,
  FileCode, Bug, BarChart, Palette, Layers, Settings,
  ChevronRight, ArrowRight, CheckCircle
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
  category: string;
}

export default function Features() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const features: Feature[] = [
    // AI Agent
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'AI Agent - Your Personal Developer',
      description: 'Build complete apps just by describing what you want in any language',
      details: [
        'Build entire apps from scratch automatically',
        'No coding knowledge required at all',
        'Creates all files and folders for you',
        'Installs needed tools automatically',
        'Works like having an expert helper',
        'Updates code based on your feedback'
      ],
      category: 'AI-Powered'
    },
    // Development Environment
    {
      icon: <Code className="h-6 w-6" />,
      title: 'Friendly Code Editor',
      description: 'Write code easily with helpful suggestions and colorful highlighting',
      details: [
        'Colors that make code easy to read',
        'Helpful suggestions as you type',
        'Multiple ways to edit faster',
        'Easy navigation through your code',
        'Automatic error detection',
        'Choose colors that feel comfortable'
      ],
      category: 'Creating'
    },
    {
      icon: <Terminal className="h-6 w-6" />,
      title: 'Command Center',
      description: 'Run your code and see results instantly, just like magic',
      details: [
        'Run your programs with one click',
        'See results immediately',
        'Try multiple things at once',
        'Install tools you need easily',
        'Everything stays running',
        'Share your screen with helpers'
      ],
      category: 'Creating'
    },
    {
      icon: <FileCode className="h-6 w-6" />,
      title: 'Your Project Files',
      description: 'Organize your work just like folders on your computer',
      details: [
        'See all your files clearly',
        'Move files by dragging them',
        'Find any file quickly',
        'Track your changes easily',
        'Preview without opening',
        'Work with many files at once'
      ],
      category: 'Creating'
    },
    {
      icon: <Package className="h-6 w-6" />,
      title: 'Add Cool Features',
      description: 'Easily add pre-made tools to make your projects awesome',
      details: [
        'We find what you need automatically',
        'Browse thousands of helpful tools',
        'Always use the right version',
        'Everything stays organized',
        'Access special tools',
        'Stay safe from bad code'
      ],
      category: 'Creating'
    },

    // Collaboration
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Learn Together',
      description: 'Get help from friends or mentors in real-time',
      details: [
        'See where others are working',
        'Fix problems together',
        'Talk while you code',
        'Leave helpful notes',
        'Know who\'s online',
        'Share your screen easily'
      ],
      category: 'Learning Together'
    },
    {
      icon: <GitBranch className="h-6 w-6" />,
      title: 'Save Your Progress',
      description: 'Never lose your work with automatic saving and history',
      details: [
        'See what changed visually',
        'Try different ideas safely',
        'Fix mistakes easily',
        'Connect to GitHub simply',
        'Share your work',
        'See your journey over time'
      ],
      category: 'Learning Together'
    },

    // Infrastructure
    {
      icon: <Cloud className="h-6 w-6" />,
      title: 'Always Available',
      description: 'Your projects work from anywhere, anytime',
      details: [
        'Grows with your needs',
        'Fast loading everywhere',
        'Protected from attacks',
        'Almost never goes down',
        'Works worldwide',
        'Load balancing'
      ],
      category: 'Infrastructure'
    },
    {
      icon: <Database className="h-6 w-6" />,
      title: 'Built-in Database',
      description: 'PostgreSQL and key-value databases included',
      details: [
        'PostgreSQL with full SQL support',
        'Key-value store for caching',
        'Automatic backups',
        'Database migrations',
        'Query performance insights',
        'Connection pooling'
      ],
      category: 'Infrastructure'
    },
    {
      icon: <Rocket className="h-6 w-6" />,
      title: 'One-Click Deploy',
      description: 'Deploy to production instantly with automatic SSL',
      details: [
        'Zero-config deployments',
        'Automatic SSL certificates',
        'Custom domain support',
        'Rolling updates',
        'Deployment previews',
        'Rollback capabilities'
      ],
      category: 'Infrastructure'
    },

    // Security
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Enterprise Security',
      description: 'Bank-level security for your code and data',
      details: [
        'End-to-end encryption',
        'SOC 2 Type II certified',
        'GDPR compliant',
        'Two-factor authentication',
        'SSO integration',
        'Audit logs'
      ],
      category: 'Security'
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: 'Secret Management',
      description: 'Secure storage for API keys and credentials',
      details: [
        'Encrypted secret storage',
        'Environment variables',
        'Secret sharing with team',
        'Automatic rotation',
        'Access control',
        'Audit trail'
      ],
      category: 'Security'
    },

    // Analytics
    {
      icon: <BarChart className="h-6 w-6" />,
      title: 'Performance Monitoring',
      description: 'Real-time metrics and application monitoring',
      details: [
        'CPU and memory usage',
        'Request analytics',
        'Error tracking',
        'Custom metrics',
        'Performance alerts',
        'Historical data'
      ],
      category: 'Analytics'
    }
  ];

  const categories = ['All', 'Development', 'Collaboration', 'Infrastructure', 'Security', 'Analytics'];

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 sm:space-y-6">
            <Badge variant="secondary" className="mb-2 sm:mb-4 text-xs sm:text-sm">
              <Zap className="h-3 w-3 mr-1" />
              Everything you need in one place
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Features that empower developers
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4 sm:px-0">
              From writing your first line of code to deploying at scale, 
              E-Code provides all the tools you need in a single platform.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate(user ? '/dashboard' : '/auth')}>
                Start building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/docs')}>
                View documentation
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <Tabs defaultValue="All" className="w-full">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full max-w-3xl mx-auto">
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(category => (
              <TabsContent key={category} value={category} className="mt-12">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {features
                    .filter(f => category === 'All' || f.category === category)
                    .map((feature, index) => (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                            {feature.icon}
                          </div>
                          <CardTitle>{feature.title}</CardTitle>
                          <CardDescription>{feature.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {feature.details.map((detail, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Platform Overview */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                <Layers className="h-3 w-3 mr-1" />
                Complete Platform
              </Badge>
              <h2 className="text-3xl font-bold mb-4">
                Everything works together seamlessly
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our integrated platform means you spend less time configuring and more time building. 
                Everything from development to deployment is designed to work together perfectly.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                    <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Instant Environments</h3>
                    <p className="text-sm text-muted-foreground">
                      Spin up development environments in seconds, not hours
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded">
                    <Network className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Connected Ecosystem</h3>
                    <p className="text-sm text-muted-foreground">
                      All tools and services work together out of the box
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded">
                    <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Zero Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      Focus on coding, we handle the infrastructure
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 blur-3xl" />
              <Card className="relative">
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <Code className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-semibold">Write Code</p>
                        <p className="text-sm text-muted-foreground">In any language</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <Users className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-semibold">Collaborate</p>
                        <p className="text-sm text-muted-foreground">In real-time</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                      <Rocket className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-semibold">Deploy</p>
                        <p className="text-sm text-muted-foreground">With one click</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Experience the future of development
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join millions of developers who are building faster with E-Code
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate(user ? '/dashboard' : '/auth')}>
              Get started free
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/contact-sales')}>
              Contact sales
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}