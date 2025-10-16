// @ts-nocheck
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Code, Terminal, Rocket, Bot, Database, Users, Shield,
  ExternalLink, Copy, ChevronRight, PlayCircle, FileText,
  Zap, Globe, Package, GitBranch, Settings, Book
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DocContentProps {
  docTitle: string | null;
}

export function DocContent({ docTitle }: DocContentProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, language = 'bash', id }: { code: string; language?: string; id: string }) => (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 h-8 w-8 p-0"
        onClick={() => copyToClipboard(code, id)}
      >
        {copiedCode === id ? (
          <span className="text-xs text-green-600">✓</span>
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );

  if (!docTitle) {
    return (
      <div className="flex-1 max-w-4xl mx-auto">
        <div className="p-8">
          {/* Welcome Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Welcome to E-Code Documentation
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to build, deploy, and scale your applications with E-Code
            </p>
          </div>

          {/* Quick Start Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <Card className="group hover:shadow-lg transition-all cursor-pointer">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mb-3">
                  <Rocket className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Quick Start</CardTitle>
                <CardDescription>
                  Get up and running with E-Code in under 5 minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full group-hover:bg-accent">
                  Start Tutorial <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all cursor-pointer">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mb-3">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">AI Features</CardTitle>
                <CardDescription>
                  Learn how to build with AI agents and intelligent code assistance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full group-hover:bg-accent">
                  Explore AI <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all cursor-pointer">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-3">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-lg">Deployments</CardTitle>
                <CardDescription>
                  Deploy your applications globally with one click
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full group-hover:bg-accent">
                  Deploy Now <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Popular Guides */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Popular Guides</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                <Code className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-medium">Your First Project</div>
                  <div className="text-sm text-muted-foreground">Create and deploy your first application</div>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Multiplayer Collaboration</div>
                  <div className="text-sm text-muted-foreground">Code together in real-time</div>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                <Database className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Database Setup</div>
                  <div className="text-sm text-muted-foreground">Connect and manage databases</div>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                <Shield className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="font-medium">Environment Variables</div>
                  <div className="text-sm text-muted-foreground">Secure configuration management</div>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Language Support */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Supported Languages & Frameworks</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go',
                'Rust', 'Ruby', 'PHP', 'C#', 'Swift', 'Kotlin'
              ].map((lang) => (
                <div key={lang} className="flex items-center gap-2 p-3 rounded-lg border text-center">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{lang}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render content based on selected doc
  const renderDocContent = () => {
    switch (docTitle) {
      case 'Introduction to E-Code':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">Introduction to E-Code</h1>
              <p className="text-xl text-muted-foreground mb-6">
                E-Code is a powerful cloud-based development environment that lets you code, collaborate, and deploy from anywhere.
              </p>
            </div>

            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold mb-4">What is E-Code?</h2>
                <p className="text-muted-foreground mb-4">
                  E-Code is an online IDE that provides a complete development environment in your browser. 
                  No setup required - just open your browser and start coding.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <Zap className="h-6 w-6 text-orange-500 mb-2" />
                      <CardTitle className="text-lg">Instant Setup</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Start coding immediately without installing anything locally.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <Users className="h-6 w-6 text-blue-500 mb-2" />
                      <CardTitle className="text-lg">Real-time Collaboration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Code together with your team in real-time, like Google Docs for code.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <strong>AI-Powered Development:</strong> Build applications with intelligent AI agents
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <strong>50+ Programming Languages:</strong> Support for all major languages and frameworks
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <strong>One-Click Deployment:</strong> Deploy to production instantly
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <strong>Integrated Database:</strong> PostgreSQL, MySQL, MongoDB support built-in
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
                <p className="text-muted-foreground mb-4">
                  Ready to start coding? Here's what you can do next:
                </p>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Create Your First Project
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Book className="h-4 w-4 mr-2" />
                    Follow the Quick Start Guide
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Explore Templates
                  </Button>
                </div>
              </section>
            </div>
          </div>
        );

      case 'Quick Start':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">Quick Start Guide</h1>
              <p className="text-xl text-muted-foreground mb-6">
                Get up and running with E-Code in just a few minutes.
              </p>
            </div>

            <div className="space-y-8">
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <h2 className="text-2xl font-semibold">Create an Account</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  Sign up for a free E-Code account to get started. You'll get access to unlimited public projects 
                  and 500 CPU hours per month.
                </p>
                <Button>Sign Up Free</Button>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <h2 className="text-2xl font-semibold">Create Your First Project</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  Start with a template or create a blank project. We support over 50 programming languages.
                </p>
                <CodeBlock 
                  code="// Welcome to E-Code!
console.log('Hello, World!');
"
                  language="javascript"
                  id="hello-world"
                />
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <h2 className="text-2xl font-semibold">Run Your Code</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  Use the integrated terminal or click the Run button to execute your code.
                </p>
                <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
                  <div className="text-gray-500">$ node index.js</div>
                  <div>Hello, World!</div>
                  <div className="text-gray-500">$</div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                    4
                  </div>
                  <h2 className="text-2xl font-semibold">Deploy Your App</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  Deploy your application to the web with a single click. Your app will be live instantly.
                </p>
                <Button className="gap-2">
                  <Globe className="h-4 w-4" />
                  Deploy Now
                </Button>
              </section>
            </div>
          </div>
        );

      case 'AI Agent Overview':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">AI Agent Overview</h1>
              <Badge className="mb-4">Hot Feature</Badge>
              <p className="text-xl text-muted-foreground mb-6">
                Build complete applications using natural language with our advanced AI agents.
              </p>
            </div>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">What is the AI Agent?</h2>
                <p className="text-muted-foreground mb-4">
                  The E-Code AI Agent is an intelligent assistant that can build entire applications from natural language descriptions. 
                  It understands context, writes code, manages dependencies, and handles deployment.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <Bot className="h-6 w-6 text-blue-500 mb-2" />
                      <CardTitle>Multi-Model Support</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Powered by Claude 4.0, GPT-4, and other leading AI models for optimal results.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <Zap className="h-6 w-6 text-orange-500 mb-2" />
                      <CardTitle>Autonomous Building</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Builds complete applications independently, handling all technical decisions.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">How to Use the AI Agent</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Describe Your App</h3>
                      <p className="text-sm text-muted-foreground">
                        Tell the AI what you want to build in natural language.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Review the Plan</h3>
                      <p className="text-sm text-muted-foreground">
                        The AI will show you what it plans to build and ask for confirmation.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Watch It Build</h3>
                      <p className="text-sm text-muted-foreground">
                        The AI will write code, install dependencies, and set up your application.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      4
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Deploy Instantly</h3>
                      <p className="text-sm text-muted-foreground">
                        Your app is automatically deployed and ready to use.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Example Prompts</h2>
                <div className="space-y-3">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Web Application</p>
                    <p className="text-sm text-muted-foreground">
                      "Build a task management app with user authentication, real-time updates, and a dashboard"
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">API Service</p>
                    <p className="text-sm text-muted-foreground">
                      "Create a REST API for a blog with CRUD operations, authentication, and PostgreSQL database"
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Data Analysis</p>
                    <p className="text-sm text-muted-foreground">
                      "Build a data visualization dashboard that analyzes CSV files and creates interactive charts"
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );

      case 'Multiplayer Collaboration':
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">Multiplayer Collaboration</h1>
              <p className="text-xl text-muted-foreground mb-6">
                Code together in real-time with your team, just like Google Docs for programming.
              </p>
            </div>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">Real-Time Features</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <Users className="h-6 w-6 text-blue-500 mb-2" />
                      <CardTitle>Live Cursors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        See exactly where your teammates are working with live cursor positions and selections.
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <Terminal className="h-6 w-6 text-green-500 mb-2" />
                      <CardTitle>Shared Terminal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Run commands together in a shared terminal environment with synchronized output.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">How to Collaborate</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Share Your Project</h3>
                      <p className="text-sm text-muted-foreground">
                        Click the "Share" button and invite teammates via email or link.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Set Permissions</h3>
                      <p className="text-sm text-muted-foreground">
                        Control who can view, edit, or admin your project.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Code Together</h3>
                      <p className="text-sm text-muted-foreground">
                        Start coding together with real-time synchronization.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Voice & Video Chat</h2>
                <p className="text-muted-foreground mb-4">
                  Collaborate more effectively with built-in voice and video chat while you code.
                </p>
                <Button className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Start Voice Chat
                </Button>
              </section>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">{docTitle}</h1>
              <p className="text-xl text-muted-foreground mb-6">
                Documentation for {docTitle} is coming soon.
              </p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Content In Development
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  We're actively working on documentation for this feature. 
                  In the meantime, you can:
                </p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit our Community Forum
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Check our Blog for Updates
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto">
      <div className="p-8">
        {renderDocContent()}
      </div>
    </div>
  );
}