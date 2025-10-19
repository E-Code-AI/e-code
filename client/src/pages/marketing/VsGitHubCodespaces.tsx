import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export default function VsGitHubCodespaces() {
  const comparisons = [
    {
      feature: "AI-Powered Development",
      eCode: "GPT-5 + Claude 3.5 Sonnet built-in",
      github: "GitHub Copilot (additional cost)",
      advantage: "eCode"
    },
    {
      feature: "Deployment",
      eCode: "One-click deployment included",
      github: "Requires separate hosting setup",
      advantage: "eCode"
    },
    {
      feature: "Database",
      eCode: "Built-in PostgreSQL with GUI",
      github: "Manual setup required",
      advantage: "eCode"
    },
    {
      feature: "Pricing",
      eCode: "Free tier + affordable plans",
      github: "$10-$18/month per user",
      advantage: "eCode"
    },
    {
      feature: "Collaboration",
      eCode: "Real-time WebSocket collaboration",
      github: "Live Share integration",
      advantage: "both"
    },
    {
      feature: "GitHub Integration",
      eCode: "Full Git support",
      github: "Native GitHub integration",
      advantage: "github"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Back Button */}
        <Link href="/compare">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Comparisons
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            E-Code Platform vs GitHub Codespaces
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Feature-by-feature comparison to help you choose the right platform
          </p>
        </div>

        {/* Comparison Table */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>
              How E-Code Platform compares to GitHub Codespaces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-left p-4 font-semibold">E-Code Platform</th>
                    <th className="text-left p-4 font-semibold">GitHub Codespaces</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">{item.feature}</td>
                      <td className="p-4">
                        <div className="flex items-start gap-2">
                          {item.advantage === "eCode" || item.advantage === "both" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                          <span className="text-sm">{item.eCode}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-start gap-2">
                          {item.advantage === "github" || item.advantage === "both" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                          <span className="text-sm">{item.github}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Key Advantages */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Why Developers Choose E-Code Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">All-in-One Platform</h3>
                <p className="text-sm text-muted-foreground">
                  Everything you need in one place: IDE, database, deployment, and AI assistance. No need to configure multiple services.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Better AI Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Multiple AI models (GPT-5, Claude) built-in at no extra cost. Custom prompts and templates included.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Faster Setup</h3>
                <p className="text-sm text-muted-foreground">
                  Start coding in seconds. No configuration needed for database, authentication, or deployment.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Lower Cost</h3>
                <p className="text-sm text-muted-foreground">
                  More generous free tier and lower pricing for premium features. No surprise bills for compute time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Ready to Switch?</h2>
            <p className="text-muted-foreground mb-4">
              Import your GitHub repositories and start building in minutes
            </p>
            <Link href="/register">
              <Button size="lg" data-testid="button-try-eCode">
                Try E-Code Platform Free
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
