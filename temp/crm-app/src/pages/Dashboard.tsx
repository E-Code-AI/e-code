import React from 'react';
import { useQuery } from 'react-query';
import { useAuthStore } from '../stores/authStore';
import {
  Users,
  UserPlus,
  Briefcase,
  DollarSign,
  TrendingUp,
  Target,
  Activity,
  CheckCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export function Dashboard() {
  const { token } = useAuthStore();

  const { data: stats } = useQuery('dashboard-stats', async () => {
    const response = await fetch('http://localhost:3002/api/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.json();
  });

  // Sample data for charts
  const revenueData = [
    { month: 'Jan', revenue: 45000 },
    { month: 'Feb', revenue: 52000 },
    { month: 'Mar', revenue: 48000 },
    { month: 'Apr', revenue: 61000 },
    { month: 'May', revenue: 69000 },
    { month: 'Jun', revenue: 75000 },
  ];

  const leadSourceData = [
    { name: 'Website', value: 35, color: '#3B82F6' },
    { name: 'Referral', value: 25, color: '#10B981' },
    { name: 'Social Media', value: 20, color: '#F59E0B' },
    { name: 'Email', value: 15, color: '#8B5CF6' },
    { name: 'Other', value: 5, color: '#6B7280' },
  ];

  const performanceData = [
    { name: 'Calls', target: 100, actual: 85 },
    { name: 'Emails', target: 150, actual: 172 },
    { name: 'Meetings', target: 20, actual: 18 },
    { name: 'Proposals', target: 15, actual: 22 },
  ];

  const statCards = [
    {
      title: 'Total Customers',
      value: stats?.totalCustomers || 0,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
      trend: 'up'
    },
    {
      title: 'Active Leads',
      value: stats?.totalLeads || 0,
      icon: UserPlus,
      color: 'bg-green-500',
      change: '+8%',
      trend: 'up'
    },
    {
      title: 'Open Deals',
      value: stats?.activeDeals || 0,
      icon: Briefcase,
      color: 'bg-purple-500',
      change: '+15%',
      trend: 'up'
    },
    {
      title: 'Revenue',
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
      change: '+23%',
      trend: 'up'
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your sales overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">{stat.change}</span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="stat-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources */}
        <div className="stat-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Lead Sources
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadSourceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {leadSourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="stat-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Sales Performance
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="target" fill="#E5E7EB" name="Target" />
            <Bar dataKey="actual" fill="#3B82F6" name="Actual" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activities
          </h3>
          <div className="space-y-4">
            {[
              { icon: CheckCircle, text: 'Deal closed with Acme Corp - $45,000', time: '2 hours ago' },
              { icon: UserPlus, text: 'New lead from website - Sarah Johnson', time: '3 hours ago' },
              { icon: Activity, text: 'Meeting scheduled with Tech Solutions', time: '5 hours ago' },
              { icon: Target, text: 'Proposal sent to Global Industries', time: '1 day ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <activity.icon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="stat-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Performers
          </h3>
          <div className="space-y-4">
            {[
              { name: 'Alex Morgan', deals: 12, revenue: '$156,000' },
              { name: 'Jordan Lee', deals: 10, revenue: '$142,000' },
              { name: 'Sam Taylor', deals: 9, revenue: '$128,000' },
              { name: 'Chris Brown', deals: 8, revenue: '$115,000' },
            ].map((performer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {performer.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{performer.name}</p>
                    <p className="text-xs text-gray-500">{performer.deals} deals closed</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900">{performer.revenue}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}