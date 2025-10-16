// @ts-nocheck
import { ReactNode } from 'react';
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
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/api-keys', icon: Key, label: 'API Keys' },
    { path: '/admin/cms', icon: FileText, label: 'CMS Pages' },
    { path: '/admin/docs', icon: Book, label: 'Documentation' },
    { path: '/admin/support', icon: Ticket, label: 'Support' },
    { path: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
    { path: '/admin/activity', icon: Activity, label: 'Activity Logs' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-zinc-400 mt-1">E-Code Administration</p>
        </div>
        
        <nav className="px-4 pb-4">
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
            <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white">
              <LogOut className="mr-3 h-4 w-4" />
              Exit Admin
            </Button>
          </Link>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-zinc-900">
        {children}
      </main>
    </div>
  );
}