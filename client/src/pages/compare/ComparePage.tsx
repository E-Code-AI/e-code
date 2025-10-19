// @ts-nocheck
import { useRoute } from 'wouter';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShieldCheck, Clock3, ServerCog, Sparkles } from 'lucide-react';

const comparisonContent: Record<string, {
  heroTitle: string;
  description: string;
  highlights: string[];
  differentiators: Array<{ title: string; description: string }>;
}> = {
  'github-codespaces': {
    heroTitle: 'E-Code vs GitHub Codespaces',
    description: 'Ship faster with AI-native automation, real-time collaboration, and enterprise controls that go beyond hosted containers.',
    highlights: ['AI agents that build full-stack apps end-to-end', 'Dedicated enterprise regions and private networking', 'Native mobile & desktop apps for on-the-go productivity'],
    differentiators: [
      { title: 'AI-first workflow', description: 'Agents write, review, test, and deploy code with policy guardrails baked in.' },
      { title: 'Enterprise-grade governance', description: 'Granular RBAC, audit trails, and compliance packs for SOC2, HIPAA, and GDPR.' },
      { title: 'Unified experience', description: 'Consistent IDE across browser, mobile, and desktop with multiplayer collaboration.' },
    ],
  },
  glitch: {
    heroTitle: 'E-Code vs Glitch',
    description: 'Go beyond prototyping to production with scalable infrastructure, integrated databases, and secure deployments.',
    highlights: ['Persistent production environments', 'Integrated observability and analytics', 'Custom domains with managed SSL'],
    differentiators: [
      { title: 'Production ready', description: 'Provision multi-region infrastructure with zero downtime deploys.' },
      { title: 'Secure by design', description: 'Role-based access, secrets management, and network isolation included.' },
      { title: 'Data services', description: 'Managed Postgres, object storage, and queue services ready out of the box.' },
    ],
  },
  heroku: {
    heroTitle: 'E-Code vs Heroku',
    description: 'Combine AI-assisted development with enterprise deployment automation on a unified platform.',
    highlights: ['Full-stack IDE with AI pair programming', 'Policy-driven deployments and rollbacks', 'Integrated monitoring & incident response'],
    differentiators: [
      { title: 'All-in-one workspace', description: 'Develop, test, and ship without context switching between local and remote tools.' },
      { title: 'AI automation', description: 'Automated scaffolding, migrations, and security reviews accelerate delivery.' },
      { title: 'Scalable architecture', description: 'Deploy to global edge regions with auto-scaling and private networking.' },
    ],
  },
  codesandbox: {
    heroTitle: 'E-Code vs CodeSandbox',
    description: 'Level up collaborative development with enterprise compliance, AI agents, and production-ready deployments.',
    highlights: ['Real-time multiplayer with voice rooms', 'AI code reviews & auto-resolves', 'SAML SSO, audit logs, and data residency'],
    differentiators: [
      { title: 'Enterprise collaboration', description: 'Shared environments, project analytics, and workspace templates built for scale.' },
      { title: 'Governed AI', description: 'Compliance-ready AI assistance with approvals, policy guardrails, and reporting.' },
      { title: 'Deployment freedom', description: 'Deploy to the E-Code edge or your own VPC with the same workflow.' },
    ],
  },
  'aws-cloud9': {
    heroTitle: 'E-Code vs AWS Cloud9',
    description: 'Modernize development with AI automation, zero-maintenance workspaces, and enterprise-class observability.',
    highlights: ['Zero-maintenance environments', 'Integrated CI/CD and incident response', 'Secure collaboration with workspace isolation'],
    differentiators: [
      { title: 'AI co-pilots', description: 'Agents manage environment setup, package updates, and dependency security patches.' },
      { title: 'Observability suite', description: 'Centralized logs, metrics, and alerts integrated with Slack and PagerDuty.' },
      { title: 'Enterprise operations', description: 'Automated backups, disaster recovery, and compliance reporting included.' },
    ],
  },
};

export default function ComparePage() {
  const [, params] = useRoute('/compare/:slug');
  const slug = params?.slug ?? 'github-codespaces';
  const content = comparisonContent[slug] ?? comparisonContent['github-codespaces'];

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden py-16">
        <div className="container-responsive max-w-5xl text-center">
          <Badge className="mx-auto mb-4 bg-white/10 text-white border-white/20">Platform comparison</Badge>
          <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">{content.heroTitle}</h1>
          <p className="mt-4 text-base sm:text-lg text-slate-200 max-w-3xl mx-auto">{content.description}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 text-left">
            {content.highlights.map((highlight) => (
              <div key={highlight} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-300" />
                <p className="text-sm text-slate-200 leading-relaxed">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-responsive max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {content.differentiators.map((item) => (
            <Card key={item.title} className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-lg text-white">{item.title}</CardTitle>
                <CardDescription className="text-slate-300 leading-relaxed">{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="container-responsive max-w-5xl">
          <Card className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-white/10">
            <CardContent className="grid gap-6 py-10 text-center sm:text-left sm:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold text-white">Why enterprises choose E-Code</h2>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-start gap-2"><ShieldCheck className="mt-1 h-4 w-4 text-emerald-300" /> Dedicated private cloud, SOC2 Type II, HIPAA, and GDPR compliance.</li>
                  <li className="flex items-start gap-2"><Clock3 className="mt-1 h-4 w-4 text-sky-300" /> Accelerated delivery with AI agents, reusable blueprints, and automated QA.</li>
                  <li className="flex items-start gap-2"><ServerCog className="mt-1 h-4 w-4 text-indigo-300" /> Global infrastructure footprint with advanced observability.</li>
                  <li className="flex items-start gap-2"><Sparkles className="mt-1 h-4 w-4 text-purple-300" /> Continuous innovation with a unified experience across devices.</li>
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <Button className="bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white" onClick={() => (window.location.href = '/contact-sales')}>
                  Book a personalized demo
                </Button>
                <Button variant="outline" className="border-white/20 text-slate-100 hover:text-white" onClick={() => (window.location.href = '/pricing')}>
                  View pricing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
