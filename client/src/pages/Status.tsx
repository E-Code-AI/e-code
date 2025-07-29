import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Activity,
  Clock,
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Zap,
  Server,
  Database,
  Globe,
  Shield,
  Terminal,
  Package,
  Users,
  Cpu
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  uptime: number;
  responseTime: number;
  icon: React.ElementType;
  description: string;
}

interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  startedAt: Date;
  resolvedAt?: Date;
  affectedServices: string[];
  updates: {
    time: Date;
    message: string;
  }[];
}

export default function Status() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Code Editor',
      status: 'operational',
      uptime: 99.98,
      responseTime: 42,
      icon: Terminal,
      description: 'Monaco editor and file system operations'
    },
    {
      name: 'AI Agent',
      status: 'operational',
      uptime: 99.95,
      responseTime: 238,
      icon: Zap,
      description: 'Autonomous application building and code generation'
    },
    {
      name: 'Hosting & Deployments',
      status: 'operational',
      uptime: 99.99,
      responseTime: 124,
      icon: Globe,
      description: 'Application hosting and deployment services'
    },
    {
      name: 'Database Services',
      status: 'operational',
      uptime: 99.97,
      responseTime: 18,
      icon: Database,
      description: 'PostgreSQL, MySQL, MongoDB instances'
    },
    {
      name: 'Authentication',
      status: 'operational',
      uptime: 99.99,
      responseTime: 31,
      icon: Shield,
      description: 'User authentication and session management'
    },
    {
      name: 'Terminal & SSH',
      status: 'operational',
      uptime: 99.94,
      responseTime: 85,
      icon: Terminal,
      description: 'Web terminal and SSH access'
    },
    {
      name: 'Object Storage',
      status: 'operational',
      uptime: 99.98,
      responseTime: 156,
      icon: Server,
      description: 'File uploads and static asset storage'
    },
    {
      name: 'Collaboration',
      status: 'operational',
      uptime: 99.96,
      responseTime: 92,
      icon: Users,
      description: 'Real-time multiplayer coding'
    },
    {
      name: 'API Services',
      status: 'operational',
      uptime: 99.98,
      responseTime: 48,
      icon: Cpu,
      description: 'REST API and GraphQL endpoints'
    }
  ]);

  const [incidents, setIncidents] = useState<Incident[]>([
    {
      id: '1',
      title: 'Scheduled Maintenance Window',
      status: 'resolved',
      severity: 'low',
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      affectedServices: ['Database Services'],
      updates: [
        {
          time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          message: 'Starting scheduled maintenance for database upgrades'
        },
        {
          time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
          message: 'Maintenance completed successfully'
        }
      ]
    }
  ]);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const refresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'outage':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'maintenance':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'outage':
        return 'text-red-500';
      case 'maintenance':
        return 'text-blue-500';
    }
  };

  const getStatusBadge = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <Badge variant="default" className="bg-green-500">Operational</Badge>;
      case 'degraded':
        return <Badge variant="default" className="bg-yellow-500">Degraded</Badge>;
      case 'outage':
        return <Badge variant="destructive">Outage</Badge>;
      case 'maintenance':
        return <Badge variant="secondary">Maintenance</Badge>;
    }
  };

  const getSeverityBadge = (severity: Incident['severity']) => {
    switch (severity) {
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-yellow-500">Medium</Badge>;
      case 'high':
        return <Badge variant="default" className="bg-orange-500">High</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
    }
  };

  const overallStatus = services.every(s => s.status === 'operational') 
    ? 'operational' 
    : services.some(s => s.status === 'outage') 
    ? 'outage' 
    : 'degraded';

  const averageUptime = services.reduce((acc, s) => acc + s.uptime, 0) / services.length;

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="border-b">
        <div className="container-responsive py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">System Status</h1>
              <p className="text-muted-foreground">
                Real-time status and uptime monitoring for E-Code services
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={refresh}
              className={refreshing ? 'animate-spin' : ''}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Overall Status */}
          <Card className={`border-2 ${
            overallStatus === 'operational' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
            overallStatus === 'outage' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
            'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {overallStatus === 'operational' ? (
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                  ) : overallStatus === 'outage' ? (
                    <XCircle className="h-12 w-12 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-12 w-12 text-yellow-500" />
                  )}
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {overallStatus === 'operational' ? 'All Systems Operational' :
                       overallStatus === 'outage' ? 'Service Disruption' :
                       'Partial Service Degradation'}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Last updated: {format(currentTime, 'PPpp')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{averageUptime.toFixed(2)}%</div>
                  <div className="text-sm text-muted-foreground">30-day uptime</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Active Incidents */}
      {incidents.filter(i => i.status !== 'resolved').length > 0 && (
        <section className="border-b bg-muted/30">
          <div className="container-responsive py-8">
            <h2 className="text-2xl font-semibold mb-4">Active Incidents</h2>
            <div className="space-y-4">
              {incidents.filter(i => i.status !== 'resolved').map(incident => (
                <Alert key={incident.id}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center gap-2">
                    {incident.title}
                    {getSeverityBadge(incident.severity)}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <p className="text-sm">
                        Affected services: {incident.affectedServices.join(', ')}
                      </p>
                      <div className="space-y-1">
                        {incident.updates.map((update, index) => (
                          <div key={index} className="text-sm">
                            <span className="text-muted-foreground">
                              {format(update.time, 'HH:mm')} - 
                            </span>
                            <span className="ml-2">{update.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Service Status Grid */}
      <section className="py-12">
        <div className="container-responsive">
          <h2 className="text-2xl font-semibold mb-6">Service Status</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Card key={service.name} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{service.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {service.description}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusIcon(service.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        {getStatusBadge(service.status)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Uptime</span>
                          <span className="font-medium">{service.uptime}%</span>
                        </div>
                        <Progress value={service.uptime} className="h-1" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Response time</span>
                        <span className="font-medium">{service.responseTime}ms</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Historical Uptime */}
      <section className="py-12 bg-muted/30">
        <div className="container-responsive">
          <h2 className="text-2xl font-semibold mb-6">Historical Uptime</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Last 24 Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">99.99%</div>
                <p className="text-sm text-muted-foreground mt-1">
                  0 incidents • 1.4 min downtime
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Last 7 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">99.98%</div>
                <p className="text-sm text-muted-foreground mt-1">
                  1 incident • 10.1 min downtime
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Last 30 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">99.97%</div>
                <p className="text-sm text-muted-foreground mt-1">
                  2 incidents • 21.6 min downtime
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Recent Incidents */}
      <section className="py-12">
        <div className="container-responsive">
          <h2 className="text-2xl font-semibold mb-6">Recent Incidents</h2>
          {incidents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">No recent incidents</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All systems have been operating normally
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {incidents.map(incident => (
                <Card key={incident.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{incident.title}</CardTitle>
                        <CardDescription>
                          {format(incident.startedAt, 'PPP')} • 
                          {incident.resolvedAt && ` Resolved in ${
                            Math.round((incident.resolvedAt.getTime() - incident.startedAt.getTime()) / 1000 / 60)
                          } minutes`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(incident.severity)}
                        {incident.status === 'resolved' ? (
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-orange-500 text-orange-500">
                            {incident.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Affected services: {incident.affectedServices.join(', ')}
                      </p>
                      <div className="border-l-2 border-muted pl-4 space-y-2">
                        {incident.updates.map((update, index) => (
                          <div key={index} className="text-sm">
                            <span className="text-muted-foreground">
                              {format(update.time, 'HH:mm')} - 
                            </span>
                            <span className="ml-2">{update.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Subscribe Section */}
      <section className="py-12 bg-muted/30">
        <div className="container-responsive">
          <Card>
            <CardContent className="py-8 text-center">
              <Activity className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Subscribe to Updates</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Get notified about incidents, scheduled maintenance, and status changes
              </p>
              <div className="flex gap-4 justify-center">
                <Button>Subscribe via Email</Button>
                <Button variant="outline">RSS Feed</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}