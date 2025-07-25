import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  Code, Book, FileText, Terminal, Rocket, Package, Database,
  GitBranch, Shield, Zap, ChevronRight, Search, ExternalLink,
  ArrowRight, BookOpen, FileCode, Settings
} from 'lucide-react';
import { useState } from 'react';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: {
    title: string;
    description: string;
    href: string;
  }[];
}

export default function Docs() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const sections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Rocket className="h-5 w-5" />,
      items: [
        {
          title: 'Quick Start Guide',
          description: 'Get up and running with E-Code in minutes',
          href: '/docs/quick-start'
        },
        {
          title: 'Creating Your First Project',
          description: 'Learn how to create and configure projects',
          href: '/docs/first-project'
        },
        {
          title: 'Understanding the Interface',
          description: 'Navigate the E-Code IDE like a pro',
          href: '/docs/interface'
        }
      ]
    },
    {
      id: 'languages',
      title: 'Languages & Frameworks',
      icon: <Code className="h-5 w-5" />,
      items: [
        {
          title: 'Python',
          description: 'Python development guide and best practices',
          href: '/docs/python'
        },
        {
          title: 'JavaScript/Node.js',
          description: 'Build web apps with JavaScript and Node.js',
          href: '/docs/javascript'
        },
        {
          title: 'React & Next.js',
          description: 'Create modern React applications',
          href: '/docs/react'
        },
        {
          title: 'All Languages',
          description: 'See guides for all 50+ supported languages',
          href: '/docs/languages'
        }
      ]
    },
    {
      id: 'features',
      title: 'Features',
      icon: <Zap className="h-5 w-5" />,
      items: [
        {
          title: 'Multiplayer Collaboration',
          description: 'Code together in real-time',
          href: '/docs/multiplayer'
        },
        {
          title: 'Version Control',
          description: 'Use Git for version control',
          href: '/docs/git'
        },
        {
          title: 'Deployments',
          description: 'Deploy your apps to production',
          href: '/docs/deployments'
        },
        {
          title: 'Database',
          description: 'Work with PostgreSQL and E-Code DB',
          href: '/docs/database'
        }
      ]
    },
    {
      id: 'advanced',
      title: 'Advanced Topics',
      icon: <Settings className="h-5 w-5" />,
      items: [
        {
          title: 'Environment Variables',
          description: 'Manage secrets and configuration',
          href: '/docs/env-vars'
        },
        {
          title: 'Custom Domains',
          description: 'Use your own domain names',
          href: '/docs/domains'
        },
        {
          title: 'Performance Optimization',
          description: 'Make your apps run faster',
          href: '/docs/performance'
        },
        {
          title: 'Security Best Practices',
          description: 'Keep your code and data secure',
          href: '/docs/security'
        }
      ]
    }
  ];

  const popularArticles = [
    { title: 'Deploy a React App', views: '125K' },
    { title: 'Connect to PostgreSQL', views: '98K' },
    { title: 'Using Environment Variables', views: '87K' },
    { title: 'Real-time Collaboration Guide', views: '76K' },
    { title: 'Python Flask Tutorial', views: '65K' }
  ];

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
                <span className="font-bold text-xl">E-Code</span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <Button variant="ghost" size="sm" onClick={() => navigate('/docs')}>
                  Docs
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/api')}>
                  API
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/community')}>
                  Community
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/support')}>
                  Support
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
      <section className="py-16 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="mb-4">
              <BookOpen className="h-3 w-3 mr-1" />
              Documentation
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold">
              Build anything with E-Code
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to know to create, collaborate, and deploy amazing projects
            </p>
            
            {/* Search */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg w-fit mb-2">
                  <FileCode className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Quick Start</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  New to E-Code? Start here and build your first app in minutes.
                </p>
                <Button variant="link" className="p-0">
                  Get started
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg w-fit mb-2">
                  <Terminal className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>API Reference</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Integrate E-Code into your workflow with our comprehensive API.
                </p>
                <Button variant="link" className="p-0">
                  View API docs
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg w-fit mb-2">
                  <Book className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Tutorials</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Step-by-step guides for building real-world applications.
                </p>
                <Button variant="link" className="p-0">
                  Browse tutorials
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Documentation Sections */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Popular Articles</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {popularArticles.map((article, index) => (
                      <li key={index}>
                        <a href="#" className="flex items-center justify-between hover:text-primary transition-colors">
                          <span className="text-sm">{article.title}</span>
                          <Badge variant="secondary" className="text-xs">
                            {article.views}
                          </Badge>
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {sections.map(section => (
                <div key={section.id}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-muted rounded-lg">
                      {section.icon}
                    </div>
                    <h2 className="text-2xl font-bold">{section.title}</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {section.items.map((item, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center justify-between">
                            {item.title}
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Help Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-4">
            Can't find what you're looking for?
          </h2>
          <p className="text-muted-foreground mb-8">
            Our support team is here to help you succeed
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Browse all docs
            </Button>
            <Button>
              Contact support
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2024 E-Code Clone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}