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
  Server,
  DollarSign,
  Shield,
  Building,
  Zap,
  Users,
  Terminal,
  Cloud,
  Settings,
  FileText,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

const comparisonData = [
  {
    category: 'Setup & Configuration',
    features: [
      { feature: 'Instant setup', ecode: true, cloud9: false, ecodeNote: 'Zero config' },
      { feature: 'No AWS account required', ecode: true, cloud9: false },
      { feature: 'No IAM configuration', ecode: true, cloud9: false },
      { feature: 'Built-in IDE', ecode: true, cloud9: true },
      { feature: 'Terminal access', ecode: true, cloud9: true },
      { feature: 'Auto-provisioning', ecode: true, cloud9: false },
      { feature: 'Pre-configured environments', ecode: true, cloud9: false, ecodeNote: '40+ templates' },
    ]
  },
  {
    category: 'Pricing & Billing',
    features: [
      { feature: 'Transparent pricing', ecode: true, cloud9: false, ecodeNote: 'Simple, clear' },
      { feature: 'Free tier', ecode: true, cloud9: false, ecodeNote: 'Generous free plan' },
      { feature: 'No hidden EC2 charges', ecode: true, cloud9: false },
      { feature: 'Predictable costs', ecode: true, cloud9: false },
      { feature: 'No data transfer fees', ecode: true, cloud9: false },
      { feature: 'Included database', ecode: true, cloud9: false, ecodeNote: 'PostgreSQL' },
      { feature: 'No surprise bills', ecode: true, cloud9: false },
    ]
  },
  {
    category: 'Developer Experience',
    features: [
      { feature: 'AI coding assistant', ecode: true, cloud9: false, ecodeNote: 'Built-in AI' },
      { feature: 'Live collaboration', ecode: true, cloud9: true },
      { feature: 'Mobile app', ecode: true, cloud9: false },
      { feature: 'Desktop app', ecode: true, cloud9: false },
      { feature: 'Guest access', ecode: true, cloud9: false, ecodeNote: 'No AWS needed' },
      { feature: 'Voice chat', ecode: true, cloud9: false },
      { feature: 'Built-in deployment', ecode: true, cloud9: false },
    ]
  },
  {
    category: 'Enterprise Features',
    features: [
      { feature: 'SSO/SAML', ecode: true, cloud9: true },
      { feature: 'Team management', ecode: true, cloud9: true },
      { feature: 'Simple user management', ecode: true, cloud9: false, ecodeNote: 'No IAM complexity' },
      { feature: 'Audit logs', ecode: true, cloud9: true },
      { feature: 'Compliance tools', ecode: true, cloud9: true },
      { feature: 'Role-based access', ecode: true, cloud9: true },
      { feature: '99.9% SLA', ecode: true, cloud9: true },
    ]
  },
  {
    category: 'Platform Features',
    features: [
      { feature: 'Integrated hosting', ecode: true, cloud9: false, ecodeNote: 'One-click deploy' },
      { feature: 'Global CDN', ecode: true, cloud9: false },
      { feature: 'Auto-scaling', ecode: true, cloud9: false, ecodeNote: 'Built-in' },
      { feature: 'Object storage', ecode: true, cloud9: false },
      { feature: 'Serverless functions', ecode: true, cloud9: false },
      { feature: 'Custom domains', ecode: true, cloud9: false },
      { feature: 'SSL certificates', ecode: true, cloud9: false },
    ]
  }
];

const complexityComparison = [
  {
    task: 'Create new project',
    ecode: '1 click, 10 seconds',
    cloud9: 'Create EC2, configure IAM, setup Cloud9',
    ecodeWins: true
  },
  {
    task: 'Add team member',
    ecode: 'Send invite link',
    cloud9: 'Create IAM user, set permissions, share environment',
    ecodeWins: true
  },
  {
    task: 'Deploy to production',
    ecode: '1 click in IDE',
    cloud9: 'Setup separate AWS services (ECS, Lambda, etc)',
    ecodeWins: true
  },
  {
    task: 'Setup database',
    ecode: 'Already included',
    cloud9: 'Provision RDS, configure security groups',
    ecodeWins: true
  },
  {
    task: 'Monitor costs',
    ecode: 'Simple dashboard',
    cloud9: 'AWS Cost Explorer, multiple services',
    ecodeWins: true
  }
];

const awsComplexityIssues = [
  {
    icon: AlertTriangle,
    title: 'IAM Complexity',
    description: 'Complex permissions and role management just to start coding'
  },
  {
    icon: DollarSign,
    title: 'Hidden Costs',
    description: 'EC2, data transfer, storage, and other unexpected charges'
  },
  {
    icon: Settings,
    title: 'Configuration Overhead',
    description: 'Security groups, VPCs, and networking setup required'
  },
  {
    icon: FileText,
    title: 'Billing Complexity',
    description: 'Multiple services with separate billing making costs unpredictable'
  }
];

export default function VsAwsCloud9() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-red-600 to-purple-600 py-24 text-white">
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
                  E-Code vs AWS Cloud9
                </h1>
                <p className="mb-8 text-xl text-white/90">
                  Skip the AWS complexity. E-Code provides enterprise-grade development without 
                  IAM headaches, hidden costs, or configuration nightmares.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/register">
                    <Button size="lg" className="bg-white text-red-600 hover:bg-white/90">
                      Start Simple with E-Code <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                      See Clear Pricing
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="space-y-4">
                <Card className="border-white/20 bg-white/10 backdrop-blur">
                  <CardContent className="p-6">
                    <h3 className="mb-4 text-lg font-semibold text-white">No AWS Complexity</h3>
                    <div className="space-y-3 text-white/90">
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>Start coding in 10 seconds, not 10 minutes</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>No IAM, VPC, or security group setup</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>Simple, transparent pricing - no bill shock</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>Everything included - IDE, hosting, database</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-green-400" />
                        <span>AI assistant built-in at no extra cost</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-400/50 bg-red-400/10 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      <span className="font-semibold text-white">AWS Cloud9 Discontinued</span>
                    </div>
                    <p className="mt-2 text-sm text-white/80">
                      AWS is deprecating Cloud9. Migrate to E-Code for a better, simpler experience.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AWS Complexity Issues */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Escape AWS Complexity</h2>
              <p className="text-lg text-muted-foreground">
                Common frustrations with Cloud9 that E-Code eliminates
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {awsComplexityIssues.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="border-red-200 dark:border-red-950">
                  <CardContent className="p-6">
                    <Icon className="mb-4 h-10 w-10 text-red-600 dark:text-red-400" />
                    <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Simplicity Comparison */}
      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Complexity vs Simplicity</h2>
              <p className="text-lg text-muted-foreground">
                See how much simpler development is with E-Code
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Common Tasks Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="p-4 text-left">Task</th>
                        <th className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Badge className="bg-primary text-white">E-Code</Badge>
                          </div>
                        </th>
                        <th className="p-4 text-center">
                          <Badge variant="secondary">AWS Cloud9</Badge>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {complexityComparison.map((item) => (
                        <tr key={item.task} className="hover:bg-muted/50">
                          <td className="p-4 font-medium">{item.task}</td>
                          <td className="p-4 text-center">
                            <span className={item.ecodeWins ? 'text-green-600 font-semibold' : ''}>
                              {item.ecode}
                            </span>
                          </td>
                          <td className="p-4 text-center text-muted-foreground">
                            {item.cloud9}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
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
                Enterprise features without enterprise complexity
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
                          {item.cloud9 ? (
                            <Check className="h-5 w-5 text-orange-600" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-12 gap-4 bg-muted/50 p-4 font-semibold">
                      <div className="col-span-6">Feature</div>
                      <div className="col-span-3 text-center text-primary">E-Code</div>
                      <div className="col-span-3 text-center">AWS Cloud9</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cost Transparency */}
      <section className="bg-gradient-to-br from-green-50 to-emerald-50 py-24 dark:from-green-950/20 dark:to-emerald-950/20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="mb-6 text-3xl font-bold">Transparent vs Hidden Costs</h2>
                <div className="space-y-4">
                  <Card className="border-green-200 dark:border-green-900">
                    <CardContent className="p-6">
                      <h3 className="mb-3 flex items-center gap-2 font-semibold text-green-700 dark:text-green-400">
                        <DollarSign className="h-5 w-5" />
                        E-Code Pricing
                      </h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          One simple monthly price
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          Everything included
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          No surprise bills
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          Free tier available
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div className="space-y-4">
                <Card className="border-red-200 dark:border-red-900">
                  <CardContent className="p-6">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-5 w-5" />
                      AWS Cloud9 Costs
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" />
                        EC2 instance charges
                      </li>
                      <li className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" />
                        EBS storage costs
                      </li>
                      <li className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" />
                        Data transfer fees
                      </li>
                      <li className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" />
                        Additional AWS services
                      </li>
                      <li className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" />
                        Complex billing calculations
                      </li>
                      <li className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-600" />
                        No free tier after 12 months
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                <div className="rounded-lg bg-yellow-100 p-4 dark:bg-yellow-950/30">
                  <p className="text-sm">
                    <strong>Common scenario:</strong> A team of 5 developers can save over 
                    <span className="font-bold text-green-600"> $500/month</span> by switching 
                    from Cloud9 to E-Code.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Ready */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-3xl font-bold">Enterprise-Grade Without the Complexity</h2>
            <p className="mb-12 text-lg text-muted-foreground">
              E-Code provides all the enterprise features without AWS overhead
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <Shield className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 font-semibold">Security First</h3>
                  <p className="text-sm text-muted-foreground">
                    SOC 2 compliant, encrypted data, SSO/SAML support
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <Building className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 font-semibold">Enterprise Scale</h3>
                  <p className="text-sm text-muted-foreground">
                    Handle teams of any size with simple management
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardContent className="p-6">
                  <Sparkles className="mx-auto mb-4 h-12 w-12 text-primary" />
                  <h3 className="mb-2 font-semibold">Modern Features</h3>
                  <p className="text-sm text-muted-foreground">
                    AI assistance, mobile apps, and cutting-edge tools
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
          <h2 className="mb-4 text-3xl font-bold">Simplify Your Development Today</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Join thousands who've escaped AWS complexity for E-Code simplicity
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Free - No AWS Required <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact-sales">
              <Button size="lg" variant="outline">
                Enterprise Demo
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Set up in 10 seconds • No credit card • No AWS account needed
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}