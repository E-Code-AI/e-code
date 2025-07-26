import { ReplitEditorInterface } from '@/components/replit/ReplitEditorInterface';
import { ReplitLayout } from '@/components/layout/ReplitLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Code, 
  Palette, 
  Zap, 
  Globe, 
  Users, 
  Shield,
  ArrowRight,
  Star,
  GitBranch,
  Terminal,
  FileText,
  Settings
} from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

export default function ReplitDemo() {
  const features = [
    {
      icon: <Code className="h-6 w-6" />,
      title: "Advanced Code Editor",
      description: "Monaco-powered editor with syntax highlighting, IntelliSense, and real-time collaboration",
      color: "text-blue-500"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Instant Execution",
      description: "Run code instantly with our lightning-fast containerized execution environment",
      color: "text-yellow-500"
    },
    {
      icon: <GitBranch className="h-6 w-6" />,
      title: "Version Control",
      description: "Built-in Git integration with visual diff, commit history, and branch management",
      color: "text-green-500"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Real-time Collaboration",
      description: "Code together with live cursors, shared terminals, and instant synchronization",
      color: "text-purple-500"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Instant Deployment",
      description: "Deploy your projects to the web with a single click and share them with the world",
      color: "text-indigo-500"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Environment",
      description: "Sandboxed execution with enterprise-grade security and access controls",
      color: "text-red-500"
    }
  ];

  const stats = [
    { label: "Active Projects", value: "2.5M+", icon: <FileText className="h-4 w-4" /> },
    { label: "Code Executions", value: "1B+", icon: <Zap className="h-4 w-4" /> },
    { label: "Developers", value: "500K+", icon: <Users className="h-4 w-4" /> },
    { label: "Languages", value: "50+", icon: <Code className="h-4 w-4" /> }
  ];

  return (
    <ReplitLayout showSidebar={false} className="bg-[var(--ecode-background)]">
      <div className="h-full overflow-auto">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-[var(--ecode-accent)] to-purple-600 text-white">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-white/20 text-white">
                  <Star className="h-3 w-3 mr-1" />
                  Complete Replit Clone
                </Badge>
              </div>
              <h1 className="text-5xl font-bold mb-6">
                The Ultimate
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-400">
                  Development Platform
                </span>
              </h1>
              <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
                Experience the power of Replit with E-Code. Complete IDE with real-time collaboration, 
                instant deployment, and advanced development tools - all in your browser.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-white text-[var(--ecode-accent)] hover:bg-white/90">
                  Try Live Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  View Source Code
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    {stat.icon}
                    <span className="text-2xl font-bold ml-2">{stat.value}</span>
                  </div>
                  <p className="text-white/80 text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Demo Section */}
        <div className="bg-[var(--ecode-surface)] border-y border-[var(--ecode-border)]">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-[var(--ecode-text)] mb-4">
                Live Interactive Demo
              </h2>
              <p className="text-[var(--ecode-text-secondary)] max-w-2xl mx-auto">
                Experience the full Replit interface with syntax highlighting, real-time preview, 
                and all the tools you need for modern development.
              </p>
            </div>

            {/* Demo Tabs */}
            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="editor">Code Editor</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
                <TabsTrigger value="deployment">Deployment</TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="space-y-4">
                <div className="border border-[var(--ecode-border)] rounded-lg overflow-hidden">
                  <ReplitEditorInterface
                    projectId="demo-1"
                    projectName="E-Code Demo Project"
                    language="JavaScript"
                  />
                </div>
              </TabsContent>

              <TabsContent value="features" className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {features.map((feature, index) => (
                    <Card key={index} className="border-[var(--ecode-border)]">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg bg-gray-100 dark:bg-gray-800", feature.color)}>
                            {feature.icon}
                          </div>
                          {feature.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{feature.description}</CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="collaboration" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-2xl font-bold text-[var(--ecode-text)] mb-4">
                      Code Together in Real-Time
                    </h3>
                    <div className="space-y-4 text-[var(--ecode-text-secondary)]">
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-[var(--ecode-accent)] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-[var(--ecode-text)]">Live Cursors</p>
                          <p className="text-sm">See exactly where your teammates are editing with colored cursors and real-time presence.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Terminal className="h-5 w-5 text-[var(--ecode-accent)] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-[var(--ecode-text)]">Shared Terminals</p>
                          <p className="text-sm">Run commands together with shared terminal sessions and synchronized output.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <GitBranch className="h-5 w-5 text-[var(--ecode-accent)] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-[var(--ecode-text)]">Version Control</p>
                          <p className="text-sm">Built-in Git integration with conflict resolution and branch management.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 rounded-lg">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm text-[var(--ecode-text-secondary)] ml-2">3 collaborators online</span>
                    </div>
                    <div className="space-y-2 font-mono text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-4 bg-green-500 opacity-60"></div>
                        <span>Alice is editing main.js</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-4 bg-blue-500 opacity-60"></div>
                        <span>Bob is running tests</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-4 bg-purple-500 opacity-60"></div>
                        <span>Carol is in terminal</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="deployment" className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-[var(--ecode-text)] mb-4">
                    Deploy to the Web Instantly
                  </h3>
                  <p className="text-[var(--ecode-text-secondary)] max-w-2xl mx-auto mb-8">
                    Share your creations with the world in seconds. No complex configuration, 
                    no deployment pipelines - just click and go live.
                  </p>
                  
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6 max-w-2xl mx-auto">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-700 dark:text-green-400 font-medium">Deployment Successful</span>
                    </div>
                    <div className="bg-white dark:bg-gray-900 border rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-[var(--ecode-accent)]" />
                        <span className="font-mono">https://my-awesome-project.e-code.app</span>
                        <Button size="sm" variant="outline" className="ml-auto">
                          Copy Link
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Your project is now live and accessible to anyone with the link!
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-[var(--ecode-background)]">
          <div className="container mx-auto px-4 py-16 text-center">
            <h2 className="text-3xl font-bold text-[var(--ecode-text)] mb-4">
              Ready to Start Building?
            </h2>
            <p className="text-[var(--ecode-text-secondary)] max-w-2xl mx-auto mb-8">
              Join thousands of developers who are already using E-Code to build, 
              collaborate, and deploy their projects faster than ever before.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">
                  View Pricing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ReplitLayout>
  );
}