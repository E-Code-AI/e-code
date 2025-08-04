import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Sparkles, ArrowRight, CheckCircle, DollarSign, Target, 
  Users, Trophy, Clock, Shield, Star, PlayCircle,
  Code, FileText, Zap, Globe, BarChart
} from 'lucide-react';
import { Link } from 'wouter';

export default function BountiesMarketing() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-96 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-96 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container-responsive max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                Developer Marketplace
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Get Paid to Code
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Join the world's largest marketplace for coding challenges. Earn money by solving real problems for companies and building your portfolio.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" className="gap-2">
                  Start Earning Today
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  See How It Works
                </Button>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>$50M+ paid to developers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>500K+ active bounty hunters</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 p-6">
                  <div className="space-y-4">
                    <Card className="bg-white dark:bg-slate-900 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge className="mb-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30">
                              $2,500 Bounty
                            </Badge>
                            <CardTitle className="text-lg">React Dashboard Component</CardTitle>
                            <CardDescription className="text-sm">Build responsive analytics dashboard</CardDescription>
                          </div>
                          <Trophy className="h-6 w-6 text-yellow-500" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">23 submissions</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>5 days left</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        <span>New bounties posted daily</span>
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
              Why Developers Choose E-Code Bounties
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              The most rewarding way to code, learn, and build your reputation
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle>Competitive Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Bounties range from $50 to $50,000+ with instant payments upon completion
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <CardTitle>Real-World Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Work on meaningful projects from startups to Fortune 500 companies
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Trophy className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Build Your Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Showcase completed bounties and build a reputation in the community
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Secure Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Escrow protection ensures you get paid for completed work
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Global Community</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Connect with developers worldwide and learn from the best
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle>Flexible Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Work on your own time, from anywhere in the world
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Bounty Categories */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Popular Bounty Categories
            </h2>
            <p className="text-lg text-muted-foreground">
              Find bounties that match your skills and interests
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Code className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Frontend Development</h3>
              <p className="text-sm text-muted-foreground">React, Vue, Angular components and apps</p>
              <div className="mt-2 text-sm font-medium text-emerald-600">$50 - $5,000</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Data Science</h3>
              <p className="text-sm text-muted-foreground">ML models, data analysis, and visualization</p>
              <div className="mt-2 text-sm font-medium text-emerald-600">$100 - $10,000</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Backend APIs</h3>
              <p className="text-sm text-muted-foreground">Node.js, Python, Go microservices</p>
              <div className="mt-2 text-sm font-medium text-emerald-600">$200 - $15,000</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Technical Writing</h3>
              <p className="text-sm text-muted-foreground">Documentation, tutorials, and guides</p>
              <div className="mt-2 text-sm font-medium text-emerald-600">$25 - $2,500</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Success Stories
            </h2>
            <p className="text-lg text-muted-foreground">
              Real developers, real earnings
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                    A
                  </div>
                  <div>
                    <CardTitle className="text-lg">Alex Chen</CardTitle>
                    <p className="text-sm text-muted-foreground">Full-stack Developer</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <blockquote className="text-sm mb-4">
                  "I've earned over $25,000 in my first year. Bounties helped me transition from junior to senior developer."
                </blockquote>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-600 font-semibold">$25,847 earned</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span>4.9 rating</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    S
                  </div>
                  <div>
                    <CardTitle className="text-lg">Sarah Johnson</CardTitle>
                    <p className="text-sm text-muted-foreground">Data Scientist</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <blockquote className="text-sm mb-4">
                  "Working on ML bounties expanded my skills and led to a full-time remote position."
                </blockquote>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-600 font-semibold">$18,320 earned</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span>5.0 rating</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    M
                  </div>
                  <div>
                    <CardTitle className="text-lg">Miguel Rodriguez</CardTitle>
                    <p className="text-sm text-muted-foreground">Mobile Developer</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <blockquote className="text-sm mb-4">
                  "Bounties funded my coding bootcamp and helped me land my dream job at a unicorn startup."
                </blockquote>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-600 font-semibold">$31,250 earned</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span>4.8 rating</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">$50M+</div>
              <p className="text-sm text-muted-foreground">Total payouts</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">500K+</div>
              <p className="text-sm text-muted-foreground">Active developers</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">10K+</div>
              <p className="text-sm text-muted-foreground">Companies posting</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">98%</div>
              <p className="text-sm text-muted-foreground">Payment success rate</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="container-responsive max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of developers already earning with bounties
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2">
                Sign Up Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="gap-2 bg-transparent text-white border-white hover:bg-white/10">
              <DollarSign className="h-4 w-4" />
              Browse Bounties
            </Button>
          </div>
          <p className="mt-6 text-sm text-white/70">
            No upfront costs • Secure payments • Global community
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}