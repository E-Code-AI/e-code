import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  Check, X, Zap, Users, Shield, Rocket, Star, Info,
  Code, Terminal, Globe, Database, Lock, Package,
  ChevronRight, Sparkles, Building2, Crown
} from 'lucide-react';
import { useState } from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

interface PricingTier {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular?: boolean;
  enterprise?: boolean;
  features: {
    text: string;
    included: boolean;
    tooltip?: string;
  }[];
  cta: string;
  ctaVariant?: 'default' | 'outline' | 'secondary';
}

export default function Pricing() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const tiers: PricingTier[] = [
    {
      name: 'Free',
      description: 'For students, hobbyists, and anyone learning to code',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        { text: '0.5 vCPU + 512 MB RAM', included: true },
        { text: '10 GiB storage', included: true },
        { text: '10 GiB egress/month', included: true },
        { text: 'Limited AI interactions', included: true },
        { text: 'Unlimited public projects', included: true },
        { text: 'Access to basic templates', included: true },
        { text: 'Community support', included: true },
        { text: 'Basic AI assistance', included: false },
        { text: 'Private projects', included: false },
        { text: 'Custom domains', included: false },
        { text: 'Always-on projects', included: false },
        { text: 'SSH access', included: false }
      ],
      cta: 'Sign up free',
      ctaVariant: 'outline'
    },
    {
      name: 'Core',
      description: 'For developers and creators who want more power',
      monthlyPrice: 25,
      yearlyPrice: 220,
      popular: true,
      features: [
        { text: 'AI Agent - Unlimited apps', included: true, tooltip: 'Build unlimited apps with our AI Agent' },
        { text: '2 vCPUs + 2 GiB RAM', included: true },
        { text: '50 GiB storage', included: true },
        { text: '100 GiB egress/month', included: true },
        { text: 'Unlimited private projects', included: true },
        { text: '5 always-on projects', included: true },
        { text: 'SSH access to projects', included: true },
        { text: 'Custom domains', included: true },
        { text: 'Priority support', included: true },
        { text: 'Advanced AI features', included: true },
        { text: 'Ghostwriter AI assistant', included: true },
        { text: 'Priority builds', included: true },
        { text: 'Dev tools (debugger, profiler)', included: true }
      ],
      cta: 'Get Core',
      ctaVariant: 'default'
    },
    {
      name: 'Teams',
      description: 'For teams collaborating on projects',
      monthlyPrice: 40,
      yearlyPrice: 400,
      features: [
        { text: 'Everything in Core', included: true },
        { text: '4 vCPUs + 4 GiB RAM per user', included: true },
        { text: '500 GiB shared storage', included: true },
        { text: '1 TiB egress/month', included: true },
        { text: 'Unlimited team members', included: true },
        { text: 'Centralized billing', included: true },
        { text: 'Team management dashboard', included: true },
        { text: 'Role-based permissions', included: true },
        { text: 'Shared projects & resources', included: true },
        { text: 'SSO/SAML authentication', included: true },
        { text: 'Priority support', included: true },
        { text: 'Advanced analytics', included: true }
      ],
      cta: 'Start with Teams',
      ctaVariant: 'default'
    },
    {
      name: 'Enterprise',
      description: 'For organizations with advanced needs',
      monthlyPrice: -1,
      yearlyPrice: -1,
      enterprise: true,
      features: [
        { text: 'Everything in Teams', included: true },
        { text: 'Custom AI model training', included: true },
        { text: 'Dedicated compute resources', included: true },
        { text: 'Unlimited storage', included: true },
        { text: 'VPC & private cloud options', included: true },
        { text: 'Air-gapped deployments', included: true },
        { text: 'SOC2 Type II compliance', included: true },
        { text: 'HIPAA compliance options', included: true },
        { text: '99.9% uptime SLA', included: true },
        { text: '24/7 phone support', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'Custom contracts & invoicing', included: true }
      ],
      cta: 'Contact Sales',
      ctaVariant: 'outline'
    }
  ];

  const handleSelectPlan = (tier: PricingTier) => {
    if (tier.enterprise) {
      navigate('/contact-sales');
    } else if (user) {
      navigate('/billing');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      {/* Pricing Header */}
      <section className="py-responsive">
        <div className="container-responsive max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="secondary" className="mb-2">
              <Sparkles className="h-3 w-3 mr-1" />
              Simple, transparent pricing
            </Badge>
            <h1 className="text-responsive-xl font-bold">
              Choose your plan
            </h1>
            <p className="text-responsive-lg text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as you grow. No hidden fees, no surprises.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 pt-8">
              <span className={billingPeriod === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}>
                Monthly
              </span>
              <Switch
                checked={billingPeriod === 'yearly'}
                onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
              />
              <span className={billingPeriod === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}>
                Yearly
                <Badge variant="secondary" className="ml-2">Save 12%</Badge>
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <Card 
                key={tier.name} 
                className={`relative ${tier.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="pt-4">
                    {tier.enterprise ? (
                      <div className="text-3xl font-bold">Custom</div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">
                          ${billingPeriod === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice}
                        </span>
                        <span className="text-muted-foreground">
                          /{billingPeriod === 'monthly' ? 'month' : 'year'}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${!feature.included ? 'text-muted-foreground' : ''}`}>
                          {feature.text}
                          {feature.tooltip && (
                            <Info className="inline h-3 w-3 ml-1 text-muted-foreground" />
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={tier.ctaVariant}
                    onClick={() => handleSelectPlan(tier)}
                  >
                    {tier.cta}
                    {!tier.enterprise && <ChevronRight className="h-4 w-4 ml-1" />}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Compare plans in detail
            </h2>
            <p className="text-lg text-muted-foreground">
              See everything included in each plan
            </p>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Features</th>
                    <th className="text-center p-4">Starter</th>
                    <th className="text-center p-4">
                      <div className="flex flex-col items-center">
                        <span>Hacker</span>
                        <Badge variant="secondary" className="mt-1">Popular</Badge>
                      </div>
                    </th>
                    <th className="text-center p-4">Pro</th>
                    <th className="text-center p-4">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Projects</td>
                    <td className="text-center p-4">3 private</td>
                    <td className="text-center p-4">Unlimited</td>
                    <td className="text-center p-4">Unlimited</td>
                    <td className="text-center p-4">Unlimited</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Storage</td>
                    <td className="text-center p-4">500MB</td>
                    <td className="text-center p-4">10GB</td>
                    <td className="text-center p-4">100GB</td>
                    <td className="text-center p-4">Unlimited</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Compute</td>
                    <td className="text-center p-4">0.5 vCPU</td>
                    <td className="text-center p-4">2 vCPU</td>
                    <td className="text-center p-4">4 vCPU</td>
                    <td className="text-center p-4">Custom</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Team Members</td>
                    <td className="text-center p-4">1</td>
                    <td className="text-center p-4">5</td>
                    <td className="text-center p-4">Unlimited</td>
                    <td className="text-center p-4">Unlimited</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Support</td>
                    <td className="text-center p-4">Community</td>
                    <td className="text-center p-4">Email</td>
                    <td className="text-center p-4">Priority</td>
                    <td className="text-center p-4">24/7 Phone</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* Resource Comparison */}
      <section className="py-20 bg-muted/50">
        <div className="container-responsive max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Compare resources</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4">Feature</th>
                  <th className="text-center py-4 px-4">Free</th>
                  <th className="text-center py-4 px-4">
                    <span className="text-primary font-semibold">Core</span>
                  </th>
                  <th className="text-center py-4 px-4">Teams</th>
                  <th className="text-center py-4 px-4">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-4 px-4 font-medium">vCPU</td>
                  <td className="text-center py-4 px-4">0.5</td>
                  <td className="text-center py-4 px-4 text-primary font-semibold">2</td>
                  <td className="text-center py-4 px-4">4 per user</td>
                  <td className="text-center py-4 px-4">Custom</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4 font-medium">RAM</td>
                  <td className="text-center py-4 px-4">512 MB</td>
                  <td className="text-center py-4 px-4 text-primary font-semibold">2 GiB</td>
                  <td className="text-center py-4 px-4">4 GiB per user</td>
                  <td className="text-center py-4 px-4">Custom</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4 font-medium">Storage</td>
                  <td className="text-center py-4 px-4">10 GiB</td>
                  <td className="text-center py-4 px-4 text-primary font-semibold">50 GiB</td>
                  <td className="text-center py-4 px-4">500 GiB shared</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4 font-medium">Bandwidth</td>
                  <td className="text-center py-4 px-4">10 GiB/month</td>
                  <td className="text-center py-4 px-4 text-primary font-semibold">100 GiB/month</td>
                  <td className="text-center py-4 px-4">1 TiB/month</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4 font-medium">Always-on projects</td>
                  <td className="text-center py-4 px-4">-</td>
                  <td className="text-center py-4 px-4 text-primary font-semibold">5</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4 font-medium">Private projects</td>
                  <td className="text-center py-4 px-4">-</td>
                  <td className="text-center py-4 px-4 text-primary font-semibold">Unlimited</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4 font-medium">AI interactions</td>
                  <td className="text-center py-4 px-4">Limited</td>
                  <td className="text-center py-4 px-4 text-primary font-semibold">Unlimited</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                  <td className="text-center py-4 px-4">Custom limits</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4 font-medium">Support</td>
                  <td className="text-center py-4 px-4">Community</td>
                  <td className="text-center py-4 px-4 text-primary font-semibold">Priority email</td>
                  <td className="text-center py-4 px-4">Priority email + chat</td>
                  <td className="text-center py-4 px-4">24/7 phone + dedicated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Frequently asked questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about our pricing
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans later?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                  and we'll prorate the difference.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We accept all major credit cards (Visa, Mastercard, American Express), 
                  as well as PayPal and bank transfers for Enterprise customers.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is there a free trial?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our Starter plan is free forever! For paid plans, we offer a 14-day money-back guarantee.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens if I exceed my limits?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We'll notify you when you're approaching your limits. You can upgrade anytime, 
                  or we can discuss custom solutions for your needs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of developers building with E-Code
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
            >
              Start building for free
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate('/contact-sales')}
            >
              Talk to sales
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}