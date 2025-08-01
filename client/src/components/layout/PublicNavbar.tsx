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
import { 
  Menu, X, ChevronDown, Code, ChevronRight, Sparkles, 
  Terminal, Users, Smartphone, Monitor, Brain, Rocket, 
  DollarSign, FileText, BookOpen, MessageSquare, Globe,
  Briefcase, Building, Newspaper, Handshake, Star,
  Search, Settings, LogIn
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { ECodeLogo } from '@/components/ECodeLogo';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import './MobileNavigation.css';

export function PublicNavbar() {
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const productItems = [
    { title: 'AI Agent', href: '/ai-agent', description: 'Build apps with AI in seconds' },
    { title: 'IDE', href: '/features', description: 'Code in your browser' },
    { title: 'Multiplayer', href: '/features#multiplayer', description: 'Code with your team' },
    { title: 'Mobile App', href: '/mobile', description: 'Code on the go' },
    { title: 'Desktop App', href: '/desktop', description: 'Code offline' },
    { title: 'AI', href: '/ai', description: 'AI-powered coding' },
    { title: 'Deployments', href: '/deployments', description: 'Host your apps' },
    { title: 'Bounties', href: '/bounties', description: 'Earn by coding' },
  ];

  const resourcesItems = [
    { title: 'Documentation', href: '/docs', description: 'Learn how to use E-Code' },
    { title: 'Blog', href: '/blog', description: 'News and updates' },
    { title: 'Community', href: '/community', description: 'Connect with developers' },
    { title: 'Templates', href: '/templates', description: 'Start from a template' },
    { title: 'Status', href: '/status', description: 'Service uptime' },
    { title: 'Forum', href: '/forum', description: 'Get help' },
  ];

  const companyItems = [
    { title: 'About', href: '/about', description: 'Our mission' },
    { title: 'Careers', href: '/careers', description: 'Join our team' },
    { title: 'Press', href: '/press', description: 'News coverage' },
    { title: 'Partners', href: '/partners', description: 'Work with us' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-responsive">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/">
              <div className="cursor-pointer">
                <ECodeLogo size="sm" />
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:block">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Product</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                        {productItems.map((item) => (
                          <li key={item.title}>
                            <Link href={item.href} className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                              <div className="text-sm font-medium leading-none">{item.title}</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
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
                      <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                        {resourcesItems.map((item) => (
                          <li key={item.title}>
                            <Link href={item.href} className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                              <div className="text-sm font-medium leading-none">{item.title}</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
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
                      <ul className="grid w-[400px] gap-3 p-4">
                        {companyItems.map((item) => (
                          <li key={item.title}>
                            <Link href={item.href} className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                              <div className="text-sm font-medium leading-none">{item.title}</div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
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
                      className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                    >
                      Pricing
                    </NavigationMenuLink>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink 
                      href="/teams"
                      className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                    >
                      Teams
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            
            <Button variant="ghost" onClick={() => window.location.href = '/login'}>
              Log in
            </Button>
            
            <Button onClick={() => window.location.href = '/register'} className="hidden sm:inline-flex">
              Sign up
            </Button>

            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[480px] p-0 overflow-hidden sheet-content">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="mobile-nav-header px-6 py-4 border-b bg-background/95 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <ECodeLogo size="sm" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Search Bar */}
                    <div className="mt-4 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search E-Code..."
                        className="pl-10 h-9 bg-muted/50 focus:bg-background"
                      />
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <ScrollArea className="flex-1">
                    <div className="mobile-nav-content px-6 py-4 space-y-6">
                      {/* Featured Actions */}
                      <div className="mobile-nav-grid grid grid-cols-2 gap-3">
                        <Button
                          className="mobile-nav-item h-auto py-4 px-4 flex-col gap-2 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigate('/');
                          }}
                        >
                          <Sparkles className="mobile-nav-icon h-5 w-5" />
                          <span className="text-xs font-medium">Start Building</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="mobile-nav-item h-auto py-4 px-4 flex-col gap-2"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            navigate('/templates');
                          }}
                        >
                          <FileText className="mobile-nav-icon h-5 w-5" />
                          <span className="text-xs font-medium">Browse Templates</span>
                        </Button>
                      </div>

                      {/* Product Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Product</h3>
                          <Badge variant="secondary" className="text-[10px]">8 Features</Badge>
                        </div>
                        <div className="space-y-1">
                          {productItems.map((item) => {
                            const icons: Record<string, any> = {
                              'AI Agent': Brain,
                              'IDE': Terminal,
                              'Multiplayer': Users,
                              'Mobile App': Smartphone,
                              'Desktop App': Monitor,
                              'AI': Sparkles,
                              'Deployments': Rocket,
                              'Bounties': DollarSign
                            };
                            const Icon = icons[item.title] || Code;
                            
                            return (
                              <Link key={item.title} href={item.href}>
                                <Button
                                  variant="ghost"
                                  className="mobile-nav-item w-full justify-start h-auto py-3 px-3 hover:bg-muted/80"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  <div className="flex items-start gap-3 w-full">
                                    <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
                                      <Icon className="mobile-nav-icon h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="font-medium text-sm">{item.title}</div>
                                      <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-2" />
                                  </div>
                                </Button>
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />

                      {/* Resources Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Resources</h3>
                          <Badge variant="secondary" className="text-[10px]">6 Items</Badge>
                        </div>
                        <div className="space-y-1">
                          {resourcesItems.map((item) => {
                            const icons: Record<string, any> = {
                              'Documentation': BookOpen,
                              'Blog': Newspaper,
                              'Community': MessageSquare,
                              'Templates': FileText,
                              'Status': Globe,
                              'Forum': Users
                            };
                            const Icon = icons[item.title] || FileText;
                            
                            return (
                              <Link key={item.title} href={item.href}>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start h-auto py-3 px-3 hover:bg-muted/80"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  <div className="flex items-start gap-3 w-full">
                                    <div className="rounded-lg bg-muted p-2 mt-0.5">
                                      <Icon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="font-medium text-sm">{item.title}</div>
                                      <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-2" />
                                  </div>
                                </Button>
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />

                      {/* Company Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Company</h3>
                          <Badge variant="secondary" className="text-[10px]">4 Pages</Badge>
                        </div>
                        <div className="space-y-1">
                          {companyItems.map((item) => {
                            const icons: Record<string, any> = {
                              'About': Building,
                              'Careers': Briefcase,
                              'Press': Newspaper,
                              'Partners': Handshake
                            };
                            const Icon = icons[item.title] || Building;
                            
                            return (
                              <Link key={item.title} href={item.href}>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start h-auto py-3 px-3 hover:bg-muted/80"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  <div className="flex items-start gap-3 w-full">
                                    <div className="rounded-lg bg-muted p-2 mt-0.5">
                                      <Icon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 text-left">
                                      <div className="font-medium text-sm">{item.title}</div>
                                      <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-2" />
                                  </div>
                                </Button>
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />

                      {/* Quick Links */}
                      <div className="grid grid-cols-2 gap-3">
                        <Link href="/pricing">
                          <Button
                            variant="outline"
                            className="w-full h-auto py-3 flex flex-col gap-1"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Star className="h-4 w-4" />
                            <span className="text-xs">Pricing</span>
                          </Button>
                        </Link>
                        <Link href="/teams">
                          <Button
                            variant="outline"
                            className="w-full h-auto py-3 flex flex-col gap-1"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Users className="h-4 w-4" />
                            <span className="text-xs">Teams</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </ScrollArea>

                  {/* Footer Actions */}
                  <div className="border-t bg-background/95 backdrop-blur p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setTimeout(() => navigate('/auth'), 150);
                        }}
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        Log in
                      </Button>
                      <Button 
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setTimeout(() => navigate('/auth'), 150);
                        }}
                      >
                        Sign up
                      </Button>
                    </div>
                    <div className="flex items-center justify-between px-2">
                      <ThemeSwitcher />
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                        <Settings className="h-3 w-3 mr-1" />
                        Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}