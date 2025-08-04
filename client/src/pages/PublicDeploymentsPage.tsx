import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Rocket, Globe, Shield, Zap, BarChart3, Server, Cloud } from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function PublicDeploymentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      {/* Hero Section */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
            Deploy Instantly, Scale Infinitely
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            From code to production in seconds. Deploy web apps, APIs, and databases with zero configuration.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8">
                Deploy Your First App
              </Button>
            </Link>
            <Link href="/docs/deployments">
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Documentation
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">No credit card required • Free tier available</p>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Everything You Need to Ship Fast
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-lg border bg-card">
              <Rocket className="w-10 h-10 text-purple-600 mb-3" />
              <h3 className="text-lg font-semibold mb-2">One-Click Deploy</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Push to deploy. No YAML files, no complex configs. Just works.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <Globe className="w-10 h-10 text-blue-600 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Global CDN</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Serve your app from 300+ edge locations worldwide.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <Zap className="w-10 h-10 text-yellow-600 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Auto-Scaling</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Handle millions of requests. Scale up or down automatically.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <Shield className="w-10 h-10 text-green-600 mb-3" />
              <h3 className="text-lg font-semibold mb-2">SSL Included</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                HTTPS everywhere with auto-renewing SSL certificates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Deployment Options */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Deploy Anything, Anywhere
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
              <Server className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-4">Static Sites</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Lightning-fast static hosting for React, Vue, Next.js, and more. Optimized builds with instant cache invalidation.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Automatic builds</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Preview deployments</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Custom domains</span>
                </li>
              </ul>
              <Link href="/register">
                <Button variant="outline" className="w-full">Deploy Static Site</Button>
              </Link>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border-2 border-purple-600">
              <div className="flex items-center justify-between mb-4">
                <Cloud className="w-12 h-12 text-purple-600" />
                <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded">POPULAR</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">Autoscale Apps</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Deploy dynamic applications that scale with demand. Perfect for APIs, web apps, and microservices.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>0 to 100 replicas</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Pay per request</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Zero cold starts</span>
                </li>
              </ul>
              <Link href="/register">
                <Button className="w-full">Deploy Autoscale App</Button>
              </Link>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
              <BarChart3 className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-4">Reserved VMs</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Dedicated compute for applications that need consistent performance and resources.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Dedicated resources</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Persistent storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Background jobs</span>
                </li>
              </ul>
              <Link href="/register">
                <Button variant="outline" className="w-full">Deploy Reserved VM</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Stats */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Built for Performance at Scale
          </h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-5xl font-bold text-purple-600">50ms</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Average deploy time</p>
            </div>
            <div>
              <p className="text-5xl font-bold text-blue-600">99.99%</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Uptime SLA</p>
            </div>
            <div>
              <p className="text-5xl font-bold text-green-600">300+</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Global edge locations</p>
            </div>
            <div>
              <p className="text-5xl font-bold text-yellow-600">10M+</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Apps deployed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Trusted by Developers Everywhere
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Startups</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Launch fast and scale without limits. Start free, pay only for what you use, and never worry about infrastructure again.
              </p>
              <blockquote className="border-l-4 border-purple-600 pl-4 italic text-gray-600 dark:text-gray-400">
                "E-Code Deployments let us ship features daily instead of weekly. Our deployment pipeline went from hours to seconds."
                <cite className="block mt-2 not-italic font-semibold">- Alex Kim, Founder at InnovateLabs</cite>
              </blockquote>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4">Enterprise</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Enterprise-grade security, compliance, and support. Deploy with confidence knowing your apps are protected and performant.
              </p>
              <blockquote className="border-l-4 border-blue-600 pl-4 italic text-gray-600 dark:text-gray-400">
                "We migrated 200+ microservices to E-Code and reduced our infrastructure costs by 60% while improving performance."
                <cite className="block mt-2 not-italic font-semibold">- Maria Santos, VP Engineering at TechCorp</cite>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-12">
            Simple, Transparent Pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg border bg-card">
              <h3 className="text-xl font-semibold mb-2">Static Sites</h3>
              <p className="text-3xl font-bold mb-4">Free</p>
              <p className="text-gray-600 dark:text-gray-400">
                Unlimited static deployments with generous bandwidth
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card border-purple-600">
              <h3 className="text-xl font-semibold mb-2">Autoscale</h3>
              <p className="text-3xl font-bold mb-4">$0.000018<span className="text-lg font-normal">/request</span></p>
              <p className="text-gray-600 dark:text-gray-400">
                Pay only for what you use, scale to millions
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <h3 className="text-xl font-semibold mb-2">Reserved VMs</h3>
              <p className="text-3xl font-bold mb-4">$7<span className="text-lg font-normal">/month</span></p>
              <p className="text-gray-600 dark:text-gray-400">
                Dedicated resources for consistent performance
              </p>
            </div>
          </div>
          <Link href="/pricing">
            <Button variant="link" className="mt-8 text-lg">
              View detailed pricing →
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Deploy?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join millions of developers shipping faster with E-Code Deployments.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Start Deploying Free
              </Button>
            </Link>
            <Link href="/contact-sales">
              <Button size="lg" variant="outline" className="text-lg px-8 text-white border-white hover:bg-white hover:text-purple-600">
                Talk to Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}