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
  Code2,
  Layers,
  Users,
  Terminal,
  Database,
  Globe,
  Zap,
  Package,
  Smartphone,
  Server,
  GitBranch,
  Sparkles
} from 'lucide-react';

const comparisonData = [
  {
    category: 'Development Environment',
    features: [
      { feature: 'Browser-based IDE', ecode: true, codesandbox: true },
      { feature: 'Full VS Code experience', ecode: true, codesandbox: true },
      { feature: 'AI coding assistant', ecode: true, codesandbox: false, ecodeNote: 'Built-in AI agent' },
      { feature: 'Terminal access', ecode: true, codesandbox: true },
      { feature: 'Mobile app', ecode: true, codesandbox: false, ecodeNote: 'iOS & Android' },
      { feature: 'Offline development', ecode: true, codesandbox: false },
      { feature: 'Desktop app', ecode: true, codesandbox: false },
    ]
  },
  {
    category: 'Full-Stack Capabilities',
    features: [
      { feature: 'Frontend development', ecode: true, codesandbox: true },
      { feature: 'Backend development', ecode: true, codesandbox: true },
      { feature: 'Database hosting', ecode: true, codesandbox: false, ecodeNote: 'PostgreSQL included' },
      { feature: 'Serverless functions', ecode: true, codesandbox: true },
      { feature: 'Object storage', ecode: true, codesandbox: false },
      { feature: 'Redis support', ecode: true, codesandbox: false },
      { feature: 'Background jobs', ecode: true, codesandbox: false },
    ]
  },
  {
    category: 'Collaboration',
    features: [
      { feature: 'Real-time collaboration', ecode: true, codesandbox: true },
      { feature: 'Voice chat', ecode: true, codesandbox: false },
      { feature: 'Screen sharing', ecode: true, codesandbox: false },
      { feature: 'Guest access', ecode: true, codesandbox: false, ecodeNote: 'No account required' },
      { feature: 'Team workspaces', ecode: true, codesandbox: true },
      { feature: 'Code review', ecode: true, codesandbox: true },
      { feature: 'Live preview sharing', ecode: true, codesandbox: true },
    ]
  },
  {
    category: 'Production Deployment',
    features: [
      { feature: 'One-click deployment', ecode: true, codesandbox: false, ecodeNote: 'Built-in hosting' },
      { feature: 'Custom domains', ecode: true, codesandbox: false },
      { feature: 'SSL certificates', ecode: true, codesandbox: false },
      { feature: 'Global CDN', ecode: true, codesandbox: false },
      { feature: 'Auto-scaling', ecode: true, codesandbox: false },
      { feature: 'Production monitoring', ecode: true, codesandbox: false },
      { feature: 'DevOps integration', ecode: true, codesandbox: false },
    ]
  },
  {
    category: 'Language Support',
    features: [
      { feature: 'JavaScript/TypeScript', ecode: true, codesandbox: true },
      { feature: 'React/Vue/Angular', ecode: true, codesandbox: true },
      { feature: 'Python', ecode: true, codesandbox: true },
      { feature: 'Go, Rust, C++', ecode: true, codesandbox: false, ecodeNote: '40+ languages' },
      { feature: 'Java, C#', ecode: true, codesandbox: false },
      { feature: 'Ruby, PHP', ecode: true, codesandbox: false },
      { feature: 'Mobile development', ecode: true, codesandbox: false },
    ]
  }
];

const keyAdvantages = [
  {
    icon: Layers,
    title: 'True Full-Stack',
    description: 'Build complete applications with backend, database, and deployment - not just frontend prototypes.'
  },
  {
    icon: Sparkles,
    title: 'AI-Powered',
    description: 'Built-in AI assistant helps you code faster, debug issues, and learn new technologies.'
  },
  {
    icon: Globe,
    title: 'Production Ready',
    description: 'Deploy to production with one click, including hosting, SSL, CDN, and custom domains.'
  },
  {
    icon: Smartphone,
    title: 'Code Anywhere',
    description: 'Native mobile and desktop apps let you code on any device, even offline.'
  }
];

export default function VsCodeSandbox() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 py-24 text-white">
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
                  E-Code vs CodeSandbox
                </h1>
                <p className="mb-8 text-xl text-white/90">
                  Go beyond prototyping. E-Code offers complete full-stack development, AI assistance, 
                  and production deployment that CodeSandbox can't match.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/register">
                    <Button size="lg" className="bg-white text-orange-600 hover:bg-white/90">
                      Try E-Code Free <ArrowRight className="ml-2 h-4 w-4" />
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
                    <h3 className="mb-4 text-lg font-semibold text-white">Beyond Prototyping</h3>
                    <div className="space-y-3 text-white/90">
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>Full-stack development with backend and database</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>AI assistant for faster development</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>Deploy to production with one click</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>40+ languages vs just JavaScript</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>Mobile and desktop apps for offline coding</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Advantages */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">E-Code Goes Beyond CodeSandbox</h2>
              <p className="text-lg text-muted-foreground">
                From quick prototypes to production applications - all in one platform
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {keyAdvantages.map(({ icon: Icon, title, description }) => (
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

      {/* Feature Comparison */}
      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Feature-by-Feature Comparison</h2>
              <p className="text-lg text-muted-foreground">
                See why E-Code is the complete development platform
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
                          {item.codesandbox ? (
                            <Check className="h-5 w-5 text-yellow-600" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-12 gap-4 bg-muted/50 p-4 font-semibold">
                      <div className="col-span-6">Feature</div>
                      <div className="col-span-3 text-center text-primary">E-Code</div>
                      <div className="col-span-3 text-center">CodeSandbox</div>
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
              <h2 className="mb-4 text-3xl font-bold">When to Choose Each Platform</h2>
              <p className="text-lg text-muted-foreground">
                Understanding the right tool for your needs
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <Card className="border-primary/20">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="h-5 w-5" />
                    Choose E-Code For
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 text-green-600" />
                      <span>Full-stack web applications</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 text-green-600" />
                      <span>Production deployments</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 text-green-600" />
                      <span>Backend APIs and services</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 text-green-600" />
                      <span>Database-driven applications</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 text-green-600" />
                      <span>Multi-language projects</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 text-green-600" />
                      <span>Team collaboration</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 text-green-600" />
                      <span>AI-assisted development</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-yellow-600/20">
                <CardHeader className="bg-yellow-50/50 dark:bg-yellow-950/20">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    CodeSandbox Works For
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 text-yellow-600" />
                      <span>Quick frontend prototypes</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 text-yellow-600" />
                      <span>Component libraries</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 text-yellow-600" />
                      <span>Code examples and demos</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 text-yellow-600" />
                      <span>Simple React/Vue apps</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="mt-0.5 h-5 w-5 text-red-600" />
                      <span className="text-muted-foreground">Complex backends</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="mt-0.5 h-5 w-5 text-red-600" />
                      <span className="text-muted-foreground">Production hosting</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="mt-0.5 h-5 w-5 text-red-600" />
                      <span className="text-muted-foreground">Database applications</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Quote */}
      <section className="border-y bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <blockquote className="text-2xl font-medium italic">
              "We started with CodeSandbox for prototypes but quickly hit limitations. 
              E-Code gave us everything - backend, database, deployment, and AI assistance. 
              It's a complete game-changer."
            </blockquote>
            <div className="mt-6">
              <p className="font-semibold">Sarah Chen</p>
              <p className="text-sm text-muted-foreground">CTO at TechStartup Inc.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready for Complete Development?</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Graduate from prototypes to production with E-Code
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
            Import your CodeSandbox projects with one click
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}