import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Sparkles, ArrowRight, CheckCircle, Globe, Palette, 
  Layout, Smartphone, Search, Zap, Image, FileText,
  ShoppingCart, BarChart, Star, PlayCircle, Laptop
} from 'lucide-react';

export default function WebsiteBuilder() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-96 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-96 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container-responsive max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300">
                AI Website Creation
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Beautiful Websites in Seconds
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Create stunning, responsive websites with AI. No design skills needed - just describe your vision and watch it come to life.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" className="gap-2">
                  Create Your Website
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  See Examples
                </Button>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>500K+ websites live</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span>Loved by designers</span>
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
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950 dark:to-purple-950 p-6">
                  <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <span className="text-xs text-muted-foreground">yoursite.com</span>
                    </div>
                    <div className="space-y-3">
                      <div className="h-8 bg-gradient-to-r from-pink-200 to-purple-200 dark:from-pink-800 dark:to-purple-800 rounded animate-pulse" />
                      <div className="grid grid-cols-3 gap-2">
                        <div className="h-20 bg-muted rounded" />
                        <div className="h-20 bg-muted rounded" />
                        <div className="h-20 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 inline mr-1" />
                    AI is designing your website...
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
              Professional Websites Made Easy
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Every website comes with everything you need to succeed online
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Palette className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle>Custom Design</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Unique designs tailored to your brand, not generic templates
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Mobile Perfect</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automatically responsive on every device and screen size
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>SEO Optimized</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Built-in SEO best practices to help you rank on Google
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Lightning Fast</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Optimized performance with instant page loads
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Image className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Media Library</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Access to millions of stock photos and graphics
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <CardTitle>Custom Domain</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Connect your own domain with free SSL certificate
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Website Types */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Perfect for Any Website
            </h2>
            <p className="text-lg text-muted-foreground">
              From portfolios to e-commerce, we've got you covered
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Business Sites</h3>
              <p className="text-sm text-muted-foreground">Professional sites for companies and services</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Laptop className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Portfolios</h3>
              <p className="text-sm text-muted-foreground">Showcase your work beautifully</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Online Stores</h3>
              <p className="text-sm text-muted-foreground">Complete e-commerce solutions</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Layout className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Landing Pages</h3>
              <p className="text-sm text-muted-foreground">High-converting marketing pages</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="container-responsive max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-4xl font-bold text-pink-600 dark:text-pink-400 mb-2">30s</div>
              <p className="text-sm text-muted-foreground">Average build time</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">99.9%</div>
              <p className="text-sm text-muted-foreground">Uptime guarantee</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">100+</div>
              <p className="text-sm text-muted-foreground">Design variations</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">24/7</div>
              <p className="text-sm text-muted-foreground">Support available</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-pink-600 to-purple-600 text-white">
        <div className="container-responsive max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Your Website is Waiting
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands creating beautiful websites with AI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="gap-2">
              Start Building Free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 bg-transparent text-white border-white hover:bg-white/10">
              <Globe className="h-4 w-4" />
              View Gallery
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}