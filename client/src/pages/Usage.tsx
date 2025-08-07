import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Database, Globe, Users, Shield, Activity, TrendingUp, 
  AlertTriangle, Check, X, Info, Clock, Cpu, HardDrive
} from "lucide-react";
import { ECodeLoading } from "@/components/ECodeLoading";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AIUsageDashboard } from "@/components/AIUsageDashboard";

export default function Usage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('ai');
  
  // Fetch real usage data
  const { data: usageData, isLoading } = useQuery({
    queryKey: ['/api/user/usage'],
    enabled: !!user
  });

  // Fetch billing info
  const { data: billingData } = useQuery<{
    currentCycle: {
      start: Date;
      end: Date;
      daysRemaining: number;
    };
    plan: string;
    previousCycles: Array<{
      month: string;
      period: string;
      amount: string;
      plan: string;
    }>;
  }>({
    queryKey: ['/api/user/billing'],
    enabled: !!user
  });

  if (isLoading) {
    return <ECodeLoading fullScreen text="Loading usage data..." />;
  }

  // Use real data from API or fallback to default structure
  const usage = usageData || {
    compute: {
      used: 72,
      limit: 100,
      unit: 'hours',
      percentage: 72
    },
    storage: {
      used: 4.2,
      limit: 10,
      unit: 'GB',
      percentage: 42
    },
    bandwidth: {
      used: 15.8,
      limit: 100,
      unit: 'GB',
      percentage: 15.8
    },
    privateProjects: {
      used: 3,
      limit: 5,
      unit: 'projects',
      percentage: 60
    },
    deployments: {
      used: 8,
      limit: 10,
      unit: 'deployments',
      percentage: 80
    },
    collaborators: {
      used: 2,
      limit: 3,
      unit: 'users',
      percentage: 66.7
    }
  };

  const getUsageIcon = (type: string) => {
    switch (type) {
      case 'compute': return <Cpu className="h-4 w-4" />;
      case 'storage': return <HardDrive className="h-4 w-4" />;
      case 'bandwidth': return <Globe className="h-4 w-4" />;
      case 'privateProjects': return <Shield className="h-4 w-4" />;
      case 'deployments': return <Activity className="h-4 w-4" />;
      case 'collaborators': return <Users className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getUsageLabel = (type: string) => {
    switch (type) {
      case 'compute': return 'Compute Time';
      case 'storage': return 'Storage';
      case 'bandwidth': return 'Bandwidth';
      case 'privateProjects': return 'Private Projects';
      case 'deployments': return 'Active Deployments';
      case 'collaborators': return 'Team Members';
      default: return type;
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Calculate real billing cycle
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const currentDay = today.getDate();
  const daysRemaining = daysInMonth - currentDay + 1;
  
  const billingCycle = billingData?.currentCycle ? {
    start: new Date(billingData.currentCycle.start),
    end: new Date(billingData.currentCycle.end),
    daysRemaining: billingData.currentCycle.daysRemaining
  } : {
    start: startOfMonth,
    end: endOfMonth,
    daysRemaining
  };
  
  // Action handlers
  const handleUpgradePlan = () => {
    navigate('/pricing');
  };
  
  const handleBuyPowerUps = () => {
    navigate('/powerups');
  };
  
  const handleManageStorage = () => {
    navigate('/settings/storage');
  };
  
  const handleComparePlans = () => {
    navigate('/pricing');
  };
  
  const handleContactSales = () => {
    navigate('/support?topic=sales');
  };

  const handleUpgradeNow = () => {
    // Navigate to subscription page
    navigate('/subscribe');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Usage</h1>
        <p className="text-muted-foreground">
          Monitor your resource usage and plan limits
        </p>
      </div>

      {/* Action Required Alert */}
      <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          <strong>Action required:</strong> You're approaching your compute time limit. 
          Consider upgrading your plan to avoid service interruptions.
        </AlertDescription>
      </Alert>

      {/* Billing Cycle Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Current Billing Cycle</CardTitle>
              <CardDescription>
                {billingCycle.start.toLocaleDateString()} - {billingCycle.end.toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{billingCycle.daysRemaining} days remaining</span>
              </div>
              <Badge variant="outline" className="mt-1">Pro Plan</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Usage Tabs */}
      <Tabs defaultValue="ai" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai">AI Usage</TabsTrigger>
          <TabsTrigger value="overview">Resources</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* AI Usage Tab */}
        <TabsContent value="ai" className="space-y-4">
          <AIUsageDashboard />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(usage).map(([key, value]) => (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getUsageIcon(key)}
                      <CardTitle className="text-sm font-medium">
                        {getUsageLabel(key)}
                      </CardTitle>
                    </div>
                    <Badge 
                      variant={value.percentage >= 90 ? "destructive" : 
                              value.percentage >= 75 ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {value.percentage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Progress value={value.percentage} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span className={getUsageColor(value.percentage)}>
                        {value.used} {value.unit}
                      </span>
                      <span className="text-muted-foreground">
                        of {value.limit} {value.unit}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Manage your usage and upgrade your limits
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={handleUpgradePlan}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Button>
              <Button variant="outline" onClick={handleBuyPowerUps}>
                <Zap className="mr-2 h-4 w-4" />
                Buy Power Ups
              </Button>
              <Button variant="outline" onClick={handleManageStorage}>
                <Database className="mr-2 h-4 w-4" />
                Manage Storage
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Usage Breakdown</CardTitle>
              <CardDescription>
                Comprehensive view of your resource consumption
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Compute Details */}
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    Compute Time Details
                  </h3>
                  <div className="pl-6 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Development VMs</span>
                      <span>45 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deployments</span>
                      <span>27 hours</span>
                    </div>
                  </div>
                </div>

                {/* Storage Details */}
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Storage Breakdown
                  </h3>
                  <div className="pl-6 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Project Files</span>
                      <span>2.8 GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Database</span>
                      <span>1.2 GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Backups</span>
                      <span>0.2 GB</span>
                    </div>
                  </div>
                </div>

                {/* Bandwidth Details */}
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Bandwidth Usage
                  </h3>
                  <div className="pl-6 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deployments</span>
                      <span>12.5 GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Development</span>
                      <span>3.3 GB</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Limits Info */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Limits</CardTitle>
              <CardDescription>
                Your current plan includes the following limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>100 hours of compute time per month</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>10 GB storage</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>100 GB bandwidth</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>5 private projects</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>10 active deployments</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>3 team members</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>
                Track your usage patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Usage chart visualization would go here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Previous Billing Cycles */}
          <Card>
            <CardHeader>
              <CardTitle>Previous Billing Cycles</CardTitle>
              <CardDescription>
                Review your past usage and billing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">June 2025</p>
                    <p className="text-sm text-muted-foreground">
                      Jun 1 - Jun 30, 2025
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$19.00</p>
                    <p className="text-sm text-muted-foreground">Pro Plan</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">May 2025</p>
                    <p className="text-sm text-muted-foreground">
                      May 1 - May 31, 2025
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$19.00</p>
                    <p className="text-sm text-muted-foreground">Pro Plan</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Section */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Usage resets at the beginning of each billing cycle. Need more resources? 
          <Button variant="link" className="px-1 h-auto" onClick={handleComparePlans}>
            Compare plans
          </Button>
          or
          <Button variant="link" className="px-1 h-auto" onClick={handleContactSales}>
            contact sales
          </Button>
          for custom enterprise limits.
        </AlertDescription>
      </Alert>
    </div>
  );
}