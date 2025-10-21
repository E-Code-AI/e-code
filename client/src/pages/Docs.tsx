// @ts-nocheck
import { type ReactNode, useState } from 'react';
import { useLocation } from 'wouter';
import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import {
  ArrowRight,
  Book,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';

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
              'Reference the style guide, change control expectations, and the docs@e-code.ai contact for revisions.'
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

  const visibleCategories = (docCategories
    .map(category => ({
      ...category,
      items: category.items.filter((item): item is DocItem => matchesQuery(item, normalizedQuery))
    }))
    .filter(category => category.items.length > 0 || !normalizedQuery)) as DocCategory[];

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

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) {
      return docSections;
    }

    return docSections
      .map((section) => {
        const filteredItems = section.items.filter((item) => {
          const article = documentationArticles[item.key];
          const haystack = [
            item.label,
            item.description ?? '',
            article.title,
            article.summary,
            ...(article.keywords ?? [])
          ]
            .join(' ')
            .toLowerCase();

          return haystack.includes(normalizedQuery);
        });

        if (!filteredItems.length) {
          return null;
        }

        return { ...section, items: filteredItems };
      })
      .filter((section): section is DocSection => Boolean(section));
  }, [normalizedQuery]);

  const activeArticleData = documentationArticles[activeArticle];

  const handleAction = (action: DocAction) => {
    if (action.articleKey) {
      setActiveArticle(action.articleKey);
    }

    if (action.href) {
      if (action.external) {
        window.open(action.href, '_blank', 'noopener,noreferrer');
      } else {
        setLocation(action.href);
      }
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const firstResult = filteredSections[0]?.items[0];
      if (firstResult) {
        setActiveArticle(firstResult.key);
      }
    }
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
              {visibleCategories.map((category: DocCategory) => (
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
                    {category.items.map((item) => {
                      const docItem = item as DocItem;
                      return (
                        <button
                          key={docItem.id}
                          type="button"
                          onClick={() => handleDocSelect(docItem)}
                          className={cn(
                            'group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-left transition-colors',
                            selectedDoc?.id === docItem.id
                              ? 'bg-accent text-foreground font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          )}
                        >
                          <span>{docItem.title}</span>
                          {docItem.readiness && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                              {readinessLabels[docItem.readiness]}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ))}
              {!hasResults && (
                <p className="text-sm text-muted-foreground px-3 py-2">
                  No documents match “{searchQuery}”. Try a different keyword or clear the search.
  const navigate = (href: string) => {
    setLocation(href);
  };

  const heroActions: DocAction[] = user
    ? [
        { label: 'View latest updates', href: '/blog', variant: 'secondary' },
        { label: 'Open a workspace', href: '/projects', variant: 'default' }
      ]
    : [
        { label: 'Create an account', href: '/register', variant: 'default' },
        { label: 'Take a product tour', href: '/', variant: 'secondary' }
      ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <Badge variant="secondary" className="inline-flex items-center gap-2">
                <Book className="h-3.5 w-3.5" />
                Updated documentation hub
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">E-Code product documentation</h1>
              <p className="max-w-2xl text-muted-foreground">
                Explore how our Replit-grade cloud development platform works under the hood. These guides stay in lockstep with the
                private E-Code codebase so your team can build, ship, and operate reliably.
              </p>
              <div className="flex flex-wrap gap-2">
                {heroActions.map((action) => (
                  <Button
                    key={action.label}
                    variant={action.variant ?? 'default'}
                    onClick={() => handleAction(action)}
                  >
                    {action.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
            <div className="w-full max-w-md">
              <Card className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Search documentation</CardTitle>
                  <CardDescription>Find topics across architecture, AI, security, and operations.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search articles, features, or services"
                      className="pl-9"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main content section starts here */}
      <div className="mx-auto flex w-full max-w-6xl gap-8 px-6 py-8">
        <div className="flex-1">
          {query.trim() ? (
            filteredSections.length > 0 ? (
              <div className="space-y-6">
                {filteredSections.map((section) => (
                  <div key={section.id} className="space-y-4">
                    <h2 className="text-xl font-semibold">{section.name}</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {section.items.map((item) => (
                        <Card
                          key={item.key}
                          className="cursor-pointer transition-all hover:shadow-md"
                          onClick={() => setActiveArticle(item.key)}
                        >
                          <CardHeader>
                            <CardTitle className="text-base">{item.label}</CardTitle>
                            {item.description && (
                              <CardDescription>{item.description}</CardDescription>
                            )}
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No results found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or browse the categories below
                </p>
              </div>
            )
          ) : (
            <div className="space-y-8">
              {docSections.map((section) => (
                <div key={section.id} className="space-y-4">
                  <h2 className="text-xl font-semibold">{section.name}</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {section.items.map((item) => (
                      <Card
                        key={item.key}
                        className="cursor-pointer transition-all hover:shadow-md"
                        onClick={() => setActiveArticle(item.key)}
                      >
                        <CardHeader>
                          <CardTitle className="text-base">{item.label}</CardTitle>
                          {item.description && (
                            <CardDescription>{item.description}</CardDescription>
                          )}
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
