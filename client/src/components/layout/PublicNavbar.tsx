// @ts-nocheck
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Menu,
  X,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Search,
  LogIn,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ECodeLogo } from '@/components/ECodeLogo';
import './MobileNavigation.css';

export function PublicNavbar() {
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const productItems = [
    { title: 'AI Agent', href: '/ai-agent', description: 'Build production-ready apps with natural language prompts.' },
    { title: 'Browser IDE', href: '/features', description: 'Enterprise-grade development workspace built for teams.' },
    { title: 'Multiplayer', href: '/features#multiplayer', description: 'Live collaboration, pair programming, and shared presence.' },
    { title: 'Mobile App', href: '/mobile', description: 'Ship from anywhere with a fully-featured mobile IDE.' },
    { title: 'Desktop App', href: '/desktop', description: 'Optimized offline workflow with secure device sync.' },
    { title: 'AI Platform', href: '/ai', description: 'Governance, observability, and orchestration for AI workloads.' },
    { title: 'Deployments', href: '/marketing/deployments', description: 'Global edge infrastructure with Fortune 500 reliability.' },
    { title: 'Bounties', href: '/marketing/bounties', description: 'Activate an on-demand developer network to accelerate delivery.' },
    { title: 'Teams', href: '/marketing/teams', description: 'Enterprise controls, compliance, and insights for large orgs.' },
  ];

  const solutionsItems = [
    { title: 'App Builder', href: '/solutions/app-builder', description: 'Rapidly prototype and deploy full-stack applications.' },
    { title: 'Website Builder', href: '/solutions/website-builder', description: 'Create polished marketing sites with zero setup.' },
    { title: 'Game Builder', href: '/solutions/game-builder', description: 'Design and launch interactive experiences powered by AI.' },
    { title: 'Dashboard Builder', href: '/solutions/dashboard-builder', description: 'Data-rich dashboards with real-time collaboration.' },
    { title: 'Chatbot / AI Agent Builder', href: '/solutions/chatbot-builder', description: 'Deploy conversational assistants across your organization.' },
    { title: 'Internal AI Builder', href: '/solutions/internal-ai-builder', description: 'Bring private AI agents to every team safely and securely.' },
  ];

  const resourcesItems = [
    { title: 'Documentation', href: '/docs', description: 'Get started quickly with step-by-step guides.' },
    { title: 'AI Documentation', href: '/ai-documentation', description: 'Complete AI capabilities guide' },
    { title: 'Blog', href: '/blog', description: 'Stories on shipping software at global scale.' },
    { title: 'Community', href: '/community', description: 'Connect with builders and share best practices.' },
    { title: 'Templates', href: '/templates', description: 'Launch with curated, industry-specific templates.' },
    { title: 'Languages', href: '/templates/languages', description: 'Build in 40+ languages without local installs.' },
    { title: 'Status', href: '/status', description: 'Transparency around platform availability.' },
    { title: 'Forum', href: '/forum', description: 'Get support from E-Code experts and peers.' },
  ];

  const companyItems = [
    { title: 'About', href: '/about', description: 'Learn about our mission and leadership team.' },
    { title: 'Careers', href: '/careers', description: 'Join a distributed team building the future of software.' },
    { title: 'Press', href: '/press', description: 'Press releases, media kit, and recent coverage.' },
    { title: 'Partners', href: '/partners', description: 'Strategic alliances and solution partners.' },
  ];

  const desktopNav = (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Product</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[480px] gap-3 p-4 md:w-[520px] md:grid-cols-2 lg:w-[640px]">
              {productItems.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="block rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-sky-500/10"
                  >
                    <div className="text-sm font-semibold text-[var(--ecode-text)] dark:text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-sky-300" />
                      {item.title}
                    </div>
                    <p className="mt-2 text-sm text-[var(--ecode-text-secondary)] dark:text-slate-300 leading-relaxed">
                      {item.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[480px] gap-3 p-4 md:w-[520px] md:grid-cols-2 lg:w-[640px]">
              {solutionsItems.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="block rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-sky-500/10"
                  >
                    <div className="text-sm font-semibold text-[var(--ecode-text)] dark:text-white flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-indigo-300" />
                      {item.title}
                    </div>
                    <p className="mt-2 text-sm text-[var(--ecode-text-secondary)] dark:text-slate-300 leading-relaxed">
                      {item.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[480px] gap-3 p-4 md:w-[520px] md:grid-cols-2 lg:w-[640px]">
              {resourcesItems.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="block rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-sky-500/10"
                  >
                    <div className="text-sm font-semibold text-[var(--ecode-text)] dark:text-white flex items-center gap-2">
                      <Search className="h-4 w-4 text-sky-300" />
                      {item.title}
                    </div>
                    <p className="mt-2 text-sm text-[var(--ecode-text-secondary)] dark:text-slate-300 leading-relaxed">
                      {item.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger>Company</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[360px] gap-3 p-4">
              {companyItems.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="block rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all duration-200 hover:-translate-y-1 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-sky-500/10"
                  >
                    <div className="text-sm font-semibold text-[var(--ecode-text)] dark:text-white flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-indigo-300" />
                      {item.title}
                    </div>
                    <p className="mt-2 text-sm text-[var(--ecode-text-secondary)] dark:text-slate-300 leading-relaxed">
                      {item.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink
            href="/pricing"
            className="group inline-flex h-10 w-max items-center justify-center rounded-full border border-[var(--ecode-border)] dark:border-white/15 px-5 text-sm font-medium text-[var(--ecode-text)] dark:text-slate-200 transition-colors hover:border-[var(--ecode-accent)] dark:hover:border-white/40 hover:text-[var(--ecode-accent)] dark:hover:text-white"
          >
            Pricing
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink
            href="/team"
            className="group inline-flex h-10 w-max items-center justify-center rounded-full border border-[var(--ecode-border)] dark:border-white/15 px-5 text-sm font-medium text-[var(--ecode-text)] dark:text-slate-200 transition-colors hover:border-[var(--ecode-accent)] dark:hover:border-white/40 hover:text-[var(--ecode-accent)] dark:hover:text-white"
          >
            Teams
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );

  const primaryCta = (
    <Button
      onClick={() => window.location.href = '/register'}
      className="hidden sm:inline-flex bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-[var(--ecode-text)] dark:text-white hover:from-sky-300 hover:via-blue-400 hover:to-indigo-400 shadow-lg shadow-blue-500/25"
    >
      Get started
    </Button>
  );

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="hidden md:block border-b border-[var(--ecode-border)] dark:border-white/10 bg-[#ffffff] dark:bg-gradient-to-r dark:from-sky-500/20 dark:via-indigo-500/20 dark:to-purple-500/20">
        <div className="container-responsive flex h-10 items-center justify-between text-xs text-[var(--ecode-text)] dark:text-slate-100">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-[var(--ecode-accent)]/10 text-[var(--ecode-accent)] dark:bg-white/15 dark:text-white border-[var(--ecode-accent)]/20 dark:border-white/25 uppercase tracking-[0.2em]">
              NEW
            </Badge>
            <p className="font-medium">Introducing E-Code Enterprise Cloud with dedicated AI governance and auditability.</p>
          </div>
          <button
            className="inline-flex items-center gap-1 text-[var(--ecode-accent)] hover:text-[var(--ecode-accent-hover)] dark:text-sky-200 dark:hover:text-white transition-colors"
            onClick={() => navigate('/contact-sales')}
          >
            Talk to an expert
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      <nav className="relative border-b border-[var(--ecode-border)] bg-[#ffffff] dark:border-white/10 dark:bg-slate-950/75 backdrop-blur-xl">
        <div className="absolute inset-0 marketing-grid opacity-0 dark:opacity-100" aria-hidden />
        <div className="container-responsive relative">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/">
                <div className="cursor-pointer">
                  <ECodeLogo size="sm" />
                </div>
              </Link>

              <div className="hidden lg:block text-[var(--ecode-text)] dark:text-slate-200">
                {desktopNav}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeSwitcher />
              <Button
                variant="ghost"
                className="text-[var(--ecode-text)] dark:text-slate-200 hover:text-[var(--ecode-accent)] dark:hover:text-white"
                onClick={() => window.location.href = '/login'}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Log in
              </Button>
              {primaryCta}

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden text-[var(--ecode-text)] dark:text-[var(--ecode-text)] dark:text-slate-100">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="sheet-content w-full sm:w-[420px] p-0 border-l border-[var(--ecode-border)]/50 bg-gradient-to-b from-[#ffffff] to-[#f8f9fa] dark:from-[var(--ecode-surface)] dark:to-[var(--ecode-surface)]/95 backdrop-blur-xl">
                  {/* Mobile Header with improved design */}
                  <div className="mobile-nav-header sticky top-0 z-10 border-b border-[var(--ecode-border)]/20 bg-white/80 dark:bg-[var(--ecode-surface)]/80 px-6 py-5 backdrop-blur-lg">
                    <div className="flex items-center justify-between mb-4">
                      <ECodeLogo size="sm" />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded-full hover:bg-[var(--ecode-sidebar-hover)] transition-all duration-200"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ecode-text-muted)] transition-colors group-focus-within:text-[var(--ecode-accent)]" />
                      <Input
                        placeholder="Search products, docs, or people"
                        className="pl-10 h-11 bg-white dark:bg-white/5 border-[var(--ecode-border)]/30 hover:border-[var(--ecode-accent)]/50 focus:border-[var(--ecode-accent)] transition-all duration-200 rounded-xl text-[var(--ecode-text)] placeholder:text-[var(--ecode-text-muted)]"
                      />
                    </div>
                  </div>

                  {/* CTA Buttons with enhanced styling */}
                  <div className="p-6 border-b border-[var(--ecode-border)]/20">
                    <Button
                      className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => window.location.href = '/register'}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Get Started Free
                    </Button>
                    <Button
                      variant="outline"
                      className="mt-3 w-full h-11 border-[var(--ecode-border)] hover:border-[var(--ecode-accent)] text-[var(--ecode-text)] hover:text-[var(--ecode-accent)] hover:bg-[var(--ecode-accent)]/5 rounded-xl transition-all duration-200"
                      onClick={() => window.location.href = '/login'}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In
                    </Button>
                  </div>

                  {/* Navigation Sections with improved design */}
                  <ScrollArea className="h-[calc(100vh-280px)] mobile-nav-content">
                    <div className="px-6 py-4">
                      {[
                        { 
                          title: 'Product', 
                          items: productItems,
                          icon: '🚀',
                          color: 'from-sky-500/10 to-blue-500/10 dark:from-sky-500/20 dark:to-blue-500/20'
                        }, 
                        { 
                          title: 'Solutions', 
                          items: solutionsItems,
                          icon: '💡',
                          color: 'from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20'
                        }, 
                        { 
                          title: 'Resources', 
                          items: resourcesItems,
                          icon: '📚',
                          color: 'from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20'
                        }, 
                        { 
                          title: 'Company', 
                          items: companyItems,
                          icon: '🏢',
                          color: 'from-orange-500/10 to-red-500/10 dark:from-orange-500/20 dark:to-red-500/20'
                        }
                      ].map((section, sectionIndex) => (
                        <div key={section.title} className={sectionIndex > 0 ? 'mt-8' : ''}>
                          {/* Section Header with icon */}
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">{section.icon}</span>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--ecode-text)]">
                              {section.title}
                            </h3>
                          </div>
                          
                          {/* Items Grid */}
                          <div className="grid gap-2">
                            {section.items.map((item, itemIndex) => (
                              <button
                                key={item.title}
                                onClick={() => {
                                  setMobileMenuOpen(false);
                                  setTimeout(() => navigate(item.href), 150);
                                }}
                                className={`mobile-nav-item group relative overflow-hidden rounded-xl bg-gradient-to-br ${section.color} border border-[var(--ecode-border)]/20 p-4 text-left transition-all duration-300 hover:border-[var(--ecode-accent)]/40 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`}
                                style={{
                                  animation: `fadeInUp 0.3s ease-out ${itemIndex * 0.05}s both`
                                }}
                              >
                                {/* Background gradient effect on hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-[var(--ecode-accent)]/0 to-[var(--ecode-accent)]/0 group-hover:from-[var(--ecode-accent)]/10 group-hover:to-transparent transition-all duration-500" />
                                
                                <div className="relative">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <span className="text-sm font-semibold text-[var(--ecode-text)] group-hover:text-[var(--ecode-accent)] transition-colors">
                                        {item.title}
                                      </span>
                                      <p className="mt-1 text-xs text-[var(--ecode-text-secondary)] line-clamp-2">
                                        {item.description}
                                      </p>
                                    </div>
                                    <ChevronRight className="mobile-nav-icon ml-2 h-4 w-4 text-[var(--ecode-text-muted)] group-hover:text-[var(--ecode-accent)] group-hover:translate-x-1 transition-all duration-300" />
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {/* Footer Links */}
                      <div className="mt-8 pt-8 border-t border-[var(--ecode-border)]/20">
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Pricing', href: '/pricing', icon: '💎' },
                            { label: 'Teams', href: '/team', icon: '👥' },
                            { label: 'Support', href: '/support', icon: '🛟' },
                            { label: 'Contact', href: '/contact-sales', icon: '📞' }
                          ].map((link) => (
                            <button
                              key={link.label}
                              onClick={() => {
                                setMobileMenuOpen(false);
                                setTimeout(() => navigate(link.href), 150);
                              }}
                              className="flex items-center justify-center gap-2 h-11 rounded-xl border border-[var(--ecode-border)] hover:border-[var(--ecode-accent)] bg-white dark:bg-white/5 hover:bg-[var(--ecode-accent)]/5 text-sm font-medium text-[var(--ecode-text)] hover:text-[var(--ecode-accent)] transition-all duration-200"
                            >
                              <span>{link.icon}</span>
                              {link.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
