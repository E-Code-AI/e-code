import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export default function VsAwsCloud9() {
  const comparisons = [
    {
      feature: "Setup Complexity",
      eCode: "Zero configuration needed",
      aws: "Requires AWS account setup",
      advantage: "eCode"
    },
    {
      feature: "AI Development",
      eCode: "Built-in GPT-5 + Claude",
      aws: "Not available",
      advantage: "eCode"
    },
    {
      feature: "Pricing Model",
      eCode: "Simple, transparent pricing",
      aws: "Complex AWS billing",
      advantage: "eCode"
    },
    {
      feature: "Deployment",
      eCode: "One-click deployment",
      aws: "Manual AWS service configuration",
      advantage: "eCode"
    },
    {
      feature: "AWS Integration",
      eCode: "Available via API",
      aws: "Native AWS integration",
      advantage: "aws"
    },
    {
      feature: "Enterprise Support",
      eCode: "Available",
      aws: "Extensive AWS support",
      advantage: "aws"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <Link href="/compare">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Comparisons
          </Button>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            E-Code Platform vs AWS Cloud9
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Modern development platform vs traditional cloud IDE
          </p>
        </div>

        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>
              How E-Code Platform compares to AWS Cloud9
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-left p-4 font-semibold">E-Code Platform</th>
                    <th className="text-left p-4 font-semibold">AWS Cloud9</th>
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
                          {item.advantage === "aws" || item.advantage === "both" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                          <span className="text-sm">{item.aws}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Why Choose E-Code Platform Over Cloud9</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Simpler to Get Started</h3>
                <p className="text-sm text-muted-foreground">
                  No AWS account needed. Start coding in seconds without navigating complex cloud services.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Modern AI Features</h3>
                <p className="text-sm text-muted-foreground">
                  Built-in AI code generation with the latest models. Cloud9 doesn't offer AI assistance.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Predictable Pricing</h3>
                <p className="text-sm text-muted-foreground">
                  Simple pricing with no surprise AWS bills. Know exactly what you'll pay each month.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Faster Deployment</h3>
                <p className="text-sm text-muted-foreground">
                  Deploy to production with one click. No need to configure EC2, load balancers, or other AWS services.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Modern Development, Simplified</h2>
            <p className="text-muted-foreground mb-4">
              Get the power of cloud development without the complexity of AWS
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
