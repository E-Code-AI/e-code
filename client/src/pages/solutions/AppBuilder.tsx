import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Code, Sparkles, Rocket, CheckCircle, Layers, Globe, Zap } from "lucide-react";
import { Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";

export default function AppBuilder() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <Badge className="mb-4 px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
            AI-Powered Development
          </Badge>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            App Builder
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Build full-stack applications with AI. From idea to deployment in minutes.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Building
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/templates">
              <Button size="lg" variant="outline" className="gap-2">
                <Layers className="h-4 w-4" />
                View Templates
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg w-fit mb-4">
              <Code className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Full-Stack Development</h3>
            <p className="text-muted-foreground">
              Build complete applications with frontend, backend, and database - all from a single prompt.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg w-fit mb-4">
              <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Generation</h3>
            <p className="text-muted-foreground">
              Our AI understands your requirements and generates production-ready code instantly.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg w-fit mb-4">
              <Rocket className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Deployment</h3>
            <p className="text-muted-foreground">
              Deploy your application to the cloud with one click. Get a live URL immediately.
            </p>
          </Card>
        </div>

        {/* Use Cases */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">What You Can Build</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "SaaS Applications",
              "E-commerce Platforms",
              "Social Networks",
              "Productivity Tools",
              "CRM Systems",
              "Analytics Dashboards",
              "API Services",
              "Mobile Apps"
            ].map((useCase) => (
              <Card key={useCase} className="p-4 text-center hover:shadow-md transition-shadow">
                <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-2" />
                <p className="font-medium">{useCase}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="p-12 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-2 border-primary/20">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Build Your App?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of developers who are building amazing applications with E-Code's AI-powered platform.
            </p>
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}