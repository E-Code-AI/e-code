// @ts-nocheck
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Cpu, 
  Zap, 
  Server, 
  MapPin, 
  DollarSign, 
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2
} from 'lucide-react';

interface GPUType {
  id: string;
  name: string;
  vram: string;
  compute: string;
  pricePerHour: number;
  available: boolean;
}

interface GPUInstance {
  id: number;
  projectId: number;
  gpuType: string;
  region: string;
  status: 'provisioning' | 'running' | 'stopped' | 'terminated';
  ipAddress?: string;
  createdAt: string;
  hourlyRate: number;
}

interface GPUManagementProps {
  projectId: number;
}

export function GPUManagement({ projectId }: GPUManagementProps) {
  const [selectedGpuType, setSelectedGpuType] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const { toast } = useToast();

  // Fetch available GPU types
  const { data: gpuTypes, isLoading: loadingTypes } = useQuery({
    queryKey: ['/api/gpu/types'],
    enabled: !!projectId
  });

  // Fetch available regions
  const { data: regions, isLoading: loadingRegions } = useQuery({
    queryKey: ['/api/gpu/regions'],
    enabled: !!projectId
  });

  // Fetch project GPU instances
  const { data: instances = [], isLoading: loadingInstances } = useQuery({
    queryKey: [`/api/projects/${projectId}/gpu/instances`],
    enabled: !!projectId
  });

  // Provision GPU mutation
  const provisionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGpuType || !selectedRegion) {
        throw new Error('Please select GPU type and region');
      }
      return await apiRequest('POST', `/api/projects/${projectId}/gpu/provision`, {
        gpuType: selectedGpuType,
        region: selectedRegion
      });
    },
    onSuccess: () => {
      toast({
        title: "GPU Provisioned",
        description: "Your GPU instance is being set up. This may take a few minutes.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gpu/instances`] });
      setSelectedGpuType('');
      setSelectedRegion('');
    },
    onError: (error: any) => {
      toast({
        title: "Provisioning Failed",
        description: error.message || "Failed to provision GPU instance",
        variant: "destructive"
      });
    }
  });

  // Terminate GPU mutation
  const terminateMutation = useMutation({
    mutationFn: async (instanceId: number) => {
      return await apiRequest('DELETE', `/api/projects/${projectId}/gpu/instances/${instanceId}`);
    },
    onSuccess: () => {
      toast({
        title: "GPU Terminated",
        description: "GPU instance has been terminated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/gpu/instances`] });
    },
    onError: (error: any) => {
      toast({
        title: "Termination Failed",
        description: error.message || "Failed to terminate GPU instance",
        variant: "destructive"
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'provisioning':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'stopped':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      running: "default",
      provisioning: "secondary",
      stopped: "outline",
      terminated: "destructive"
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (loadingTypes || loadingRegions || loadingInstances) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasActiveInstance = instances.some((i: GPUInstance) => 
    i.status === 'running' || i.status === 'provisioning'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Cpu className="h-6 w-6" />
          GPU Management
        </h2>
        <p className="text-muted-foreground mt-1">
          Provision and manage GPU instances for your project
        </p>
      </div>

      {/* Current Instances */}
      {instances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active GPU Instances</CardTitle>
            <CardDescription>
              Manage your running GPU instances
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {instances.map((instance: GPUInstance) => (
              <div 
                key={instance.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(instance.status)}
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {instance.gpuType}
                      {getStatusBadge(instance.status)}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {instance.region}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${instance.hourlyRate}/hour
                      </span>
                      {instance.ipAddress && (
                        <span className="font-mono text-xs">
                          {instance.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => terminateMutation.mutate(instance.id)}
                  disabled={terminateMutation.isPending || instance.status === 'terminated'}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Terminate
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Provision New Instance */}
      <Card>
        <CardHeader>
          <CardTitle>Provision New GPU Instance</CardTitle>
          <CardDescription>
            Select GPU type and region to provision a new instance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasActiveInstance && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You already have an active GPU instance. Additional instances will incur extra charges.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">GPU Type</label>
              <Select value={selectedGpuType} onValueChange={setSelectedGpuType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select GPU type" />
                </SelectTrigger>
                <SelectContent>
                  {gpuTypes?.map((gpu: GPUType) => (
                    <SelectItem 
                      key={gpu.id} 
                      value={gpu.id}
                      disabled={!gpu.available}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <div className="font-medium">{gpu.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {gpu.vram} VRAM • {gpu.compute}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-medium">
                            ${gpu.pricePerHour}/hr
                          </div>
                          {!gpu.available && (
                            <div className="text-xs text-red-500">Unavailable</div>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Region</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions?.map((region: any) => (
                    <SelectItem key={region.id} value={region.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>{region.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({region.location})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              <Zap className="h-4 w-4 inline mr-1" />
              GPUs are billed per hour while running
            </div>
            <Button 
              onClick={() => provisionMutation.mutate()}
              disabled={!selectedGpuType || !selectedRegion || provisionMutation.isPending}
            >
              {provisionMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Provisioning...
                </>
              ) : (
                <>
                  <Server className="h-4 w-4 mr-2" />
                  Provision GPU
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>GPU Usage Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• GPUs are ideal for machine learning, AI model training, and parallel computing tasks</p>
          <p>• Remember to terminate instances when not in use to avoid unnecessary charges</p>
          <p>• Connect to your GPU instance using SSH or our built-in terminal</p>
          <p>• Pre-installed with CUDA, PyTorch, and common ML frameworks</p>
        </CardContent>
      </Card>
    </div>
  );
}