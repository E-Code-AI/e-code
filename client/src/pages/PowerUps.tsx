import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { 
  Zap, 
  Rocket, 
  Crown, 
  Star, 
  Infinity,
  Timer,
  Shield,
  Code,
  Users,
  Database,
  Globe,
  Cpu,
  HardDrive,
  Lock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Package,
  Settings,
  CreditCard,
  RefreshCw,
  Info
} from 'lucide-react';

interface PowerUp {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  duration?: string;
  features: string[];
  active: boolean;
  expiresAt?: string;
  category: string;
}

export default function PowerUps() {
  const [activeTab, setActiveTab] = useState('available');

  // Fetch power-ups data
  const { data: powerUps = [], isLoading } = useQuery<PowerUp[]>({
    queryKey: ['/api/powerups']
  });

  // Fetch user's active power-ups
  const { data: activePowerUps = [] } = useQuery<PowerUp[]>({
    queryKey: ['/api/powerups/active']
  });

  // Purchase power-up mutation
  const purchaseMutation = useMutation({
    mutationFn: async (powerUpId: string) => {
      const response = await fetch(`/api/powerups/${powerUpId}/purchase`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to purchase power-up');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/powerups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/powerups/active'] });
      toast({
        title: "Power-Up Activated!",
        description: "Your power-up has been successfully activated.",
      });
    }
  });

  const categories = [
    { id: 'compute', name: 'Compute Power', icon: Cpu, color: 'bg-blue-500' },
    { id: 'storage', name: 'Storage', icon: HardDrive, color: 'bg-green-500' },
    { id: 'collaboration', name: 'Collaboration', icon: Users, color: 'bg-purple-500' },
    { id: 'ai', name: 'AI Features', icon: Rocket, color: 'bg-orange-500' },
    { id: 'security', name: 'Security', icon: Shield, color: 'bg-red-500' }
  ];

  const PowerUpCard = ({ powerUp, isActive = false }: { powerUp: PowerUp; isActive?: boolean }) => {
    const iconMap: Record<string, any> = {
      Zap, Rocket, Crown, Star, Infinity, Timer, Shield, Code, Users, Database, Globe, Cpu, HardDrive, Lock
    };
    const IconComponent = iconMap[powerUp.icon] || Zap;
    const categoryInfo = categories.find(c => c.id === powerUp.category);

    return (
      <Card className={`relative overflow-hidden ${isActive ? 'border-primary' : ''}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${categoryInfo?.color || 'bg-primary'} bg-opacity-10`}>
                <IconComponent className={`h-6 w-6 ${categoryInfo?.color?.replace('bg-', 'text-') || 'text-primary'}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{powerUp.name}</CardTitle>
                <CardDescription className="text-sm">{powerUp.description}</CardDescription>
              </div>
            </div>
            {isActive && (
              <Badge variant="default" className="bg-green-500">
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Features:</h4>
              <ul className="space-y-1">
                {powerUp.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">${powerUp.price}</span>
                    {powerUp.duration && (
                      <span className="text-sm text-muted-foreground">/{powerUp.duration}</span>
                    )}
                  </div>
                </div>
                {isActive ? (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Expires</p>
                    <p className="text-sm font-medium">
                      {powerUp.expiresAt ? new Date(powerUp.expiresAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={() => purchaseMutation.mutate(powerUp.id)}
                    disabled={purchaseMutation.isPending}
                  >
                    {purchaseMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Activate
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Power Ups</h1>
              <p className="text-muted-foreground">Supercharge your development with premium features</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activePowerUps.length}</p>
                  <p className="text-sm text-muted-foreground">Active Power-Ups</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">∞</p>
                  <p className="text-sm text-muted-foreground">Compute Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">50</p>
                  <p className="text-sm text-muted-foreground">Team Members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">+40%</p>
                  <p className="text-sm text-muted-foreground">Performance Boost</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="available">Available Power-Ups</TabsTrigger>
            <TabsTrigger value="active">My Power-Ups</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-6">
            {/* Category Filter */}
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              <Button variant="outline" size="sm" className="whitespace-nowrap">
                <Package className="h-4 w-4 mr-2" />
                All Categories
              </Button>
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <Button key={category.id} variant="ghost" size="sm" className="whitespace-nowrap">
                    <IconComponent className="h-4 w-4 mr-2" />
                    {category.name}
                  </Button>
                );
              })}
            </div>

            {/* Power-Up Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {powerUps.filter(p => !p.active).map((powerUp) => (
                <PowerUpCard key={powerUp.id} powerUp={powerUp} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-6">
            {activePowerUps.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Power-Ups</h3>
                  <p className="text-muted-foreground mb-4">
                    Activate power-ups to unlock premium features and boost your productivity
                  </p>
                  <Button onClick={() => setActiveTab('available')}>
                    Browse Power-Ups
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activePowerUps.map((powerUp) => (
                  <PowerUpCard key={powerUp.id} powerUp={powerUp} isActive />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Power-Up Settings</CardTitle>
                <CardDescription>Manage your power-up preferences and notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="auto-renew">Auto-Renew Power-Ups</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically renew power-ups when they expire
                      </p>
                    </div>
                    <Switch id="auto-renew" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="notifications">Expiration Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified before power-ups expire
                      </p>
                    </div>
                    <Switch id="notifications" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="usage-alerts">Usage Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert when reaching power-up limits
                      </p>
                    </div>
                    <Switch id="usage-alerts" defaultChecked />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-3">Payment Method</h3>
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/25</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Update
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-3">Billing History</h3>
                  <Button variant="outline" className="w-full">
                    View Billing History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}