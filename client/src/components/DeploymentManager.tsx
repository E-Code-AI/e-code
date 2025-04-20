import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Switch 
} from "@/components/ui/switch";
import { 
  Rocket, 
  CloudOff, 
  RefreshCw, 
  Edit3, 
  Globe, 
  Clock, 
  Check, 
  ExternalLink, 
  ChevronRight, 
  BarChart2, 
  Zap, 
  Settings,
  AlertCircle,
  Server,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Project } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeploymentManagerProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

type DeploymentStatus = "running" | "stopped" | "deploying" | "failed";

interface DeploymentDetails {
  id: string;
  status: DeploymentStatus;
  url: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  commit?: string;
  logs?: string[];
  error?: string;
}

export function DeploymentManager({ project, isOpen, onClose }: DeploymentManagerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [customDomain, setCustomDomain] = useState("");
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [isAutoDeploy, setIsAutoDeploy] = useState(false);
  const { toast } = useToast();
  
  // Mock deployment data
  const [deployment, setDeployment] = useState<DeploymentDetails>({
    id: "depl_123456",
    status: "running",
    url: `${project.name.toLowerCase().replace(/\s+/g, "-")}.replit.app`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: "1.0.0",
  });
  
  // Mock domains
  const [domains, setDomains] = useState<string[]>([]);
  
  // Mock logs
  const [logs, setLogs] = useState<string[]>([
    "[2024-04-20 12:00:01] Starting deployment...",
    "[2024-04-20 12:00:03] Installing dependencies...",
    "[2024-04-20 12:00:15] Build completed successfully",
    "[2024-04-20 12:00:20] Deployment successful!",
    "[2024-04-20 12:00:21] Application is now running"
  ]);
  
  const deployMutation = useMutation({
    mutationFn: async () => {
      // Mock deployment
      setDeployment({
        ...deployment,
        status: "deploying"
      });
      
      // Simulate deployment process
      return new Promise<DeploymentDetails>((resolve) => {
        setTimeout(() => {
          const newDeployment = {
            ...deployment,
            status: "running" as DeploymentStatus,
            updatedAt: new Date().toISOString()
          };
          resolve(newDeployment);
        }, 2000);
      });
    },
    onSuccess: (newDeployment) => {
      setDeployment(newDeployment);
      toast({
        title: "Deployment successful",
        description: "Your application has been deployed.",
      });
    },
    onError: (error: Error) => {
      setDeployment({
        ...deployment,
        status: "failed",
        error: error.message
      });
      toast({
        title: "Deployment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      // Mock domain addition
      if (!domain.match(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/)) {
        throw new Error("Invalid domain format");
      }
      
      // Check if domain already exists
      if (domains.includes(domain)) {
        throw new Error("Domain already exists");
      }
      
      // Simulate API call
      return new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(domain);
        }, 1000);
      });
    },
    onSuccess: (domain) => {
      setDomains([...domains, domain]);
      setCustomDomain("");
      setIsAddingDomain(false);
      toast({
        title: "Domain added",
        description: `${domain} has been added to your project.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add domain",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleDeploy = () => {
    deployMutation.mutate();
  };
  
  const handleAddDomain = () => {
    if (customDomain.trim()) {
      addDomainMutation.mutate(customDomain);
    }
  };
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };
  
  const getStatusColor = (status: DeploymentStatus) => {
    switch (status) {
      case "running":
        return "bg-green-500";
      case "stopped":
        return "bg-yellow-500";
      case "deploying":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Deployment Manager
          </DialogTitle>
          <DialogDescription>
            Deploy, manage, and monitor your application.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="font-medium text-lg">{project.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={cn("h-2 w-2 rounded-full", getStatusColor(deployment.status))}></div>
                  <span className="text-sm text-muted-foreground capitalize">{deployment.status}</span>
                </div>
              </div>
              
              <Button 
                onClick={handleDeploy} 
                disabled={deployMutation.isPending || deployment.status === "deploying"}
              >
                {deployMutation.isPending || deployment.status === "deploying" ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy
                  </>
                )}
              </Button>
            </div>
            
            <Separator />
            
            {deployment.status === "failed" && deployment.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Deployment Failed</AlertTitle>
                <AlertDescription>
                  {deployment.error}
                </AlertDescription>
              </Alert>
            )}
            
            {deployment.status === "running" && (
              <div className="flex justify-between items-center bg-muted p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <a 
                    href={`https://${deployment.url}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm font-medium text-primary underline"
                  >
                    {deployment.url}
                  </a>
                </div>
                <Button variant="outline" size="sm" className="h-7">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Visit
                </Button>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <Server className="h-4 w-4" />
                    Server
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium capitalize">{deployment.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version</span>
                      <span className="font-medium">{deployment.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last updated</span>
                      <span className="font-medium">{formatDate(deployment.updatedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <Database className="h-4 w-4" />
                    Database
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium">PostgreSQL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="font-medium">Connected</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size</span>
                      <span className="font-medium">10MB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <BarChart2 className="h-4 w-4" />
                  Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[120px] flex items-center justify-center border rounded-md border-dashed">
                  <span className="text-sm text-muted-foreground">
                    Statistics will appear here after deployment
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-deploy"
                  checked={isAutoDeploy}
                  onCheckedChange={setIsAutoDeploy}
                />
                <Label htmlFor="auto-deploy">Auto-deploy on git push</Label>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Advanced Settings
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="domains" className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-md mb-4">
              <h3 className="text-sm font-medium mb-1">Default domain</h3>
              <div className="flex items-center gap-2">
                <Badge>Default</Badge>
                <span className="text-sm">{deployment.url}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Custom domains</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAddingDomain(true)}
                  className={cn(isAddingDomain && "hidden")}
                >
                  Add Domain
                </Button>
              </div>
              
              {isAddingDomain ? (
                <div className="flex gap-2 items-end">
                  <div className="flex-grow">
                    <Label htmlFor="custom-domain" className="text-xs">Domain Name</Label>
                    <Input 
                      id="custom-domain" 
                      placeholder="example.com" 
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                    />
                  </div>
                  <Button 
                    size="sm" 
                    disabled={!customDomain.trim() || addDomainMutation.isPending} 
                    onClick={handleAddDomain}
                  >
                    {addDomainMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsAddingDomain(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : domains.length > 0 ? (
                <div className="space-y-2">
                  {domains.map((domain, index) => (
                    <Card key={index}>
                      <CardContent className="p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span>{domain}</span>
                        </div>
                        <Badge variant="outline" className="bg-green-500/10 text-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="border rounded-md border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No custom domains added yet.
                  </p>
                </div>
              )}
            </div>
            
            <div className="bg-muted/50 p-3 rounded-md text-sm space-y-2">
              <h4 className="font-medium">How to set up a custom domain</h4>
              <ol className="list-decimal ml-5 text-muted-foreground space-y-1">
                <li>Add your domain name above</li>
                <li>Configure your DNS settings with your domain provider</li>
                <li>Add a CNAME record pointing to <code className="bg-muted px-1 py-0.5 rounded">{deployment.url}</code></li>
                <li>Wait for DNS propagation (may take up to 24 hours)</li>
              </ol>
            </div>
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-4 py-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Deployment Logs</h3>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
            
            <div className="bg-black text-white p-3 rounded-md font-mono text-xs h-60 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="py-0.5">{log}</div>
              ))}
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Showing logs for deployment on {formatDate(deployment.updatedAt)}
              </span>
              <Button variant="outline" size="sm">
                Download Logs
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}