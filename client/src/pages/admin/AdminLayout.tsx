import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard,
  Users,
  Key,
  FileText,
  Ticket,
  CreditCard,
  Book,
  Activity,
  Settings,
  Inbox,
  LogOut,
  Menu,
  X,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/ai-optimization', icon: Zap, label: 'AI Optimization' },
    { path: '/admin/requests', icon: Inbox, label: 'Customer Requests' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/api-keys', icon: Key, label: 'API Keys' },
    { path: '/admin/cms', icon: FileText, label: 'CMS Pages' },
    { path: '/admin/docs', icon: Book, label: 'Documentation' },
    { path: '/admin/support', icon: Ticket, label: 'Support' },
    { path: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
    { path: '/admin/activity', icon: Activity, label: 'Activity Logs' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex h-screen relative">
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50 bg-zinc-800 text-white hover:bg-zinc-700"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        data-testid="button-mobile-menu"
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={closeMobileMenu}
          data-testid="backdrop-mobile-menu"
        />
      )}

      {/* Sidebar - Responsive */}
      <aside className={`
        fixed lg:relative
        w-64 h-full
        bg-zinc-950 border-r border-zinc-800
        z-40
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 mt-14 lg:mt-0">
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-zinc-400 mt-1">E-Code Administration</p>
        </div>
        
        <nav className="px-4 pb-20">
          {navItems.map((item) => {
            const isActive = location === item.path || 
              (item.path !== '/admin' && location.startsWith(item.path));
            const Icon = item.icon;
            
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`w-full justify-start mb-1 ${
                    isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                  onClick={closeMobileMenu}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800">
          <Link href="/">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-zinc-400 hover:text-white"
              onClick={closeMobileMenu}
              data-testid="button-exit-admin"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Exit Admin
            </Button>
          </Link>
        </div>
      </aside>
      
      {/* Main Content - Responsive */}
      <main className="flex-1 w-full lg:w-auto overflow-y-auto bg-zinc-900">
        {children}
      </main>
    </div>
  );
}