import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Users, Activity, DollarSign, TrendingUp, 
  Search, Filter, Download, BarChart3,
  Cpu, HardDrive, Globe, Database, Zap, Bot
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface UserUsage {
  userId: number;
  username: string;
  email: string;
  plan: string;
  usage: {
    compute: { used: number; limit: number; cost: number };
    storage: { used: number; limit: number; cost: number };
    bandwidth: { used: number; limit: number; cost: number };
    deployments: { used: number; limit: number; cost: number };
    databases: { used: number; limit: number; cost: number };
    agentRequests: { used: number; limit: number; cost: number };
  };
  totalCost: number;
  billingPeriod: string;
}

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  usageByService: {
    compute: { total: number; cost: number };
    storage: { total: number; cost: number };
    bandwidth: { total: number; cost: number };
    deployments: { total: number; cost: number };
    databases: { total: number; cost: number };
    agentRequests: { total: number; cost: number };
  };
}

export default function AdminUsage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const { user } = useAuth();

  // Check if user is admin
  if (!user || !user.email?.includes('admin')) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Access denied. Admin privileges required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: platformStats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ['/api/admin/usage/stats', selectedPeriod],
  });

  const { data: usersUsage, isLoading: usageLoading } = useQuery<UserUsage[]>({
    queryKey: ['/api/admin/usage/users', selectedPeriod, selectedPlan, searchTerm],
  });

  const filteredUsers = usersUsage?.filter(user => 
    (selectedPlan === "all" || user.plan === selectedPlan) &&
    (searchTerm === "" || 
     user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) || [];

  const getUsageIcon = (type: string) => {
    switch (type) {
      case 'compute': return <Cpu className="h-4 w-4" />;
      case 'storage': return <HardDrive className="h-4 w-4" />;
      case 'bandwidth': return <Globe className="h-4 w-4" />;
      case 'deployments': return <Activity className="h-4 w-4" />;
      case 'databases': return <Database className="h-4 w-4" />;
      case 'agentRequests': return <Bot className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const formatUsage = (value: number, unit: string) => {
    if (unit === 'GB' || unit === 'hours') {
      return `${value.toFixed(2)} ${unit}`;
    }
    return `${Math.round(value)} ${unit}`;
  };

  const formatCost = (cost: number) => {
    return `€${cost.toFixed(2)}`;
  };

  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'starter': return 'bg-gray-100 text-gray-800';
      case 'core': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-green-100 text-green-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportUsageData = () => {
    if (!usersUsage) return;
    
    const csvData = usersUsage.map(user => ({
      Username: user.username,
      Email: user.email,
      Plan: user.plan,
      'Compute (hours)': user.usage.compute.used,
      'Storage (GB)': user.usage.storage.used,
      'Bandwidth (GB)': user.usage.bandwidth.used,
      'Deployments': user.usage.deployments.used,
      'Databases': user.usage.databases.used,
      'AI Requests': user.usage.agentRequests.used,
      'Total Cost': user.totalCost
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (statsLoading || usageLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading admin usage data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Analytics</h1>
          <p className="text-muted-foreground">Monitor platform usage and billing</p>
        </div>
        <Button onClick={exportUsageData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Platform Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {platformStats?.activeUsers || 0} active this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(platformStats?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From subscriptions and usage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12.5%</div>
            <p className="text-xs text-muted-foreground">
              vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Service</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AI Agent</div>
            <p className="text-xs text-muted-foreground">
              Most used service
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Service */}
      <Card>
        <CardHeader>
          <CardTitle>Usage by Service</CardTitle>
          <CardDescription>Platform-wide resource consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(platformStats?.usageByService || {}).map(([service, data]) => (
              <div key={service} className="flex items-center space-x-4">
                {getUsageIcon(service)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="capitalize text-sm font-medium">{service.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCost(data.cost)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatUsage(data.total, service === 'agentRequests' ? 'requests' : 
                               service === 'deployments' ? 'deployments' :
                               service === 'databases' ? 'operations' : 'GB')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Usage Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Usage Details</CardTitle>
              <CardDescription>Individual user consumption and costs</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Plans</option>
                <option value="starter">Starter</option>
                <option value="core">Core</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Compute</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Bandwidth</TableHead>
                <TableHead>AI Requests</TableHead>
                <TableHead>Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlanColor(user.plan)}>
                      {user.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatUsage(user.usage.compute.used, 'hours')}
                      <div className="text-xs text-muted-foreground">
                        {formatCost(user.usage.compute.cost)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatUsage(user.usage.storage.used, 'GB')}
                      <div className="text-xs text-muted-foreground">
                        {formatCost(user.usage.storage.cost)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatUsage(user.usage.bandwidth.used, 'GB')}
                      <div className="text-xs text-muted-foreground">
                        {formatCost(user.usage.bandwidth.cost)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatUsage(user.usage.agentRequests.used, 'requests')}
                      <div className="text-xs text-muted-foreground">
                        {formatCost(user.usage.agentRequests.cost)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {formatCost(user.totalCost)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}