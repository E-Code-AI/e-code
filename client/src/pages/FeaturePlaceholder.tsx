import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ShieldCheck, Clock3 } from 'lucide-react';

const featureCopy: Record<string, {
  title: string;
  subtitle: string;
  summary: string;
  highlights: string[];
}> = {
  assistant: {
    title: 'AI Assistant',
    subtitle: 'Conversational development copilot',
    summary: 'Ask questions about your codebase, auto-generate documentation, and unblock your teams with contextual intelligence.',
    highlights: ['Understands your repository, tests, and deployments', 'Enterprise controls with audit trails and policy guardrails', 'Available across web, mobile, and desktop apps'],
  },
  database: {
    title: 'Managed Database Studio',
    subtitle: 'Command the data layer with zero friction',
    summary: 'Provision, manage, and observe your databases with AI-assisted migrations, schema visualizations, and performance insights.',
    highlights: ['AI-assisted migration planning', 'Automated backups and failover', 'Integrated query insights and alerts'],
  },
  console: {
    title: 'Command Console',
    subtitle: 'Secure shell, logs, and observability in one place',
    summary: 'Gain instant access to runtime logs, shell access, and metrics dashboards through a unified console experience.',
    highlights: ['Role-based access for operations teams', 'Full audit history of shell sessions', 'Deep links into traces and deployments'],
  },
  authentication: {
    title: 'Authentication Hub',
    subtitle: 'Streamlined auth experiences for every app',
    summary: 'Integrate SSO, passwordless login, and social sign-on with built-in compliance controls.',
    highlights: ['Supports SAML, OIDC, and passwordless flows', 'Centralized policy management and analytics', 'Fully branded experiences and user lifecycle automations'],
  },
  preview: {
    title: 'Preview Environments',
    subtitle: 'On-demand environments for every change',
    summary: 'Spin up secure preview environments with generated fixtures, QA checklists, and collaboration tools.',
    highlights: ['Automatic URL for every pull request', 'AI generated test plans and review summaries', 'Usage analytics and tear-down scheduling'],
  },
  agent: {
    title: 'Agent Control Center',
    subtitle: 'Manage, govern, and monitor your AI agents',
    summary: 'Operationalize AI in production with real-time observability, approval workflows, and safety checks.',
    highlights: ['Fine-grained permissions and scopes', 'Live session replay and analytics', 'Policy and compliance automation'],
  },
  'code-search': {
    title: 'Code Search',
    subtitle: 'Semantic search across every repository',
    summary: 'Discover patterns, anti-patterns, and reusable components with AI-powered insights across your codebase.',
    highlights: ['Natural language queries with vector search', 'Compliance and license filters', 'Cross-language understanding'],
  },
  packages: {
    title: 'Package Intelligence',
    subtitle: 'Safe dependencies at enterprise scale',
    summary: 'Audit vulnerabilities, licenses, and supply-chain risks with automated remediation workflows.',
    highlights: ['Continuous CVE monitoring and auto-patches', 'Policy-driven approvals', 'SBOM exports and compliance reports'],
  },
  extensions: {
    title: 'Extensions Marketplace',
    subtitle: 'Curate private integrations and workflows',
    summary: 'Bring your toolchain directly into the workspace with vetted, secure extensions tailored to your teams.',
    highlights: ['Private marketplace support', 'Role and permission aware extensions', 'Lifecycle management and analytics'],
  },
  integrations: {
    title: 'Integration Hub',
    subtitle: 'Connect your ecosystem in minutes',
    summary: 'Prebuilt connectors for CI/CD, observability, support, and data services with centralized governance.',
    highlights: ['200+ enterprise integrations', 'Granular secrets management', 'Event streaming and webhooks'],
  },
  networking: {
    title: 'Networking Control Plane',
    subtitle: 'Secure connectivity for hybrid deployments',
    summary: 'Control ingress, egress, and private connectivity with fine-grained policies and observability.',
    highlights: ['Private networking and VPC peering', 'Zero-trust access policies', 'Global traffic management'],
  },
  problems: {
    title: 'Issue Intelligence',
    subtitle: 'Proactively resolve incidents with AI triage',
    summary: 'Detect, prioritize, and resolve incidents using AI-driven root-cause analysis and recommended playbooks.',
    highlights: ['Noise reduction with ML-based correlation', 'Automated postmortem generation', 'Workflow integrations with PagerDuty and Jira'],
  },
  'kv-store': {
    title: 'Distributed KV Store',
    subtitle: 'Ultra-fast key-value storage for serverless apps',
    summary: 'Provision globally available KV storage with built-in replication, caching, and analytics.',
    highlights: ['Low-latency global reads and writes', 'Auto-scaling with zero maintenance', 'Audit logging and TTL policies'],
  },
  shell: {
    title: 'Secure Shell',
    subtitle: 'Production-grade terminal in the browser',
    summary: 'Give teams audited, role-aware shell access without exposing infrastructure keys.',
    highlights: ['Session recording and approvals', 'Just-in-time credentials', 'Command policy enforcement'],
  },
  threads: {
    title: 'Collaboration Threads',
    subtitle: 'Async conversations anchored to your code',
    summary: 'Embed discussions, reviews, and decisions directly in the workspace for transparent knowledge sharing.',
    highlights: ['Attach to files, lines, or deployments', 'AI summaries and next steps', 'Integrations with Slack and Teams'],
  },
  vnc: {
    title: 'Visual Workspace',
    subtitle: 'Graphical access to managed environments',
    summary: 'Secure browser-based desktop for design tooling, data visualization, and legacy workflows.',
    highlights: ['Pixel-perfect streaming performance', 'Policy-controlled clipboard and downloads', 'Session analytics and compliance logging'],
  },
  referrals: {
    title: 'Referral Hub',
    subtitle: 'Reward your network for building on E-Code',
    summary: 'Launch global referral campaigns with transparent tracking, insights, and flexible incentives.',
    highlights: ['Customizable incentive structures', 'Real-time performance dashboards', 'Automated payouts and compliance'],
  },
  'teams/new': {
    title: 'Team Launchpad',
    subtitle: 'Spin up new teams with enterprise guardrails',
    summary: 'Template onboarding, permissions, and workspace configuration for new teams in minutes.',
    highlights: ['Automated workspace provisioning', 'Policy-based permission templates', 'Analytics on activation and usage'],
  },
};

interface FeaturePlaceholderProps {
  featureKey: string;
}

export default function FeaturePlaceholder({ featureKey }: FeaturePlaceholderProps) {
  const copy = featureCopy[featureKey] ?? featureCopy.assistant;

  return (
    <div className="px-responsive py-12 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="text-center space-y-4">
          <Badge className="bg-white/10 text-white border-white/20">Coming soon</Badge>
          <h1 className="text-4xl font-semibold text-white">{copy.title}</h1>
          <p className="text-lg text-slate-300">{copy.subtitle}</p>
          <p className="mx-auto max-w-3xl text-slate-300 leading-relaxed">{copy.summary}</p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          {copy.highlights.map((highlight) => (
            <Card key={highlight} className="bg-white/5 border-white/10">
              <CardHeader className="flex items-start gap-3">
                <div className="rounded-full bg-white/10 p-3 text-sky-200">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle className="text-base text-white leading-relaxed">{highlight}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-white/10">
          <CardContent className="grid gap-8 py-10 sm:grid-cols-2">
            <div className="space-y-3">
              <CardTitle className="text-2xl text-white">Enterprise preview access</CardTitle>
              <CardDescription className="text-slate-300">
                We’re partnering with select enterprises to shape the roadmap. Get early access, dedicated solution architects, and influence the product direction.
              </CardDescription>
            </div>
            <div className="space-y-3">
              <Button className="w-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white" onClick={() => (window.location.href = '/contact-sales')}>
                Request early access
              </Button>
              <Button variant="outline" className="w-full border-white/20 text-slate-100 hover:text-white" onClick={() => (window.location.href = '/docs')}>
                View documentation
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 sm:grid-cols-3">
          {[{
            title: 'Security by default',
            description: 'SOC2 Type II controls, audit logging, and fine-grained RBAC protect every action.',
          }, {
            title: 'Accelerated delivery',
            description: 'AI guided workflows remove busywork so teams can focus on strategic initiatives.',
          }, {
            title: 'Operational confidence',
            description: 'Real-time insights keep stakeholders aligned with progress and impact.',
          }].map((item) => (
            <Card key={item.title} className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-lg text-white">{item.title}</CardTitle>
                <CardDescription className="text-slate-300 leading-relaxed">{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-slate-200">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <span>Enterprise roadmap partner program</span>
            </div>
            <div className="flex items-center gap-3 text-slate-200">
              <Clock3 className="h-5 w-5 text-sky-300" />
              <span>Priority onboarding and support SLAs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
