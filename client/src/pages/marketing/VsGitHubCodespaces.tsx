// @ts-nocheck
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { 
  Check,
  X,
  ArrowRight,
  Zap,
  DollarSign,
  Users,
  Globe,
  Shield,
  Code2,
  Terminal,
  Sparkles,
  GitBranch,
  Rocket,
  Clock,
  Package
} from 'lucide-react';

const comparisonData = [
  {
    category: 'Development Environment',
    features: [
      { feature: 'Browser-based IDE', ecode: true, codespaces: true },
      { feature: 'AI Code Assistant', ecode: true, codespaces: false, ecodeNote: 'Built-in AI agent' },
      { feature: 'Instant environment setup', ecode: true, codespaces: true },
      { feature: 'Mobile app support', ecode: true, codespaces: false },
      { feature: 'Offline development', ecode: true, codespaces: false, ecodeNote: 'Desktop app' },
      { feature: 'Live collaboration', ecode: true, codespaces: true },
      { feature: 'Voice coding support', ecode: true, codespaces: false },
    ]
  },
  {
    category: 'Language & Framework Support',
    features: [
      { feature: '40+ languages', ecode: true, codespaces: true },
      { feature: 'Polyglot runtime', ecode: true, codespaces: false, ecodeNote: 'Mix languages freely' },
      { feature: 'Auto-detect frameworks', ecode: true, codespaces: false },
      { feature: 'Zero-config setup', ecode: true, codespaces: false },
      { feature: 'Package management', ecode: true, codespaces: true },
      { feature: 'Custom environments', ecode: true, codespaces: true },
    ]
  },
  {
    category: 'Deployment & Hosting',
    features: [
      { feature: 'One-click deployment', ecode: true, codespaces: false, ecodeNote: 'Built-in hosting' },
      { feature: 'Automatic SSL', ecode: true, codespaces: false },
      { feature: 'Global CDN', ecode: true, codespaces: false },
      { feature: 'Database hosting', ecode: true, codespaces: false, ecodeNote: 'PostgreSQL included' },
      { feature: 'Object storage', ecode: true, codespaces: false },
      { feature: 'Custom domains', ecode: true, codespaces: false },
      { feature: 'Serverless functions', ecode: true, codespaces: false },
    ]
  },
  {
    category: 'Team Collaboration',
    features: [
      { feature: 'Real-time multiplayer', ecode: true, codespaces: true },
      { feature: 'Voice chat', ecode: true, codespaces: false },
      { feature: 'Screen sharing', ecode: true, codespaces: false },
      { feature: 'Code review tools', ecode: true, codespaces: true },
      { feature: 'Team workspaces', ecode: true, codespaces: true },
      { feature: 'Guest access', ecode: true, codespaces: false, ecodeNote: 'No GitHub required' },
    ]
  },
  {
    category: 'Pricing & Value',
    features: [
      { feature: 'Free tier', ecode: true, codespaces: true, ecodeNote: 'Generous free tier' },
      { feature: 'Transparent pricing', ecode: true, codespaces: false, ecodeNote: 'Simple, predictable' },
      { feature: 'No hidden costs', ecode: true, codespaces: false },
      { feature: 'Student discounts', ecode: true, codespaces: true },
      { feature: 'Team plans', ecode: true, codespaces: true },
      { feature: 'Pay-as-you-go', ecode: true, codespaces: true },
    ]
  }
];

const pricingComparison = [
  {
    tier: 'Free',
    ecode: '$0/month',
    ecodeDetails: ['Unlimited public projects', '500MB storage', '0.2 vCPU, 512MB RAM', 'Community support'],
    codespaces: '60 hours/month',
    codespacesDetails: ['2-core, 4GB RAM', 'Limited to personal accounts', 'No team features']
  },
  {
    tier: 'Individual',
    ecode: '$7/month',
    ecodeDetails: ['Unlimited private projects', '10GB storage', '2 vCPU, 2GB RAM', 'Priority support', 'Custom domains'],
    codespaces: '$20/month',
    codespacesDetails: ['180 hours/month', '2-core machine', 'GitHub Pro required']
  },
  {
    tier: 'Team',
    ecode: '$20/month per user',
    ecodeDetails: ['Team collaboration', '100GB storage', '4 vCPU, 8GB RAM', 'Advanced security', 'SSO/SAML'],
    codespaces: '$40/month per user',
    codespacesDetails: ['Additional usage charges', 'Requires GitHub Team', 'Complex billing']
  }
];

export default function VsGitHubCodespaces() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 py-24 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 flex items-center gap-2">
              <Link href="/compare">
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
                  ← All Comparisons
                </Badge>
              </Link>
            </div>
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h1 className="mb-6 text-4xl font-bold lg:text-5xl">
                  E-Code vs GitHub Codespaces
                </h1>
                <p className="mb-8 text-xl text-white/90">
                  Why developers are switching from GitHub Codespaces to E-Code for a more complete, 
                  affordable cloud development experience.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/register">
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-white/90">
                      Start Free with E-Code <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                      View Pricing
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="grid gap-4">
                <Card className="border-white/20 bg-white/10 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-full bg-green-500 p-2">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Key Advantages</h3>
                    </div>
                    <ul className="space-y-3 text-white/90">
                      <li className="flex items-start gap-2">
                        <Zap className="mt-0.5 h-4 w-4 text-yellow-400" />
                        <span>Built-in AI assistant for faster development</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <DollarSign className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>65% lower cost for comparable resources</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Rocket className="mt-0.5 h-4 w-4 text-orange-400" />
                        <span>Integrated deployment and hosting included</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Globe className="mt-0.5 h-4 w-4 text-blue-400" />
                        <span>No GitHub account or subscription required</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="border-b bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-primary">65%</div>
              <div className="text-sm text-muted-foreground">Lower Cost</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-primary">10x</div>
              <div className="text-sm text-muted-foreground">Faster Setup</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">More Features</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">Support Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Feature-by-Feature Comparison</h2>
              <p className="text-lg text-muted-foreground">
                See how E-Code delivers more value across every category
              </p>
            </div>

            {comparisonData.map((category) => (
              <Card key={category.category} className="mb-8">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="text-xl">{category.category}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {category.features.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/30">
                        <div className="col-span-6 flex items-center">
                          <span className="font-medium">{item.feature}</span>
                        </div>
                        <div className="col-span-3 flex items-center justify-center">
                          {item.ecode ? (
                            <div className="flex items-center gap-2">
                              <Check className="h-5 w-5 text-green-600" />
                              {item.ecodeNote && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.ecodeNote}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="col-span-3 flex items-center justify-center">
                          {item.codespaces ? (
                            <Check className="h-5 w-5 text-blue-600" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-12 gap-4 bg-muted/50 p-4 font-semibold">
                      <div className="col-span-6">Feature</div>
                      <div className="col-span-3 text-center text-primary">E-Code</div>
                      <div className="col-span-3 text-center">GitHub Codespaces</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Transparent Pricing Comparison</h2>
              <p className="text-lg text-muted-foreground">
                E-Code offers better value at every tier with no hidden costs
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {pricingComparison.map((tier) => (
                <Card key={tier.tier} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5">
                    <CardTitle className="text-2xl">{tier.tier}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="mb-6">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge className="bg-primary text-white">E-Code</Badge>
                        <span className="text-2xl font-bold">{tier.ecode}</span>
                      </div>
                      <ul className="space-y-2">
                        {tier.ecodeDetails.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="mt-0.5 h-4 w-4 text-green-600" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border-t pt-6">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="secondary">GitHub Codespaces</Badge>
                        <span className="text-xl font-semibold text-muted-foreground">{tier.codespaces}</span>
                      </div>
                      <ul className="space-y-2">
                        {tier.codespacesDetails.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="mt-0.5 h-4 w-4" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose E-Code */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Why Developers Choose E-Code</h2>
              <p className="text-lg text-muted-foreground">
                More than just a code editor - a complete development platform
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <Sparkles className="mb-4 h-10 w-10 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">AI-Powered Development</h3>
                  <p className="text-muted-foreground">
                    Built-in AI assistant that understands your code, suggests improvements, 
                    and helps you build faster without additional subscriptions.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <Globe className="mb-4 h-10 w-10 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">Integrated Deployment</h3>
                  <p className="text-muted-foreground">
                    Deploy your apps instantly with built-in hosting, SSL, CDN, and custom domains. 
                    No need for separate hosting services.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <Package className="mb-4 h-10 w-10 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">All-Inclusive Platform</h3>
                  <p className="text-muted-foreground">
                    Database hosting, object storage, serverless functions, and more - 
                    all included without extra configuration or costs.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <Users className="mb-4 h-10 w-10 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">True Collaboration</h3>
                  <p className="text-muted-foreground">
                    Real-time multiplayer coding with voice chat, screen sharing, and guest access. 
                    No GitHub account required for collaborators.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Experience the Difference?</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join millions of developers who've made the switch to E-Code
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Building Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact-sales">
              <Button size="lg" variant="outline">
                Talk to Sales
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required • Free forever for public projects
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}