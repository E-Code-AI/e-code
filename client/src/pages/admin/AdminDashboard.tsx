import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  DollarSign, 
  FileText, 
  Ticket,
  TrendingUp,
  Package,
  BookOpen,
  Globe
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { apiRequest } from '@/lib/queryClient';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  totalRevenue: number;
  activeSubscriptions: number;
  openTickets: number;
  publishedDocs: number;
  publishedPages: number;
}

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/dashboard/stats']
  });

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      description: `${stats?.activeUsers || 0} active in last 30 days`,
      color: 'text-blue-500'
    },
    {
      title: 'Revenue',
      value: `$${(stats?.totalRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      description: `${stats?.activeSubscriptions || 0} active subscriptions`,
      color: 'text-green-500'
    },
    {
      title: 'Projects',
      value: stats?.totalProjects || 0,
      icon: Package,
      description: 'Total projects created',
      color: 'text-purple-500'
    },
    {
      title: 'Open Tickets',
      value: stats?.openTickets || 0,
      icon: Ticket,
      description: 'Awaiting response',
      color: 'text-orange-500'
    },
    {
      title: 'Documentation',
      value: stats?.publishedDocs || 0,
      icon: BookOpen,
      description: 'Published articles',
      color: 'text-cyan-500'
    },
    {
      title: 'CMS Pages',
      value: stats?.publishedPages || 0,
      icon: FileText,
      description: 'Published pages',
      color: 'text-pink-500'
    }
  ];

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-zinc-400">Overview of your platform statistics</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-zinc-800 border-zinc-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-zinc-700 rounded w-24 animate-pulse" />
                  <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-zinc-700 rounded w-16 mb-1 animate-pulse" />
                  <div className="h-3 bg-zinc-700 rounded w-32 animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-300">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <p className="text-xs text-zinc-500 mt-1">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">New user registration</p>
                    <p className="text-xs text-zinc-500">user@example.com joined 5 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">New project created</p>
                    <p className="text-xs text-zinc-500">AI Chat App by john_doe</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">Support ticket opened</p>
                    <p className="text-xs text-zinc-500">Billing inquiry - Priority: High</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center space-x-3">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-white">View All Users</span>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center space-x-3">
                <Ticket className="h-5 w-5 text-orange-500" />
                <span className="text-sm text-white">Open Tickets</span>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-sm text-white">Revenue Report</span>
              </CardContent>
            </Card>
            <Card className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center space-x-3">
                <Globe className="h-5 w-5 text-purple-500" />
                <span className="text-sm text-white">System Status</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}