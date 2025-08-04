import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { 
  Smartphone, 
  Code, 
  Zap, 
  Shield, 
  Globe, 
  Sparkles,
  ChevronRight,
  Download,
  Star,
  Users,
  Cloud,
  Cpu,
  Layers,
  GitBranch,
  Terminal,
  FileCode
} from "lucide-react";

export function PublicMobilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-900 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_-20%,transparent_40%,white)]" />
        
        <div className="container mx-auto px-6 py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-primary/10 rounded-full p-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-primary">Revolutionary Mobile Development</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Code Without Limits, Anywhere You Go
              </h1>
              
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Transform your mobile device into a powerful development environment. Build, test, and deploy 
                applications directly from your pocket with enterprise-grade capabilities.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button size="lg" className="h-14 px-8 text-lg font-semibold">
                  <Download className="mr-2 h-5 w-5" />
                  Download for iOS
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold">
                  <Download className="mr-2 h-5 w-5" />
                  Get for Android
                </Button>
              </div>
              
              <div className="flex items-center gap-8">
                <div>
                  <div className="flex items-center mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">4.9/5 Rating</p>
                </div>
                <div className="border-l pl-8">
                  <p className="text-2xl font-bold">2M+</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Active Developers</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl" />
              <div className="relative">
                <img 
                  src="/api/placeholder/600/800" 
                  alt="E-Code Mobile App"
                  className="rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800"
                />
                <div className="absolute -bottom-6 -right-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500 h-3 w-3 rounded-full animate-pulse" />
                    <span className="font-medium">Live Development</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Professional Development, Mobile Experience
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Access the full power of our development platform optimized for mobile workflows
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Code,
                title: "Full IDE Capabilities",
                description: "Complete code editor with syntax highlighting, autocomplete, and intelligent suggestions"
              },
              {
                icon: Cloud,
                title: "Cloud-Powered Execution",
                description: "Run resource-intensive tasks in the cloud while coding comfortably on your device"
              },
              {
                icon: GitBranch,
                title: "Version Control Integration",
                description: "Full Git support with branch management, commits, and pull requests"
              },
              {
                icon: Terminal,
                title: "Integrated Terminal",
                description: "Access a full Linux terminal with package management and custom configurations"
              },
              {
                icon: Layers,
                title: "Multi-Language Support",
                description: "Build with Python, JavaScript, Go, Rust, and 50+ programming languages"
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "Bank-level encryption and secure containers protect your code and data"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-shadow"
              >
                <div className="bg-primary/10 rounded-lg p-3 w-fit mb-6">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">
                Seamless Workflow Across All Devices
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
                Start coding on your phone during your commute, continue on your tablet at the coffee shop, 
                and finish on your desktop at home. Your entire development environment travels with you.
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    title: "Instant Synchronization",
                    description: "Changes sync in real-time across all your devices"
                  },
                  {
                    title: "Offline Capabilities",
                    description: "Keep coding even without an internet connection"
                  },
                  {
                    title: "Touch-Optimized Interface",
                    description: "Designed specifically for mobile interactions"
                  }
                ].map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="bg-primary/10 rounded-full p-2 h-fit">
                      <ChevronRight className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <img 
                src="/api/placeholder/700/500" 
                alt="Multi-device sync"
                className="rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-purple-600 text-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { value: "50+", label: "Languages Supported" },
              { value: "99.9%", label: "Uptime Guarantee" },
              { value: "<100ms", label: "Average Latency" },
              { value: "24/7", label: "Support Available" }
            ].map((stat, index) => (
              <div key={index}>
                <p className="text-5xl font-bold mb-2">{stat.value}</p>
                <p className="text-white/80">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Start Building on the Go Today
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto">
            Join millions of developers who've discovered the freedom of mobile development. 
            Your next breakthrough is just a tap away.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <div className="bg-black text-white rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-900 transition-colors">
              <Download className="h-10 w-10" />
              <div className="text-left">
                <p className="text-xs">Download on the</p>
                <p className="text-xl font-semibold">App Store</p>
              </div>
            </div>
            
            <div className="bg-black text-white rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-900 transition-colors">
              <Download className="h-10 w-10" />
              <div className="text-left">
                <p className="text-xs">Get it on</p>
                <p className="text-xl font-semibold">Google Play</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Shield className="h-4 w-4" />
            <span>Enterprise-grade security • SOC 2 Type II Certified</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-8">
              <Link href="/docs/mobile">
                <a className="text-slate-600 hover:text-primary">Documentation</a>
              </Link>
              <Link href="/blog/mobile">
                <a className="text-slate-600 hover:text-primary">Blog</a>
              </Link>
              <Link href="/support">
                <a className="text-slate-600 hover:text-primary">Support</a>
              </Link>
            </div>
            
            <div className="text-sm text-slate-600 dark:text-slate-400">
              © 2025 E-Code. Empowering developers everywhere.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}