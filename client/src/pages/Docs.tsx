import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { 
  Code, Book, FileText, Terminal, Rocket, Package, Database,
  GitBranch, Shield, Zap, ChevronRight, Search, ExternalLink,
  ArrowRight, BookOpen, FileCode, Settings, Play, Users,
  Cpu, Globe, Layers, Palette, GraduationCap, HelpCircle,
  MessageSquare, Video, PuzzleIcon, Bot, Sparkles, Cloud,
  Key, CreditCard, BarChart, Boxes, ChevronDown, Home,
  Command, Braces, Hash, FileJson, Coffee, Binary,
  Code2, Gem, Cog, Component, Apple, Smartphone,
  Music, DollarSign, Briefcase, School, Trophy, Heart
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DocCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: {
    title: string;
    href: string;
    description?: string;
    badge?: string;
  }[];
}

export default function Docs() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['getting-started']);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const docCategories: DocCategory[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <Rocket className="h-4 w-4" />,
      items: [
        { title: 'Introduction to E-Code', href: '/docs/intro' },
        { title: 'Quick Start', href: '/docs/quickstart' },
        { title: 'Your First Project', href: '/docs/first-project' },
        { title: 'Understanding the Workspace', href: '/docs/workspace' },
        { title: 'Keyboard Shortcuts', href: '/docs/shortcuts' },
        { title: 'Mobile App', href: '/docs/mobile', badge: 'New' }
      ]
    },
    {
      id: 'ai-features',
      title: 'AI Features',
      icon: <Bot className="h-4 w-4" />,
      items: [
        { title: 'AI Agent Overview', href: '/docs/ai-agent', badge: 'Hot' },
        { title: 'Building with AI', href: '/docs/ai-building' },
        { title: 'Code Completion', href: '/docs/ai-completion' },
        { title: 'AI Chat Assistant', href: '/docs/ai-chat' },
        { title: 'Debugging with AI', href: '/docs/ai-debugging' },
        { title: 'AI Model Selection', href: '/docs/ai-models' }
      ]
    },
    {
      id: 'languages',
      title: 'Languages',
      icon: <Code className="h-4 w-4" />,
      items: [
        { title: 'Python', href: '/docs/languages/python' },
        { title: 'JavaScript/TypeScript', href: '/docs/languages/javascript' },
        { title: 'Java', href: '/docs/languages/java' },
        { title: 'C/C++', href: '/docs/languages/cpp' },
        { title: 'Go', href: '/docs/languages/go' },
        { title: 'Rust', href: '/docs/languages/rust' },
        { title: 'Ruby', href: '/docs/languages/ruby' },
        { title: 'PHP', href: '/docs/languages/php' },
        { title: 'C#', href: '/docs/languages/csharp' },
        { title: 'Swift', href: '/docs/languages/swift' },
        { title: 'R', href: '/docs/languages/r' },
        { title: 'All Languages (50+)', href: '/docs/languages/all' }
      ]
    },
    {
      id: 'frameworks',
      title: 'Frameworks & Libraries',
      icon: <Boxes className="h-4 w-4" />,
      items: [
        { title: 'React', href: '/docs/frameworks/react' },
        { title: 'Next.js', href: '/docs/frameworks/nextjs' },
        { title: 'Vue.js', href: '/docs/frameworks/vue' },
        { title: 'Angular', href: '/docs/frameworks/angular' },
        { title: 'Express.js', href: '/docs/frameworks/express' },
        { title: 'Django', href: '/docs/frameworks/django' },
        { title: 'Flask', href: '/docs/frameworks/flask' },
        { title: 'Ruby on Rails', href: '/docs/frameworks/rails' },
        { title: 'Spring Boot', href: '/docs/frameworks/spring' },
        { title: 'Flutter', href: '/docs/frameworks/flutter' },
        { title: 'React Native', href: '/docs/frameworks/react-native' },
        { title: 'TensorFlow', href: '/docs/frameworks/tensorflow' }
      ]
    },
    {
      id: 'features',
      title: 'Core Features',
      icon: <Zap className="h-4 w-4" />,
      items: [
        { title: 'Multiplayer Collaboration', href: '/docs/multiplayer' },
        { title: 'Version Control (Git)', href: '/docs/git' },
        { title: 'Live Preview', href: '/docs/preview' },
        { title: 'Terminal & Shell', href: '/docs/terminal' },
        { title: 'File System', href: '/docs/files' },
        { title: 'Package Management', href: '/docs/packages' },
        { title: 'Environment Variables', href: '/docs/env-vars' },
        { title: 'Secrets Management', href: '/docs/secrets' },
        { title: 'Code Search', href: '/docs/search' },
        { title: 'Extensions', href: '/docs/extensions' }
      ]
    },
    {
      id: 'deployment',
      title: 'Deployment & Hosting',
      icon: <Cloud className="h-4 w-4" />,
      items: [
        { title: 'Deployments Overview', href: '/docs/deployments' },
        { title: 'Custom Domains', href: '/docs/domains' },
        { title: 'SSL Certificates', href: '/docs/ssl' },
        { title: 'Environment Configuration', href: '/docs/deploy-config' },
        { title: 'Scaling & Performance', href: '/docs/scaling' },
        { title: 'Monitoring & Analytics', href: '/docs/monitoring' },
        { title: 'CI/CD Integration', href: '/docs/cicd' }
      ]
    },
    {
      id: 'database',
      title: 'Databases',
      icon: <Database className="h-4 w-4" />,
      items: [
        { title: 'PostgreSQL', href: '/docs/postgres' },
        { title: 'E-Code DB', href: '/docs/replitdb' },
        { title: 'MySQL', href: '/docs/mysql' },
        { title: 'MongoDB', href: '/docs/mongodb' },
        { title: 'Redis', href: '/docs/redis' },
        { title: 'SQLite', href: '/docs/sqlite' },
        { title: 'Database Migrations', href: '/docs/migrations' }
      ]
    },
    {
      id: 'teams',
      title: 'Teams & Organizations',
      icon: <Users className="h-4 w-4" />,
      items: [
        { title: 'Teams Overview', href: '/docs/teams' },
        { title: 'Creating a Team', href: '/docs/teams/create' },
        { title: 'Team Roles & Permissions', href: '/docs/teams/roles' },
        { title: 'Team Projects', href: '/docs/teams/projects' },
        { title: 'Billing for Teams', href: '/docs/teams/billing' },
        { title: 'SSO & SAML', href: '/docs/teams/sso', badge: 'Enterprise' }
      ]
    },
    {
      id: 'education',
      title: 'Education',
      icon: <GraduationCap className="h-4 w-4" />,
      items: [
        { title: 'Teams for Education', href: '/docs/education' },
        { title: 'Classroom Setup', href: '/docs/education/classroom' },
        { title: 'Assignments', href: '/docs/education/assignments' },
        { title: 'Autograding', href: '/docs/education/autograding' },
        { title: 'Student Privacy', href: '/docs/education/privacy' },
        { title: 'Curriculum Resources', href: '/docs/education/curriculum' }
      ]
    },
    {
      id: 'api',
      title: 'API & Integrations',
      icon: <Terminal className="h-4 w-4" />,
      items: [
        { title: 'API Overview', href: '/docs/api' },
        { title: 'Authentication', href: '/docs/api/auth' },
        { title: 'Projects API', href: '/docs/api/projects' },
        { title: 'Files API', href: '/docs/api/files' },
        { title: 'Execution API', href: '/docs/api/execution' },
        { title: 'Webhooks', href: '/docs/api/webhooks' },
        { title: 'GraphQL API', href: '/docs/api/graphql', badge: 'Beta' },
        { title: 'GitHub Integration', href: '/docs/integrations/github' },
        { title: 'VS Code Extension', href: '/docs/integrations/vscode' }
      ]
    },
    {
      id: 'security',
      title: 'Security & Compliance',
      icon: <Shield className="h-4 w-4" />,
      items: [
        { title: 'Security Overview', href: '/docs/security' },
        { title: 'Data Privacy', href: '/docs/privacy' },
        { title: 'SOC 2 Compliance', href: '/docs/soc2' },
        { title: 'GDPR', href: '/docs/gdpr' },
        { title: 'Security Best Practices', href: '/docs/security/best-practices' },
        { title: 'Vulnerability Disclosure', href: '/docs/security/disclosure' }
      ]
    },
    {
      id: 'billing',
      title: 'Billing & Plans',
      icon: <CreditCard className="h-4 w-4" />,
      items: [
        { title: 'Pricing Overview', href: '/docs/billing' },
        { title: 'Free Plan', href: '/docs/billing/free' },
        { title: 'Hacker Plan', href: '/docs/billing/hacker' },
        { title: 'Pro Plan', href: '/docs/billing/pro' },
        { title: 'Cycles', href: '/docs/billing/cycles' },
        { title: 'Bounties', href: '/docs/billing/bounties' },
        { title: 'Enterprise', href: '/docs/billing/enterprise' }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <HelpCircle className="h-4 w-4" />,
      items: [
        { title: 'Common Issues', href: '/docs/troubleshooting' },
        { title: 'Performance Issues', href: '/docs/troubleshooting/performance' },
        { title: 'Connection Problems', href: '/docs/troubleshooting/connection' },
        { title: 'Build Errors', href: '/docs/troubleshooting/build' },
        { title: 'Debugging Guide', href: '/docs/troubleshooting/debugging' },
        { title: 'Getting Help', href: '/docs/support' }
      ]
    }
  ];

  const quickStartGuides = [
    { title: 'Build a Website', icon: <Globe className="h-5 w-5" />, time: '5 min' },
    { title: 'Create a Discord Bot', icon: <MessageSquare className="h-5 w-5" />, time: '10 min' },
    { title: 'Deploy a REST API', icon: <Terminal className="h-5 w-5" />, time: '15 min' },
    { title: 'Build a Game', icon: <PuzzleIcon className="h-5 w-5" />, time: '20 min' },
    { title: 'Train an AI Model', icon: <Sparkles className="h-5 w-5" />, time: '30 min' },
    { title: 'Create a Mobile App', icon: <Smartphone className="h-5 w-5" />, time: '25 min' }
  ];

  const popularTemplates = [
    { name: 'Next.js Starter', language: 'TypeScript', icon: <Code2 className="h-4 w-4" /> },
    { name: 'Python Flask API', language: 'Python', icon: <Binary className="h-4 w-4" /> },
    { name: 'Discord Bot', language: 'JavaScript', icon: <MessageSquare className="h-4 w-4" /> },
    { name: 'React + Vite', language: 'JavaScript', icon: <Zap className="h-4 w-4" /> },
    { name: 'Express.js API', language: 'JavaScript', icon: <Terminal className="h-4 w-4" /> },
    { name: 'Django Web App', language: 'Python', icon: <Globe className="h-4 w-4" /> }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/')}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">E</span>
                </div>
                <span className="font-semibold text-lg">E-Code Docs</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="hidden md:flex items-center gap-4">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Guides
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  API Reference
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Templates
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Community
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
              >
                {user ? 'Dashboard' : 'Sign up'}
              </Button>
              <Button 
                size="sm"
                onClick={() => navigate('/projects')}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                Start coding
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block w-64 border-r bg-muted/30 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
          <ScrollArea className="h-full py-6 px-4">
            <div className="space-y-1">
              {docCategories.map(category => (
                <Collapsible
                  key={category.id}
                  open={expandedCategories.includes(category.id)}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                    <div className="flex items-center gap-2">
                      {category.icon}
                      <span>{category.title}</span>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 transition-transform",
                        expandedCategories.includes(category.id) && "rotate-180"
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 ml-6 space-y-1">
                    {category.items.map(item => (
                      <a
                        key={item.href}
                        href={item.href}
                        className="group flex items-center justify-between px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                      >
                        <span>{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </a>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Hero Section */}
          <section className="px-6 py-12 bg-gradient-to-b from-primary/5 to-transparent">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <Badge variant="secondary" className="mb-4">
                <BookOpen className="h-3 w-3 mr-1" />
                Documentation v2.0
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold">
                Build anything with E-Code
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Learn how to use E-Code's powerful features to create, collaborate, and deploy your projects
              </p>
              
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search docs... (Try 'AI Agent', 'deploy', 'Python')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-6 text-base"
                />
                <kbd className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>
          </section>

          {/* Quick Start Guides */}
          <section className="px-6 py-12">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Quick Start Guides</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {quickStartGuides.map((guide, index) => (
                  <Card key={index} className="hover:shadow-lg transition-all cursor-pointer group">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          {guide.icon}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {guide.time}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {guide.title}
                      </h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Popular Templates */}
          <section className="px-6 py-12 bg-muted/30">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Popular Templates</h2>
                <Button variant="ghost" size="sm" className="text-primary">
                  View all templates
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {popularTemplates.map((template, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          {template.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{template.name}</h3>
                          <p className="text-sm text-muted-foreground">{template.language}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button variant="secondary" size="sm" className="w-full">
                        Use template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Featured Content */}
          <section className="px-6 py-12">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">Featured Resources</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Bot className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle>AI Agent Documentation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Learn how to use our AI agent to build complete applications autonomously
                    </p>
                    <Button variant="link" className="p-0">
                      Read the guide
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Video className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle>Video Tutorials</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Watch step-by-step tutorials for popular frameworks and languages
                    </p>
                    <Button variant="link" className="p-0">
                      Watch videos
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <School className="h-8 w-8 mb-2 text-primary" />
                    <CardTitle>100 Days of Code</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Join our structured learning path to master programming
                    </p>
                    <Button variant="link" className="p-0">
                      Start learning
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Help Section */}
          <section className="px-6 py-16 bg-muted/30">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">
                Need help?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Can't find what you're looking for? We're here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="outline">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Join Community
                </Button>
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  <HelpCircle className="mr-2 h-5 w-5" />
                  Contact Support
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}