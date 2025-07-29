import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Zap, 
  Code2, 
  Globe, 
  Brain, 
  Languages,
  Rocket,
  Shield,
  Users,
  CheckCircle,
  ArrowRight,
  MessageSquare,
  FileCode,
  Package,
  Wrench,
  Eye,
  Search,
  Activity,
  FileSearch
} from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';

export default function AI() {
  const [selectedFeature, setSelectedFeature] = useState('autonomous');

  const features = {
    autonomous: {
      title: 'Autonomous Building',
      description: 'Just describe what you want. Our AI agent builds complete applications from scratch.',
      icon: Brain,
      details: [
        'Understands natural language in any language',
        'Generates entire project structures automatically',
        'Creates all necessary files and configurations',
        'Installs dependencies and sets up environments',
        'Deploys instantly with one click'
      ]
    },
    multilingual: {
      title: 'Any Language Support',
      description: 'Communicate in your native language. Our AI understands and responds in over 100 languages.',
      icon: Languages,
      details: [
        'Describe your ideas in any language',
        'Get responses in your preferred language',
        'Code comments in your language',
        'Documentation automatically translated',
        'Global accessibility for all developers'
      ]
    },
    intelligent: {
      title: 'Intelligent Code Generation',
      description: 'AI that writes production-ready code following best practices and modern standards.',
      icon: Code2,
      details: [
        'Clean, maintainable code structure',
        'Follows language-specific conventions',
        'Implements error handling automatically',
        'Optimizes for performance',
        'Adds helpful comments and documentation'
      ]
    },
    realtime: {
      title: 'Real-time Assistance',
      description: 'Get instant help while coding. AI watches your code and provides suggestions as you type.',
      icon: Zap,
      details: [
        'Live code suggestions and completions',
        'Instant error detection and fixes',
        'Real-time optimization recommendations',
        'Context-aware assistance',
        'Learn as you code with explanations'
      ]
    }
  };

  const useCases = [
    {
      title: 'Complete Beginners',
      description: 'Never coded before? Describe your app idea and watch it come to life.',
      icon: Users,
      example: '"I want a website to track my daily habits with graphs"'
    },
    {
      title: 'Rapid Prototyping',
      description: 'Build MVPs and prototypes in minutes instead of days.',
      icon: Rocket,
      example: '"Create a marketplace for selling handmade crafts"'
    },
    {
      title: 'Learning Projects',
      description: 'Learn by building. AI explains every line of code it generates.',
      icon: Brain,
      example: '"Build a game like Tetris and explain how it works"'
    },
    {
      title: 'Business Solutions',
      description: 'Create internal tools and business applications without a dev team.',
      icon: Shield,
      example: '"Make a dashboard to track our sales and inventory"'
    }
  ];

  const aiTools = [
    { name: 'Web Search', icon: Search, description: 'Find real-time information' },
    { name: 'Visual Editor', icon: Eye, description: 'Draw designs to convert to code' },
    { name: 'Code Analysis', icon: FileSearch, description: 'Understand existing code' },
    { name: 'Performance', icon: Activity, description: 'Optimize for speed' },
    { name: 'Package Manager', icon: Package, description: 'Install any dependency' },
    { name: 'Debug Assistant', icon: Wrench, description: 'Fix issues instantly' }
  ];

  const stats = [
    { value: '100K+', label: 'Apps Built' },
    { value: '<60s', label: 'Average Build Time' },
    { value: '100+', label: 'Languages Supported' },
    { value: '99.9%', label: 'Success Rate' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-orange-500/10" />
        <div className="container-responsive relative">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="default" className="mb-4 text-sm px-4 py-1">
                <Sparkles className="h-4 w-4 mr-1" />
                POWERED BY CLAUDE 4.0 SONNET
              </Badge>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                AI that builds
                <span className="block bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  complete apps
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
                Describe your idea in any language. Our AI agent creates the entire application 
                automatically - no coding knowledge required.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button size="lg" asChild className="text-lg px-8">
                  <Link href="/agent">
                    Start Building with AI
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-lg px-8">
                  <Link href="/templates">
                    View AI Examples
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How Our AI Agent Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From idea to deployed app in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-white">
                <MessageSquare className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Describe Your Idea</h3>
              <p className="text-muted-foreground">
                Tell our AI what you want to build in plain language - any language you prefer.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-fuchsia-500 to-orange-500 rounded-2xl flex items-center justify-center text-white">
                <Brain className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. AI Builds Everything</h3>
              <p className="text-muted-foreground">
                Watch as AI creates files, writes code, and sets up your entire project automatically.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center text-white">
                <Globe className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Deploy Instantly</h3>
              <p className="text-muted-foreground">
                Your app is live and shareable immediately. No configuration or setup needed.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Deep Dive */}
      <section className="py-20">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              AI Agent Capabilities
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features that make building effortless
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
            <div className="space-y-4">
              {Object.entries(features).map(([key, feature]) => {
                const Icon = feature.icon;
                return (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all ${
                      selectedFeature === key ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedFeature(key)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{feature.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {feature.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>

            <div className="sticky top-8">
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle>{features[selectedFeature].title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {features[selectedFeature].details.map((detail, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* AI Tools */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              AI-Powered Tools
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Advanced capabilities that help AI build better applications
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {aiTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card key={tool.name} className="text-center hover:shadow-lg transition-all">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">{tool.name}</h3>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Who Uses Our AI Agent?
            </h2>
            <p className="text-lg text-muted-foreground">
              From complete beginners to experienced developers
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              return (
                <Card key={useCase.title} className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle>{useCase.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {useCase.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm font-mono">{useCase.example}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Live Demo */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="container-responsive">
          <Card className="max-w-4xl mx-auto overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Try AI Agent Now</h2>
                  <p className="opacity-90">See how easy it is to build your first app</p>
                </div>
                <Sparkles className="h-12 w-12 opacity-20" />
              </div>
            </div>
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">Example prompts to try:</p>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link href="/agent?prompt=Build a personal portfolio website with dark mode">
                        "Build a personal portfolio website with dark mode"
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link href="/agent?prompt=Create a quiz app with score tracking">
                        "Create a quiz app with score tracking"
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <Link href="/agent?prompt=做一个待办事项应用">
                        "做一个待办事项应用" (Chinese)
                      </Link>
                    </Button>
                  </div>
                </div>
                <Button size="lg" className="w-full" asChild>
                  <Link href="/agent">
                    Open AI Agent
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container-responsive">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Building Today
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              No credit card required. Build unlimited apps with our free tier.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/signup">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}