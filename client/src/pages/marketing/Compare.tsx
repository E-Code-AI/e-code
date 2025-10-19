// @ts-nocheck
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { 
  ArrowRight,
  GitBranch,
  Sparkles,
  Cloud,
  Code2,
  Server,
  Shield,
  Users,
  Globe,
  Zap,
  DollarSign,
  Terminal,
  Rocket
} from 'lucide-react';

const comparisons = [
  {
    id: 'github-codespaces',
    title: 'E-Code vs GitHub Codespaces',
    description: 'Compare the best cloud development environments. See why E-Code offers more value with integrated AI, better pricing, and instant deployment.',
    icon: GitBranch,
    color: 'from-purple-500 to-blue-500',
    highlights: ['Better pricing', 'Integrated AI', 'Instant deployment'],
    badge: 'Most Popular',
    href: '/compare/github-codespaces'
  },
  {
    id: 'glitch',
    title: 'E-Code vs Glitch',
    description: 'Learn how E-Code provides a more powerful development experience with enterprise features, better performance, and comprehensive language support.',
    icon: Sparkles,
    color: 'from-pink-500 to-purple-500',
    highlights: ['Enterprise ready', 'Better performance', 'More languages'],
    badge: 'Community Choice',
    href: '/compare/glitch'
  },
  {
    id: 'heroku',
    title: 'E-Code vs Heroku',
    description: 'Discover why developers choose E-Code over Heroku for simpler deployment, transparent pricing, and integrated development environment.',
    icon: Cloud,
    color: 'from-indigo-500 to-purple-500',
    highlights: ['Simpler deployment', 'Clear pricing', 'Built-in IDE'],
    badge: 'Best Value',
    href: '/compare/heroku'
  },
  {
    id: 'codesandbox',
    title: 'E-Code vs CodeSandbox',
    description: 'See how E-Code excels with full-stack development, AI assistance, and production deployments beyond just frontend prototyping.',
    icon: Code2,
    color: 'from-yellow-500 to-orange-500',
    highlights: ['Full-stack support', 'AI powered', 'Production ready'],
    href: '/compare/codesandbox'
  },
  {
    id: 'aws-cloud9',
    title: 'E-Code vs AWS Cloud9',
    description: 'Understand why E-Code is the modern alternative to Cloud9 with simpler setup, transparent pricing, and no AWS complexity.',
    icon: Server,
    color: 'from-orange-500 to-red-500',
    highlights: ['No AWS complexity', 'Simple pricing', 'Modern IDE'],
    badge: 'Enterprise Ready',
    href: '/compare/aws-cloud9'
  }
];

const features = [
  { icon: Shield, label: 'Enterprise Security' },
  { icon: Users, label: 'Team Collaboration' },
  { icon: Globe, label: 'Global Deployment' },
  { icon: Zap, label: 'Instant Setup' },
  { icon: DollarSign, label: 'Transparent Pricing' },
  { icon: Terminal, label: 'Full Terminal Access' }
];

export default function Compare() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background py-24">
        <div className="absolute inset-0 bg-grid-white/10 bg-grid-16" />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-4" variant="secondary">Platform Comparisons</Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight lg:text-6xl">
              Compare E-Code with Other Platforms
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              See why over 30 million developers choose E-Code for building, collaborating, and deploying software. 
              Compare features, pricing, and capabilities side-by-side.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Start Building Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Features */}
      <section className="border-b py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Cards Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Choose Your Comparison</h2>
              <p className="text-lg text-muted-foreground">
                Detailed comparisons to help you make the right choice for your development needs
              </p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2">
              {comparisons.map((comparison) => {
                const Icon = comparison.icon;
                return (
                  <Link key={comparison.id} href={comparison.href}>
                    <Card className="relative h-full transition-all hover:shadow-lg hover:scale-105 cursor-pointer group">
                      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${comparison.color}`} />
                      {comparison.badge && (
                        <Badge className="absolute -top-3 right-4" variant="default">
                          {comparison.badge}
                        </Badge>
                      )}
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className={`rounded-lg bg-gradient-to-br ${comparison.color} p-3 text-white`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <h3 className="mb-3 text-xl font-semibold">{comparison.title}</h3>
                        <p className="mb-4 text-muted-foreground">
                          {comparison.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {comparison.highlights.map((highlight) => (
                            <Badge key={highlight} variant="secondary" className="text-xs">
                              {highlight}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Why E-Code Section */}
      <section className="bg-muted/50 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-6 text-3xl font-bold">Why Developers Choose E-Code</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-lg bg-background p-6">
                <Rocket className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 font-semibold">Instant Start</h3>
                <p className="text-sm text-muted-foreground">
                  No setup, no configuration. Start coding in seconds with any language or framework.
                </p>
              </div>
              <div className="rounded-lg bg-background p-6">
                <Zap className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 font-semibold">AI Powered</h3>
                <p className="text-sm text-muted-foreground">
                  Built-in AI assistant helps you code faster and learn as you build.
                </p>
              </div>
              <div className="rounded-lg bg-background p-6">
                <Globe className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 font-semibold">Deploy Anywhere</h3>
                <p className="text-sm text-muted-foreground">
                  One-click deployment to production with automatic scaling and monitoring.
                </p>
              </div>
            </div>
            <div className="mt-12">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Try E-Code Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}