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

interface DocAction {
  label: string;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  articleKey?: DocKey;
  href?: string;
  external?: boolean;
}

interface DocArticle {
  title: string;
  summary: string;
  lastUpdated: string;
  content: ReactNode;
  media?: ReactNode;
  keywords?: string[];
  actions?: DocAction[];
}

type DocKey =
  | 'overview'
  | 'workspace'
  | 'ai'
  | 'collaboration'
  | 'projects'
  | 'deployments'
  | 'runtimes'
  | 'security'
  | 'support'
  | 'api';

interface DocSection {
  title: string;
  icon: ReactNode;
  items: Array<{ key: DocKey; label: string; description?: string }>;
}

const docsMedia = {
  overviewScreenshot: 'https://cdn.ecode.dev/docs/dashboard-2025.webp',
  deploymentsPoster: 'https://cdn.ecode.dev/docs/deployments/handover-poster.webp'
};

const documentationArticles: Record<DocKey, DocArticle> = {
  overview: {
    title: 'Platform overview',
    summary:
      'How the full-stack E-Code platform stitches together the React client, Express API, workspace runtimes, and governance services.',
    lastUpdated: 'February 18, 2025',
    keywords: ['architecture', 'express', 'react', 'postgres', 'overview', 'single-port'],
    media: (
      <figure className="my-6 rounded-xl border bg-muted/40 p-4">
        <img
          src={docsMedia.overviewScreenshot}
          alt="E-Code dashboard showing the editor, terminal, and live preview"
          className="rounded-lg border shadow-sm"
          loading="lazy"
        />
        <figcaption className="mt-3 text-sm text-muted-foreground">
          The default workspace pairs the Monaco editor with a live preview and terminals surfaced from <code>client/src/pages/EditorPage.tsx</code>.
        </figcaption>
      </figure>
    ),
    content: (
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">What ships with the platform</h2>
          <p>
            E-Code combines a Vite-powered React client (<code>client/src/App.tsx</code>) with an Express API (<code>server/index.ts</code>) that
            proxies long-lived WebSocket connections, orchestrates runtime containers, and exposes deployment tooling. Persistent
            data is stored in PostgreSQL via Drizzle ORM migrations located in <code>migrations/</code>.
          </p>
          <ul className="grid gap-4 md:grid-cols-2">
            <li className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="font-medium">Unified experience</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A single-page client routes authenticated users through the dashboard, project editor, deployments, AI studio, and
                admin surfaces using <code>wouter</code> for navigation.
              </p>
            </li>
            <li className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="font-medium">Single-port topology</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <code>server/polyglot-routes.ts</code> fans requests to the Go and Python runtimes while keeping everything available behind
                the primary Express process—matching the architecture described in <code>REPLIT_SINGLE_PORT_ARCHITECTURE.md</code>.
              </p>
            </li>
            <li className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="font-medium">Data-driven UI</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Navigation, marketplace listings, and template catalogs are hydrated from JSON fixtures and server responses seeded by
                <code>server/seed-templates.ts</code> and <code>server/seed-blog.ts</code>.
              </p>
            </li>
            <li className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="font-medium">Enterprise controls</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Authentication hooks into <code>server/auth.ts</code>, audit logs stream through <code>server/security/audit-logger.ts</code>, and org-level
                settings live under <code>client/src/pages/admin</code>.
              </p>
            </li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Key directories</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Client</CardTitle>
                <CardDescription>React + Tailwind UI</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <code>client/src/pages</code> hosts the feature views—from <code>Docs.tsx</code> to <code>Deployments.tsx</code>—powered by shared primitives in
                  <code>client/src/components</code>.
                </p>
                <p>
                  UI tokens come from <code>tailwind.config.ts</code> and <code>client/src/styles</code>.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Server</CardTitle>
                <CardDescription>Express services</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  API routes in <code>server/routes</code> cover projects, auth, billing, and deployments while orchestration helpers live under
                  <code>server/orchestration</code>.
                </p>
                <p>
                  Background jobs leverage <code>server/workflows</code> and <code>server/analytics</code>.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Infrastructure</CardTitle>
                <CardDescription>Runtime + tooling</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Scripts such as <code>deploy-production.sh</code>, <code>fix-existing-deployment.sh</code>, and the Kubernetes manifests under <code>kubernetes/</code>
                  automate provisioning.
                </p>
                <p>
                  Drizzle migrations and database helpers live inside <code>server/database</code> and <code>migrations/</code>.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    ),
    actions: [
      { label: 'Explore deployment scripts', href: '/deployments', variant: 'default' },
      { label: 'Deep dive into runtimes', articleKey: 'runtimes', variant: 'outline' }
    ]
  },
  workspace: {
    title: 'Cloud workspace tour',
    summary: 'Understand the editor, terminals, previews, and resource monitors that make up an E-Code workspace.',
    lastUpdated: 'February 18, 2025',
    keywords: ['workspace', 'editor', 'preview', 'terminal', 'monaco'],
    content: (
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Editor, terminals, and preview</h2>
          <p>
            The project workspace is rendered by <code>client/src/pages/EditorPage.tsx</code>. It binds together the Monaco editor, file tree,
            shell processes, and live preview frames. Terminals are backed by the WebSocket bridge in <code>server/terminal</code>, while the
            preview iframe proxies through <code>server/preview</code> so every project port is accessible from the main origin.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Resource overlays:</strong> <code>client/src/components/inspector</code> shows CPU, memory, and file system usage streamed from
              <code>server/status/runtime-metrics.ts</code>.
            </li>
            <li>
              <strong>Command palette:</strong> The floating palette in <code>client/src/components/command-palette</code> offers quick access to environment
              variables, deployments, and AI actions.
            </li>
            <li>
              <strong>Themeable UI:</strong> Workspace themes from <code>client/src/pages/Themes.tsx</code> persist to user profiles via
              <code>server/routes/user-settings.ts</code>.
            </li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Real-time state</h2>
          <p>
            Collaboration overlays and comments rely on Yjs documents synchronized through <code>server/collaboration</code>. Presence updates propagate
            via <code>server/realtime/presence-server.ts</code>, and comment threads surface in <code>client/src/components/review</code>.
          </p>
          <p>
            Autosave checkpoints are handled by <code>server/storage/file-system-adapter.ts</code>, mirroring project files to persistent volumes managed by
            the Go runtime under <code>server/runtimes/go</code>.
          </p>
        </section>
      </div>
    ),
    actions: [
      { label: 'Open a workspace', href: '/projects', variant: 'default' },
      { label: 'Customize workspace theme', href: '/themes', variant: 'outline' }
    ]
  },
  ai: {
    title: 'AI copilots & automations',
    summary:
      'Leverage the AI services wired into the platform, from in-editor completions to fully autonomous build agents.',
    lastUpdated: 'February 18, 2025',
    keywords: ['ai', 'agents', 'autonomous', 'anthropic', 'openai', 'mcp'],
    content: (
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Provider federation</h2>
          <p>
            All AI requests flow through <code>server/ai/ai-service.ts</code>, which selects model providers defined in
            <code>server/ai/ai-providers.ts</code>. Support is baked in for Anthropic, OpenAI, Google Gemini, and locally hosted models via
            <code>server/ai/opensource-models-provider.ts</code>.
          </p>
          <p>
            The autonomous agent loop lives in <code>server/ai/autonomous-builder.ts</code> and executes tool invocations declared inside
            <code>server/tools</code>. Each tool has guard rails and audit logging to maintain traceability.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">In-product experiences</h2>
          <ul className="grid gap-4 md:grid-cols-2">
            <li className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="font-medium">AI Sidebar</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <code>client/src/pages/AI.tsx</code> injects context-aware prompts, code explanations, and test generation directly inside the editor.
              </p>
            </li>
            <li className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="font-medium">Agent Studio</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <code>client/src/pages/AIAgentStudio.tsx</code> lets power users design workflow automations, schedule recurrent runs, and review execution logs.
              </p>
            </li>
            <li className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="font-medium">MCP integrations</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Managed Connectors expose filesystem, Git, and deployment capabilities to the agent layer via <code>server/mcp</code>.
              </p>
            </li>
            <li className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="font-medium">Reviews & guardrails</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Before code is merged, AI-authored changes run through <code>server/security/code-safety-checks.ts</code> and surface in the Review feed inside
                <code>client/src/pages/Workflows.tsx</code>.
              </p>
            </li>
          </ul>
        </section>
      </div>
    ),
    actions: [
      { label: 'Launch Agent Studio', href: '/ai-agent/studio', variant: 'default' },
      { label: 'Browse automation logs', href: '/workflows', variant: 'outline' }
    ]
  },
  collaboration: {
    title: 'Collaboration & reviews',
    summary: 'How teams co-edit, comment, and review deployments with workspace presence and async workflows.',
    lastUpdated: 'February 17, 2025',
    keywords: ['collaboration', 'comments', 'presence', 'reviews', 'teams'],
    content: (
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Live collaboration</h2>
          <p>
            The collaboration layer is powered by <code>server/collaboration</code>. Each workspace session establishes a Yjs doc and WebRTC data channels
            managed by <code>server/webrtc</code>. Presence pings and shared cursors are rendered via <code>client/src/components/collaboration</code>.
          </p>
          <p>
            Teams and org membership live in <code>server/teams</code>, which enforces role-based permissions mirrored in the UI at
            <code>client/src/pages/Teams.tsx</code> and <code>client/src/pages/TeamSettings.tsx</code>.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Reviews and discussions</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Comments:</strong> Threaded conversations sit in <code>server/community/comments-service.ts</code> and surface in the workspace sidebar.
            </li>
            <li>
              <strong>Audit trails:</strong> Every change is captured by <code>server/security/audit-logger.ts</code> and displayed in <code>client/src/pages/AuditLogs.tsx</code>.
            </li>
            <li>
              <strong>Notifications:</strong> Email and in-app alerts run through <code>server/notifications</code> and show up in <code>client/src/pages/Notifications.tsx</code>.
            </li>
          </ul>
        </section>
      </div>
    ),
    actions: [
      { label: 'Create a team', href: '/teams', variant: 'default' },
      { label: 'Review audit logs', href: '/audit-logs', variant: 'outline' }
    ]
  },
  projects: {
    title: 'Projects, templates & marketplace',
    summary: 'Spin up production-ready apps using curated templates, dependency installers, and the E-Code marketplace.',
    lastUpdated: 'February 16, 2025',
    keywords: ['templates', 'marketplace', 'projects', 'packages'],
    content: (
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Template catalog</h2>
          <p>
            Seed data in <code>server/seed-templates.ts</code> populates the catalog displayed on <code>client/src/pages/TemplatesPage.tsx</code>. Templates cover full-stack
            frameworks (Next.js, Remix), AI starter kits, and mobile cross-platform projects.
          </p>
          <p>
            Each template includes runtime requirements, default environment variables, and quickstart instructions rendered from
            structured metadata stored in <code>server/data/templates</code>.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Dependency automation</h2>
          <p>
            The dependency graph for every project is tracked by <code>server/package-management</code>. Installations invoke the Node- and Python-specific
            workers in <code>server/package-installer.ts</code> and <code>server/python</code>, while the UI for upgrades lives in <code>client/src/pages/Dependencies.tsx</code>.
          </p>
          <p>
            Marketplace extensions, surfaced through <code>client/src/pages/Marketplace.tsx</code>, are backed by the server-side registry maintained in
            <code>server/extensions</code>.
          </p>
        </section>
      </div>
    ),
    actions: [
      { label: 'Browse templates', href: '/templates', variant: 'default' },
      { label: 'Open the marketplace', href: '/marketplace', variant: 'outline' }
    ]
  },
  deployments: {
    title: 'Deployments & environments',
    summary: 'Promote projects from dev sandboxes to production with built-in previews, custom domains, and GKE automation.',
    lastUpdated: 'February 18, 2025',
    keywords: ['deployments', 'gke', 'kubernetes', 'domains', 'preview'],
    media: (
      <figure className="my-6 rounded-xl border bg-muted/40 p-4">
        <video
          className="w-full rounded-lg border shadow-sm"
          controls
          poster={docsMedia.deploymentsPoster}
          preload="metadata"
        >
          <source src="/assets/platform-demo.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <figcaption className="mt-3 text-sm text-muted-foreground">
          End-to-end promotion from draft previews to production runs inside <code>client/src/pages/Deployments.tsx</code>.
        </figcaption>
      </figure>
    ),
    content: (
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Promotion pipeline</h2>
          <p>
            Every deployment starts as a preview generated by <code>server/deployment/preview-service.ts</code>. Once validated, it moves into the
            production orchestrator defined in <code>server/deployment/deployment-service.ts</code>, which targets Kubernetes clusters configured via the
            manifests inside <code>kubernetes/</code>.
          </p>
          <p>
            DNS automation and SSL provisioning run through <code>server/deployment/domain-service.ts</code> and the Cloudflare adapters in
            <code>server/integrations/cloudflare</code>.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Operations tooling</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Health dashboard:</strong> <code>client/src/pages/HealthDashboard.tsx</code> visualizes cluster metrics streamed from
              <code>server/monitoring/health-service.ts</code>.
            </li>
            <li>
              <strong>Runtime diagnostics:</strong> Deep-dives on container logs live in <code>client/src/pages/RuntimeDiagnosticsPage.tsx</code> and pull data from
              <code>server/runtimes/runtime-inspector.ts</code>.
            </li>
            <li>
              <strong>Production scripts:</strong> Shell helpers like <code>deploy-production.sh</code>, <code>deploy-to-gke.sh</code>, and <code>COMPLETE_DEPLOYMENT.sh</code>
              replicate the same steps used by the UI.
            </li>
          </ul>
        </section>
      </div>
    ),
    actions: [
      { label: 'Open deployments hub', href: '/deployments', variant: 'default' },
      { label: 'Review runtime services', articleKey: 'runtimes', variant: 'outline' }
    ]
  },
  runtimes: {
    title: 'Runtimes & system services',
    summary: 'Dive into the Go runtime, sandboxing, resource quotas, and storage that keep workspaces isolated.',
    lastUpdated: 'February 15, 2025',
    keywords: ['runtime', 'sandbox', 'go runtime', 'resource quotas', 'storage'],
    content: (
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Container orchestration</h2>
          <p>
            Workspace containers are created by <code>server/orchestration/container-orchestrator.ts</code> and run inside the custom runtime described in
            <code>server/orchestration/container-runtime.ts</code>. Each container is namespaced, cgroup-isolated, and mounted with project storage from
            <code>server/storage</code>.
          </p>
          <p>
            Resource policies live in <code>server/orchestration/quota-manager.ts</code>, ensuring CPU, memory, and file descriptors remain within plan
            limits defined in <code>server/billing/plan-limits.ts</code>.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Language runtimes</h2>
          <ul className="grid gap-4 md:grid-cols-2">
            <li className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="font-medium">Polyglot adapters</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <code>server/polyglot-services.ts</code> exposes Go, Python, and Node executors. Client pages like <code>client/src/pages/RuntimesPage.tsx</code>
                surface runtime availability and versions.
              </p>
            </li>
            <li className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="font-medium">Sandboxing</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Commands run through the isolation layer in <code>server/sandbox</code>, which mounts ephemeral volumes, rewrites syscalls, and applies seccomp
                profiles per container.
              </p>
            </li>
          </ul>
        </section>
      </div>
    ),
    actions: [
      { label: 'Check runtime status', href: '/runtimes', variant: 'default' },
      { label: 'Inspect diagnostics', href: '/runtime-diagnostics', variant: 'outline' }
    ]
  },
  security: {
    title: 'Security, identity & compliance',
    summary: 'Enterprise-grade access controls, audit trails, and compliance tooling wired into every workspace.',
    lastUpdated: 'February 17, 2025',
    keywords: ['security', 'identity', 'sso', 'compliance', 'audit'],
    content: (
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Identity & access</h2>
          <p>
            Authentication routes in <code>server/auth.ts</code> support password, OAuth, and SSO flows. SCIM provisioning hooks are available in
            <code>server/sso/scim-service.ts</code>, while the UI for configuring SAML and OIDC lives at <code>client/src/pages/SSOConfiguration.tsx</code>.
          </p>
          <p>
            Role-based access control is enforced by <code>server/security/access-control.ts</code> and mirrored in the UI via <code>client/src/pages/CustomRoles.tsx</code>.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Compliance & data protection</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Audit logs:</strong> <code>server/security/audit-logger.ts</code> persists every sensitive action for export in <code>client/src/pages/AuditLogs.tsx</code>.
            </li>
            <li>
              <strong>Secrets management:</strong> Encrypted storage is handled by <code>server/security/secrets-vault.ts</code> with UI surfaces in
              <code>client/src/pages/SecretManagement.tsx</code> and <code>client/src/pages/Secrets.tsx</code>.
            </li>
            <li>
              <strong>Compliance reporting:</strong> DPA, SOC 2, and subprocessor details are published through <code>client/src/pages/DPA.tsx</code>,
              <code>client/src/pages/StudentDPA.tsx</code>, and <code>client/src/pages/Subprocessors.tsx</code>.
            </li>
          </ul>
        </section>
      </div>
    ),
    actions: [
      { label: 'Configure SSO', href: '/advanced/sso', variant: 'default' },
      { label: 'View compliance docs', href: '/dpa', variant: 'outline' }
    ]
  },
  support: {
    title: 'Support & success',
    summary: 'How customers engage with support, success engineering, and the self-serve knowledge base.',
    lastUpdated: 'February 14, 2025',
    keywords: ['support', 'success', 'status', 'contact'],
    content: (
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Channels</h2>
          <p>
            The support hub at <code>client/src/pages/Support.tsx</code> surfaces live chat, ticket routing, and knowledge base search. Tickets are persisted via
            <code>server/support/support-service.ts</code> and escalations notify on-call responders through <code>server/notifications/providers/pagerduty.ts</code>.
          </p>
          <p>
            Status updates and incident history originate from <code>server/status</code> and render in <code>client/src/pages/Status.tsx</code>, ensuring transparency during
            maintenance windows.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Customer success</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Onboarding runbooks:</strong> Delivered through <code>client/src/pages/Learn.tsx</code> and templated tasks tracked by
              <code>server/education</code>.
            </li>
            <li>
              <strong>Billing support:</strong> <code>client/src/pages/AdminBilling.tsx</code> provides plan management while <code>server/billing</code> syncs with Stripe.
            </li>
            <li>
              <strong>Community programs:</strong> The forum at <code>client/src/pages/Community.tsx</code> is powered by <code>server/community</code> with moderation tools in
              <code>client/src/pages/ReportAbuse.tsx</code>.
            </li>
          </ul>
        </section>
      </div>
    ),
    actions: [
      { label: 'Contact support', href: '/support', variant: 'default' },
      { label: 'Check system status', href: '/status', variant: 'outline' }
    ]
  },
  api: {
    title: 'APIs & integrations',
    summary: 'Programmatic access to workspaces, deployments, and billing via REST, webhooks, and SDKs.',
    lastUpdated: 'February 18, 2025',
    keywords: ['api', 'sdk', 'webhooks', 'integrations'],
    content: (
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">REST & webhooks</h2>
          <p>
            REST endpoints are organized under <code>server/api</code> with OpenAPI descriptions generated from <code>server/api/openapi</code>. Webhooks for deployments,
            billing events, and audit alerts are handled by <code>server/api/webhooks</code> with signature verification in
            <code>server/security/webhook-verifier.ts</code>.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Client SDKs</h2>
          <p>
            The TypeScript SDK exposed through <code>sdk/</code> mirrors the REST endpoints and ships on NPM as <code>@ecode/sdk</code>. Sample usage and code snippets are
            available at <code>client/src/pages/APISDKPage.tsx</code>.
          </p>
          <p>
            Server-to-server integrations with GitHub, GitLab, Slack, and PagerDuty are implemented in <code>server/integrations</code> and can be configured from
            <code>client/src/pages/Integrations.tsx</code>.
          </p>
        </section>
      </div>
    ),
    actions: [
      { label: 'View API reference', href: '/api-sdk', variant: 'default' },
      { label: 'Download TypeScript SDK', href: 'https://www.npmjs.com/package/@ecode/sdk', external: true, variant: 'outline' }
    ]
  }
};

const docSections: DocSection[] = [
  {
    title: 'Start here',
    icon: <Rocket className="h-4 w-4" />, 
    items: [
      { key: 'overview', label: 'Platform overview', description: 'Architecture, services, and tooling.' },
      { key: 'workspace', label: 'Cloud workspace tour', description: 'Editor, preview, and collaboration surface.' },
      { key: 'ai', label: 'AI copilots & automations', description: 'Model federation and agent tooling.' }
    ]
  },
  {
    title: 'Build together',
    icon: <Users className="h-4 w-4" />,
    items: [
      { key: 'collaboration', label: 'Collaboration & reviews', description: 'Co-editing, comments, and notifications.' },
      { key: 'projects', label: 'Projects & templates', description: 'Catalogs, dependencies, and marketplace.' }
    ]
  },
  {
    title: 'Ship to production',
    icon: <Rocket className="h-4 w-4" />,
    items: [
      { key: 'deployments', label: 'Deployments & environments', description: 'Previews, domains, and GKE automation.' },
      { key: 'runtimes', label: 'Runtimes & system services', description: 'Isolation, quotas, and language adapters.' }
    ]
  },
  {
    title: 'Operate securely',
    icon: <ShieldCheck className="h-4 w-4" />,
    items: [
      { key: 'security', label: 'Security & compliance', description: 'SSO, secrets, audit logging, and policies.' },
      { key: 'api', label: 'APIs & integrations', description: 'REST, SDKs, and partner connectors.' }
    ]
  },
  {
    title: 'Get help',
    icon: <LifeBuoy className="h-4 w-4" />,
    items: [
      { key: 'support', label: 'Support & success', description: 'Support channels, status, and onboarding.' }
    ]
  }
];

export default function DocsPage(): JSX.Element {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeArticle, setActiveArticle] = useState<DocKey>('overview');
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();

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

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10 lg:flex-row">
        <aside className="w-full max-w-md flex-none lg:max-w-xs">
          <ScrollArea className="h-[calc(100vh-12rem)] rounded-lg border bg-card p-4">
            <nav className="space-y-4">
              {filteredSections.length ? (
                filteredSections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      {section.icon}
                      {section.title}
                    </div>
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <Button
                          key={item.key}
                          variant={activeArticle === item.key ? 'secondary' : 'ghost'}
                          className="flex w-full justify-between text-left"
                          onClick={() => setActiveArticle(item.key)}
                        >
                          <span className="flex flex-col items-start">
                            <span>{item.label}</span>
                            {item.description && (
                              <span className="text-xs text-muted-foreground">{item.description}</span>
                            )}
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      ))}
                    </div>
                    <Separator className="opacity-40" />
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No documentation matched “{query}”. Try another search term.
                </div>
              )}
            </nav>
          </ScrollArea>
        </aside>

        <main className="flex-1">
          <article className="space-y-6 rounded-xl border bg-card p-8 shadow-sm">
            <header className="space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <Badge variant="outline" className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {activeArticleData.summary}
                </Badge>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> Last updated {activeArticleData.lastUpdated}
                </span>
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">{activeArticleData.title}</h2>
            </header>

            {activeArticleData.media}

            <div className="prose prose-neutral max-w-none dark:prose-invert">
              {activeArticleData.content}
            </div>

            {activeArticleData.actions?.length ? (
              <div className="flex flex-wrap gap-3 pt-4">
                {activeArticleData.actions.map((action) => (
                  <Button
                    key={action.label}
                    variant={action.variant ?? 'secondary'}
                    onClick={() => handleAction(action)}
                  >
                    {action.label}
                    {action.external ? (
                      <ExternalLink className="ml-2 h-4 w-4" />
                    ) : (
                      <ArrowRight className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                ))}
              </div>
            ) : null}
          </article>

          <section className="mt-8 rounded-xl border bg-muted/40 p-6">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex w-full items-center justify-between text-left text-base">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    Need a guided walkthrough?
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4 text-sm text-muted-foreground">
                <p>
                  Our solutions engineers host live enablement sessions covering workspace onboarding, AI automation, and deployment
                  hardening. Sessions reference the exact scripts and services inside this repo so your teams can mirror production
                  setups with confidence.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setLocation('/contact-sales')}>
                    Talk to solutions
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setLocation('/support')}>
                    Visit support center
                    <LifeBuoy className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>
        </main>
      </div>
    </div>
  );
}
