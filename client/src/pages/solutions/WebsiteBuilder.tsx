// @ts-nocheck
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Globe, Palette, Layout, CheckCircle, Zap, Sparkles, Monitor } from "lucide-react";
import { Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";

export default function WebsiteBuilder() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <Badge className="mb-4 px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">
            Professional Websites in Seconds
          </Badge>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Website Builder
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Create stunning, responsive websites instantly with AI. No design skills required.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Build Your Website
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/showcase">
              <Button size="lg" variant="outline" className="gap-2">
                <Monitor className="h-4 w-4" />
                View Examples
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg w-fit mb-4">
              <Globe className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Fully Responsive</h3>
            <p className="text-muted-foreground">
              Every website automatically adapts to desktop, tablet, and mobile devices perfectly.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-teal-100 dark:bg-teal-900/20 rounded-lg w-fit mb-4">
              <Palette className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Beautiful Designs</h3>
            <p className="text-muted-foreground">
              AI generates modern, professional designs tailored to your brand and industry.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg w-fit mb-4">
              <Zap className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Optimized for speed with automatic image optimization and CDN delivery.
            </p>
          </Card>
        </div>

        {/* Website Types */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Perfect For Any Business</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "Portfolio Sites",
              "Business Websites",
              "Landing Pages",
              "Blogs",
              "Online Stores",
              "Restaurant Sites",
              "Event Pages",
              "Documentation"
            ].map((type) => (
              <Card key={type} className="p-4 text-center hover:shadow-md transition-shadow">
                <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-2" />
                <p className="font-medium">{type}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Describe Your Website</h3>
              <p className="text-muted-foreground">
                Tell our AI what kind of website you need and your preferences.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Builds It</h3>
              <p className="text-muted-foreground">
                Watch as your website is created in real-time with all features.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Publish Instantly</h3>
              <p className="text-muted-foreground">
                Your website goes live immediately with a custom domain.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="p-12 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 border-2 border-primary/20">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Create Your Website Today</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              No coding, no design skills, no hassle. Just describe what you want and watch it come to life.
            </p>
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Building Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}