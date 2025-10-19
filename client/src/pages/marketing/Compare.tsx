import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CheckCircle2, ArrowRight, Zap, Code, Cloud, Shield } from "lucide-react";

export default function Compare() {
  const competitors = [
    {
      name: "GitHub Codespaces",
      path: "/compare/github-codespaces",
      icon: Code,
      description: "Cloud-based development environments"
    },
    {
      name: "Glitch",
      path: "/compare/glitch",
      icon: Zap,
      description: "Collaborative coding platform"
    },
    {
      name: "Heroku",
      path: "/compare/heroku",
      icon: Cloud,
      description: "Platform as a Service (PaaS)"
    },
    {
      name: "CodeSandbox",
      path: "/compare/codesandbox",
      icon: Code,
      description: "Online code editor"
    },
    {
      name: "AWS Cloud9",
      path: "/compare/aws-cloud9",
      icon: Shield,
      description: "Cloud IDE from Amazon"
    }
  ];

  const advantages = [
    "AI-powered code generation with GPT-5 and Claude",
    "Real-time collaboration with WebSocket",
    "One-click deployment to production",
    "Built-in database and authentication",
    "Fortune 500-grade infrastructure",
    "Custom AI prompts and templates"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Compare E-Code Platform
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See how E-Code Platform stacks up against other development platforms
          </p>
        </div>

        {/* Key Advantages */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Why Choose E-Code Platform?</CardTitle>
            <CardDescription>
              Our platform offers unique advantages that set us apart
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {advantages.map((advantage, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{advantage}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Competitor Comparisons */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Detailed Comparisons
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitors.map((competitor) => {
              const Icon = competitor.icon;
              return (
                <Card key={competitor.path} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{competitor.name}</CardTitle>
                    </div>
                    <CardDescription>{competitor.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={competitor.path}>
                      <Button variant="outline" className="w-full" data-testid={`button-compare-${competitor.name.toLowerCase().replace(/\s+/g, '-')}`}>
                        View Comparison
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Ready to Experience the Difference?</h2>
            <p className="text-muted-foreground mb-4">
              Join thousands of developers building faster with E-Code Platform
            </p>
            <Link href="/register">
              <Button size="lg" data-testid="button-get-started">
                Get Started Free
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
