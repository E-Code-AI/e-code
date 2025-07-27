import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  Bell,
  Settings,
  LogOut,
  User,
  Zap,
  Crown,
  HelpCircle,
  Book,
  Users,
  Code,
  Database,
  Globe,
  Menu,
  X,
  Lock,
  Terminal,
  Palette,
  Workflow,
  Shield,
  HardDrive,
  Key,
  Package,
  ChevronDown,
  GraduationCap,
  DollarSign,
  Gift,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { NotificationCenter } from "@/components/NotificationCenter";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { useIsMobile } from "@/hooks/use-media-query";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { ECodeLogo } from "@/components/ECodeLogo";
import { MobileMenu } from "./MobileMenu";

export function ReplitHeader() {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => location === path;

  return (
    <>
    <header className="h-14 bg-[var(--ecode-surface)] border-b border-[var(--ecode-border)] flex items-center justify-between px-4 replit-transition shadow-sm">
      {/* Logo et navigation principale */}
      <div className="flex items-center">
        {/* Mobile menu button - only on mobile */}
        <div className="lg:hidden mr-2">
          <MobileMenu onOpenSpotlight={() => setSpotlightOpen(true)} />
        </div>
        
        {/* E-Code Logo */}
        <Link href="/">
          <div className="group cursor-pointer flex items-center">
            <ECodeLogo size="sm" showText={!isMobile} className="group-hover:opacity-80 transition-opacity" />
          </div>
        </Link>

        {/* Navigation principale - hidden on mobile */}
        <nav className="hidden lg:flex items-center space-x-1 ml-8">
          {/* Create Button - First like Replit */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)] replit-transition"
              >
                <Plus className="mr-1 h-4 w-4" />
                Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[var(--ecode-surface)] border-[var(--ecode-border)]">
              <DropdownMenuItem className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]" onClick={() => navigate('/agent')}>
                <Zap className="mr-2 h-4 w-4" />
                Build with AI
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]" onClick={() => navigate('/new')}>
                <Code className="mr-2 h-4 w-4" />
                Start from scratch
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]" onClick={() => navigate('/templates')}>
                <Package className="mr-2 h-4 w-4" />
                From template
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]" onClick={() => navigate('/github-import')}>
                <Database className="mr-2 h-4 w-4" />
                Import from GitHub
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--ecode-border)]" />
              <DropdownMenuItem className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]" onClick={() => navigate('/teams/new')}>
                <Users className="mr-2 h-4 w-4" />
                Create a team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Home - Second like Replit */}
          <Link href="/dashboard">
            <Button
              variant={isActive("/dashboard") ? "default" : "ghost"}
              size="sm"
              className={`replit-transition ${
                isActive("/dashboard")
                  ? "bg-[var(--ecode-accent)] text-white"
                  : "text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
              }`}
            >
              Home
            </Button>
          </Link>

          {/* Apps - Third like Replit */}
          <Link href="/projects">
            <Button
              variant={isActive("/projects") ? "default" : "ghost"}
              size="sm"
              className={`replit-transition ${
                isActive("/projects")
                  ? "bg-[var(--ecode-accent)] text-white"
                  : "text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
              }`}
            >
              Apps
            </Button>
          </Link>

          {/* Deployments - Fourth like Replit */}
          <Link href="/deployments">
            <Button
              variant={isActive("/deployments") ? "default" : "ghost"}
              size="sm"
              className={`replit-transition ${
                isActive("/deployments")
                  ? "bg-[var(--ecode-accent)] text-white"
                  : "text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
              }`}
            >
              Deployments
            </Button>
          </Link>

          {/* Usage - Fifth like Replit */}
          <Link href="/usage">
            <Button
              variant={isActive("/usage") ? "default" : "ghost"}
              size="sm"
              className={`replit-transition relative ${
                isActive("/usage")
                  ? "bg-[var(--ecode-accent)] text-white"
                  : "text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
              }`}
            >
              Usage
              <span className="absolute -top-1 -right-2 px-1.5 py-0.5 text-[10px] font-medium bg-orange-500 text-white rounded">
                Action required
              </span>
            </Button>
          </Link>

          {/* Teams - Sixth like Replit */}
          <Link href="/teams">
            <Button
              variant={isActive("/teams") ? "default" : "ghost"}
              size="sm"
              className={`replit-transition ${
                isActive("/teams")
                  ? "bg-[var(--ecode-accent)] text-white"
                  : "text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
              }`}
            >
              Teams
            </Button>
          </Link>
        </nav>
      </div>

      {/* Search bar - only on larger screens */}
      <div className="flex-1 max-w-md mx-4 sm:mx-6 hidden lg:block">
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal bg-[var(--ecode-surface-secondary)] border-[var(--ecode-border)] text-[var(--ecode-text-secondary)] hover:bg-[var(--ecode-sidebar-hover)]"
          onClick={() => setSpotlightOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="hidden xl:inline">Search or run a command...</span>
          <span className="xl:hidden">Search...</span>
          <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      {/* Actions utilisateur */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Bouton Plan Pro */}
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex items-center space-x-1 border-[var(--ecode-warning)] text-[var(--ecode-warning)] hover:bg-[var(--ecode-warning)]/10 replit-transition"
        >
          <Crown className="h-4 w-4" />
          <span>Upgrade</span>
        </Button>



        {/* Notifications */}
        <NotificationCenter />

        {/* Menu utilisateur */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 replit-hover">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl || ""} alt={user?.username} />
                <AvatarFallback className="bg-[var(--ecode-accent)] text-white">
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-[var(--ecode-surface)] border-[var(--ecode-border)]" align="end">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium text-[var(--ecode-text)]">{user?.displayName || user?.username}</p>
                <p className="w-[200px] truncate text-sm text-[var(--ecode-text-secondary)]">
                  {user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator className="bg-[var(--ecode-border)]" />
            
            <DropdownMenuItem 
              onClick={() => navigate(`/@${user?.username}`)}
              className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]">
              <User className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => navigate('/account')}
              className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]">
              <Settings className="mr-2 h-4 w-4" />
              Account
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-[var(--ecode-border)]" />
            
            <DropdownMenuItem 
              onClick={() => navigate('/cycles')}
              className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]">
              <Zap className="mr-2 h-4 w-4" />
              Cycles & Power Ups
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => navigate('/deployments')}
              className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]">
              <Globe className="mr-2 h-4 w-4" />
              Deployments
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => navigate('/bounties')}
              className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]">
              <DollarSign className="mr-2 h-4 w-4" />
              Bounties
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => navigate('/teams')}
              className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]">
              <Users className="mr-2 h-4 w-4" />
              Teams & Orgs
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-[var(--ecode-border)]" />
            
            <DropdownMenuItem 
              onClick={() => navigate('/learn')}
              className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]">
              <GraduationCap className="mr-2 h-4 w-4" />
              Learn
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => navigate('/docs')}
              className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]">
              <Book className="mr-2 h-4 w-4" />
              Documentation
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => navigate('/support')}
              className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]">
              <HelpCircle className="mr-2 h-4 w-4" />
              Support
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-[var(--ecode-border)]" />
            
            <DropdownMenuItem 
              onClick={() => navigate('/referrals')}
              className="text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]">
              <Gift className="mr-2 h-4 w-4" />
              Refer a Friend
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-[var(--ecode-border)]" />
            
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-[var(--ecode-danger)] hover:bg-[var(--ecode-danger)]/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    <SpotlightSearch open={spotlightOpen} onOpenChange={setSpotlightOpen} />
    </>
  );
}