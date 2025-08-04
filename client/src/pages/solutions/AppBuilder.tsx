import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Sparkles, ArrowRight, CheckCircle, Code2, Zap, Globe, 
  Smartphone, Laptop, Database, Shield, Rocket, Users,
  MessageSquare, BarChart, TrendingUp, Star, PlayCircle
} from 'lucide-react';

export default function AppBuilder() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-96 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-96 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container-responsive max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                AI-Powered Development
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Build Full-Stack Apps in Minutes
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Transform your ideas into production-ready applications with AI. No coding experience required - just describe what you want to build.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" className="gap-2">
                  Start Building Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Watch Demo
                </Button>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>2M+ apps built</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span>4.9/5 rating</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border bg-slate-900">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-green-400 font-mono text-sm">
                    <Sparkles className="h-4 w-4" />
                    <span>AI: Building your task management app...</span>
                  </div>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="text-blue-400">✓ Created React components</div>
                    <div className="text-blue-400">✓ Set up database schema</div>
                    <div className="text-blue-400">✓ Implemented authentication</div>
                    <div className="text-blue-400">✓ Added real-time sync</div>
                    <div className="text-yellow-400 animate-pulse">→ Deploying to production...</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Build Modern Apps
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              From idea to production in minutes. Our AI handles the complex parts so you can focus on your vision.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Code2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Full-Stack Development</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Build complete applications with frontend, backend, and database - all integrated seamlessly.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Instant Database</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  PostgreSQL database automatically provisioned and configured for your app's needs.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Built-in Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  User authentication, sessions, and security best practices implemented automatically.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>One-Click Deploy</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Deploy to production with custom domains, SSL, and global CDN in a single click.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle>Mobile Responsive</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Every app is automatically optimized for mobile, tablet, and desktop screens.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <CardTitle>Real-time Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  WebSocket support for live data sync and real-time collaboration features.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Popular App Types
            </h2>
            <p className="text-lg text-muted-foreground">
              See what others are building with AI App Builder
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">SaaS Dashboards</h3>
              <p className="text-sm text-muted-foreground">Analytics, admin panels, and data visualization tools</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Social Platforms</h3>
              <p className="text-sm text-muted-foreground">Communities, forums, and social networks</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Productivity Tools</h3>
              <p className="text-sm text-muted-foreground">Task managers, calendars, and workflow apps</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">AI Applications</h3>
              <p className="text-sm text-muted-foreground">Chatbots, assistants, and AI-powered tools</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container-responsive max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Build Your App?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Join millions of developers building the future with AI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="gap-2">
              Start Building Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 bg-transparent text-white border-white hover:bg-white/10">
              <MessageSquare className="h-4 w-4" />
              Talk to Sales
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}