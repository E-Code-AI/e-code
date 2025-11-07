import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Users, Workflow, Lock, Cpu, Rocket } from 'lucide-react';

const capabilities = [
  {
    icon: ShieldCheck,
    title: 'Enterprise-grade security',
    description: 'SOC2 Type II controls, granular RBAC, and private networking for regulated workloads.',
  },
  {
    icon: Users,
    title: 'Team-aware automation',
    description: 'Contextual agents that understand org structures, permissions, and project history.',
  },
  {
    icon: Workflow,
    title: 'Workflow orchestration',
    description: 'Trigger complex build, review, and deployment sequences tailored to your SDLC.',
  },
  {
    icon: Lock,
    title: 'Policy guardrails',
    description: 'Ensure every action respects security policies with real-time observability and approvals.',
  },
  {
    icon: Cpu,
    title: 'Model flexibility',
    description: 'Bring your own models or leverage E-Code tuned models with governance baked in.',
  },
  {
    icon: Rocket,
    title: 'Faster delivery',
    description: 'Reduce cycle times with reusable templates, automation kits, and instant deployments.',
  },
];

export default function InternalAIBuilder() {
  return (
    <MarketingLayout>
      <section className="relative overflow-hidden py-16">
        <div className="container-responsive max-w-5xl text-center">
          <Badge className="mx-auto mb-6 bg-white/10 text-white border-white/20">Internal AI Builder</Badge>
          <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">
            Private AI agents for every team
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-200">
            Deploy governed AI agents that work across engineering, design, and operations—without compromising compliance or control.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button className="bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white" onClick={() => (window.location.href = '/contact-sales')}>
              Talk to an enterprise specialist
            </Button>
            <Button variant="outline" className="border-white/20 text-slate-100 hover:text-white" onClick={() => (window.location.href = '/pricing')}>
              View pricing options
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-responsive max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <Card key={capability.title} className="bg-white/5 border-white/10">
              <CardHeader className="space-y-4">
                <div className="inline-flex rounded-full bg-white/10 p-3 text-sky-200">
                  <capability.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg text-white">{capability.title}</CardTitle>
                <CardDescription className="text-slate-300 leading-relaxed">{capability.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="container-responsive max-w-5xl">
          <Card className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-white/10">
            <CardContent className="grid gap-8 py-12 text-center sm:text-left sm:grid-cols-[1.5fr_1fr]">
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold text-white">Launch an internal AI center of excellence</h2>
                <p className="text-slate-300">
                  E-Code provides playbooks, governance frameworks, and dedicated solution architects to help you operationalize AI responsibly across your organization.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button className="bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white" onClick={() => (window.location.href = '/contact-sales')}>
                  Schedule an executive briefing
                </Button>
                <Button variant="outline" className="border-white/20 text-slate-100 hover:text-white" onClick={() => (window.location.href = '/docs')}>
                  Explore documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
