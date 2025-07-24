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
    // Development Environment
    {
      icon: <Code className="h-6 w-6" />,
      title: 'Powerful Code Editor',
      description: 'A full-featured IDE in your browser with intelligent code completion',
      details: [
        'Syntax highlighting for 50+ languages',
        'IntelliSense and auto-completion',
        'Multi-cursor editing',
        'Code folding and navigation',
        'Integrated linting and formatting',
        'Custom themes and settings'
      ],
      category: 'Development'
    },
    {
      icon: <Terminal className="h-6 w-6" />,
      title: 'Integrated Terminal',
      description: 'Full Linux terminal with root access in every project',
      details: [
        'Persistent shell sessions',
        'Multiple terminal tabs',
        'Custom shell configurations',
        'Package installation via apt/pip/npm',
        'Background process support',
        'Terminal sharing for collaboration'
      ],
      category: 'Development'
    },
    {
      icon: <FileCode className="h-6 w-6" />,
      title: 'File Management',
      description: 'Advanced file explorer with drag-and-drop support',
      details: [
        'Tree view file explorer',
        'Drag and drop file operations',
        'File search and replace',
        'Git integration in file tree',
        'File preview and quick edit',
        'Bulk file operations'
      ],
      category: 'Development'
    },
    {
      icon: <Package className="h-6 w-6" />,
      title: 'Package Management',
      description: 'Install any package from npm, pip, cargo, and more',
      details: [
        'Automatic dependency detection',
        'Package search and discovery',
        'Version management',
        'Lock file support',
        'Private registry support',
        'Vulnerability scanning'
      ],
      category: 'Development'
    },

    // Collaboration
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Real-time Collaboration',
      description: 'Code together with your team in real-time',
      details: [
        'Live cursor tracking',
        'Shared debugging sessions',
        'Voice and video chat',
        'Code reviews and comments',
        'Presence indicators',
        'Collaborative terminals'
      ],
      category: 'Collaboration'
    },
    {
      icon: <GitBranch className="h-6 w-6" />,
      title: 'Version Control',
      description: 'Built-in Git support with visual tools',
      details: [
        'Visual Git interface',
        'Branch management',
        'Merge conflict resolution',
        'GitHub/GitLab integration',
        'Pull request creation',
        'Commit history visualization'
      ],
      category: 'Collaboration'
    },

    // Infrastructure
    {
      icon: <Cloud className="h-6 w-6" />,
      title: 'Cloud Infrastructure',
      description: 'Scalable cloud computing powered by Google Cloud',
      details: [
        'Auto-scaling resources',
        'Global CDN distribution',
        'DDoS protection',
        '99.9% uptime SLA',
        'Multiple region deployment',
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
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/')}
              >
                <Code className="h-6 w-6" />
                <span className="font-bold text-xl">Replit</span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <Button variant="ghost" size="sm" onClick={() => navigate('/features')}>
                  Features
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
                  Pricing
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/templates')}>
                  Templates
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/docs')}>
                  Docs
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Log in
              </Button>
              <Button onClick={() => navigate(user ? '/dashboard' : '/auth')}>
                {user ? 'Dashboard' : 'Sign up'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="mb-4">
              <Zap className="h-3 w-3 mr-1" />
              Everything you need in one place
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold">
              Features that empower developers
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From writing your first line of code to deploying at scale, 
              Replit provides all the tools you need in a single platform.
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
            Join millions of developers who are building faster with Replit
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

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Replit Clone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}