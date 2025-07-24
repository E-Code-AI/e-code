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
      name: 'Starter',
      description: 'Perfect for learning and personal projects',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        { text: 'Unlimited public projects', included: true },
        { text: '3 private projects', included: true },
        { text: '500MB storage', included: true },
        { text: 'Basic compute (0.5 vCPU, 512MB RAM)', included: true },
        { text: 'Community support', included: true },
        { text: 'SSL certificates', included: true },
        { text: 'Custom domains', included: false },
        { text: 'Team collaboration', included: false },
        { text: 'Priority support', included: false },
        { text: 'Advanced deployments', included: false }
      ],
      cta: 'Start free',
      ctaVariant: 'outline'
    },
    {
      name: 'Hacker',
      description: 'For developers who want more power',
      monthlyPrice: 7,
      yearlyPrice: 70,
      popular: true,
      features: [
        { text: 'Everything in Starter', included: true },
        { text: 'Unlimited private projects', included: true },
        { text: '10GB storage', included: true },
        { text: 'Better compute (2 vCPU, 2GB RAM)', included: true },
        { text: 'Custom domains', included: true },
        { text: '5 team members', included: true },
        { text: 'Private deployments', included: true },
        { text: 'Email support', included: true },
        { text: 'SSH access', included: true },
        { text: 'Dedicated support', included: false }
      ],
      cta: 'Get Hacker',
      ctaVariant: 'default'
    },
    {
      name: 'Pro',
      description: 'For professional developers and teams',
      monthlyPrice: 25,
      yearlyPrice: 250,
      features: [
        { text: 'Everything in Hacker', included: true },
        { text: '100GB storage', included: true },
        { text: 'Premium compute (4 vCPU, 8GB RAM)', included: true },
        { text: 'Unlimited team members', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'Priority support', included: true },
        { text: 'SLA guarantee', included: true },
        { text: 'Advanced security features', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'Dedicated account manager', included: false }
      ],
      cta: 'Go Pro',
      ctaVariant: 'default'
    },
    {
      name: 'Enterprise',
      description: 'Custom solutions for large organizations',
      monthlyPrice: -1,
      yearlyPrice: -1,
      enterprise: true,
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Unlimited storage', included: true },
        { text: 'Custom compute resources', included: true },
        { text: 'Enterprise SSO', included: true },
        { text: 'Advanced compliance (SOC2, HIPAA)', included: true },
        { text: 'Dedicated infrastructure', included: true },
        { text: '24/7 phone support', included: true },
        { text: 'Custom SLA', included: true },
        { text: 'On-premise deployment option', included: true },
        { text: 'Dedicated success team', included: true }
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
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/')}
              >
                <Code className="h-6 w-6" />
                <span className="font-bold text-xl">Replit</span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <Button variant="ghost" size="sm" onClick={() => navigate('/features')}>
                  Features
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
                  Pricing
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/templates')}>
                  Templates
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/docs')}>
                  Docs
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Log in
              </Button>
              <Button onClick={() => navigate(user ? '/dashboard' : '/auth')}>
                {user ? 'Dashboard' : 'Sign up'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Pricing Header */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="secondary" className="mb-2">
              <Sparkles className="h-3 w-3 mr-1" />
              Simple, transparent pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold">
              Choose your plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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
                <Badge variant="secondary" className="ml-2">Save 20%</Badge>
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
            Join thousands of developers building with Replit
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

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Replit Clone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}