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
  Sparkles,
  Building,
  Shield,
  Gauge,
  Database,
  Users,
  Terminal,
  Globe,
  Code2,
  Layers,
  Package,
  Rocket
} from 'lucide-react';

const comparisonData = [
  {
    category: 'Development Capabilities',
    features: [
      { feature: 'Full-stack development', ecode: true, glitch: true },
      { feature: 'AI coding assistant', ecode: true, glitch: false, ecodeNote: 'Built-in AI agent' },
      { feature: 'Enterprise IDE features', ecode: true, glitch: false, ecodeNote: 'Advanced tooling' },
      { feature: 'Terminal access', ecode: true, glitch: true },
      { feature: 'Debugger', ecode: true, glitch: false },
      { feature: 'Version control', ecode: true, glitch: true },
      { feature: 'Code intelligence', ecode: true, glitch: false },
    ]
  },
  {
    category: 'Performance & Scalability',
    features: [
      { feature: 'Production-grade hosting', ecode: true, glitch: false, ecodeNote: 'Enterprise ready' },
      { feature: 'Auto-scaling', ecode: true, glitch: false },
      { feature: 'Global CDN', ecode: true, glitch: false },
      { feature: 'High performance', ecode: true, glitch: false, ecodeNote: 'Up to 32GB RAM' },
      { feature: 'Custom domains', ecode: true, glitch: true },
      { feature: 'SSL certificates', ecode: true, glitch: true },
      { feature: 'DDoS protection', ecode: true, glitch: false },
    ]
  },
  {
    category: 'Language Support',
    features: [
      { feature: '40+ languages', ecode: true, glitch: false, ecodeNote: 'All major languages' },
      { feature: 'Polyglot runtime', ecode: true, glitch: false },
      { feature: 'Node.js', ecode: true, glitch: true },
      { feature: 'Python', ecode: true, glitch: true },
      { feature: 'Go, Rust, C++', ecode: true, glitch: false },
      { feature: 'Java, C#, PHP', ecode: true, glitch: false },
      { feature: 'Ruby, Swift, Kotlin', ecode: true, glitch: false },
    ]
  },
  {
    category: 'Enterprise Features',
    features: [
      { feature: 'SSO/SAML', ecode: true, glitch: false, ecodeNote: 'Enterprise auth' },
      { feature: 'Team management', ecode: true, glitch: true },
      { feature: 'Private projects', ecode: true, glitch: true },
      { feature: 'Audit logs', ecode: true, glitch: false },
      { feature: 'Role-based access', ecode: true, glitch: false },
      { feature: 'Compliance tools', ecode: true, glitch: false },
      { feature: '99.9% SLA', ecode: true, glitch: false },
    ]
  },
  {
    category: 'Database & Storage',
    features: [
      { feature: 'PostgreSQL hosting', ecode: true, glitch: false, ecodeNote: 'Built-in database' },
      { feature: 'Object storage', ecode: true, glitch: false },
      { feature: 'Redis support', ecode: true, glitch: false },
      { feature: 'SQLite', ecode: true, glitch: true },
      { feature: 'Database backups', ecode: true, glitch: false },
      { feature: 'Data persistence', ecode: true, glitch: true },
    ]
  }
];

const keyDifferences = [
  {
    icon: Building,
    title: 'Enterprise Ready',
    description: 'E-Code provides enterprise-grade security, compliance, and scalability that Glitch lacks.'
  },
  {
    icon: Gauge,
    title: 'Superior Performance',
    description: 'Up to 10x better performance with dedicated resources and global CDN deployment.'
  },
  {
    icon: Code2,
    title: 'Professional IDE',
    description: 'Full VS Code experience with extensions, debugging, and advanced development tools.'
  },
  {
    icon: Database,
    title: 'Complete Backend',
    description: 'Built-in PostgreSQL, Redis, object storage, and serverless functions included.'
  }
];

export default function VsGlitch() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600 py-24 text-white">
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
                  E-Code vs Glitch
                </h1>
                <p className="mb-8 text-xl text-white/90">
                  From hobby projects to enterprise applications - see why E-Code is the professional 
                  choice for serious developers.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/register">
                    <Button size="lg" className="bg-white text-purple-600 hover:bg-white/90">
                      Start with E-Code <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                      Compare Plans
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="grid gap-4">
                <Card className="border-white/20 bg-white/10 backdrop-blur">
                  <CardContent className="p-6">
                    <h3 className="mb-4 text-lg font-semibold text-white">Why Teams Choose E-Code</h3>
                    <div className="space-y-3 text-white/90">
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>10x better performance with dedicated resources</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>Enterprise security and compliance features</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>Built-in AI assistant for faster development</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>Support for 40+ programming languages</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>Production-grade hosting with auto-scaling</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Differences */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Key Differences at a Glance</h2>
              <p className="text-lg text-muted-foreground">
                E-Code delivers professional features that Glitch simply doesn't offer
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {keyDifferences.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="border-primary/20">
                  <CardContent className="p-6">
                    <Icon className="mb-4 h-10 w-10 text-primary" />
                    <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Detailed Feature Comparison</h2>
              <p className="text-lg text-muted-foreground">
                See how E-Code outperforms Glitch across every category
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
                          {item.glitch ? (
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
                      <div className="col-span-3 text-center">Glitch</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">E-Code Excels Where Glitch Falls Short</h2>
              <p className="text-lg text-muted-foreground">
                Built for professional development and production deployments
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="mb-4 text-xl font-semibold">Perfect for E-Code</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 text-green-600" />
                    <span>Production applications requiring high performance</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 text-green-600" />
                    <span>Enterprise teams needing security and compliance</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 text-green-600" />
                    <span>Full-stack applications with databases</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 text-green-600" />
                    <span>AI-powered applications and machine learning</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 text-green-600" />
                    <span>Multi-language projects and microservices</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="mb-4 text-xl font-semibold">Limited on Glitch</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-5 w-5 text-red-600" />
                    <span className="text-muted-foreground">Apps requiring more than 512MB RAM</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-5 w-5 text-red-600" />
                    <span className="text-muted-foreground">Enterprise security requirements</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-5 w-5 text-red-600" />
                    <span className="text-muted-foreground">Complex backend services</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-5 w-5 text-red-600" />
                    <span className="text-muted-foreground">Languages beyond Node.js and Python</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-5 w-5 text-red-600" />
                    <span className="text-muted-foreground">Production workloads at scale</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Upgrade to Professional Development</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join teams who've upgraded from Glitch to E-Code for serious development
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact-sales">
              <Button size="lg" variant="outline">
                Talk to Sales
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Free tier includes more resources than Glitch premium plans
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}