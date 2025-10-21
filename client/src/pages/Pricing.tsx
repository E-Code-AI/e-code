// @ts-nocheck
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  Check, X, Zap, Users, Shield, Rocket, Star, Info,
  Code, Terminal, Globe, Database, Lock, Package,
  ChevronRight, Sparkles, Building2, Crown, TrendingUp,
  ArrowRight, Server, Cloud, Cpu, HardDrive, Gauge,
  Shield, Phone, MessageSquare, Mail, Headphones,
  CreditCard, Award, BarChart3, Users2, Briefcase,
  Brain, Layers, GitBranch, Timer, Infinity, CheckCircle2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

// Import stock images for background
import cloudComputingImg from '@assets/stock_images/cloud_computing_tech_ffd053c9.jpg';

interface PricingTier {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular?: boolean;
  enterprise?: boolean;
  icon: React.ReactNode;
  gradient: string;
  features: {
    text: string;
    included: boolean;
    tooltip?: string;
    highlight?: boolean;
  }[];
  cta: string;
  ctaVariant?: 'default' | 'outline' | 'secondary';
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Pricing() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const tiers: PricingTier[] = [
    {
      name: 'Starter',
      description: 'Perfect for learning and personal projects',
      monthlyPrice: 0,
      yearlyPrice: 0,
      icon: <Rocket className="h-6 w-6" />,
      gradient: 'from-gray-600 to-gray-700',
      features: [
        { text: '1 vCPU + 1 GB RAM', included: true },
        { text: '10 GB storage', included: true },
        { text: '50 GB bandwidth/month', included: true },
        { text: '5 Active projects', included: true },
        { text: 'Public projects only', included: true },
        { text: 'Community support', included: true },
        { text: 'Basic templates', included: true },
        { text: 'GitHub integration', included: true },
        { text: 'SSL certificates', included: true },
        { text: 'AI assistance (100 requests/month)', included: true },
        { text: 'Private projects', included: false },
        { text: 'Custom domains', included: false },
        { text: 'Team collaboration', included: false },
        { text: 'Priority support', included: false },
        { text: 'Advanced AI features', included: false }
      ],
      cta: 'Start Free',
      ctaVariant: 'outline'
    },
    {
      name: 'Professional',
      description: 'For professional developers and small teams',
      monthlyPrice: 29,
      yearlyPrice: 25,
      popular: true,
      icon: <Star className="h-6 w-6" />,
      gradient: 'from-violet-600 to-fuchsia-600',
      features: [
        { text: '4 vCPUs + 8 GB RAM', included: true, highlight: true },
        { text: '100 GB SSD storage', included: true, highlight: true },
        { text: '1 TB bandwidth/month', included: true },
        { text: 'Unlimited projects', included: true, highlight: true },
        { text: 'Private & public projects', included: true },
        { text: 'Priority email support', included: true },
        { text: 'All premium templates', included: true },
        { text: 'Custom domains (5 included)', included: true, highlight: true },
        { text: 'Team collaboration (5 members)', included: true },
        { text: 'AI Agent - Unlimited apps', included: true, highlight: true, tooltip: 'Build unlimited apps with our AI Agent' },
        { text: 'Advanced AI code completion', included: true },
        { text: 'Automated deployments', included: true },
        { text: 'Database hosting', included: true },
        { text: 'Edge deployment', included: true },
        { text: 'Analytics dashboard', included: true }
      ],
      cta: 'Start Pro Trial',
      ctaVariant: 'default'
    },
    {
      name: 'Business',
      description: 'For growing teams and businesses',
      monthlyPrice: 99,
      yearlyPrice: 89,
      icon: <Briefcase className="h-6 w-6" />,
      gradient: 'from-blue-600 to-cyan-600',
      features: [
        { text: '8 vCPUs + 16 GB RAM per seat', included: true, highlight: true },
        { text: '500 GB SSD storage', included: true },
        { text: 'Unlimited bandwidth', included: true, highlight: true },
        { text: 'Unlimited everything', included: true, highlight: true },
        { text: 'Team collaboration (50 members)', included: true },
        { text: 'Priority support + SLA', included: true, highlight: true },
        { text: 'Custom domain (unlimited)', included: true },
        { text: 'Advanced security features', included: true },
        { text: 'SSO/SAML authentication', included: true, highlight: true },
        { text: 'Role-based access control', included: true },
        { text: 'Private cloud deployment', included: true },
        { text: 'Dedicated resources', included: true },
        { text: 'Custom AI model training', included: true, highlight: true },
        { text: 'White-label options', included: true },
        { text: 'API access', included: true }
      ],
      cta: 'Contact Sales',
      ctaVariant: 'default'
    },
    {
      name: 'Enterprise',
      description: 'Custom solutions for large organizations',
      monthlyPrice: -1,
      yearlyPrice: -1,
      enterprise: true,
      icon: <Building2 className="h-6 w-6" />,
      gradient: 'from-gray-800 to-gray-900',
      features: [
        { text: 'Custom infrastructure', included: true, highlight: true },
        { text: 'Unlimited everything', included: true },
        { text: 'Dedicated account team', included: true, highlight: true },
        { text: '24/7 phone support', included: true, highlight: true },
        { text: 'Air-gapped deployment', included: true },
        { text: 'SOC 2 Type II certified', included: true, highlight: true },
        { text: 'HIPAA compliance', included: true },
        { text: 'Custom SLA (99.99% uptime)', included: true, highlight: true },
        { text: 'On-premise deployment', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'Audit logs & compliance', included: true },
        { text: 'Advanced threat protection', included: true },
        { text: 'Custom billing & invoicing', included: true },
        { text: 'Professional services', included: true },
        { text: 'Training & onboarding', included: true }
      ],
      cta: 'Get Quote',
      ctaVariant: 'outline'
    }
  ];

  const comparisonFeatures = [
    { category: 'Infrastructure', features: [
      { name: 'CPU cores', starter: '1 vCPU', pro: '4 vCPUs', business: '8 vCPUs', enterprise: 'Custom' },
      { name: 'Memory', starter: '1 GB', pro: '8 GB', business: '16 GB', enterprise: 'Custom' },
      { name: 'Storage', starter: '10 GB', pro: '100 GB', business: '500 GB', enterprise: 'Unlimited' },
      { name: 'Bandwidth', starter: '50 GB', pro: '1 TB', business: 'Unlimited', enterprise: 'Unlimited' }
    ]},
    { category: 'Development', features: [
      { name: 'Projects', starter: '5 active', pro: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Private repos', starter: <X className="h-4 w-4 text-gray-400" />, pro: <Check className="h-4 w-4 text-green-500" />, business: <Check className="h-4 w-4 text-green-500" />, enterprise: <Check className="h-4 w-4 text-green-500" /> },
      { name: 'Custom domains', starter: <X className="h-4 w-4 text-gray-400" />, pro: '5', business: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'SSL certificates', starter: <Check className="h-4 w-4 text-green-500" />, pro: <Check className="h-4 w-4 text-green-500" />, business: <Check className="h-4 w-4 text-green-500" />, enterprise: <Check className="h-4 w-4 text-green-500" /> }
    ]},
    { category: 'AI Features', features: [
      { name: 'AI requests/month', starter: '100', pro: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Code completion', starter: 'Basic', pro: 'Advanced', business: 'Advanced', enterprise: 'Custom models' },
      { name: 'AI Agent apps', starter: <X className="h-4 w-4 text-gray-400" />, pro: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Custom AI training', starter: <X className="h-4 w-4 text-gray-400" />, pro: <X className="h-4 w-4 text-gray-400" />, business: <Check className="h-4 w-4 text-green-500" />, enterprise: <Check className="h-4 w-4 text-green-500" /> }
    ]},
    { category: 'Support', features: [
      { name: 'Support channels', starter: 'Community', pro: 'Email', business: 'Priority + Chat', enterprise: '24/7 Phone' },
      { name: 'Response time', starter: 'Best effort', pro: '24 hours', business: '4 hours', enterprise: '1 hour' },
      { name: 'Dedicated manager', starter: <X className="h-4 w-4 text-gray-400" />, pro: <X className="h-4 w-4 text-gray-400" />, business: <X className="h-4 w-4 text-gray-400" />, enterprise: <Check className="h-4 w-4 text-green-500" /> },
      { name: 'SLA', starter: <X className="h-4 w-4 text-gray-400" />, pro: <X className="h-4 w-4 text-gray-400" />, business: '99.9%', enterprise: '99.99%' }
    ]}
  ];

  const handleSelectPlan = (tier: PricingTier) => {
    if (tier.enterprise) {
      navigate('/contact-sales');
    } else if (user) {
      navigate('/subscribe');
    } else {
      navigate('/auth');
    }
  };

  const calculateSavings = (monthlyPrice: number, yearlyPrice: number) => {
    if (monthlyPrice <= 0) return 0;
    return Math.round(((monthlyPrice - yearlyPrice) / monthlyPrice) * 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-gray-50 dark:to-gray-900/50">
      <PublicNavbar />

      {/* Hero Section with Background */}
      <motion.section 
        className="relative py-20 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={cloudComputingImg} 
            alt="Cloud Computing"
            className="w-full h-full object-cover opacity-5 dark:opacity-3"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
        </div>

        <div className="container-responsive relative z-10 max-w-7xl">
          <motion.div 
            className="text-center space-y-6 mb-16"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeInUp}>
              <Badge 
                variant="secondary" 
                className="mb-4 px-6 py-2 text-sm font-semibold bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 border-violet-600/20"
              >
                <Sparkles className="h-4 w-4 mr-2 text-violet-600" />
                Save up to 20% with annual billing
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-5xl sm:text-6xl lg:text-7xl font-bold"
              variants={fadeInUp}
            >
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Pricing that scales
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                with your growth
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
              variants={fadeInUp}
            >
              Start free and upgrade as you grow. No hidden fees, no surprises. 
              Enterprise-grade features at startup-friendly prices.
            </motion.p>

            {/* Billing Toggle with Animation */}
            <motion.div 
              className="flex items-center justify-center gap-4 pt-8"
              variants={fadeInUp}
            >
              <span className={`text-lg font-medium transition-colors ${billingPeriod === 'monthly' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                Monthly
              </span>
              <Switch
                checked={billingPeriod === 'yearly'}
                onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
                className="scale-125"
              />
              <span className={`text-lg font-medium transition-colors ${billingPeriod === 'yearly' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                Yearly
                <Badge className="ml-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0">
                  Save 20%
                </Badge>
              </span>
            </motion.div>
          </motion.div>

          {/* Pricing Cards with Glassmorphism */}
          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <AnimatePresence mode="wait">
              {tiers.map((tier, index) => (
                <motion.div
                  key={tier.name}
                  variants={fadeInUp}
                  whileHover={{ scale: 1.02, y: -5 }}
                  onHoverStart={() => setHoveredCard(tier.name)}
                  onHoverEnd={() => setHoveredCard(null)}
                  className="relative"
                >
                  {/* Popular Badge */}
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="px-4 py-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-0 shadow-lg">
                        <Star className="h-3 w-3 mr-1 fill-white" />
                        MOST POPULAR
                      </Badge>
                    </div>
                  )}

                  {/* Card with Glassmorphism */}
                  <Card className={`
                    h-full relative overflow-hidden transition-all duration-300
                    ${tier.popular ? 'border-2 border-violet-600/50 shadow-2xl' : 'border-gray-200 dark:border-gray-800'}
                    ${hoveredCard === tier.name ? 'shadow-2xl' : 'shadow-lg'}
                    backdrop-blur-sm bg-white/80 dark:bg-gray-900/80
                  `}>
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-5`} />
                    
                    <CardHeader className="relative z-10 pb-6">
                      {/* Icon with gradient background */}
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tier.gradient} p-3 mb-4 text-white`}>
                        {tier.icon}
                      </div>
                      
                      <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                      <CardDescription className="text-base mt-2">{tier.description}</CardDescription>
                      
                      {/* Price */}
                      <div className="pt-6">
                        {tier.enterprise ? (
                          <div>
                            <div className="text-4xl font-bold">Custom</div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Contact for pricing</p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-bold">
                                ${billingPeriod === 'monthly' ? tier.monthlyPrice : tier.yearlyPrice}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400">
                                /month
                              </span>
                            </div>
                            {billingPeriod === 'yearly' && tier.monthlyPrice > 0 && (
                              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                Save ${(tier.monthlyPrice - tier.yearlyPrice) * 12}/year
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="relative z-10 space-y-4">
                      {/* CTA Button */}
                      <Button 
                        className={`w-full h-12 text-base font-semibold transition-all duration-200 ${
                          tier.popular 
                            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg' 
                            : ''
                        }`}
                        variant={tier.popular ? 'default' : tier.ctaVariant}
                        onClick={() => handleSelectPlan(tier)}
                      >
                        {tier.cta}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      
                      {/* Features List */}
                      <div className="pt-4 border-t">
                        <ul className="space-y-3">
                          {tier.features.slice(0, 10).map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              {feature.included ? (
                                <div className={`mt-0.5 ${feature.highlight ? 'text-violet-600 dark:text-violet-400' : 'text-green-600 dark:text-green-400'}`}>
                                  <CheckCircle2 className="h-5 w-5" />
                                </div>
                              ) : (
                                <X className="h-5 w-5 text-gray-300 dark:text-gray-600 mt-0.5" />
                              )}
                              <span className={`text-sm ${
                                !feature.included ? 'text-gray-400 dark:text-gray-600 line-through' : 
                                feature.highlight ? 'font-semibold text-gray-900 dark:text-white' : 
                                'text-gray-700 dark:text-gray-300'
                              }`}>
                                {feature.text}
                                {feature.tooltip && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="inline h-3 w-3 ml-1 text-gray-400" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{feature.tooltip}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                        
                        {tier.features.length > 10 && (
                          <button className="text-sm text-violet-600 dark:text-violet-400 font-medium mt-4 hover:underline">
                            + {tier.features.length - 10} more features
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.section>

      {/* Detailed Comparison Table */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="container-responsive max-w-7xl">
          <motion.div 
            className="text-center mb-12"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="text-4xl font-bold mb-4"
              variants={fadeInUp}
            >
              Compare plans in detail
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 dark:text-gray-400"
              variants={fadeInUp}
            >
              Every feature, every detail, side by side
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden backdrop-blur-sm bg-white/90 dark:bg-gray-900/90">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left p-6 font-semibold text-gray-900 dark:text-white">Features</th>
                      <th className="text-center p-6 min-w-[150px]">
                        <div className="font-semibold text-gray-900 dark:text-white">Starter</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Free forever</div>
                      </th>
                      <th className="text-center p-6 min-w-[150px]">
                        <div className="font-semibold text-violet-600 dark:text-violet-400">Professional</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Most popular</div>
                      </th>
                      <th className="text-center p-6 min-w-[150px]">
                        <div className="font-semibold text-gray-900 dark:text-white">Business</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">For teams</div>
                      </th>
                      <th className="text-center p-6 min-w-[150px]">
                        <div className="font-semibold text-gray-900 dark:text-white">Enterprise</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Custom</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((category, categoryIdx) => (
                      <React.Fragment key={categoryIdx}>
                        <tr className="bg-gray-50 dark:bg-gray-800/30">
                          <td colSpan={5} className="px-6 py-3">
                            <div className="font-semibold text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                              {category.category}
                            </div>
                          </td>
                        </tr>
                        {category.features.map((feature, featureIdx) => (
                          <tr key={featureIdx} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors">
                            <td className="p-6 font-medium text-gray-700 dark:text-gray-300">{feature.name}</td>
                            <td className="text-center p-6 text-gray-600 dark:text-gray-400">{feature.starter}</td>
                            <td className="text-center p-6 text-violet-600 dark:text-violet-400 font-medium">{feature.pro}</td>
                            <td className="text-center p-6 text-gray-900 dark:text-white font-medium">{feature.business}</td>
                            <td className="text-center p-6 text-gray-900 dark:text-white font-medium">{feature.enterprise}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Enterprise Section */}
      <section className="py-20 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="container-responsive max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <Badge className="bg-white/10 text-white border-white/20">
                <Building2 className="h-4 w-4 mr-2" />
                Enterprise Solutions
              </Badge>
              <h2 className="text-4xl sm:text-5xl font-bold">
                Built for the world's most demanding teams
              </h2>
              <p className="text-xl opacity-90">
                Get dedicated infrastructure, advanced security, and custom SLAs. 
                Our enterprise plan scales with organizations of any size.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-green-400" />
                  <span>SOC 2 Type II Certified</span>
                </div>
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-green-400" />
                  <span>HIPAA Compliant</span>
                </div>
                <div className="flex items-center gap-3">
                  <Gauge className="h-5 w-5 text-green-400" />
                  <span>99.99% Uptime SLA</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-green-400" />
                  <span>24/7 Phone Support</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100"
                  onClick={() => navigate('/contact-sales')}
                >
                  Contact Sales
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                  onClick={() => navigate('/docs/enterprise')}
                >
                  Learn More
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Enterprise includes:</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {[
                      'Custom infrastructure sizing',
                      'Dedicated account manager',
                      'Professional services & training',
                      'Custom integrations',
                      'Air-gapped deployment options',
                      'Advanced audit logging',
                      'Priority feature requests',
                      'Custom billing & contracts'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-white/90">
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container-responsive max-w-4xl">
          <motion.div 
            className="text-center mb-12"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="text-4xl font-bold mb-4"
              variants={fadeInUp}
            >
              Frequently asked questions
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 dark:text-gray-400"
              variants={fadeInUp}
            >
              Got questions? We've got answers
            </motion.p>
          </motion.div>

          <motion.div 
            className="space-y-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              {
                question: "Can I switch plans anytime?",
                answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate the difference. No lock-in contracts, ever."
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, and ACH bank transfers for annual plans. Enterprise customers can pay via invoice."
              },
              {
                question: "Is there a free trial for paid plans?",
                answer: "Yes! All paid plans come with a 14-day free trial. No credit card required. You can also start with our free Starter plan and upgrade anytime."
              },
              {
                question: "How does the AI Agent work?",
                answer: "Our AI Agent understands natural language descriptions and builds complete, production-ready applications. It handles all the code, setup, and deployment automatically. Available on Professional plans and above."
              },
              {
                question: "What happens if I exceed my limits?",
                answer: "We'll notify you when you're approaching 80% of your limits. You can upgrade anytime, or we can discuss custom solutions. We never shut down your services unexpectedly."
              },
              {
                question: "Do you offer discounts for students or nonprofits?",
                answer: "Yes! We offer 50% discounts for verified students and registered nonprofits. Contact our support team with proof of eligibility to get started."
              }
            ].map((faq, idx) => (
              <motion.div key={idx} variants={fadeInUp}>
                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400">
                      {faq.answer}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-violet-600 to-fuchsia-600">
        <div className="container-responsive max-w-4xl text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white">
              Start building for free today
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Join over 2 million developers who are shipping faster with E-Code. 
              No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                size="lg"
                className="bg-white text-violet-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold shadow-lg"
                onClick={() => navigate(user ? '/dashboard' : '/register')}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Start Free Trial
              </Button>
              <Button 
                size="lg"
                variant="ghost"
                className="text-white border-2 border-white/30 hover:bg-white/10 px-8 py-6 text-lg"
                onClick={() => navigate('/demo')}
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}