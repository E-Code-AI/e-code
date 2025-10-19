import { type ReactNode, useState } from 'react';
import { useLocation } from 'wouter';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  HelpCircle,
  Layers,
  Rocket,
  Search,
  Server,
  Shield
} from 'lucide-react';

const docsRepositoryBase = 'https://github.com/E-Code-AI/e-code/blob/main';

type DocReadiness = 'stable' | 'draft' | 'in-progress';

type DocHighlight = {
  title: string;
  description: string;
};

type DocResource = {
  label: string;
  href: string;
  description?: string;
};

type DocItem = {
  id: string;
  title: string;
  summary: string;
  href: string;
  highlights: DocHighlight[];
  tags?: string[];
  readiness?: DocReadiness;
  lastReviewed?: string;
  resources?: DocResource[];
};

type DocCategory = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  items: DocItem[];
};

const readinessLabels: Record<DocReadiness, string> = {
  stable: 'Production ready',
  draft: 'Draft',
  'in-progress': 'In review'
};

const docCategories: DocCategory[] = [
  {
    id: 'onboarding',
    title: 'Onboarding & Enablement',
    description: 'Bootstrap local environments and deliver accurate product walkthroughs.',
    icon: <Rocket className="h-4 w-4" />,
    items: [
      {
        id: 'getting-started',
        title: 'Environment bootstrap checklist',
        href: `${docsRepositoryBase}/docs/getting-started.md`,
        summary:
          'Install required tooling, configure secrets, seed the database, and validate the browser IDE end to end.',
        highlights: [
          {
            title: 'Install prerequisites',
            description:
              'Use Node.js 18+, npm 10+, and PostgreSQL 15. Optional Docker Desktop and Redis unlock container and rate-limit testing.'
          },
          {
            title: 'Configure environment variables',
            description:
              'Copy `.env.production.example` to `.env` and set DATABASE_URL, SESSION_SECRET, and optional AI provider API keys.'
          },
          {
            title: 'Provision the schema',
            description: 'Run `npm run db:push` to apply Drizzle migrations and load the seeded `testuser` dataset.'
          },
          {
            title: 'Launch and verify the workspace',
            description:
              'Start `npm run dev`, sign in at `http://localhost:5000` with `testuser` / `testpass123`, and exercise the editor, terminal, AI assistant, and live preview flows.'
          },
          {
            title: 'Troubleshoot quickly',
            description:
              'Validate PostgreSQL connectivity with `psql`, restart the dev server if Vite errors appear, and confirm WebSocket reachability for file sync.'
          }
        ],
        tags: ['local environment', 'onboarding'],
        readiness: 'stable',
        resources: [
          {
            label: 'Product tour playbook',
            href: `${docsRepositoryBase}/docs/product-tour.md`
          },
          {
            label: 'Architecture overview',
            href: `${docsRepositoryBase}/docs/architecture/overview.md`
          }
        ]
      },
      {
        id: 'product-tour',
        title: 'Persona-based product tour',
        href: `${docsRepositoryBase}/docs/product-tour.md`,
        summary:
          'Deliver a Fortune-500-ready walkthrough covering dashboards, collaboration, deployment, administration, and analytics.',
        highlights: [
          {
            title: 'Dashboard storyline',
            description:
              'Open with the admin dashboard persona, highlight usage cards, announcements, and the call to connect SSO.'
          },
          {
            title: 'Workspace collaboration',
            description:
              'Launch a flagship template, demonstrate multi-user editing, run `npm test`, and showcase AI refactoring within the IDE.'
          },
          {
            title: 'Deployment pipeline tour',
            description:
              'Walk through environment variable policies, audit trails, and stage a rollout using `deploy-production.sh`.'
          },
          {
            title: 'Governance and billing checkpoints',
            description:
              'Create roles, outline SAML/SCIM configuration screens, and review billing exports and webhook subscriptions.'
          },
          {
            title: 'Demo asset library',
            description:
              'Maintain screenshots, GIFs, and Loom trailers under `attached_assets/` so every button showcased reflects the current release.'
          }
        ],
        tags: ['enablement', 'demos'],
        readiness: 'stable',
        resources: [
          {
            label: 'Attached assets directory',
            href: 'https://github.com/E-Code-AI/e-code/tree/main/attached_assets',
            description: 'Source-of-truth visuals and video placeholders for live demos.'
          }
        ]
      }
    ]
  },
  {
    id: 'platform',
    title: 'Platform & Runtime Architecture',
    description: 'Understand the system boundaries powering the browser IDE and execution runtimes.',
    icon: <Layers className="h-4 w-4" />,
    items: [
      {
        id: 'architecture-overview',
        title: 'Platform architecture overview',
        href: `${docsRepositoryBase}/docs/architecture/overview.md`,
        summary:
          'Maps the React client, Express control plane, runtime services, persistence layer, and security posture in one reference.',
        highlights: [
          {
            title: 'Client layer',
            description:
              'React 18 with Vite, Tailwind UI, Monaco Editor, and collaborative editing backed by yjs and socket.io.'
          },
          {
            title: 'Control plane',
            description:
              'Express entry point in `server/index.ts` handles authentication, routing, middleware, and asset serving.'
          },
          {
            title: 'Runtime and container services',
            description:
              'Docker/Kubernetes helpers allocate sandboxes while AI tools live under `sdk/` and `services/runtime`.'
          },
          {
            title: 'Persistence & security',
            description:
              'PostgreSQL via Drizzle migrations, optional Redis-backed sessions, and hardened middleware for rate limiting and headers.'
          },
          {
            title: 'Deployment & observability',
            description:
              'Single-port deployment scripts integrate with Cloud Run or GKE and expose health endpoints plus CDN optimisation.'
          }
        ],
        tags: ['architecture', 'solution design'],
        readiness: 'stable',
        resources: [
          {
            label: 'Deployment playbook',
            href: `${docsRepositoryBase}/docs/operations/deployment-playbook.md`
          }
        ]
      },
      {
        id: 'live-preview',
        title: 'Live preview system',
        href: `${docsRepositoryBase}/docs/preview.md`,
        summary:
          'Explains multi-port previews, device emulation, domain routing, and API endpoints for orchestrating preview sessions.',
        highlights: [
          {
            title: 'Multi-port orchestration',
            description:
              'Automatically detect multiple services, label them, and monitor their health for real-time switching.'
          },
          {
            title: 'Device emulation presets',
            description:
              'Test desktop, tablet, and mobile breakpoints with persistent user preferences.'
          },
          {
            title: 'Framework coverage',
            description:
              'Ships with detection for React, Vue, Angular, static HTML, Express, Flask, Django, FastAPI, and more.'
          },
          {
            title: 'Path-based routing model',
            description:
              'Production previews use `https://e-code.ai/preview/:projectId/:port/` and WebSocket endpoints under `/ws/preview/`.'
          },
          {
            title: 'Preview APIs',
            description:
              'Integrate with `POST /api/projects/{id}/preview/start`, status polling, and port switching endpoints.'
          }
        ],
        tags: ['runtime', 'preview'],
        readiness: 'stable'
      }
    ]
  },
  {
    id: 'operations',
    title: 'Operations & Reliability',
    description: 'Promote releases confidently with documented gates, observability, and rollback patterns.',
    icon: <Server className="h-4 w-4" />,
    items: [
      {
        id: 'deployment-playbook',
        title: 'Deployment playbook',
        href: `${docsRepositoryBase}/docs/operations/deployment-playbook.md`,
        summary:
          'Standardizes promotions from development through production with environment matrices, validation gates, and rollback paths.',
        highlights: [
          {
            title: 'Environment matrix',
            description:
              'Defines development, staging, and production environments with clear differences in security and data hygiene.'
          },
          {
            title: 'Promotion workflow',
            description:
              'Cut release candidates, deploy to staging with `deploy-to-gke.sh`, and validate core smoke tests before production launch.'
          },
          {
            title: 'Operational review',
            description:
              'Check monitoring dashboards, confirm audit logs, and package release notes for stakeholder enablement.'
          },
          {
            title: 'Observability checklist',
            description:
              'Track CDN optimisation metrics, configure 5xx, database saturation, and AI error alerts, and retain JSON logs for 30 days.'
          },
          {
            title: 'Rollback strategy',
            description:
              'Document container image reversions, migration considerations, infrastructure restores, and communication steps.'
          }
        ],
        tags: ['operations', 'release management'],
        readiness: 'stable',
        resources: [
          {
            label: 'deploy-production.sh',
            href: `${docsRepositoryBase}/deploy-production.sh`
          },
          {
            label: 'deploy-to-gke.sh',
            href: `${docsRepositoryBase}/deploy-to-gke.sh`
          },
          {
            label: 'GOOGLE_CLOUD_DEPLOYMENT.md',
            href: `${docsRepositoryBase}/GOOGLE_CLOUD_DEPLOYMENT.md`
          }
        ]
      }
    ]
  },
  {
    id: 'ai',
    title: 'AI & Automation',
    description: 'Roll out AI-first features with documented flags, APIs, and telemetry expectations.',
    icon: <Bot className="h-4 w-4" />,
    items: [
      {
        id: 'ai-ux',
        title: 'AI UX feature catalogue',
        href: `${docsRepositoryBase}/docs/AI_UX_FEATURES.md`,
        summary:
          'Enumerates AI assistant UX improvements, governing feature flags, API endpoints, telemetry, and test coverage.',
        highlights: [
          {
            title: 'Improve Prompt refinement',
            description:
              'Enable the `aiUx.improvePrompt` flag to analyse and rewrite prompts through `POST /api/ai/improve-prompt`.'
          },
          {
            title: 'Extended thinking & high power mode',
            description:
              'Toolbar toggles increase reasoning depth, token budgets, and persist user preferences for complex tasks.'
          },
          {
            title: 'Progress tab visibility',
            description:
              'Surface per-step timelines, file navigation, and status colours under the Progress tab when `aiUx.progressTab` is active.'
          },
          {
            title: 'Pause and resume controls',
            description:
              'Allow operators to pause or resume agent executions via dedicated endpoints while preserving context.'
          },
          {
            title: 'Telemetry & testing',
            description:
              'Track feature usage, toggles, successes, and errors, and run `npm test test/ai-ux-features.test.ts` before rollout.'
          }
        ],
        tags: ['ai', 'feature flags'],
        readiness: 'stable'
      }
    ]
  },
  {
    id: 'governance',
    title: 'Governance & Support',
    description: 'Coordinate doc ownership, escalation paths, and source control hygiene.',
    icon: <Shield className="h-4 w-4" />,
    items: [
      {
        id: 'docs-hub',
        title: 'Documentation hub overview',
        href: `${docsRepositoryBase}/docs/README.md`,
        summary:
          'Explains how the docs directory is curated, the target audiences, and the governance model for updates.',
        highlights: [
          {
            title: 'Audience navigation table',
            description:
              'Direct developers, product champions, architects, and SREs to the right guides using the quick-start matrix.'
          },
          {
            title: 'Live inventory',
            description:
              'Track maintained documents including getting started, product tour, architecture overview, and deployment playbook.'
          },
          {
            title: 'Feedback & governance',
            description:
              'Reference the style guide, change control expectations, and the docs@e-code.dev contact for revisions.'
          }
        ],
        tags: ['governance', 'meta'],
        readiness: 'stable',
        lastReviewed: '2025-10-19',
        resources: [
          {
            label: 'ACCURATE_STATUS_REPORT.md',
            href: `${docsRepositoryBase}/ACCURATE_STATUS_REPORT.md`
          }
        ]
      },
      {
        id: 'git-troubleshooting',
        title: 'Git troubleshooting guide',
        href: `${docsRepositoryBase}/docs/git-troubleshooting.md`,
        summary:
          'Resolves common Git merge conflicts and aborted rebases blocking engineers from pulling the latest changes.',
        highlights: [
          {
            title: 'Diagnose conflicts',
            description:
              'Run `git status` to identify files marked “both modified” and clean conflict markers between `<<<<<<<` blocks.'
          },
          {
            title: 'Complete the merge or rebase',
            description: 'Stage resolved files, then finish with `git commit` or `git rebase --continue` as appropriate.'
          },
          {
            title: 'Abort safely when needed',
            description:
              'Use `git merge --abort` or `git rebase --abort` to discard partial operations and return to a clean working tree.'
          },
          {
            title: 'Prevent future issues',
            description:
              'Pull frequently and keep changesets small to minimise the time conflicts remain unresolved.'
          }
        ],
        tags: ['support', 'version control'],
        readiness: 'stable'
      }
    ]
  }
];

const allDocItems: DocItem[] = docCategories.flatMap(category => category.items);

const matchesQuery = (item: DocItem, query: string) => {
  if (!query) {
    return true;
  }

  const normalized = query.toLowerCase();
  const haystack = [
    item.title,
    item.summary,
    item.tags?.join(' ') ?? '',
    ...item.highlights.map(highlight => `${highlight.title} ${highlight.description}`)
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
};

export default function Docs() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    docCategories.map(category => category.id)
  );
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleCategories = docCategories
    .map(category => ({
      ...category,
      items: category.items.filter(item => matchesQuery(item, normalizedQuery))
    }))
    .filter(category => category.items.length > 0 || !normalizedQuery);

  const hasResults = visibleCategories.some(category => category.items.length > 0);

  const selectedDoc = selectedDocId
    ? allDocItems.find(item => item.id === selectedDocId) ?? null
    : null;

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleDocSelect = (item: DocItem) => {
    setSelectedDocId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDocument = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/')}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">E</span>
                </div>
                <span className="font-semibold text-lg">E-Code Documentation</span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => handleDocSelect(docCategories[0].items[0])}
                >
                  Getting started
                </button>
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => handleDocSelect(docCategories[2].items[0])}
                >
                  Deployment playbook
                </button>
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => handleDocSelect(docCategories[1].items[0])}
                >
                  Architecture
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(user ? '/dashboard' : '/auth')}
              >
                {user ? 'Back to workspace' : 'Sign in'}
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/contact-sales')}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                Talk to us
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="hidden lg:block w-72 border-r bg-muted/30 h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto">
          <ScrollArea className="h-full py-6 px-4">
            <div className="space-y-2">
              {visibleCategories.map(category => (
                <Collapsible
                  key={category.id}
                  open={expandedCategories.includes(category.id)}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                    <div className="flex items-center gap-2 text-left">
                      {category.icon}
                      <div>
                        <div>{category.title}</div>
                        <p className="text-xs font-normal text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        expandedCategories.includes(category.id) && 'rotate-180'
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 ml-6 space-y-1">
                    {category.items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleDocSelect(item)}
                        className={cn(
                          'group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-left transition-colors',
                          selectedDoc?.id === item.id
                            ? 'bg-accent text-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        )}
                      >
                        <span>{item.title}</span>
                        {item.readiness && (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            {readinessLabels[item.readiness]}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
              {!hasResults && (
                <p className="text-sm text-muted-foreground px-3 py-2">
                  No documents match “{searchQuery}”. Try a different keyword or clear the search.
                </p>
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className="flex-1">
          {selectedDoc ? (
            <article className="px-6 py-12 max-w-4xl mx-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDocId(null)}
                className="mb-8 -ml-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to overview
              </Button>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">{selectedDoc.title}</h1>
                    {selectedDoc.readiness && (
                      <Badge className="uppercase tracking-wide">{readinessLabels[selectedDoc.readiness]}</Badge>
                    )}
                    {selectedDoc.lastReviewed && (
                      <Badge variant="secondary">Last reviewed {selectedDoc.lastReviewed}</Badge>
                    )}
                  </div>
                  <p className="text-lg text-muted-foreground max-w-3xl">{selectedDoc.summary}</p>
                  {selectedDoc.tags && (
                    <div className="flex flex-wrap gap-2">
                      {selectedDoc.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="lowercase">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <section>
                  <h2 className="text-xl font-semibold">What this covers</h2>
                  <ul className="mt-4 space-y-3">
                    {selectedDoc.highlights.map(highlight => (
                      <li key={highlight.title} className="flex gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                        <div>
                          <p className="font-medium leading-none">{highlight.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{highlight.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                {selectedDoc.resources && selectedDoc.resources.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold">Related assets</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {selectedDoc.resources.map(resource => (
                        <Card key={resource.href}>
                          <CardHeader>
                            <CardTitle className="text-base">{resource.label}</CardTitle>
                            {resource.description && (
                              <CardDescription>{resource.description}</CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => handleOpenDocument(resource.href)}
                            >
                              Open resource
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => handleOpenDocument(selectedDoc.href)}>
                    View full document
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenDocument('mailto:docs@e-code.dev')}
                  >
                    Request an update
                  </Button>
                </div>

                <section className="mt-12 pt-8 border-t">
                  <h3 className="text-lg font-semibold">Need a hand?</h3>
                  <div className="grid gap-4 sm:grid-cols-2 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Contact documentation</CardTitle>
                        <CardDescription>Escalate clarifications or propose edits.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => handleOpenDocument('mailto:docs@e-code.dev')}
                        >
                          Email docs@e-code.dev
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Talk to support</CardTitle>
                        <CardDescription>Open a ticket with the platform team.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button className="w-full" onClick={() => navigate('/support')}>
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Contact support
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </section>
              </div>
            </article>
          ) : (
            <>
              <section className="px-6 py-12 bg-gradient-to-b from-primary/5 to-transparent">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                  <Badge variant="secondary" className="mb-4 uppercase tracking-wide">
                    <BookOpen className="h-3 w-3 mr-1" />
                    Documentation hub
                  </Badge>
                  <h1 className="text-4xl md:text-5xl font-bold">
                    Enterprise-ready documentation for every E-Code workflow
                  </h1>
                  <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                    Explore verified guides that mirror the current platform release—from environment setup and executive demos to
                    runtime architecture, deployment controls, and AI operations.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button size="lg" onClick={() => handleDocSelect(docCategories[0].items[0])}>
                      Start with onboarding
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => handleOpenDocument('mailto:docs@e-code.dev')}
                    >
                      Book a documentation review
                    </Button>
                  </div>
                </div>
              </section>

              <section className="px-6 py-12">
                <div className="max-w-3xl mx-auto relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search the documentation (e.g. deployment, preview, AI)"
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    className="pl-12 pr-4 py-6 text-base"
                  />
                </div>
              </section>

              <section className="px-6 pb-12">
                <div className="max-w-6xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Featured guides</h2>
                    <Button
                      variant="ghost"
                      className="text-primary"
                      onClick={() => handleDocSelect(docCategories[2].items[0])}
                    >
                      Review the deployment playbook
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[
                      docCategories[0].items[0],
                      docCategories[1].items[0],
                      docCategories[2].items[0]
                    ].map(item => (
                      <Card
                        key={item.id}
                        className="hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => handleDocSelect(item)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            {item.readiness && (
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                {readinessLabels[item.readiness]}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <h3 className="font-semibold mb-2">{item.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-3">{item.summary}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </section>

              <section className="px-6 py-12 bg-muted/30">
                <div className="max-w-6xl mx-auto">
                  <h2 className="text-2xl font-bold mb-4">Operational quick links</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Release checklist</CardTitle>
                        <CardDescription>
                          Follow the production checklist backed by automated scripts and observability gates.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleOpenDocument(`${docsRepositoryBase}/PRODUCTION_CHECKLIST.md`)}
                        >
                          Open PRODUCTION_CHECKLIST.md
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleOpenDocument(`${docsRepositoryBase}/deploy-production.sh`)}
                        >
                          Review deploy-production.sh
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Documentation governance</CardTitle>
                        <CardDescription>
                          Ensure every update is tracked with the docs hub guide and accuracy status report.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleDocSelect(docCategories[4].items[0])}
                        >
                          View documentation hub
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleOpenDocument(`${docsRepositoryBase}/ACCURATE_STATUS_REPORT.md`)}
                        >
                          Accuracy status report
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </section>

              <section className="px-6 py-16">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                  <h2 className="text-3xl font-bold">Need help aligning the docs with your release?</h2>
                  <p className="text-lg text-muted-foreground">
                    Partner with the documentation team to schedule reviews, capture new screenshots, or author bespoke runbooks
                    for enterprise rollouts.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button size="lg" onClick={() => navigate('/support')}>
                      <HelpCircle className="mr-2 h-5 w-5" />
                      Open a support ticket
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => handleOpenDocument('mailto:docs@e-code.dev')}
                    >
                      Email docs@e-code.dev
                    </Button>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

