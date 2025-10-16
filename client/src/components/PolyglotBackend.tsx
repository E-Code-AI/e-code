/**
 * Polyglot Backend Interface Component
 * Displays and manages the multi-language backend services
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  Code, 
  Database, 
  Cpu, 
  Brain,
  FileCode,
  Container,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Gauge,
  Server,
  Layers,
  BarChart3,
  Cog,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'unhealthy';
  lastCheck: Date;
  responseTime?: number;
}

interface ServiceCapabilities {
  services: {
    typescript: ServiceInfo;
    'go-runtime': ServiceInfo;
    'python-ml': ServiceInfo;
  };
  routing: Record<string, string>;
}

interface ServiceInfo {
  port: number;
  capabilities: string[];
  endpoints: string[];
}

interface BenchmarkResult {
  service: string;
  responseTime: number;
  status: string;
  error?: string;
}

export function PolyglotBackend() {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch service health status
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['polyglot-health'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/polyglot/health');
      if (!res.ok) throw new Error('Failed to fetch health status');
      return res.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch service capabilities
  const { data: capabilitiesData } = useQuery({
    queryKey: ['polyglot-capabilities'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/polyglot/capabilities');
      if (!res.ok) throw new Error('Failed to fetch capabilities');
      return res.json() as ServiceCapabilities;
    }
  });

  // Benchmark services
  const benchmarkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('GET', '/api/polyglot/benchmark');
      if (!res.ok) throw new Error('Benchmark failed');
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Benchmark Complete",
        description: `Fastest service: ${data.fastest.service} (${data.fastest.responseTime}ms)`,
      });
    }
  });

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'typescript': return <Code className="h-5 w-5" />;
      case 'go-runtime': return <Cpu className="h-5 w-5" />;
      case 'python-ml': return <Brain className="h-5 w-5" />;
      default: return <Server className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'unhealthy': return 'text-red-600';
      case 'degraded': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'unhealthy': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Polyglot Backend Architecture</h1>
          <p className="text-muted-foreground">Multi-language backend services (TypeScript, Go, Python)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => benchmarkMutation.mutate()}
            disabled={benchmarkMutation.isPending}
            variant="outline"
            size="sm"
          >
            <Gauge className="h-4 w-4 mr-2" />
            {benchmarkMutation.isPending ? 'Benchmarking...' : 'Run Benchmark'}
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      {healthData && (
        <Alert>
          <div className="flex items-center gap-2">
            {getStatusIcon(healthData.status)}
            <AlertTitle>System Status: {healthData.status.toUpperCase()}</AlertTitle>
          </div>
          <AlertDescription>
            {healthData.services.filter((s: ServiceHealth) => s.status === 'healthy').length} of{' '}
            {healthData.services.length} services are healthy
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {healthData?.services.map((service: ServiceHealth) => (
              <Card key={service.service}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {getServiceIcon(service.service)}
                    {service.service.replace('-', ' ').toUpperCase()}
                  </CardTitle>
                  {getStatusIcon(service.status)}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{service.status}</div>
                  {service.responseTime && (
                    <p className="text-xs text-muted-foreground">
                      Response time: {service.responseTime}ms
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Last check: {new Date(service.lastCheck).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Architecture Benefits</CardTitle>
              <CardDescription>Why we use a polyglot backend approach</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <Code className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold">TypeScript</h4>
                    <p className="text-sm text-muted-foreground">
                      Web APIs, user management, database operations
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Cpu className="h-5 w-5 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-semibold">Go</h4>
                    <p className="text-sm text-muted-foreground">
                      High-performance containers, file ops, real-time
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-purple-600 mt-1" />
                  <div>
                    <h4 className="font-semibold">Python</h4>
                    <p className="text-sm text-muted-foreground">
                      AI/ML processing, data analysis, code analysis
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          {capabilitiesData && Object.entries(capabilitiesData.services).map(([serviceName, serviceInfo]) => (
            <Card key={serviceName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getServiceIcon(serviceName)}
                    {serviceName.replace('-', ' ').toUpperCase()}
                  </CardTitle>
                  <Badge variant="outline">Port {serviceInfo.port}</Badge>
                </div>
                <CardDescription>
                  {serviceInfo.capabilities.length} capabilities, {serviceInfo.endpoints.length} endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Capabilities</h4>
                    <div className="space-y-1">
                      {serviceInfo.capabilities.map((capability, index) => (
                        <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {capability}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">API Endpoints</h4>
                    <div className="flex flex-wrap gap-2">
                      {serviceInfo.endpoints.map((endpoint, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {endpoint}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Capabilities Tab */}
        <TabsContent value="capabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Routing Matrix</CardTitle>
              <CardDescription>How requests are automatically routed to optimal services</CardDescription>
            </CardHeader>
            <CardContent>
              {capabilitiesData && (
                <div className="space-y-3">
                  {Object.entries(capabilitiesData.routing).map(([capability, service]) => (
                    <div key={capability} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{capability.replace('-', ' ')}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {getServiceIcon(service)}
                        <span className="text-sm font-medium">{service}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Benchmarks</CardTitle>
              <CardDescription>Service response times and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {benchmarkMutation.data ? (
                <div className="space-y-4">
                  {benchmarkMutation.data.benchmarks.map((benchmark: BenchmarkResult) => (
                    <div key={benchmark.service} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getServiceIcon(benchmark.service)}
                        <div>
                          <div className="font-medium">{benchmark.service}</div>
                          <div className="text-sm text-muted-foreground">
                            Status: {benchmark.status}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {benchmark.responseTime > 0 ? (
                          <>
                            <div className="font-semibold">{benchmark.responseTime}ms</div>
                            <Progress 
                              value={Math.max(0, 100 - benchmark.responseTime / 10)} 
                              className="w-20 h-2" 
                            />
                          </>
                        ) : (
                          <Badge variant="destructive">Unavailable</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="text-sm">
                      <strong>Fastest Service:</strong> {benchmarkMutation.data.fastest.service} 
                      ({benchmarkMutation.data.fastest.responseTime}ms)
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Run a benchmark to see performance metrics</p>
                  <Button
                    onClick={() => benchmarkMutation.mutate()}
                    disabled={benchmarkMutation.isPending}
                    className="mt-4"
                  >
                    {benchmarkMutation.isPending ? 'Running...' : 'Start Benchmark'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}