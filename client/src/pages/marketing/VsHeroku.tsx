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
  Cloud,
  DollarSign,
  Rocket,
  Code2,
  Terminal,
  Database,
  Globe,
  Shield,
  Gauge,
  Clock,
  Users
} from 'lucide-react';

const comparisonData = [
  {
    category: 'Development & Deployment',
    features: [
      { feature: 'Built-in IDE', ecode: true, heroku: false, ecodeNote: 'Full development environment' },
      { feature: 'One-click deployment', ecode: true, heroku: true },
      { feature: 'AI coding assistant', ecode: true, heroku: false },
      { feature: 'Instant preview', ecode: true, heroku: false },
      { feature: 'Git integration', ecode: true, heroku: true },
      { feature: 'CI/CD pipeline', ecode: true, heroku: true },
      { feature: 'Zero-config deployment', ecode: true, heroku: false, ecodeNote: 'No buildpacks needed' },
    ]
  },
  {
    category: 'Pricing & Value',
    features: [
      { feature: 'Free tier', ecode: true, heroku: false, ecodeNote: 'Generous free tier' },
      { feature: 'Transparent pricing', ecode: true, heroku: false, ecodeNote: 'No hidden costs' },
      { feature: 'Pay-as-you-go', ecode: true, heroku: true },
      { feature: 'No dyno sleeping', ecode: true, heroku: false },
      { feature: 'Included database', ecode: true, heroku: false, ecodeNote: 'PostgreSQL included' },
      { feature: 'Free SSL certificates', ecode: true, heroku: true },
      { feature: 'No add-on fees', ecode: true, heroku: false },
    ]
  },
  {
    category: 'Performance & Scaling',
    features: [
      { feature: 'Auto-scaling', ecode: true, heroku: true },
      { feature: 'Global CDN', ecode: true, heroku: false, ecodeNote: 'Built-in CDN' },
      { feature: 'Edge deployment', ecode: true, heroku: false },
      { feature: 'Container support', ecode: true, heroku: true },
      { feature: 'Serverless functions', ecode: true, heroku: false },
      { feature: 'WebSocket support', ecode: true, heroku: true },
      { feature: 'Background jobs', ecode: true, heroku: true },
    ]
  },
  {
    category: 'Developer Experience',
    features: [
      { feature: 'Instant setup', ecode: true, heroku: false, ecodeNote: 'No CLI required' },
      { feature: 'Live collaboration', ecode: true, heroku: false },
      { feature: 'Built-in terminal', ecode: true, heroku: false },
      { feature: 'Database GUI', ecode: true, heroku: false },
      { feature: 'Logs viewer', ecode: true, heroku: true },
      { feature: 'Metrics dashboard', ecode: true, heroku: true },
      { feature: 'Mobile development', ecode: true, heroku: false, ecodeNote: 'Mobile app available' },
    ]
  }
];

const pricingComparison = [
  {
    tier: 'Free',
    ecode: {
      price: '$0/month',
      features: [
        'Unlimited public apps',
        'Always-on hosting',
        'PostgreSQL database',
        'Custom domains',
        '500MB storage'
      ]
    },
    heroku: {
      price: 'Discontinued',
      features: [
        'Free tier removed in 2022',
        'No free hosting available',
        'Must use paid dynos',
        'Database costs extra',
        'SSL costs extra'
      ]
    }
  },
  {
    tier: 'Starter',
    ecode: {
      price: '$7/month',
      features: [
        'Unlimited private apps',
        '2 vCPU, 2GB RAM',
        '10GB storage',
        'Priority support',
        'Team collaboration'
      ]
    },
    heroku: {
      price: '$25/month',
      features: [
        'Basic dyno (512MB RAM)',
        'Never sleeps',
        'Database starts at $9/month',
        'Limited metrics',
        'Email support'
      ]
    }
  },
  {
    tier: 'Professional',
    ecode: {
      price: '$20/month',
      features: [
        '4 vCPU, 8GB RAM',
        '100GB storage',
        'Auto-scaling included',
        'Advanced security',
        'Dedicated support'
      ]
    },
    heroku: {
      price: '$50-250/month',
      features: [
        'Professional dynos',
        'Horizontal scaling',
        'Database from $50/month',
        'Enhanced metrics',
        'Business support extra'
      ]
    }
  }
];

const costSavings = [
  { scenario: 'Small app with database', ecode: '$7/month', heroku: '$34/month', savings: '79%' },
  { scenario: 'Medium app with scaling', ecode: '$20/month', heroku: '$100+/month', savings: '80%' },
  { scenario: 'Enterprise with team', ecode: '$100/month', heroku: '$500+/month', savings: '80%' },
];

export default function VsHeroku() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 py-24 text-white">
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
                  E-Code vs Heroku
                </h1>
                <p className="mb-8 text-xl text-white/90">
                  The modern alternative to Heroku with better pricing, built-in development tools, 
                  and no platform lock-in.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/register">
                    <Button size="lg" className="bg-white text-purple-600 hover:bg-white/90">
                      Deploy Free on E-Code <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                      See Pricing
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="space-y-4">
                <Card className="border-white/20 bg-white/10 backdrop-blur">
                  <CardContent className="p-6">
                    <h3 className="mb-4 text-lg font-semibold text-white">Migration Benefits</h3>
                    <div className="space-y-3 text-white/90">
                      <div className="flex items-start gap-2">
                        <DollarSign className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>Save 80% on hosting costs</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Rocket className="mt-0.5 h-4 w-4 text-orange-400" />
                        <span>Deploy in seconds, not minutes</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Code2 className="mt-0.5 h-4 w-4 text-blue-400" />
                        <span>Develop and deploy in one platform</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Database className="mt-0.5 h-4 w-4 text-purple-400" />
                        <span>Database included at no extra cost</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-yellow-400/50 bg-yellow-400/10 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-400 text-black">Limited Time</Badge>
                      <span className="font-semibold text-white">Free Heroku Migration</span>
                    </div>
                    <p className="mt-2 text-sm text-white/80">
                      We'll help migrate your Heroku apps for free. Contact sales for details.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Comparison */}
      <section className="border-b py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <h3 className="mb-8 text-center text-2xl font-bold">Real Cost Comparison</h3>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Scenario</th>
                    <th className="px-4 py-3 text-center">E-Code</th>
                    <th className="px-4 py-3 text-center">Heroku</th>
                    <th className="px-4 py-3 text-center">You Save</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {costSavings.map((item) => (
                    <tr key={item.scenario} className="hover:bg-muted/30">
                      <td className="px-4 py-3">{item.scenario}</td>
                      <td className="px-4 py-3 text-center font-semibold text-green-600">{item.ecode}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{item.heroku}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-green-100 text-green-700">{item.savings}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Complete Feature Comparison</h2>
              <p className="text-lg text-muted-foreground">
                Everything Heroku offers, plus much more at a fraction of the cost
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
                          {item.heroku ? (
                            <Check className="h-5 w-5 text-purple-600" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-12 gap-4 bg-muted/50 p-4 font-semibold">
                      <div className="col-span-6">Feature</div>
                      <div className="col-span-3 text-center text-primary">E-Code</div>
                      <div className="col-span-3 text-center">Heroku</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Pricing That Makes Sense</h2>
              <p className="text-lg text-muted-foreground">
                No more complex dyno calculations or surprise add-on costs
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {pricingComparison.map((tier) => (
                <Card key={tier.tier} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5">
                    <CardTitle className="text-2xl">{tier.tier}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {/* E-Code Pricing */}
                    <div className="mb-6">
                      <div className="mb-3 flex items-center gap-2">
                        <Badge className="bg-primary text-white">E-Code</Badge>
                        <span className="text-2xl font-bold">{tier.ecode.price}</span>
                      </div>
                      <ul className="space-y-2">
                        {tier.ecode.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="mt-0.5 h-4 w-4 text-green-600" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Heroku Pricing */}
                    <div className="border-t pt-6">
                      <div className="mb-3 flex items-center gap-2">
                        <Badge variant="secondary">Heroku</Badge>
                        <span className="text-xl font-semibold text-muted-foreground">{tier.heroku.price}</span>
                      </div>
                      <ul className="space-y-2">
                        {tier.heroku.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            {feature.includes('removed') || feature.includes('costs extra') ? (
                              <X className="mt-0.5 h-4 w-4 text-red-600" />
                            ) : (
                              <Check className="mt-0.5 h-4 w-4" />
                            )}
                            <span>{feature}</span>
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

      {/* Migration Guide */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-3xl font-bold">Easy Migration from Heroku</h2>
            <p className="mb-12 text-lg text-muted-foreground">
              Migrate your Heroku apps in minutes with our simple process
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                    1
                  </div>
                  <h3 className="mb-2 font-semibold">Import Your Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your GitHub repo or upload your code directly
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                    2
                  </div>
                  <h3 className="mb-2 font-semibold">Auto-Configure</h3>
                  <p className="text-sm text-muted-foreground">
                    E-Code automatically detects and configures your app
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                    3
                  </div>
                  <h3 className="mb-2 font-semibold">Deploy</h3>
                  <p className="text-sm text-muted-foreground">
                    One click to deploy with automatic SSL and custom domains
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="mt-12">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Start Free Migration <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">
                No credit card required • Free support for migration
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}