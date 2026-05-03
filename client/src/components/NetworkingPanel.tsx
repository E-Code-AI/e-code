import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";
import {
AlertTriangle,
ArrowRightLeft,
Check,
ChevronDown,ChevronRight,
Circle,
Copy,
ExternalLink,
Globe,
Loader2,
Lock,
Plus,
Search,ShoppingCart,
Sparkles,
Trash2,
Unlock,
Wifi,
X
} from "lucide-react";
import { useEffect, useState } from "react";
import DomainPurchasePanel from "./DomainPurchasePanel";

interface PortConfig {
  id: string;
  projectId: string;
  port: number;
  internalPort: number;
  externalPort: number;
  label: string;
  protocol: string;
  isPublic: boolean;
  exposeLocalhost: boolean;
  createdAt: string;
  listening: boolean;
  localhostOnly: boolean;
  proxyUrl: string | null;
  externalUrl: string;
  source: string;
  detectedAt: string | null;
  lastSeenAt: string | null;
}

interface CustomDomain {
  id: string;
  domain: string;
  projectId: string;
  verified: boolean;
  verificationToken: string;
  sslStatus: string;
  createdAt: string;
  verifiedAt: string | null;
}

interface ProjectData {
  id: string;
  devUrlPublic: boolean;
}

export default function NetworkingPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [portsOpen, setPortsOpen] = useState(true);
  const [domainsOpen, setDomainsOpen] = useState(true);
  const [addPortMode, setAddPortMode] = useState(false);
  const [addDomainMode, setAddDomainMode] = useState(false);
  const [newPort, setNewPort] = useState("");
  const [newPortLabel, setNewPortLabel] = useState("");
  const [newPortProtocol, setNewPortProtocol] = useState("http");
  const [newDomain, setNewDomain] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showDomainPurchase, setShowDomainPurchase] = useState(false);
  const [confirmDeletePortId, setConfirmDeletePortId] = useState<string | null>(null);
  const [confirmDeleteDomainId, setConfirmDeleteDomainId] = useState<string | null>(null);
  const [newlyDiscoveredIds, setNewlyDiscoveredIds] = useState<Set<string>>(new Set());

  const portsQuery = useQuery<PortConfig[]>({
    queryKey: ["/api/projects", projectId, "networking", "ports"],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}/networking/ports`),
    refetchInterval: 15000,
  });

  const domainsQuery = useQuery<CustomDomain[]>({
    queryKey: ["/api/projects", projectId, "networking", "domains"],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}/networking/domains`),
  });

  const projectQuery = useQuery<ProjectData>({
    queryKey: ["/api/projects", projectId, "dev-url-settings"],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}`),
  });

  // Live WebSocket updates: listen for ports:update events from the scanner
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/preview`;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: "subscribe", projectId: parseInt(projectId) }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "ports:update" && String(data.projectId) === String(projectId)) {
            const addedPorts: PortConfig[] = data.newPorts || [];
            if (addedPorts.length > 0) {
              setNewlyDiscoveredIds((prev) => {
                const next = new Set(prev);
                addedPorts.forEach((p) => next.add(p.id));
                return next;
              });
              queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "networking", "ports"] });
              toast({ title: `${addedPorts.length} new port${addedPorts.length > 1 ? "s" : ""} detected` });
              setTimeout(() => {
                setNewlyDiscoveredIds((prev) => {
                  const next = new Set(prev);
                  addedPorts.forEach((p) => next.delete(p.id));
                  return next;
                });
              }, 30000);
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [projectId, queryClient, toast]);

  const toggleDevUrlMutation = useMutation({
    mutationFn: async (devUrlPublic: boolean) => {
      await apiRequest("PATCH", `/api/projects/${projectId}`, { devUrlPublic });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "dev-url-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Development URL privacy updated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    },
  });

  const createPortMutation = useMutation({
    mutationFn: async (data: { port: number; label: string; protocol: string }) => {
      return apiRequest("POST", `/api/projects/${projectId}/networking/ports`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "networking", "ports"] });
      setAddPortMode(false);
      setNewPort("");
      setNewPortLabel("");
      toast({ title: "Port configured" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add port", description: err.message, variant: "destructive" });
    },
  });

  const togglePortMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      return apiRequest("PATCH", `/api/projects/${projectId}/networking/ports/${id}`, { isPublic });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "networking", "ports"] });
      toast({ title: variables.isPublic ? "Port set to public" : "Port set to private" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update port", description: err.message, variant: "destructive" });
    },
  });

  const toggleExposeMutation = useMutation({
    mutationFn: async ({ id, exposeLocalhost }: { id: string; exposeLocalhost: boolean }) => {
      return apiRequest("PATCH", `/api/projects/${projectId}/networking/ports/${id}`, { exposeLocalhost });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "networking", "ports"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update port", description: err.message, variant: "destructive" });
    },
  });

  const deletePortMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/networking/ports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "networking", "ports"] });
      setConfirmDeletePortId(null);
      toast({ title: "Port removed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to remove port", description: err.message, variant: "destructive" });
    },
  });

  const scanPortsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/projects/${projectId}/networking/ports/scan`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "networking", "ports"] });
      const msg = data?.newPortsAdded > 0
        ? `Found ${data.detected} listening ports — ${data.newPortsAdded} added`
        : `Scanned ${data?.detected ?? 0} listening ports — no new ports`;
      toast({ title: "Port scan complete", description: msg });
    },
    onError: (err: any) => {
      toast({ title: "Port scan failed", description: err.message, variant: "destructive" });
    },
  });

  const addDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      return apiRequest("POST", `/api/projects/${projectId}/networking/domains`, { domain });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "networking", "domains"] });
      setAddDomainMode(false);
      setNewDomain("");
      toast({ title: "Domain added — add the TXT record to verify ownership" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add domain", description: err.message, variant: "destructive" });
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/projects/${projectId}/networking/domains/${id}/verify`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "networking", "domains"] });
      if (data.verified) {
        toast({ title: "Domain verified!" });
      } else {
        toast({
          title: "Verification pending",
          description: data.message || "TXT record not found yet. DNS propagation can take up to 48 hours.",
          variant: "destructive"
        });
      }
    },
    onError: (err: any) => {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/networking/domains/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "networking", "domains"] });
      setConfirmDeleteDomainId(null);
      toast({ title: "Domain removed" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to remove domain", description: err.message, variant: "destructive" });
    },
  });

  const ports = portsQuery.data || [];
  const domains = domainsQuery.data || [];

  const copyToken = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  function getSslBadge(status: string) {
    if (status === "self-signed") {
      return (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 flex items-center gap-0.5">
          <AlertTriangle className="w-2.5 h-2.5" /> Self-Signed
        </span>
      );
    }
    if (status === "active") {
      return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400">SSL Active</span>;
    }
    if (status === "provisioning") {
      return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">Provisioning</span>;
    }
    if (status === "failed") {
      return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">Failed</span>;
    }
    return <span className="text-[9px] text-[var(--ide-text-muted)]">SSL: {status}</span>;
  }

  function getSourceBadge(source: string, id: string) {
    if (newlyDiscoveredIds.has(id) || source === "detected" || source === "agent") {
      return (
        <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-400 flex items-center gap-0.5 shrink-0">
          <Sparkles className="w-2 h-2" />
          {source === "agent" ? "Agent" : "New"}
        </span>
      );
    }
    return null;
  }

  if (showDomainPurchase) {
    return <DomainPurchasePanel projectId={projectId} onClose={() => setShowDomainPurchase(false)} />;
  }

  return (
    <div className="flex flex-col h-full" data-testid="networking-panel">
      <div className="flex items-center justify-between px-3 h-9 border-b border-[var(--ide-border)] shrink-0">
        <span className="text-[10px] font-bold text-[var(--ide-text-secondary)] uppercase tracking-widest">Networking</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-6 h-6 text-[var(--ide-text-muted)] hover:text-[var(--ide-text)]" onClick={() => setShowDomainPurchase(true)} title="Purchase & manage domains" data-testid="button-open-domain-purchase">
            <ShoppingCart className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="w-6 h-6 text-[var(--ide-text-muted)] hover:text-[var(--ide-text)]" onClick={onClose} data-testid="button-close-networking">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Dev URL section */}
        <div className="px-3 py-2 border-b border-[var(--ide-border)]">
          <div className="flex items-center gap-2 py-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {projectQuery.data?.devUrlPublic ? <Globe className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-[var(--ide-text)] block">Private development URL</span>
                <span className="text-[9px] text-[var(--ide-text-muted)]">
                  {projectQuery.data?.devUrlPublic ? "Dev URL is publicly accessible" : "Dev URL requires authentication"}
                </span>
              </div>
            </div>
            <Switch
              checked={!projectQuery.data?.devUrlPublic}
              onCheckedChange={(checked) => toggleDevUrlMutation.mutate(!checked)}
              className="scale-75 shrink-0"
              data-testid="toggle-dev-url-private"
              disabled={toggleDevUrlMutation.isPending}
            />
          </div>
          <div className="mt-1 mb-1">
            <div className="flex items-center gap-1">
              <code className="text-[9px] font-mono bg-[var(--ide-bg)] px-2 py-1 rounded text-blue-400 flex-1 truncate" data-testid="text-dev-url">
                {projectId}.dev.e-code.ai
              </code>
              <Button
                variant="ghost" size="icon" className="w-5 h-5 shrink-0"
                onClick={() => { navigator.clipboard.writeText(`${projectId}.dev.e-code.ai`); toast({ title: "Dev URL copied" }); }}
                data-testid="copy-dev-url"
              >
                <Copy className="w-2.5 h-2.5 text-[var(--ide-text-muted)]" />
              </Button>
            </div>
          </div>
        </div>

        {/* Ports section */}
        <div className="px-3 py-2">
          <button className="flex items-center gap-1.5 w-full text-left py-1.5" onClick={() => setPortsOpen(!portsOpen)} data-testid="toggle-ports">
            {portsOpen ? <ChevronDown className="w-3 h-3 text-[var(--ide-text-muted)]" /> : <ChevronRight className="w-3 h-3 text-[var(--ide-text-muted)]" />}
            <Wifi className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] font-semibold text-[var(--ide-text-secondary)] uppercase">Ports ({ports.length})</span>
            <div className="flex items-center gap-0.5 ml-auto">
              <Button variant="ghost" size="icon" className="w-5 h-5 text-[var(--ide-text-muted)] hover:text-[var(--ide-text)]" onClick={(e) => { e.stopPropagation(); scanPortsMutation.mutate(undefined); }} title="Scan for listening ports" data-testid="button-scan-ports" disabled={scanPortsMutation.isPending}>
                {scanPortsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              </Button>
              <Button variant="ghost" size="icon" className="w-5 h-5 text-[var(--ide-text-muted)] hover:text-[var(--ide-text)]" onClick={(e) => { e.stopPropagation(); setAddPortMode(true); setPortsOpen(true); }} data-testid="button-add-port">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </button>

          {portsOpen && (
            <div className="space-y-1.5 mt-1">
              {addPortMode && (
                <div className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)] space-y-2">
                  <div className="flex gap-1.5">
                    <Input type="number" placeholder="Port" value={newPort} onChange={(e) => setNewPort(e.target.value)} className="h-7 text-xs bg-[var(--ide-bg)] w-24" data-testid="input-port-number" min="1" max="65535" />
                    <Input placeholder="Label (optional)" value={newPortLabel} onChange={(e) => setNewPortLabel(e.target.value)} className="h-7 text-xs bg-[var(--ide-bg)] flex-1" data-testid="input-port-label" />
                  </div>
                  <select value={newPortProtocol} onChange={(e) => setNewPortProtocol(e.target.value)} className="w-full h-7 text-xs bg-[var(--ide-bg)] border border-[var(--ide-border)] rounded px-2 text-[var(--ide-text)]" data-testid="select-port-protocol">
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="ws">WebSocket</option>
                    <option value="tcp">TCP</option>
                  </select>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-6 text-[10px] flex-1" onClick={() => createPortMutation.mutate({ port: parseInt(newPort) || 0, label: newPortLabel, protocol: newPortProtocol })} disabled={!newPort || isNaN(parseInt(newPort)) || createPortMutation.isPending} data-testid="button-save-port">
                      {createPortMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add Port"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { setAddPortMode(false); setNewPort(""); setNewPortLabel(""); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {portsQuery.isLoading ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-[var(--ide-text-muted)]" /></div>
              ) : ports.length === 0 && !addPortMode ? (
                <div className="py-4 px-2 text-center space-y-1.5">
                  <Wifi className="w-6 h-6 text-[var(--ide-text-muted)] mx-auto" />
                  <p className="text-[11px] text-[var(--ide-text-muted)]">No ports configured</p>
                  <p className="text-[9px] text-[var(--ide-text-muted)] max-w-[180px] mx-auto">Start a server in your project, then click the scan button to detect it automatically.</p>
                  <div className="flex gap-1 justify-center pt-1">
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => scanPortsMutation.mutate(undefined)} disabled={scanPortsMutation.isPending} data-testid="button-empty-scan">
                      {scanPortsMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Search className="w-3 h-3 mr-1" />}
                      Scan
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setAddPortMode(true)} data-testid="button-empty-add">
                      <Plus className="w-3 h-3 mr-1" /> Add manually
                    </Button>
                  </div>
                </div>
              ) : (
                ports.map((p) => (
                  <div key={p.id} className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)]" data-testid={`port-${p.id}`}>
                    {confirmDeletePortId === p.id ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-[var(--ide-text)]">Remove port {p.internalPort}?</p>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="destructive" className="h-6 text-[10px] flex-1" onClick={() => deletePortMutation.mutate(p.id)} disabled={deletePortMutation.isPending}>
                            {deletePortMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Remove"}
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setConfirmDeletePortId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 min-w-0">
                            <div className="w-6 h-6 rounded flex items-center justify-center bg-[var(--ide-bg)] text-[10px] font-mono font-bold text-blue-400">{p.internalPort}</div>
                            <ArrowRightLeft className="w-2.5 h-2.5 text-[var(--ide-text-muted)] shrink-0" />
                            <div className="w-6 h-6 rounded flex items-center justify-center bg-[var(--ide-bg)] text-[10px] font-mono font-bold text-green-400">{p.externalPort}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] text-[var(--ide-text)] truncate">{p.label || `Port ${p.internalPort}`}</span>
                              {getSourceBadge(p.source, p.id)}
                            </div>
                            <span className="text-[9px] text-[var(--ide-text-muted)] flex items-center gap-1">
                              {p.protocol.toUpperCase()}
                              {p.isPublic ? <Unlock className="w-2.5 h-2.5 text-green-400" /> : <Lock className="w-2.5 h-2.5" />}
                              {p.isPublic ? "Public" : "Private"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1" data-testid={`port-status-${p.id}`}>
                            <Circle className={`w-2 h-2 ${p.listening ? "fill-green-400 text-green-400" : "fill-gray-500 text-gray-500"}`} />
                            <span className={`text-[9px] ${p.listening ? "text-green-400" : "text-[var(--ide-text-muted)]"}`}>
                              {p.listening ? (p.localhostOnly ? "Localhost" : "Listening") : "Inactive"}
                            </span>
                          </div>
                          <Switch
                            checked={p.isPublic}
                            onCheckedChange={(checked) => togglePortMutation.mutate({ id: p.id, isPublic: checked })}
                            className="scale-75"
                            data-testid={`toggle-port-${p.id}`}
                            disabled={togglePortMutation.isPending}
                          />
                          <Button variant="ghost" size="icon" className="w-5 h-5 text-[var(--ide-text-muted)] hover:text-red-400" onClick={() => setConfirmDeletePortId(p.id)} data-testid={`delete-port-${p.id}`}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[9px] text-[var(--ide-text-muted)]">
                            <span>Expose localhost:</span>
                            <Switch
                              checked={p.exposeLocalhost}
                              onCheckedChange={(checked) => toggleExposeMutation.mutate({ id: p.id, exposeLocalhost: checked })}
                              className="scale-[0.6]"
                              data-testid={`toggle-expose-${p.id}`}
                              disabled={toggleExposeMutation.isPending}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-[var(--ide-text-muted)]">
                            :{p.internalPort} → :{p.externalPort}
                          </span>
                        </div>
                        {p.proxyUrl && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <Globe className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                            <code className="text-[9px] font-mono bg-[var(--ide-bg)] px-2 py-0.5 rounded text-blue-400 flex-1 truncate" data-testid={`proxy-url-${p.id}`}>
                              {window.location.origin}{p.proxyUrl}
                            </code>
                            <Button
                              variant="ghost" size="icon" className="w-4 h-4"
                              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${p.proxyUrl}`); toast({ title: "Preview URL copied" }); }}
                              data-testid={`copy-proxy-url-${p.id}`}
                            >
                              <Copy className="w-2.5 h-2.5 text-[var(--ide-text-muted)]" />
                            </Button>
                            <a href={p.proxyUrl} target="_blank" rel="noreferrer" className="shrink-0" data-testid={`open-proxy-${p.id}`}>
                              <ExternalLink className="w-3 h-3 text-blue-400" />
                            </a>
                          </div>
                        )}
                        {p.externalUrl && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <Globe className="w-2.5 h-2.5 text-green-400 shrink-0" />
                            <code className="text-[9px] font-mono bg-[var(--ide-bg)] px-2 py-0.5 rounded text-green-400 flex-1 truncate" data-testid={`external-url-${p.id}`}>
                              {p.externalUrl}
                            </code>
                            <Button
                              variant="ghost" size="icon" className="w-4 h-4"
                              onClick={() => { navigator.clipboard.writeText(p.externalUrl); toast({ title: "External URL copied" }); }}
                              data-testid={`copy-external-url-${p.id}`}
                            >
                              <Copy className="w-2.5 h-2.5 text-[var(--ide-text-muted)]" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Custom Domains section */}
        <div className="px-3 py-2 border-t border-[var(--ide-border)]">
          <button className="flex items-center gap-1.5 w-full text-left py-1.5" onClick={() => setDomainsOpen(!domainsOpen)} data-testid="toggle-domains">
            {domainsOpen ? <ChevronDown className="w-3 h-3 text-[var(--ide-text-muted)]" /> : <ChevronRight className="w-3 h-3 text-[var(--ide-text-muted)]" />}
            <Globe className="w-3 h-3 text-green-400" />
            <span className="text-[10px] font-semibold text-[var(--ide-text-secondary)] uppercase">Custom Domains ({domains.length})</span>
            <div className="flex items-center gap-0.5 ml-auto">
              <Button variant="ghost" size="icon" className="w-5 h-5 text-[var(--ide-text-muted)] hover:text-[var(--ide-text)]" onClick={(e) => { e.stopPropagation(); setShowDomainPurchase(true); }} title="Purchase a domain" data-testid="button-purchase-domain">
                <ShoppingCart className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="w-5 h-5 text-[var(--ide-text-muted)] hover:text-[var(--ide-text)]" onClick={(e) => { e.stopPropagation(); setAddDomainMode(true); setDomainsOpen(true); }} data-testid="button-add-domain">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </button>

          {domainsOpen && (
            <div className="space-y-1.5 mt-1">
              {addDomainMode && (
                <div className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)] space-y-2">
                  <Input placeholder="example.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className="h-7 text-xs bg-[var(--ide-bg)]" data-testid="input-domain" />
                  <p className="text-[9px] text-[var(--ide-text-muted)]">A DNS TXT record will be generated for ownership verification.</p>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-6 text-[10px] flex-1" onClick={() => addDomainMutation.mutate(newDomain)} disabled={!newDomain.trim() || addDomainMutation.isPending} data-testid="button-save-domain">
                      {addDomainMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add Domain"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { setAddDomainMode(false); setNewDomain(""); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {domainsQuery.isLoading ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-[var(--ide-text-muted)]" /></div>
              ) : domains.length === 0 && !addDomainMode ? (
                <p className="text-[11px] text-[var(--ide-text-muted)] text-center py-3">No custom domains — add one to map your domain to this project.</p>
              ) : (
                domains.map((d) => (
                  <div key={d.id} className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)]" data-testid={`domain-${d.id}`}>
                    {confirmDeleteDomainId === d.id ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-[var(--ide-text)]">Remove {d.domain}?</p>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="destructive" className="h-6 text-[10px] flex-1" onClick={() => deleteDomainMutation.mutate(d.id)} disabled={deleteDomainMutation.isPending}>
                            {deleteDomainMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Remove"}
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setConfirmDeleteDomainId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Globe className={`w-3.5 h-3.5 shrink-0 ${d.verified ? "text-green-400" : "text-yellow-400"}`} />
                          <span className="text-[11px] font-medium text-[var(--ide-text)] flex-1 truncate">{d.domain}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${d.verified ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                            {d.verified ? "Verified" : "Pending"}
                          </span>
                          <Button variant="ghost" size="icon" className="w-5 h-5 text-[var(--ide-text-muted)] hover:text-red-400 shrink-0" onClick={() => setConfirmDeleteDomainId(d.id)} data-testid={`delete-domain-${d.id}`}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        {!d.verified && (
                          <div className="mt-2 space-y-1.5">
                            <p className="text-[9px] text-[var(--ide-text-muted)]">Add a DNS TXT record with this value to verify ownership:</p>
                            <div className="flex items-center gap-1">
                              <code className="text-[9px] font-mono bg-[var(--ide-bg)] px-2 py-1 rounded text-[var(--ide-text)] flex-1 truncate">{d.verificationToken}</code>
                              <Button variant="ghost" size="icon" className="w-5 h-5 shrink-0" onClick={() => copyToken(d.verificationToken, d.id)} data-testid={`copy-token-${d.id}`}>
                                {copiedToken === d.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-[var(--ide-text-muted)]" />}
                              </Button>
                            </div>
                            <p className="text-[8px] text-[var(--ide-text-muted)]">DNS propagation can take up to 48 hours.</p>
                            <Button size="sm" variant="outline" className="h-6 text-[10px] w-full" onClick={() => verifyDomainMutation.mutate(d.id)} disabled={verifyDomainMutation.isPending} data-testid={`verify-domain-${d.id}`}>
                              {verifyDomainMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                              Check DNS Verification
                            </Button>
                          </div>
                        )}
                        {d.verified && (
                          <div className="mt-1.5">
                            <div className="flex items-center gap-1.5">
                              {getSslBadge(d.sslStatus)}
                              <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" className="text-[9px] text-blue-400 hover:underline flex items-center gap-0.5 ml-auto">
                                Visit <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                            {d.sslStatus === "self-signed" && (
                              <p className="text-[8px] text-yellow-400/70 mt-1" data-testid={`ssl-note-${d.id}`}>
                                Development certificate only — configure external TLS (e.g. Cloudflare, Let's Encrypt) for production.
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
