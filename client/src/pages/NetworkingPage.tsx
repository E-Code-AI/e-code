import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageShell, PageHeader } from '@/components/layout/PageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Network,
  Globe,
  Shield,
  Lock,
  Server,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Settings,
  RefreshCw,
  Check,
  X,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Wifi,
  Key,
  FileKey,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Clock,
  Zap,
  ChevronRight,
  Layers,
  Link2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FirewallRule {
  id: string;
  name: string;
  priority: number;
  direction: 'ingress' | 'egress';
  action: 'allow' | 'deny';
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  sourceIp: string;
  destinationIp: string;
  port: string;
  enabled: boolean;
  createdAt: string;
}

interface VPCPeering {
  id: string;
  name: string;
  peerVpcId: string;
  peerRegion: string;
  status: 'active' | 'pending' | 'failed';
  cidrBlock: string;
  createdAt: string;
}

interface DNSRecord {
  id: string;
  name: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';
  value: string;
  ttl: number;
  priority?: number;
  enabled: boolean;
}

interface SSLCertificate {
  id: string;
  domain: string;
  issuer: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'pending';
  autoRenew: boolean;
  type: 'managed' | 'custom';
}

interface ZeroTrustPolicy {
  id: string;
  name: string;
  description: string;
  conditions: {
    ipRanges?: string[];
    countries?: string[];
    deviceTypes?: string[];
    userGroups?: string[];
  };
  action: 'allow' | 'deny' | 'mfa';
  enabled: boolean;
  priority: number;
}

interface PortForward {
  id: string;
  name: string;
  externalPort: number;
  internalPort: number;
  protocol: 'tcp' | 'udp';
  targetIp: string;
  enabled: boolean;
}

interface TrafficStats {
  totalRequests: number;
  requestsPerSecond: number;
  bandwidthIn: number;
  bandwidthOut: number;
  errorRate: number;
  latencyP50: number;
  latencyP99: number;
  topEndpoints: { path: string; requests: number }[];
  topCountries: { country: string; requests: number }[];
}

interface NetworkNode {
  id: string;
  name: string;
  type: 'vpc' | 'subnet' | 'loadbalancer' | 'instance' | 'gateway';
  status: 'healthy' | 'warning' | 'error';
  connections: string[];
}

const mockFirewallRules: FirewallRule[] = [
  { id: '1', name: 'Allow HTTPS', priority: 100, direction: 'ingress', action: 'allow', protocol: 'tcp', sourceIp: '0.0.0.0/0', destinationIp: '*', port: '443', enabled: true, createdAt: '2024-01-15T10:00:00Z' },
  { id: '2', name: 'Allow SSH', priority: 200, direction: 'ingress', action: 'allow', protocol: 'tcp', sourceIp: '10.0.0.0/8', destinationIp: '*', port: '22', enabled: true, createdAt: '2024-01-15T10:00:00Z' },
  { id: '3', name: 'Block Malicious IPs', priority: 50, direction: 'ingress', action: 'deny', protocol: 'all', sourceIp: '192.168.100.0/24', destinationIp: '*', port: '*', enabled: true, createdAt: '2024-01-15T10:00:00Z' },
  { id: '4', name: 'Allow Outbound HTTPS', priority: 100, direction: 'egress', action: 'allow', protocol: 'tcp', sourceIp: '*', destinationIp: '0.0.0.0/0', port: '443', enabled: true, createdAt: '2024-01-15T10:00:00Z' },
];

const mockVPCPeerings: VPCPeering[] = [
  { id: '1', name: 'Production to Staging', peerVpcId: 'vpc-0123456789', peerRegion: 'us-east-1', status: 'active', cidrBlock: '10.1.0.0/16', createdAt: '2024-01-10T10:00:00Z' },
  { id: '2', name: 'Production to Analytics', peerVpcId: 'vpc-9876543210', peerRegion: 'us-west-2', status: 'active', cidrBlock: '10.2.0.0/16', createdAt: '2024-01-08T10:00:00Z' },
  { id: '3', name: 'Disaster Recovery', peerVpcId: 'vpc-1122334455', peerRegion: 'eu-west-1', status: 'pending', cidrBlock: '10.3.0.0/16', createdAt: '2024-01-20T10:00:00Z' },
];

const mockDNSRecords: DNSRecord[] = [
  { id: '1', name: 'api.ecode.dev', type: 'A', value: '203.0.113.50', ttl: 300, enabled: true },
  { id: '2', name: 'www.ecode.dev', type: 'CNAME', value: 'ecode.dev', ttl: 3600, enabled: true },
  { id: '3', name: 'mail.ecode.dev', type: 'MX', value: 'mx1.ecode.dev', ttl: 3600, priority: 10, enabled: true },
  { id: '4', name: '_dmarc.ecode.dev', type: 'TXT', value: 'v=DMARC1; p=reject; rua=mailto:dmarc@ecode.dev', ttl: 3600, enabled: true },
];

const mockSSLCertificates: SSLCertificate[] = [
  { id: '1', domain: '*.ecode.dev', issuer: "Let's Encrypt", expiresAt: '2025-03-15T00:00:00Z', status: 'active', autoRenew: true, type: 'managed' },
  { id: '2', domain: 'api.ecode.dev', issuer: 'DigiCert', expiresAt: '2025-06-20T00:00:00Z', status: 'active', autoRenew: false, type: 'custom' },
  { id: '3', domain: 'staging.ecode.dev', issuer: "Let's Encrypt", expiresAt: '2024-02-01T00:00:00Z', status: 'expired', autoRenew: true, type: 'managed' },
];

const mockZeroTrustPolicies: ZeroTrustPolicy[] = [
  { id: '1', name: 'Admin Access', description: 'Require MFA for admin panel access', conditions: { userGroups: ['admins'], ipRanges: ['10.0.0.0/8'] }, action: 'mfa', enabled: true, priority: 1 },
  { id: '2', name: 'Block High-Risk Countries', description: 'Block access from sanctioned countries', conditions: { countries: ['NK', 'IR', 'SY'] }, action: 'deny', enabled: true, priority: 2 },
  { id: '3', name: 'Allow Corporate Network', description: 'Allow access from corporate IPs without MFA', conditions: { ipRanges: ['192.168.1.0/24', '10.10.0.0/16'] }, action: 'allow', enabled: true, priority: 3 },
];

const mockPortForwards: PortForward[] = [
  { id: '1', name: 'Web Server', externalPort: 80, internalPort: 8080, protocol: 'tcp', targetIp: '10.0.1.10', enabled: true },
  { id: '2', name: 'SSH Jumpbox', externalPort: 2222, internalPort: 22, protocol: 'tcp', targetIp: '10.0.1.20', enabled: true },
  { id: '3', name: 'Game Server', externalPort: 27015, internalPort: 27015, protocol: 'udp', targetIp: '10.0.2.50', enabled: false },
];

const mockTrafficStats: TrafficStats = {
  totalRequests: 12847293,
  requestsPerSecond: 4521,
  bandwidthIn: 156.7,
  bandwidthOut: 892.3,
  errorRate: 0.023,
  latencyP50: 45,
  latencyP99: 234,
  topEndpoints: [
    { path: '/api/v1/users', requests: 2847123 },
    { path: '/api/v1/projects', requests: 1923847 },
    { path: '/api/v1/auth', requests: 1523847 },
    { path: '/api/v1/files', requests: 982347 },
  ],
  topCountries: [
    { country: 'United States', requests: 5234567 },
    { country: 'Germany', requests: 2134567 },
    { country: 'United Kingdom', requests: 1834567 },
    { country: 'Japan', requests: 1234567 },
  ],
};

const mockNetworkNodes: NetworkNode[] = [
  { id: '1', name: 'Primary VPC', type: 'vpc', status: 'healthy', connections: ['2', '3'] },
  { id: '2', name: 'Public Subnet', type: 'subnet', status: 'healthy', connections: ['4', '5'] },
  { id: '3', name: 'Private Subnet', type: 'subnet', status: 'healthy', connections: ['6'] },
  { id: '4', name: 'Load Balancer', type: 'loadbalancer', status: 'healthy', connections: [] },
  { id: '5', name: 'Internet Gateway', type: 'gateway', status: 'healthy', connections: [] },
  { id: '6', name: 'App Server', type: 'instance', status: 'warning', connections: [] },
];

export default function NetworkingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('topology');
  const [showAddRuleDialog, setShowAddRuleDialog] = useState(false);
  const [showAddDNSDialog, setShowAddDNSDialog] = useState(false);
  const [showAddPolicyDialog, setShowAddPolicyDialog] = useState(false);

  const [newRule, setNewRule] = useState<Partial<FirewallRule>>({
    name: '',
    priority: 100,
    direction: 'ingress',
    action: 'allow',
    protocol: 'tcp',
    sourceIp: '0.0.0.0/0',
    destinationIp: '*',
    port: '443',
    enabled: true,
  });

  const [newDNSRecord, setNewDNSRecord] = useState<Partial<DNSRecord>>({
    name: '',
    type: 'A',
    value: '',
    ttl: 3600,
    enabled: true,
  });

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard', description: text });
  };

  const handleRefreshTopology = () => {
    toast({ title: 'Refreshing topology', description: 'Network topology is being refreshed...' });
  };

  const handleAddRule = () => {
    toast({ title: 'Rule created', description: `Firewall rule "${newRule.name}" has been created.` });
    setShowAddRuleDialog(false);
    setNewRule({ name: '', priority: 100, direction: 'ingress', action: 'allow', protocol: 'tcp', sourceIp: '0.0.0.0/0', destinationIp: '*', port: '443', enabled: true });
  };

  const handleDeleteRule = (rule: FirewallRule) => {
    toast({ title: 'Rule deleted', description: `Firewall rule "${rule.name}" has been deleted.` });
  };

  const handleToggleRule = (rule: FirewallRule) => {
    toast({ title: rule.enabled ? 'Rule disabled' : 'Rule enabled', description: `Firewall rule "${rule.name}" has been ${rule.enabled ? 'disabled' : 'enabled'}.` });
  };

  const navItems = [
    { id: 'topology', label: 'Network Topology', icon: Network },
    { id: 'firewall', label: 'Firewall Rules', icon: Shield },
    { id: 'vpc', label: 'VPC Peering', icon: Link2 },
    { id: 'dns', label: 'DNS Management', icon: Globe },
    { id: 'ssl', label: 'SSL/TLS Certificates', icon: Lock },
    { id: 'zerotrust', label: 'Zero-Trust Policies', icon: Key },
    { id: 'traffic', label: 'Traffic Analytics', icon: BarChart3 },
    { id: 'ports', label: 'Port Forwarding', icon: Layers },
  ];

  const inputClassName = "min-h-[44px] border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-primary/20 focus:border-primary/40 focus:ring-2 transition-all duration-200";
  const cardClassName = "border border-border bg-card shadow-sm";
  const switchClassName = "data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted";

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      healthy: { variant: 'default', label: 'Healthy' },
      pending: { variant: 'secondary', label: 'Pending' },
      warning: { variant: 'secondary', label: 'Warning' },
      failed: { variant: 'destructive', label: 'Failed' },
      expired: { variant: 'destructive', label: 'Expired' },
      error: { variant: 'destructive', label: 'Error' },
    };
    const config = variants[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  return (
    <PageShell>
      <div 
        className="min-h-screen bg-background -mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8 px-4 pt-4 pb-8 md:px-6 md:pt-6 lg:px-8 lg:pt-8"
        style={{ fontFamily: 'var(--ecode-font-sans)' }}
        data-testid="page-networking"
      >
        <PageHeader
          title="Network Control Plane"
          description="Configure networking, firewall rules, VPC peering, DNS, SSL certificates, and zero-trust policies."
          icon={Network}
          actions={(
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="gap-2 border-border bg-card text-foreground hover:bg-muted hover:border-primary/30 transition-all duration-200"
                onClick={handleRefreshTopology}
                data-testid="button-refresh-topology"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button 
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
                onClick={() => setShowAddRuleDialog(true)}
                data-testid="button-add-rule"
              >
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
            </div>
          )}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <div className="lg:col-span-1">
            <nav 
              className="space-y-1 p-2 rounded-xl border border-border bg-card"
              data-testid="nav-networking-sidebar"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] ${
                      isActive 
                        ? 'bg-primary/10 text-primary border-l-2 border-primary pl-[10px]' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    onClick={() => setActiveTab(item.id)}
                    data-testid={`button-nav-${item.id}`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {activeTab === 'topology' && (
              <Card className={cardClassName} data-testid="card-network-topology">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Network Topology
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Visual representation of your network infrastructure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {mockNetworkNodes.map((node) => (
                      <div 
                        key={node.id}
                        className="p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-all cursor-pointer"
                        data-testid={`node-${node.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {node.type === 'vpc' && <Server className="h-4 w-4 text-primary" />}
                            {node.type === 'subnet' && <Layers className="h-4 w-4 text-blue-500" />}
                            {node.type === 'loadbalancer' && <Activity className="h-4 w-4 text-green-500" />}
                            {node.type === 'instance' && <Server className="h-4 w-4 text-purple-500" />}
                            {node.type === 'gateway' && <Globe className="h-4 w-4 text-orange-500" />}
                            <span className="font-medium text-foreground">{node.name}</span>
                          </div>
                          {getStatusBadge(node.status)}
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">{node.type}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {node.connections.length} connections
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 rounded-lg border border-dashed border-border bg-muted/30 text-center" data-testid="topology-visualization">
                    <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Interactive Topology View</h3>
                    <p className="text-muted-foreground mb-4">
                      Drag and zoom to explore your network infrastructure
                    </p>
                    <Button variant="outline" data-testid="button-fullscreen-topology">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Fullscreen View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'firewall' && (
              <Card className={cardClassName} data-testid="card-firewall-rules">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Firewall Rules
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Configure ingress and egress rules to control network traffic
                      </CardDescription>
                    </div>
                    <Dialog open={showAddRuleDialog} onOpenChange={setShowAddRuleDialog}>
                      <DialogTrigger asChild>
                        <Button className="gap-2" data-testid="button-add-firewall-rule">
                          <Plus className="h-4 w-4" />
                          Add Rule
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md" data-testid="dialog-add-rule">
                        <DialogHeader>
                          <DialogTitle>Add Firewall Rule</DialogTitle>
                          <DialogDescription>Create a new firewall rule to control network traffic.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label>Rule Name</Label>
                            <Input
                              value={newRule.name}
                              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                              placeholder="e.g., Allow HTTPS"
                              className={inputClassName}
                              data-testid="input-rule-name"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Direction</Label>
                              <Select value={newRule.direction} onValueChange={(v) => setNewRule({ ...newRule, direction: v as 'ingress' | 'egress' })}>
                                <SelectTrigger className={inputClassName} data-testid="select-direction">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ingress">Ingress</SelectItem>
                                  <SelectItem value="egress">Egress</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Action</Label>
                              <Select value={newRule.action} onValueChange={(v) => setNewRule({ ...newRule, action: v as 'allow' | 'deny' })}>
                                <SelectTrigger className={inputClassName} data-testid="select-action">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="allow">Allow</SelectItem>
                                  <SelectItem value="deny">Deny</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Protocol</Label>
                              <Select value={newRule.protocol} onValueChange={(v) => setNewRule({ ...newRule, protocol: v as 'tcp' | 'udp' | 'icmp' | 'all' })}>
                                <SelectTrigger className={inputClassName} data-testid="select-protocol">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="tcp">TCP</SelectItem>
                                  <SelectItem value="udp">UDP</SelectItem>
                                  <SelectItem value="icmp">ICMP</SelectItem>
                                  <SelectItem value="all">All</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Port</Label>
                              <Input
                                value={newRule.port}
                                onChange={(e) => setNewRule({ ...newRule, port: e.target.value })}
                                placeholder="443"
                                className={inputClassName}
                                data-testid="input-port"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Source IP</Label>
                            <Input
                              value={newRule.sourceIp}
                              onChange={(e) => setNewRule({ ...newRule, sourceIp: e.target.value })}
                              placeholder="0.0.0.0/0"
                              className={inputClassName}
                              data-testid="input-source-ip"
                            />
                          </div>
                          <div>
                            <Label>Priority</Label>
                            <Input
                              type="number"
                              value={newRule.priority}
                              onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
                              placeholder="100"
                              className={inputClassName}
                              data-testid="input-priority"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowAddRuleDialog(false)} data-testid="button-cancel-rule">Cancel</Button>
                          <Button onClick={handleAddRule} data-testid="button-save-rule">Create Rule</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table data-testid="table-firewall-rules">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Protocol</TableHead>
                          <TableHead>Port</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockFirewallRules.map((rule) => (
                          <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                            <TableCell className="font-medium">{rule.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {rule.direction === 'ingress' ? <ArrowDownLeft className="h-3 w-3 mr-1" /> : <ArrowUpRight className="h-3 w-3 mr-1" />}
                                {rule.direction}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={rule.action === 'allow' ? 'default' : 'destructive'}>
                                {rule.action === 'allow' ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                                {rule.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="uppercase">{rule.protocol}</TableCell>
                            <TableCell>{rule.port}</TableCell>
                            <TableCell className="font-mono text-xs">{rule.sourceIp}</TableCell>
                            <TableCell>
                              <Switch
                                checked={rule.enabled}
                                onCheckedChange={() => handleToggleRule(rule)}
                                className={switchClassName}
                                data-testid={`switch-rule-${rule.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" data-testid={`button-edit-rule-${rule.id}`}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive" data-testid={`button-delete-rule-${rule.id}`}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Firewall Rule</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete the rule "{rule.name}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteRule(rule)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {activeTab === 'vpc' && (
              <Card className={cardClassName} data-testid="card-vpc-peering">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    VPC Peering Connections
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Manage connections between your Virtual Private Clouds
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {mockVPCPeerings.map((peering) => (
                      <div 
                        key={peering.id}
                        className="p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-all"
                        data-testid={`vpc-peering-${peering.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Link2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground">{peering.name}</h4>
                              <p className="text-sm text-muted-foreground">{peering.peerRegion}</p>
                            </div>
                          </div>
                          {getStatusBadge(peering.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Peer VPC ID:</span>
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{peering.peerVpcId}</code>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyToClipboard(peering.peerVpcId)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CIDR Block:</span>
                            <code className="font-mono text-xs bg-muted px-2 py-1 rounded ml-2">{peering.cidrBlock}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-4 gap-2" variant="outline" data-testid="button-add-vpc-peering">
                    <Plus className="h-4 w-4" />
                    Create VPC Peering Connection
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'dns' && (
              <Card className={cardClassName} data-testid="card-dns-management">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        DNS Records
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Manage DNS records for your domains
                      </CardDescription>
                    </div>
                    <Button className="gap-2" data-testid="button-add-dns-record">
                      <Plus className="h-4 w-4" />
                      Add Record
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table data-testid="table-dns-records">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>TTL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockDNSRecords.map((record) => (
                        <TableRow key={record.id} data-testid={`row-dns-${record.id}`}>
                          <TableCell className="font-mono text-sm">{record.name}</TableCell>
                          <TableCell><Badge variant="outline">{record.type}</Badge></TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate">{record.value}</TableCell>
                          <TableCell>{record.ttl}s</TableCell>
                          <TableCell>
                            <Switch checked={record.enabled} className={switchClassName} data-testid={`switch-dns-${record.id}`} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" data-testid={`button-edit-dns-${record.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" data-testid={`button-delete-dns-${record.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {activeTab === 'ssl' && (
              <Card className={cardClassName} data-testid="card-ssl-certificates">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        SSL/TLS Certificates
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Manage SSL/TLS certificates for secure connections
                      </CardDescription>
                    </div>
                    <Button className="gap-2" data-testid="button-add-certificate">
                      <Plus className="h-4 w-4" />
                      Add Certificate
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {mockSSLCertificates.map((cert) => (
                      <div 
                        key={cert.id}
                        className="p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-all"
                        data-testid={`ssl-cert-${cert.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${cert.status === 'active' ? 'bg-green-500/10' : cert.status === 'expired' ? 'bg-red-500/10' : 'bg-yellow-500/10'}`}>
                              <FileKey className={`h-4 w-4 ${cert.status === 'active' ? 'text-green-500' : cert.status === 'expired' ? 'text-red-500' : 'text-yellow-500'}`} />
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground font-mono">{cert.domain}</h4>
                              <p className="text-sm text-muted-foreground">Issued by {cert.issuer}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(cert.status)}
                            <Badge variant="outline">{cert.type}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4 text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              Expires: {new Date(cert.expiresAt).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Auto-renew:</span>
                              <Switch checked={cert.autoRenew} className={switchClassName} data-testid={`switch-autorenew-${cert.id}`} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" data-testid={`button-view-cert-${cert.id}`}>
                              View Details
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`button-renew-cert-${cert.id}`}>
                              Renew
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'zerotrust' && (
              <Card className={cardClassName} data-testid="card-zero-trust">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Zero-Trust Access Policies
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Configure conditional access policies for enhanced security
                      </CardDescription>
                    </div>
                    <Button className="gap-2" data-testid="button-add-policy">
                      <Plus className="h-4 w-4" />
                      Add Policy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {mockZeroTrustPolicies.map((policy) => (
                      <div 
                        key={policy.id}
                        className="p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-all"
                        data-testid={`policy-${policy.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Shield className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-foreground">{policy.name}</h4>
                              <p className="text-sm text-muted-foreground">{policy.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={policy.action === 'allow' ? 'default' : policy.action === 'deny' ? 'destructive' : 'secondary'}>
                              {policy.action.toUpperCase()}
                            </Badge>
                            <Switch checked={policy.enabled} className={switchClassName} data-testid={`switch-policy-${policy.id}`} />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {policy.conditions.ipRanges?.map((ip, i) => (
                            <Badge key={i} variant="outline" className="text-xs">IP: {ip}</Badge>
                          ))}
                          {policy.conditions.countries?.map((country, i) => (
                            <Badge key={i} variant="outline" className="text-xs">Country: {country}</Badge>
                          ))}
                          {policy.conditions.userGroups?.map((group, i) => (
                            <Badge key={i} variant="outline" className="text-xs">Group: {group}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'traffic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className={cardClassName} data-testid="card-stat-requests">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Requests</p>
                          <p className="text-2xl font-bold text-foreground">{(mockTrafficStats.totalRequests / 1000000).toFixed(1)}M</p>
                        </div>
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Activity className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={cardClassName} data-testid="card-stat-rps">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Requests/Second</p>
                          <p className="text-2xl font-bold text-foreground">{mockTrafficStats.requestsPerSecond.toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-green-500/10">
                          <Zap className="h-5 w-5 text-green-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={cardClassName} data-testid="card-stat-bandwidth">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Bandwidth Out</p>
                          <p className="text-2xl font-bold text-foreground">{mockTrafficStats.bandwidthOut} GB/s</p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-500/10">
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={cardClassName} data-testid="card-stat-latency">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">P99 Latency</p>
                          <p className="text-2xl font-bold text-foreground">{mockTrafficStats.latencyP99}ms</p>
                        </div>
                        <div className="p-3 rounded-lg bg-orange-500/10">
                          <Clock className="h-5 w-5 text-orange-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className={cardClassName} data-testid="card-top-endpoints">
                    <CardHeader>
                      <CardTitle className="text-foreground">Top Endpoints</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mockTrafficStats.topEndpoints.map((endpoint, i) => (
                          <div key={i} className="space-y-2" data-testid={`endpoint-${i}`}>
                            <div className="flex items-center justify-between text-sm">
                              <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{endpoint.path}</code>
                              <span className="text-muted-foreground">{(endpoint.requests / 1000000).toFixed(1)}M</span>
                            </div>
                            <Progress value={(endpoint.requests / mockTrafficStats.topEndpoints[0].requests) * 100} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={cardClassName} data-testid="card-top-countries">
                    <CardHeader>
                      <CardTitle className="text-foreground">Traffic by Country</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {mockTrafficStats.topCountries.map((country, i) => (
                          <div key={i} className="space-y-2" data-testid={`country-${i}`}>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-foreground">{country.country}</span>
                              <span className="text-muted-foreground">{(country.requests / 1000000).toFixed(1)}M</span>
                            </div>
                            <Progress value={(country.requests / mockTrafficStats.topCountries[0].requests) * 100} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'ports' && (
              <Card className={cardClassName} data-testid="card-port-forwarding">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        Port Forwarding Rules
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Configure port forwarding to route traffic to internal services
                      </CardDescription>
                    </div>
                    <Button className="gap-2" data-testid="button-add-port-forward">
                      <Plus className="h-4 w-4" />
                      Add Rule
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table data-testid="table-port-forwards">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>External Port</TableHead>
                        <TableHead>Internal Port</TableHead>
                        <TableHead>Protocol</TableHead>
                        <TableHead>Target IP</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockPortForwards.map((forward) => (
                        <TableRow key={forward.id} data-testid={`row-forward-${forward.id}`}>
                          <TableCell className="font-medium">{forward.name}</TableCell>
                          <TableCell>{forward.externalPort}</TableCell>
                          <TableCell>{forward.internalPort}</TableCell>
                          <TableCell><Badge variant="outline" className="uppercase">{forward.protocol}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{forward.targetIp}</TableCell>
                          <TableCell>
                            <Switch checked={forward.enabled} className={switchClassName} data-testid={`switch-forward-${forward.id}`} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" data-testid={`button-edit-forward-${forward.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" data-testid={`button-delete-forward-${forward.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
