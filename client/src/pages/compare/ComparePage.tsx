// @ts-nocheck
import { useRoute } from 'wouter';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ShieldCheck, Clock3, ServerCog, Sparkles } from 'lucide-react';
import { BRAND } from '@/constants/brand';

const comparisonContent: Record<string, {
  heroTitle: string;
  description: string;
  highlights: string[];
  differentiators: Array<{ title: string; description: string }>;
  platform: {
    name: string;
    logo: string;
    tagline: string;
    focus: string[];
  };
  comparisonPoints: Array<{
    label: string;
    eCode: string;
    competitor: string;
  }>;
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
    platform: {
      name: 'GitHub Codespaces',
      logo: '/assets/compare/github-codespaces.svg',
      tagline: 'Cloud development environments inside the GitHub ecosystem.',
      focus: [
        'Optimized for GitHub repositories and pull request workflows',
        'Strong Copilot integration for inline code completion',
        'Great fit for open source and smaller team collaboration',
      ],
    },
    comparisonPoints: [
      {
        label: 'Automation & AI',
        eCode: 'Multi-agent orchestration automates scaffolding, QA, migrations, and deployment approvals.',
        competitor: 'Copilot provides inline suggestions but lacks integrated delivery automation.',
      },
      {
        label: 'Enterprise readiness',
        eCode: 'Dedicated private regions, policy guardrails, and turnkey compliance packs for regulated industries.',
        competitor: 'Shared infrastructure with limited network isolation and enterprise compliance add-ons.',
      },
      {
        label: 'Environment management',
        eCode: 'Zero-maintenance workspaces with blueprints, drift detection, and automatic dependency updates.',
        competitor: 'Developers manage devcontainer configuration and updates per repository.',
      },
      {
        label: 'Collaboration',
        eCode: 'Multiparty editing, voice rooms, and shared dashboards across web, desktop, and mobile clients.',
        competitor: 'Live share inside the browser with limited analytics and device support.',
      },
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
    platform: {
      name: 'Glitch',
      logo: '/assets/compare/glitch.svg',
      tagline: 'Playful creative coding environment for prototypes and experiments.',
      focus: [
        'Instant remixing for community-built apps',
        'Great for hackathons and quick idea validation',
        'Simple deployment model focused on lightweight projects',
      ],
    },
    comparisonPoints: [
      {
        label: 'Scale & reliability',
        eCode: 'Managed production clusters with auto-healing, rollbacks, and enterprise SLAs.',
        competitor: 'Best suited for small hobby apps with limited scaling controls.',
      },
      {
        label: 'Security posture',
        eCode: 'Secrets vault, network segmentation, and compliance automation built-in.',
        competitor: 'Basic environment variables and shared networking model.',
      },
      {
        label: 'AI acceleration',
        eCode: 'Project blueprints, AI code reviews, and automated documentation generation.',
        competitor: 'No native AI assistance beyond community snippets.',
      },
      {
        label: 'Data services',
        eCode: 'Managed databases, object storage, and queues provisioned with one click.',
        competitor: 'External services required for production-grade data workloads.',
      },
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
    platform: {
      name: 'Heroku',
      logo: '/assets/compare/heroku.svg',
      tagline: 'PaaS for deploying apps with streamlined operations.',
      focus: [
        'Streamlined deployment experience for web backends',
        'Add-ons marketplace for extending functionality',
        'Opinionated workflow centered on pipelines and Git deploys',
      ],
    },
    comparisonPoints: [
      {
        label: 'Development workflow',
        eCode: 'Build, test, and deploy from one AI-native workspace with shared context.',
        competitor: 'Develop locally or in another IDE, then push to Heroku for deploys.',
      },
      {
        label: 'AI operations',
        eCode: 'Agents handle runbooks, incident response, and release notes automatically.',
        competitor: 'Manual operations augmented by add-ons and scripts.',
      },
      {
        label: 'Customization',
        eCode: 'Bring-your-own cloud or run on E-Code edge with private networking controls.',
        competitor: 'Runs only in the Heroku-managed environment.',
      },
      {
        label: 'Observability',
        eCode: 'Unified metrics, logs, and traces surfaced in the IDE with AI summaries.',
        competitor: 'Requires multiple add-ons and external dashboards.',
      },
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
    platform: {
      name: 'CodeSandbox',
      logo: '/assets/compare/codesandbox.svg',
      tagline: 'Collaborative sandboxes for frontend teams and prototypes.',
      focus: [
        'Fast browser-based prototyping for frontend stacks',
        'GitHub integration for branches and PR previews',
        'Lightweight dev environments optimized for React and JS projects',
      ],
    },
    comparisonPoints: [
      {
        label: 'Use cases',
        eCode: 'Supports full-stack and microservice workloads with secure data integrations.',
        competitor: 'Focused on frontend sandboxes and lightweight backend prototyping.',
      },
      {
        label: 'Compliance & governance',
        eCode: 'Granular workspace policies, audit logs, and residency controls for enterprises.',
        competitor: 'Team features for sharing but limited compliance tooling.',
      },
      {
        label: 'Performance',
        eCode: 'Dedicated compute profiles with GPU support and global regions.',
        competitor: 'Shared compute optimized for short-lived sandboxes.',
      },
      {
        label: 'Deployment story',
        eCode: 'One-click deploy to production or your own cloud from the same workspace.',
        competitor: 'Deploy via integrations to external platforms or manual exports.',
      },
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
    platform: {
      name: 'AWS Cloud9',
      logo: '/assets/compare/aws-cloud9.svg',
      tagline: 'Browser-based IDE tightly integrated with AWS services.',
      focus: [
        'Best for teams already standardized on AWS IAM and tooling',
        'Great integration with Lambda, EC2, and serverless debugging',
        'Requires AWS account management and VPC configuration knowledge',
      ],
    },
    comparisonPoints: [
      {
        label: 'Setup & maintenance',
        eCode: 'Provision secure environments in minutes with automated patching and lifecycle management.',
        competitor: 'Requires manual configuration of AWS accounts, IAM, and network policies per workspace.',
      },
      {
        label: 'AI assistance',
        eCode: 'Cross-project AI knowledge base with policy-aware agents for delivery workflows.',
        competitor: 'Relies on external tools for AI code completion and workflow automation.',
      },
      {
        label: 'Collaboration',
        eCode: 'Team dashboards, shared terminals, and asynchronous reviews with rich playback.',
        competitor: 'Basic sharing with AWS account access and limited co-editing.',
      },
      {
        label: 'Multi-cloud flexibility',
        eCode: 'Deploy to E-Code edge or customer cloud with unified controls.',
        competitor: 'AWS-only with vendor lock-in to AWS infrastructure.',
      },
    ],
  },
};

export default function ComparePage() {
  const [, params] = useRoute('/compare/:slug');
  const slug = params?.slug ?? 'github-codespaces';
  const content = comparisonContent[slug] ?? comparisonContent['github-codespaces'];
  const eCodeLogo = BRAND.assets.logo;

  return (
    <MarketingLayout>
      <section className="relative overflow-hidden py-16">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -left-32 top-16 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
        </div>
        <div className="container-responsive relative z-10 flex max-w-6xl flex-col items-center gap-10 text-center">
          <Badge className="mx-auto bg-white/10 text-white border-white/20">Platform comparison</Badge>
          <div className="flex w-full flex-col items-center gap-8">
            <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">{content.heroTitle}</h1>
            <p className="max-w-3xl text-base sm:text-lg text-slate-200">{content.description}</p>
            <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <div className="flex w-full max-w-sm items-center gap-4 rounded-3xl border border-white/15 bg-white/5 p-4 text-left backdrop-blur">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                  <img src={eCodeLogo} alt="E-Code logo" className="h-10 w-10" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">E-Code</p>
                  <p className="text-sm text-slate-300">AI-native enterprise development platform</p>
                </div>
              </div>
              <div className="flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                VS
              </div>
              <div className="flex w-full max-w-sm items-center gap-4 rounded-3xl border border-white/15 bg-white/5 p-4 text-left backdrop-blur">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
                  <img src={content.platform.logo} alt={`${content.platform.name} logo`} className="h-10 w-10" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{content.platform.name}</p>
                  <p className="text-sm text-slate-300">{content.platform.tagline}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid w-full gap-4 text-left sm:grid-cols-3">
            {content.highlights.map((highlight) => (
              <div key={highlight} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-300" />
                <p className="text-sm text-slate-200 leading-relaxed">{highlight}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="container-responsive max-w-6xl grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white">Where {content.platform.name} shines</CardTitle>
              <CardDescription className="text-slate-300">Key strengths of {content.platform.name} today.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-200">
                {content.platform.focus.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 block h-2.5 w-2.5 rounded-full bg-sky-400" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-sky-500/20 via-blue-500/10 to-indigo-500/20 border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white">Why teams upgrade to E-Code</CardTitle>
              <CardDescription className="text-slate-100/80">Enterprise organizations combine AI automation with governed collaboration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-100">
              <p className="leading-relaxed">Unlock AI-native delivery with unified tooling across web, desktop, and mobile—without sacrificing compliance.</p>
              <div className="rounded-2xl border border-white/20 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">On every plan</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-100/90">
                  <li>• Policy-aware AI agents for build, test, and deploy.</li>
                  <li>• Private networking and bring-your-own cloud options.</li>
                  <li>• Analytics and runbooks surfaced directly in the IDE.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-12">
        <div className="container-responsive max-w-6xl">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Detailed comparison</CardTitle>
              <CardDescription className="text-slate-300">
                How E-Code stacks up against {content.platform.name} across critical criteria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {content.comparisonPoints.map((point) => (
                <div key={point.label} className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-5 sm:grid-cols-[1fr_1fr_1fr]">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-200">{point.label}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">E-Code</p>
                    <p className="mt-2 text-sm text-slate-100 leading-relaxed">{point.eCode}</p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{content.platform.name}</p>
                    <p className="mt-2 text-sm text-slate-200 leading-relaxed">{point.competitor}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-12">
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
