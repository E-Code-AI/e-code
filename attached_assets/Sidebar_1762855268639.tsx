import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Code2,
  Settings,
  FileText,
  Database,
  Terminal,
  Users,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { ECodeLogo } from './ECodeLogo';
import { useAuth } from '@/hooks/use-auth';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const { profile, isAdmin } = useAuth();

  const mainNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/app', badge: null },
    { icon: FolderOpen, label: 'Projects', href: '/app/projects', badge: null },
    { icon: Code2, label: 'Editor', href: '/app/editor', badge: null },
    { icon: Terminal, label: 'Terminal', href: '/app/terminal', badge: null },
    { icon: FileText, label: 'Files', href: '/app/files', badge: null },
    { icon: Database, label: 'Database', href: '/app/database', badge: null },
  ];

  const teamNavItems = [
    { icon: Users, label: 'Team', href: '/app/team', badge: null },
    { icon: Sparkles, label: 'AI Agent', href: '/app/ai-agent', badge: 'NEW' },
  ];

  const bottomNavItems = [
    { icon: Settings, label: 'Settings', href: '/app/settings', badge: null },
  ];

  return (
    <aside className={`w-64 h-screen bg-[var(--ecode-surface)] dark:bg-slate-950 border-r border-[var(--ecode-border)] dark:border-white/10 flex flex-col ${className}`}>
      {/* Logo Header */}
      <div className="p-4 border-b border-[var(--ecode-border)] dark:border-white/10">
        <Link to="/app">
          <div className="cursor-pointer">
            <ECodeLogo size="sm" />
          </div>
        </Link>
      </div>

      {/* User Profile Quick Info */}
      {profile && (
        <div className="p-4 border-b border-[var(--ecode-border)] dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 flex items-center justify-center">
              <span className="text-white font-semibold">
                {profile.name?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--ecode-text)] dark:text-white truncate">
                {profile.name || 'User'}
              </p>
              <p className="text-xs text-[var(--ecode-text-secondary)] dark:text-slate-400 truncate">
                {profile.email}
              </p>
            </div>
          </div>
          {isAdmin && (
            <Badge className="mt-2 bg-gradient-to-r from-sky-400 to-blue-500 text-white border-0">
              Admin
            </Badge>
          )}
        </div>
      )}

      {/* Main Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ecode-text-muted)] dark:text-slate-400">
              Workspace
            </p>
          </div>
          {mainNavItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Button
                variant="ghost"
                className="w-full justify-start text-[var(--ecode-text)] dark:text-slate-200 hover:bg-[var(--ecode-surface-secondary)] dark:hover:bg-white/5 hover:text-[var(--ecode-accent)] dark:hover:text-white"
              >
                <item.icon className="mr-3 h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          ))}

          <Separator className="my-3" />

          <div className="px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ecode-text-muted)] dark:text-slate-400">
              Collaboration
            </p>
          </div>
          {teamNavItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Button
                variant="ghost"
                className="w-full justify-start text-[var(--ecode-text)] dark:text-slate-200 hover:bg-[var(--ecode-surface-secondary)] dark:hover:bg-white/5 hover:text-[var(--ecode-accent)] dark:hover:text-white"
              >
                <item.icon className="mr-3 h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge className="ml-auto text-xs bg-gradient-to-r from-sky-400 to-blue-500 text-white border-0">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="p-3 mt-4">
          <div className="rounded-xl border border-[var(--ecode-border)] dark:border-white/10 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 p-4">
            <div className="flex items-start gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-sky-500 dark:text-sky-400 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-[var(--ecode-text)] dark:text-white">
                  AI Agent Ready
                </h4>
                <p className="text-xs text-[var(--ecode-text-secondary)] dark:text-slate-300 mt-1">
                  Build faster with AI assistance
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white hover:from-sky-300 hover:via-blue-400 hover:to-indigo-400"
              onClick={() => window.location.href = '/app/ai-agent'}
            >
              Open AI Agent
              <ChevronRight className="ml-2 h-3 w-3" />
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-[var(--ecode-border)] dark:border-white/10 space-y-1">
        {bottomNavItems.map((item) => (
          <Link key={item.href} to={item.href}>
            <Button
              variant="ghost"
              className="w-full justify-start text-[var(--ecode-text)] dark:text-slate-200 hover:bg-[var(--ecode-surface-secondary)] dark:hover:bg-white/5 hover:text-[var(--ecode-accent)] dark:hover:text-white"
            >
              <item.icon className="mr-3 h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </aside>
  );
}