import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Sparkles, ArrowRight, CheckCircle, MessageSquare, Bot, 
  Brain, Zap, Globe, Shield, BarChart, Users,
  Layers, PlayCircle, Star, Headphones
} from 'lucide-react';

export default function ChatbotBuilder() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-96 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-96 w-[500px] h-[500px] bg-fuchsia-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container-responsive max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                Conversational AI Platform
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Build Intelligent Chatbots & AI Agents
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Create sophisticated conversational AI that understands context, handles complex queries, and delivers human-like interactions.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" className="gap-2">
                  Build Your AI Agent
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Try Live Demo
                </Button>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>10M+ conversations daily</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-500" />
                  <span>Powered by GPT-4</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border bg-white dark:bg-slate-900">
                <div className="p-6">
                  <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950 dark:to-fuchsia-950 rounded-lg p-4">
                    {/* Chat Interface Demo */}
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm">Hello! I'm your AI assistant. How can I help you today?</p>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <div className="bg-violet-500 text-white rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm">I need help with customer support automation</p>
                        </div>
                        <div className="w-8 h-8 bg-slate-300 dark:bg-slate-700 rounded-full" />
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 max-w-[80%]">
                          <p className="text-sm">I can help you build a custom support bot that...</p>
                          <div className="flex items-center gap-1 mt-2">
                            <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Enterprise-Ready AI Conversations
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Build chatbots that understand, learn, and deliver results
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <CardTitle>Natural Language AI</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Advanced NLP understands intent, context, and nuanced conversations
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Layers className="h-6 w-6 text-fuchsia-600 dark:text-fuchsia-400" />
                </div>
                <CardTitle>Multi-Channel Deploy</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Deploy to web, mobile, Slack, Discord, WhatsApp, and more
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Enterprise Security</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  SOC 2 compliant with data encryption and privacy controls
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Instant Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Sub-second response times with intelligent caching
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
                  <BarChart className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track conversations, sentiment, and performance metrics
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle>100+ Languages</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automatic translation and multilingual support built-in
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
              AI Agents for Every Industry
            </h2>
            <p className="text-lg text-muted-foreground">
              Pre-trained models for common use cases
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Headphones className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Customer Support</h3>
              <p className="text-sm text-muted-foreground">24/7 support that resolves 80% of tickets automatically</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Sales Assistant</h3>
              <p className="text-sm text-muted-foreground">Qualify leads and book meetings automatically</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Knowledge Base</h3>
              <p className="text-sm text-muted-foreground">Answer questions from your documentation instantly</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">HR Assistant</h3>
              <p className="text-sm text-muted-foreground">Onboarding, FAQs, and employee engagement</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Integration Partners */}
      <section className="py-20">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Integrates Everywhere
            </h2>
            <p className="text-lg text-muted-foreground">
              Connect with your existing tools and platforms
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {['Slack', 'Discord', 'WhatsApp', 'Telegram', 'Microsoft Teams', 'Facebook'].map((platform, idx) => (
              <motion.div
                key={platform}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-muted/50 rounded-lg px-6 py-3 font-medium"
              >
                {platform}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive max-w-4xl">
          <Card className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950 dark:to-fuchsia-950 border-violet-200 dark:border-violet-800">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <blockquote className="text-lg mb-4">
                "Our AI support agent handles 85% of customer queries automatically, saving us 40 hours per week and improving customer satisfaction scores by 35%."
              </blockquote>
              <cite className="text-muted-foreground">
                — Sarah Chen, Head of Customer Success at TechCorp
              </cite>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
        <div className="container-responsive max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Build Your AI Agent Today
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Start with our free tier - no credit card required
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="gap-2">
              Start Building Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 bg-transparent text-white border-white hover:bg-white/10">
              <MessageSquare className="h-4 w-4" />
              Talk to an Expert
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}