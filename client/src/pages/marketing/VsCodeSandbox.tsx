import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export default function VsCodeSandbox() {
  const comparisons = [
    {
      feature: "AI Code Generation",
      eCode: "GPT-5 + Claude built-in",
      codesandbox: "Not available",
      advantage: "eCode"
    },
    {
      feature: "Backend Support",
      eCode: "Full backend with database",
      codesandbox: "Limited backend (serverless)",
      advantage: "eCode"
    },
    {
      feature: "Deployment",
      eCode: "Production deployments",
      codesandbox: "Preview deployments",
      advantage: "eCode"
    },
    {
      feature: "Frontend Development",
      eCode: "Full support",
      codesandbox: "Excellent support",
      advantage: "both"
    },
    {
      feature: "Collaboration",
      eCode: "Real-time collaboration",
      codesandbox: "Real-time collaboration",
      advantage: "both"
    },
    {
      feature: "Templates",
      eCode: "AI-generated templates",
      codesandbox: "Large template library",
      advantage: "codesandbox"
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
            E-Code Platform vs CodeSandbox
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Full-stack platform vs frontend-focused editor
          </p>
        </div>

        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>
              How E-Code Platform compares to CodeSandbox
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-left p-4 font-semibold">E-Code Platform</th>
                    <th className="text-left p-4 font-semibold">CodeSandbox</th>
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
                          {item.advantage === "codesandbox" || item.advantage === "both" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                          <span className="text-sm">{item.codesandbox}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Build Full-Stack Apps with AI</h2>
            <p className="text-muted-foreground mb-4">
              E-Code Platform supports both frontend and backend development
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
