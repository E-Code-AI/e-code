import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Zap, 
  Cpu, 
  Database, 
  Network,
  HardDrive,
  Clock,
  Shield,
  Gauge,
  TrendingUp,
  Activity,
  BarChart3,
  Settings,
  Crown,
  Star,
  CheckCircle2,
  AlertTriangle,
  Info,
  Rocket,
  Globe,
  Lock
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CurrentPlan {
  name: string;
  cpu: { current: number; max: number; unit: string };
  memory: { current: number; max: number; unit: string };
  storage: { current: number; max: number; unit: string };
  network: { current: number; max: number; unit: string };
  builds: { current: number; max: number; unit: string };
}

interface PowerUp {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  boost: string;
  price: string;
  active: boolean;
  usage: number;
  color: string;
}

export default function PowerUps() {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Fetch current plan from API
  const { data: currentPlan, isLoading: planLoading } = useQuery<CurrentPlan>({
    queryKey: ['/api/powerups/current-plan'],
  });

  // Fetch power-ups from API
  const { data: powerUps = [], isLoading: powerUpsLoading } = useQuery<PowerUp[]>({
    queryKey: ['/api/powerups'],
  });

  // Fetch usage stats from API
  const { data: usageStats = [] } = useQuery<any[]>({
    queryKey: ['/api/powerups/usage-stats'],
  });

  // Fetch recommendations from API
  const { data: recommendations = [] } = useQuery<any[]>({
    queryKey: ['/api/powerups/recommendations'],
  });

  const getUsageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUsageProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const PowerUpCard = ({ powerUp }: { powerUp: PowerUp }) => {
    const iconMap: Record<string, any> = {
      Cpu,
      Database,
      HardDrive,
      Network,
      Rocket,
      Shield
    };
    const IconComponent = iconMap[powerUp.icon] || Zap;
    
    return (
      <Card className={`relative overflow-hidden ${powerUp.active ? 'ring-2 ring-primary' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${powerUp.color}`}>
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{powerUp.name}</h3>
                  <p className="text-sm text-muted-foreground">{powerUp.category}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{powerUp.boost}</Badge>
                  {powerUp.active && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                {powerUp.description}
              </p>
              
              {powerUp.active && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Usage</span>
                    <span className={getUsageColor(powerUp.usage)}>{powerUp.usage}%</span>
                  </div>
                  <Progress value={powerUp.usage} className="h-2" />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">{powerUp.price}</span>
                <div className="flex items-center gap-2">
                  <Switch checked={powerUp.active} />
                  <Button size="sm" variant={powerUp.active ? "outline" : "default"}>
                    {powerUp.active ? 'Manage' : 'Activate'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                {currentPlan?.name || 'Current'} Plan
              </CardTitle>
              <CardDescription>Your current resource allocation and usage</CardDescription>
            </div>
            <Button variant="outline">Upgrade Plan</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">CPU</span>
              </div>
              <p className="text-2xl font-bold">{currentPlan?.cpu.current || 0}/{currentPlan?.cpu.max || 0}</p>
              <p className="text-xs text-muted-foreground">{currentPlan?.cpu.unit || ''}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Memory</span>
              </div>
              <p className="text-2xl font-bold">{currentPlan?.memory.current || 0}/{currentPlan?.memory.max || 0}</p>
              <p className="text-xs text-muted-foreground">{currentPlan?.memory.unit || ''}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Storage</span>
              </div>
              <p className="text-2xl font-bold">{currentPlan?.storage.current || 0}/{currentPlan?.storage.max || 0}</p>
              <p className="text-xs text-muted-foreground">{currentPlan?.storage.unit || ''}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Network</span>
              </div>
              <p className="text-2xl font-bold">{currentPlan?.network.current || 0}/{currentPlan?.network.max || 0}</p>
              <p className="text-xs text-muted-foreground">{currentPlan?.network.unit || ''}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Builds</span>
              </div>
              <p className="text-2xl font-bold">{currentPlan?.builds.current || 0}/{currentPlan?.builds.max || 0}</p>
              <p className="text-xs text-muted-foreground">{currentPlan?.builds.unit || ''}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Power-Ups */}
      <Card>
        <CardHeader>
          <CardTitle>Active Power-Ups</CardTitle>
          <CardDescription>Currently enabled performance boosters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {powerUps.filter(p => p.active).map((powerUp) => (
              <div key={powerUp.id} className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${powerUp.color}`}>
                    <powerUp.icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium">{powerUp.name}</h3>
                    <p className="text-sm text-muted-foreground">{powerUp.price}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Usage</span>
                    <span className={getUsageColor(powerUp.usage)}>{powerUp.usage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getUsageProgressColor(powerUp.usage)}`}
                      style={{ width: `${powerUp.usage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>Optimize your performance based on usage patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="mt-0.5">
                  {rec.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                  {rec.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
                  {rec.type === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{rec.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                  {rec.action && (
                    <Button size="sm" variant="outline">
                      {rec.action}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              Power-Ups
            </h1>
            <p className="text-muted-foreground">Boost your development performance with premium resources</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
            <Button size="sm">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="powerups">All Power-Ups</TabsTrigger>
            <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="powerups" className="space-y-6">
            <div className="grid gap-4">
              {powerUps.map((powerUp) => (
                <PowerUpCard key={powerUp.id} powerUp={powerUp} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {usageStats.map((stat, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{stat.label}</h3>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-2xl font-bold">{stat.value}</span>
                          <span className="text-sm text-muted-foreground">/ {stat.limit} {stat.unit}</span>
                        </div>
                        <Progress value={(stat.value / stat.limit) * 100} />
                        <p className="text-xs text-muted-foreground">
                          {((stat.value / stat.limit) * 100).toFixed(1)}% of limit used
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Usage Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage Over Time</CardTitle>
                <CardDescription>Track your resource consumption patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Usage analytics chart would appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing Summary</CardTitle>
                <CardDescription>Current month charges and usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Pro Plan</p>
                      <p className="text-sm text-muted-foreground">Base subscription</p>
                    </div>
                    <span className="font-semibold">$29.00</span>
                  </div>
                  
                  {powerUps.filter(p => p.active).map((powerUp) => (
                    <div key={powerUp.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{powerUp.name}</p>
                        <p className="text-sm text-muted-foreground">Power-up subscription</p>
                      </div>
                      <span className="font-semibold">{powerUp.price}</span>
                    </div>
                  ))}
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total this month</span>
                      <span className="text-xl font-bold">$59.00</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Next billing date: February 15, 2025</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Manage your billing information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                      VISA
                    </div>
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/26</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Update</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}