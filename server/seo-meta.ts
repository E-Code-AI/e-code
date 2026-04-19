const BASE_URL = 'https://e-code.ai';

export interface PageMeta {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  noindex?: boolean;
}

const DEFAULT_OG_IMAGE = `${BASE_URL}/assets/og/default.png`;
const TWITTER_SITE = '@ecodesocial';
const SITE_NAME = 'E-Code';

const PAGE_META: Record<string, PageMeta> = {
  '/': {
    title: 'E-Code - AI-Powered Development Platform | Build & Deploy in Minutes',
    description: 'Build and deploy production-ready applications in minutes with AI agents. Enterprise-grade security, real-time collaboration, and global edge deployment. Start building today.',
    keywords: 'AI development platform, code editor online, cloud IDE, AI code generation, deploy applications, enterprise development, collaborative coding, browser IDE',
    canonical: BASE_URL,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/landing.png`,
  },
  '/pricing': {
    title: 'Pricing Plans - E-Code | Free to Enterprise',
    description: 'Transparent pricing for individuals, teams, and enterprises. Start free, scale to millions. Compare Core, Teams, and Enterprise plans with AI credits included.',
    keywords: 'E-Code pricing, development platform cost, cloud IDE pricing, enterprise development pricing, AI development cost, team collaboration pricing',
    canonical: `${BASE_URL}/pricing`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/pricing.png`,
  },
  '/features': {
    title: 'Features - E-Code | Enterprise-Grade Development Tools',
    description: 'Discover powerful features: AI-powered code generation, real-time collaboration, instant deployment, 40+ languages, and enterprise security. Built for Fortune 500 standards.',
    keywords: 'IDE features, AI code assistant, real-time collaboration, instant deployment, multi-language support, enterprise security',
    canonical: `${BASE_URL}/features`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/features.png`,
  },
  '/about': {
    title: 'About E-Code - Our Mission & Leadership Team',
    description: 'E-Code is revolutionizing software development with AI. Learn about our mission to democratize coding and meet our world-class leadership team.',
    keywords: 'E-Code company, about E-Code, E-Code team, software development mission, AI development company',
    canonical: `${BASE_URL}/about`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/about.png`,
  },
  '/careers': {
    title: 'Careers at E-Code - Join Our Global Team',
    description: 'Build the future of software development. Join our distributed team working on cutting-edge AI and cloud technologies. Remote-first culture, competitive benefits.',
    keywords: 'E-Code jobs, software engineering careers, remote developer jobs, AI company careers, tech startup jobs',
    canonical: `${BASE_URL}/careers`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/careers.png`,
  },
  '/contact': {
    title: 'Contact E-Code - Get in Touch',
    description: 'Reach out to the E-Code team for sales inquiries, technical support, or partnership opportunities. We respond within 24 hours.',
    keywords: 'contact E-Code, E-Code support, E-Code sales, get in touch',
    canonical: `${BASE_URL}/contact`,
    ogType: 'website',
  },
  '/contact-sales': {
    title: 'Contact Sales - E-Code | Enterprise Plans',
    description: 'Talk to our enterprise sales team about custom plans, volume pricing, dedicated support, and SSO integration for your organization.',
    keywords: 'E-Code enterprise sales, custom pricing, enterprise plan, sales contact',
    canonical: `${BASE_URL}/contact-sales`,
    ogType: 'website',
  },
  '/ai': {
    title: 'AI Platform - E-Code | Enterprise AI Development',
    description: 'Build with AI agents that understand your codebase. Generate production code, debug automatically, and deploy with confidence. SOC 2 compliant AI governance.',
    keywords: 'AI code generation, AI pair programmer, GPT coding, AI development tools, automated coding, AI code review',
    canonical: `${BASE_URL}/ai`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/ai.png`,
  },
  '/mobile': {
    title: 'Mobile App - E-Code | Code Anywhere on iOS & Android',
    description: 'Ship from anywhere with our fully-featured mobile IDE. iOS and Android apps with full code editing, debugging, and deployment capabilities.',
    keywords: 'mobile IDE, code on mobile, iOS code editor, Android development app, mobile programming',
    canonical: `${BASE_URL}/mobile`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/mobile.png`,
  },
  '/desktop': {
    title: 'Desktop App - E-Code | Native Performance, Cloud Power',
    description: 'The full E-Code experience on your desktop. Offline support, secure device sync, and native performance. Available for Windows, macOS, and Linux.',
    keywords: 'E-Code desktop, native IDE, offline code editor, desktop development app, cross-platform IDE',
    canonical: `${BASE_URL}/desktop`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/desktop.png`,
  },
  '/security': {
    title: 'Security & Compliance - E-Code | SOC 2 & GDPR Certified',
    description: 'Bank-level security for your code. SOC 2 Type II certified, GDPR compliant, end-to-end encryption. Built for Fortune 500 security requirements.',
    keywords: 'code security, SOC 2 compliance, GDPR development, enterprise security, secure code hosting, data protection',
    canonical: `${BASE_URL}/security`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/security.png`,
  },
  '/docs': {
    title: 'Documentation - E-Code | Guides & API Reference',
    description: 'Comprehensive documentation for E-Code. Quick start guides, API reference, tutorials, and best practices for developers.',
    keywords: 'E-Code documentation, API reference, developer guides, coding tutorials, platform documentation',
    canonical: `${BASE_URL}/docs`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/docs.png`,
  },
  '/blog': {
    title: 'Blog - E-Code | Engineering & Product Updates',
    description: 'Stories on shipping software at global scale. Engineering insights, product updates, and best practices from the E-Code team.',
    keywords: 'E-Code blog, software engineering blog, development tips, tech blog, product updates',
    canonical: `${BASE_URL}/blog`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/blog.png`,
  },
  '/community': {
    title: 'Community - E-Code | Connect with Developers Worldwide',
    description: 'Join the E-Code community of developers and creators. Share projects, get help, and collaborate with builders worldwide.',
    keywords: 'developer community, coding community, E-Code users, programming forum, developer network',
    canonical: `${BASE_URL}/community`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/community.png`,
  },
  '/templates': {
    title: 'Templates - E-Code | 100+ Ready-to-Deploy Starters',
    description: 'Launch faster with industry-specific templates. React, Node.js, Python, and 100+ pre-built starters ready to deploy in one click.',
    keywords: 'code templates, project starters, boilerplate code, React templates, Node.js templates, project templates',
    canonical: `${BASE_URL}/templates`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/templates.png`,
  },
  '/changelog': {
    title: 'Changelog - E-Code | Product Updates & New Features',
    description: 'Stay updated with the latest E-Code features, improvements, and bug fixes. Detailed release notes and version history.',
    keywords: 'E-Code changelog, product updates, release notes, new features, version history',
    canonical: `${BASE_URL}/changelog`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/changelog.png`,
  },
  '/tutorials': {
    title: 'Tutorials - E-Code | Step-by-Step Development Guides',
    description: 'Learn to build real-world applications with guided tutorials. From beginner to advanced, covering all major technologies.',
    keywords: 'coding tutorials, programming guides, learn development, step-by-step coding, developer tutorials',
    canonical: `${BASE_URL}/tutorials`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/tutorials.png`,
  },
  '/languages': {
    title: 'Supported Languages - E-Code | 40+ Programming Languages',
    description: 'Code in 40+ languages including Python, JavaScript, TypeScript, Go, Rust, Java, C++, and more. Full language server support with AI assistance for every language.',
    keywords: 'programming languages, multi-language IDE, Python IDE, JavaScript IDE, TypeScript editor, Go editor',
    canonical: `${BASE_URL}/languages`,
    ogType: 'website',
  },
  '/status': {
    title: 'System Status - E-Code | Uptime & Incidents',
    description: 'Real-time status of E-Code services. Check uptime, response times, and incident history for all platform components.',
    keywords: 'E-Code status, system uptime, service incidents, platform health',
    canonical: `${BASE_URL}/status`,
    ogType: 'website',
    noindex: true,
  },
  '/terms': {
    title: 'Terms of Service - E-Code',
    description: 'E-Code Terms of Service. Read our complete terms governing the use of our development platform and services.',
    canonical: `${BASE_URL}/terms`,
    ogType: 'website',
    noindex: true,
  },
  '/privacy': {
    title: 'Privacy Policy - E-Code',
    description: 'E-Code Privacy Policy. Learn how we collect, use, and protect your data in accordance with GDPR and CCPA regulations.',
    canonical: `${BASE_URL}/privacy`,
    ogType: 'website',
    noindex: true,
  },
  '/dpa': {
    title: 'Data Processing Agreement - E-Code',
    description: 'E-Code Data Processing Agreement for enterprise customers. GDPR-compliant data processing terms.',
    canonical: `${BASE_URL}/dpa`,
    ogType: 'website',
    noindex: true,
  },
  '/accessibility': {
    title: 'Accessibility Statement - E-Code',
    description: 'E-Code is committed to making our platform accessible. Learn about our WCAG 2.1 AA compliance efforts and accessibility features.',
    canonical: `${BASE_URL}/accessibility`,
    ogType: 'website',
  },
  '/solutions/enterprise': {
    title: 'Enterprise Solutions - E-Code | Fortune 500 Development Platform',
    description: 'Enterprise-grade development platform with SSO, audit logs, custom roles, dedicated support, and 99.99% SLA. Trusted by Fortune 500 companies.',
    keywords: 'enterprise development, Fortune 500 IDE, enterprise cloud IDE, corporate development platform, enterprise software development',
    canonical: `${BASE_URL}/solutions/enterprise`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/solutions/enterprise.png`,
  },
  '/solutions/startups': {
    title: 'Startup Solutions - E-Code | Ship 10x Faster',
    description: 'Build your MVP in days, not months. AI-powered development, instant deployment, and pricing that scales with your growth.',
    keywords: 'startup development, MVP builder, rapid prototyping, startup tools, fast development, scale startup',
    canonical: `${BASE_URL}/solutions/startups`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/solutions/startups.png`,
  },
  '/solutions/freelancers': {
    title: 'Freelancer Solutions - E-Code | Deliver Client Projects Faster',
    description: 'Impress clients with faster delivery. AI-assisted development, professional deployments, and portfolio hosting included.',
    keywords: 'freelancer tools, freelance development, client projects, portfolio hosting, contractor development',
    canonical: `${BASE_URL}/solutions/freelancers`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/solutions/freelancers.png`,
  },
  '/solutions/education': {
    title: 'Education Solutions - E-Code | The Best Platform to Learn Coding',
    description: 'The best platform for learning to code. Interactive tutorials, AI tutoring, instant feedback, and collaborative classrooms.',
    keywords: 'learn to code, coding education, programming tutorials, computer science education, coding bootcamp',
    canonical: `${BASE_URL}/solutions/education`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/solutions/education.png`,
  },
  '/solutions/app-builder': {
    title: 'App Builder - E-Code | Build Full-Stack Applications with AI',
    description: 'Rapidly prototype and deploy full-stack applications with AI assistance. From idea to production in hours. React, Node.js, databases, and more.',
    keywords: 'app builder, full-stack development, rapid prototyping, AI app development, no-code app builder, web app creator',
    canonical: `${BASE_URL}/solutions/app-builder`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/solutions/app-builder.png`,
  },
  '/solutions/website-builder': {
    title: 'Website Builder - E-Code | Professional Sites in Minutes',
    description: 'Create polished marketing sites, landing pages, and portfolios with zero setup. AI-generated content, responsive design, instant deployment.',
    keywords: 'website builder, landing page creator, AI website builder, marketing site builder, portfolio creator',
    canonical: `${BASE_URL}/solutions/website-builder`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/solutions/website-builder.png`,
  },
  '/solutions/game-builder': {
    title: 'Game Builder - E-Code | Create Interactive Experiences',
    description: 'Design and launch interactive games and experiences powered by AI. 2D/3D engines, multiplayer support, and instant publishing.',
    keywords: 'game builder, game development platform, AI game creation, online game maker, interactive experience builder',
    canonical: `${BASE_URL}/solutions/game-builder`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/solutions/game-builder.png`,
  },
  '/solutions/dashboard-builder': {
    title: 'Dashboard Builder - E-Code | Data Visualization Made Easy',
    description: 'Build data-rich dashboards with real-time collaboration. Charts, graphs, KPIs, and analytics. Connect to any data source.',
    keywords: 'dashboard builder, data visualization, analytics dashboard, business intelligence, real-time dashboard',
    canonical: `${BASE_URL}/solutions/dashboard-builder`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/solutions/dashboard-builder.png`,
  },
  '/solutions/chatbot-builder': {
    title: 'Chatbot Builder - E-Code | Deploy AI Assistants',
    description: 'Deploy conversational AI assistants across your organization. GPT-powered, trainable on your data, enterprise-ready.',
    keywords: 'chatbot builder, AI assistant, conversational AI, GPT chatbot, customer support bot, enterprise chatbot',
    canonical: `${BASE_URL}/solutions/chatbot-builder`,
    ogType: 'website',
    ogImage: `${BASE_URL}/assets/og/solutions/chatbot-builder.png`,
  },
  '/compare/replit': {
    title: 'E-Code vs Replit - Enterprise-Grade Alternative',
    description: 'Compare E-Code and Replit feature-by-feature. E-Code delivers superior AI capabilities, enterprise security, and team collaboration at competitive pricing.',
    keywords: 'E-Code vs Replit, Replit alternative, enterprise IDE alternative, Replit comparison',
    canonical: `${BASE_URL}/compare/replit`,
    ogType: 'website',
  },
  '/compare/github-codespaces': {
    title: 'E-Code vs GitHub Codespaces - Smarter Cloud Development',
    description: 'Compare E-Code and GitHub Codespaces. Built-in AI agents, faster startup times, and no per-minute billing. The smarter cloud development choice.',
    keywords: 'E-Code vs GitHub Codespaces, Codespaces alternative, cloud IDE comparison, GitHub Codespaces alternative',
    canonical: `${BASE_URL}/compare/github-codespaces`,
    ogType: 'website',
  },
  '/compare/cursor': {
    title: 'E-Code vs Cursor - Full Cloud IDE vs AI Code Editor',
    description: 'Compare E-Code and Cursor. E-Code is a full cloud IDE with AI — no local setup, instant collaboration, and built-in deployment. No download required.',
    keywords: 'E-Code vs Cursor, Cursor alternative, cloud AI IDE, AI code editor comparison',
    canonical: `${BASE_URL}/compare/cursor`,
    ogType: 'website',
  },
  '/compare/vercel-v0': {
    title: 'E-Code vs Vercel v0 - Full IDE vs UI Generator',
    description: 'E-Code builds complete applications, not just UI components. Compare our full-stack AI development platform against Vercel v0.',
    keywords: 'E-Code vs Vercel v0, v0 alternative, AI app builder vs UI generator',
    canonical: `${BASE_URL}/compare/vercel-v0`,
    ogType: 'website',
  },
  '/partners': {
    title: 'Partners - E-Code | Technology & Channel Partners',
    description: 'Join the E-Code partner ecosystem. Technology integrations, channel resellers, and consulting partners building on our platform.',
    keywords: 'E-Code partners, technology partners, channel partners, ISV partners',
    canonical: `${BASE_URL}/partners`,
    ogType: 'website',
  },
  '/press': {
    title: 'Press & Media - E-Code | News & Press Kit',
    description: 'E-Code press resources, brand assets, and media contacts. Download our press kit and find the latest news coverage.',
    keywords: 'E-Code press, media kit, press releases, news coverage, brand assets',
    canonical: `${BASE_URL}/press`,
    ogType: 'website',
  },
  '/help-center': {
    title: 'Help Center - E-Code | Support & FAQs',
    description: 'Get answers to common questions about E-Code. Browse our help articles, tutorials, and troubleshooting guides.',
    keywords: 'E-Code help, support center, FAQ, troubleshooting, how to use E-Code',
    canonical: `${BASE_URL}/help-center`,
    ogType: 'website',
  },
  '/case-studies': {
    title: 'Case Studies - E-Code | Customer Success Stories',
    description: 'See how engineering teams use E-Code to ship faster. Real results from startups, enterprises, and individual developers.',
    keywords: 'E-Code case studies, customer success, developer stories, enterprise case studies',
    canonical: `${BASE_URL}/case-studies`,
    ogType: 'website',
  },
};

const ORGANIZATION_SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'E-Code',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/icons/icon-192x192.png`,
        width: 192,
        height: 192,
      },
      sameAs: [
        'https://twitter.com/ecodesocial',
        'https://github.com/e-code',
        'https://linkedin.com/company/e-code',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@e-code.ai',
        url: `${BASE_URL}/contact`,
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: 'E-Code',
      description: 'AI-Powered Cloud Development Platform',
      publisher: { '@id': `${BASE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${BASE_URL}/#software`,
      name: 'E-Code',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web, Windows, macOS, Linux, iOS, Android',
      description: 'AI-powered cloud IDE for building and deploying applications',
      url: BASE_URL,
      publisher: { '@id': `${BASE_URL}/#organization` },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free plan available',
      },
    },
  ],
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function getPageMeta(pathname: string): PageMeta {
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  return PAGE_META[cleanPath] || PAGE_META['/'];
}

export function buildSsrMetaBlock(meta: PageMeta): string {
  const canonical = meta.canonical || BASE_URL;
  const ogImage = meta.ogImage || DEFAULT_OG_IMAGE;
  const ogType = meta.ogType || 'website';
  const robots = meta.noindex ? 'noindex, nofollow' : 'index, follow';
  const desc = escapeHtml(meta.description);
  const title = escapeHtml(meta.title);
  const kw = meta.keywords ? escapeHtml(meta.keywords) : '';

  return `
    <meta name="robots" content="${robots}" />
    <meta name="googlebot" content="${robots}" />
    ${kw ? `<meta name="keywords" content="${kw}" />` : ''}
    <link rel="canonical" href="${canonical}" />

    <!-- Open Graph -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${title}" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="${TWITTER_SITE}" />
    <meta name="twitter:creator" content="${TWITTER_SITE}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${ogImage}" />

    <!-- Structured Data: Organization + WebSite + SoftwareApplication -->
    <script type="application/ld+json">${ORGANIZATION_SCHEMA}</script>`;
}

export function injectSsrMeta(html: string, pathname: string): string {
  const meta = getPageMeta(pathname);
  const metaBlock = buildSsrMetaBlock(meta);

  let result = html;

  result = result.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(meta.title)}</title>`,
  );

  result = result.replace(
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
  );

  result = result.replace('<!-- SSR_SEO_META -->', metaBlock);

  return result;
}
