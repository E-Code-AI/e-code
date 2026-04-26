import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Check,
  Clock,
  Copy,
  Cpu,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  HardDrive,
  Loader2,
  Rocket,
  X,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";

type TabId = "overview" | "logs" | "resources" | "analytics";
type PublishStatus = "idle" | "publishing" | "live" | "failed" | "needs-republish";

interface PublishStatusResponse {
  status: PublishStatus;
  url: string | null;
  deployedAt: string | null;
  errorMessage: string | null;
  publish?: {
    totalDeployments: number;
    deployment?: { id: string; type: string } | null;
    latestDeployment?: { id: string; type: string } | null;
  };
}

interface LatestDeploymentResponse {
  success: boolean;
  deployment: {
    deploymentId: string;
    type: string;
    environment: string;
    status: string;
    updatedAt?: string | null;
    createdAt?: string | null;
    metrics?: {
      cpu?: number;
      memory?: number;
      requests?: number;
      errors?: number;
      responseTime?: number;
      uptime?: number;
    } | null;
  };
}

interface DeploymentLogsResponse {
  success: boolean;
  logs: Array<{
    id: string;
    type: "build" | "deploy";
    message: string;
    timestamp: string;
    level: "info" | "warn" | "error";
  }>;
}

interface DeploymentAnalyticsResponse {
  success: boolean;
  analytics: {
    summary: {
      totalRequests: number;
      avgResponseTime: number;
    };
    requests: {
      byPath: Array<{ path: string; count: number }>;
      byStatusCode: Record<string, number>;
    };
    timeSeries: Array<{
      timestamp: string;
      requests: number;
    }>;
  };
}

const STATUS_COLORS: Record<PublishStatus, string> = {
  idle: "#6B7280",
  live: "#10B981",
  publishing: "#F59E0B",
  failed: "#EF4444",
  "needs-republish": "#F59E0B",
};

function QRCodeDisplay({ url }: { url: string }) {
  return <div className="text-[10px] bg-[var(--ide-surface)] p-2 rounded text-[var(--ide-text)]">{url}</div>;
}

function TopList({ title, items }: { title: string; items: Array<{ label: string; value: number }> }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)]">
      <span className="text-[10px] font-semibold text-[var(--ide-text-secondary)] uppercase block mb-2">{title}</span>
      <div className="space-y-1">
        {items.slice(0, 8).map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-[10px]">
            <span className="text-[var(--ide-text)] truncate flex-1">{item.label}</span>
            <div className="w-16 h-1.5 bg-[var(--ide-border)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--ide-accent)] rounded-full" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
            <span className="text-[var(--ide-text-muted)] w-8 text-right">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const { data, isLoading } = useQuery<PublishStatusResponse>({
    queryKey: ["/api/projects", projectId, "publish", "status"],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}/publish/status`),
    refetchInterval: (query) => (query.state.data?.status === "publishing" ? 2000 : 15000),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const endpoint = data?.status === "live" || data?.status === "needs-republish" ? "republish" : "publish";
      return apiRequest("POST", `/api/projects/${projectId}/${endpoint}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "publish", "status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "deployment", "latest"] });
    },
  });

  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[var(--ide-text-muted)]" /></div>;

  const status = data?.status || "idle";
  const url = data?.url || "";
  const deploymentType = data?.publish?.deployment?.type || data?.publish?.latestDeployment?.type || "";

  return (
    <div className="p-3 space-y-3">
      <div className="bg-[var(--ide-surface)] rounded-lg p-3 border border-[var(--ide-border)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
          <span className="text-sm font-semibold text-[var(--ide-text)]">{status === "live" ? "Published" : status === "publishing" ? "Publishing..." : status === "failed" ? "Failed" : status === "needs-republish" ? "Needs Republish" : "Not Published"}</span>
          {deploymentType ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase font-semibold">{deploymentType}</span> : null}
          {data?.publish?.totalDeployments ? <span className="text-[10px] text-[var(--ide-text-muted)]">{data.publish.totalDeployments} deploy{data.publish.totalDeployments > 1 ? "s" : ""}</span> : null}
        </div>

        {url ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[var(--ide-text-muted)]" />
              <span className="text-[11px] text-[var(--ide-accent)] truncate flex-1">{url}</span>
              <Button variant="ghost" size="icon" className="w-6 h-6 text-[var(--ide-text-muted)]" onClick={() => { navigator.clipboard.writeText(url); setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000); }}>
                {copiedUrl ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </Button>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-[var(--ide-text-muted)] hover:text-[var(--ide-text)]">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            {data?.deployedAt ? <div className="flex items-center gap-2 text-[10px] text-[var(--ide-text-muted)]"><Clock className="w-3 h-3" /><span>Last deployed: {new Date(data.deployedAt).toLocaleString()}</span></div> : null}
            {data?.errorMessage ? <div className="flex items-center gap-2 text-[10px] text-red-400"><AlertCircle className="w-3 h-3" /><span>{data.errorMessage}</span></div> : null}
          </div>
        ) : (
          <div className="text-[10px] text-[var(--ide-text-muted)]">No live deployment URL yet.</div>
        )}
      </div>

      {url ? (
        <div className="bg-[var(--ide-surface)] rounded-lg p-3 border border-[var(--ide-border)] flex flex-col items-center">
          <span className="text-[10px] text-[var(--ide-text-muted)] uppercase mb-2 font-semibold">QR Code for Mobile Access</span>
          <div className="bg-white p-2 rounded"><QRCodeDisplay url={url} /></div>
        </div>
      ) : null}

      <Button className="w-full h-8 text-xs" onClick={() => publishMutation.mutate(undefined)} disabled={publishMutation.isPending || status === "publishing"}>
        {publishMutation.isPending || status === "publishing" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Rocket className="w-3.5 h-3.5 mr-1.5" />}
        {status === "live" || status === "needs-republish" ? "Republish" : "Publish"}
      </Button>
    </div>
  );
}

function LogsTab({ projectId }: { projectId: string }) {
  const latestQuery = useQuery<LatestDeploymentResponse>({
    queryKey: ["/api/projects", projectId, "deployment", "latest"],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}/deployment/latest`),
  });
  const deploymentId = latestQuery.data?.deployment?.deploymentId;
  const logsQuery = useQuery<DeploymentLogsResponse>({
    queryKey: ["/api/deployments", deploymentId, "logs"],
    queryFn: () => apiRequest("GET", `/api/deployments/${deploymentId}/logs?type=all&limit=200`),
    enabled: !!deploymentId,
    refetchInterval: 10000,
  });

  if (latestQuery.isLoading || (deploymentId && logsQuery.isLoading)) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[var(--ide-text-muted)]" /></div>;
  if (!deploymentId) return <div className="flex items-center justify-center py-8 text-[11px] text-[var(--ide-text-muted)]">No deployment logs available yet</div>;

  const logs = logsQuery.data?.logs || [];
  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-[var(--ide-border)] text-[10px] text-[var(--ide-text-muted)]">Deployment ID: <span className="font-mono text-[var(--ide-text)]">{deploymentId}</span></div>
      <div className="flex-1 overflow-y-auto font-mono text-[10px]">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--ide-text-muted)]"><FileText className="w-6 h-6 mb-2 opacity-50" /><span className="text-[11px]">No logs found</span></div>
        ) : logs.map((log) => (
          <div key={log.id} className={`px-2 py-0.5 border-b border-[var(--ide-border)] hover:bg-[var(--ide-surface)] ${log.level === "error" ? "bg-red-500/5" : ""}`}>
            <span className="text-[9px] text-[var(--ide-text-muted)]">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className={`ml-1.5 px-1 py-0 rounded text-[8px] uppercase font-semibold ${log.level === "error" ? "bg-red-500/20 text-red-400" : log.level === "warn" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"}`}>{log.level}</span>
            <span className="ml-1.5 text-[var(--ide-text-muted)] uppercase">{log.type}</span>
            <span className="ml-1.5 text-[var(--ide-text)]">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourcesTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery<LatestDeploymentResponse>({
    queryKey: ["/api/projects", projectId, "deployment", "latest"],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}/deployment/latest`),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[var(--ide-text-muted)]" /></div>;
  const metrics = data?.deployment?.metrics;
  const point = { time: new Date(data?.deployment?.updatedAt || data?.deployment?.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), cpu: metrics?.cpu || 0, memory: metrics?.memory || 0 };

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)]"><div className="flex items-center gap-1.5 mb-1"><Cpu className="w-3 h-3 text-blue-400" /><span className="text-[9px] text-[var(--ide-text-muted)] uppercase">CPU</span></div><span className="text-lg font-bold text-[var(--ide-text)]">{metrics?.cpu ?? 0}<span className="text-xs text-[var(--ide-text-muted)]">%</span></span></div>
        <div className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)]"><div className="flex items-center gap-1.5 mb-1"><HardDrive className="w-3 h-3 text-purple-400" /><span className="text-[9px] text-[var(--ide-text-muted)] uppercase">Memory</span></div><span className="text-lg font-bold text-[var(--ide-text)]">{metrics?.memory ?? 0}<span className="text-xs text-[var(--ide-text-muted)]">MB</span></span></div>
      </div>
      <div className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)]">
        <span className="text-[10px] font-semibold text-[var(--ide-text-secondary)] uppercase block mb-2">CPU Snapshot</span>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={[point]}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ide-border)" />
            <XAxis dataKey="time" tick={{ fontSize: 8, fill: "var(--ide-text-muted)" }} />
            <YAxis tick={{ fontSize: 8, fill: "var(--ide-text-muted)" }} domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="cpu" stroke="#3B82F6" strokeWidth={1.5} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)]">
        <span className="text-[10px] font-semibold text-[var(--ide-text-secondary)] uppercase block mb-2">Runtime</span>
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between"><span className="text-[var(--ide-text-muted)]">Status</span><span className="text-[var(--ide-text)]">{data?.deployment?.status || "unknown"}</span></div>
          <div className="flex justify-between"><span className="text-[var(--ide-text-muted)]">Environment</span><span className="text-[var(--ide-text)]">{data?.deployment?.environment || "production"}</span></div>
          <div className="flex justify-between"><span className="text-[var(--ide-text-muted)]">Type</span><span className="text-[var(--ide-text)]">{data?.deployment?.type || "autoscale"}</span></div>
          <div className="flex justify-between"><span className="text-[var(--ide-text-muted)]">Uptime</span><span className="text-[var(--ide-text)]">{metrics?.uptime ?? 0}%</span></div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({ projectId }: { projectId: string }) {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("30d");
  const { data, isLoading } = useQuery<DeploymentAnalyticsResponse>({
    queryKey: ["/api/projects", projectId, "deployments", "analytics", period],
    queryFn: () => apiRequest("GET", `/api/projects/${projectId}/deployments/analytics?period=${period}`),
    refetchInterval: 60000,
  });

  if (isLoading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[var(--ide-text-muted)]" /></div>;
  const analytics = data?.analytics;
  const topUrls = analytics?.requests.byPath.map((entry) => ({ label: entry.path, value: entry.count })) || [];
  const statuses = Object.entries(analytics?.requests.byStatusCode || {});

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      <div className="flex gap-1 mb-2">
        {(["24h", "7d", "30d"] as const).map((range) => (
          <button key={range} className={`text-[9px] px-1.5 py-0.5 rounded ${period === range ? "bg-[var(--ide-accent)] text-white" : "bg-[var(--ide-surface)] text-[var(--ide-text-muted)]"}`} onClick={() => setPeriod(range)}>{range}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)]"><div className="flex items-center gap-1.5 mb-1"><Eye className="w-3 h-3 text-blue-400" /><span className="text-[9px] text-[var(--ide-text-muted)] uppercase">Requests</span></div><span className="text-lg font-bold text-[var(--ide-text)]">{analytics?.summary.totalRequests ?? 0}</span></div>
        <div className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)]"><div className="flex items-center gap-1.5 mb-1"><Activity className="w-3 h-3 text-green-400" /><span className="text-[9px] text-[var(--ide-text-muted)] uppercase">Avg Latency</span></div><span className="text-lg font-bold text-[var(--ide-text)]">{Math.round(analytics?.summary.avgResponseTime ?? 0)} ms</span></div>
      </div>
      <div className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)]">
        <span className="text-[10px] font-semibold text-[var(--ide-text-secondary)] uppercase block mb-2">Traffic Over Time</span>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={(analytics?.timeSeries || []).map((point) => ({ time: new Date(point.timestamp).toLocaleDateString(), requests: point.requests }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ide-border)" />
            <XAxis dataKey="time" tick={{ fontSize: 7, fill: "var(--ide-text-muted)" }} />
            <YAxis tick={{ fontSize: 8, fill: "var(--ide-text-muted)" }} />
            <Tooltip />
            <Bar dataKey="requests" fill="#3B82F6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TopList title="Top URLs" items={topUrls} />
      <div className="bg-[var(--ide-surface)] rounded-lg p-2.5 border border-[var(--ide-border)]">
        <span className="text-[10px] font-semibold text-[var(--ide-text-secondary)] uppercase block mb-2">HTTP Status Distribution</span>
        {statuses.length === 0 ? <div className="text-[10px] text-[var(--ide-text-muted)] text-center py-2">No data</div> : (
          <div className="space-y-1">
            {statuses.map(([status, count]) => (
              <div key={status} className="flex items-center gap-2 text-[10px]">
                <span className="font-mono">{status}</span>
                <div className="flex-1 h-1.5 bg-[var(--ide-border)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--ide-accent)]" style={{ width: `${Math.max(5, (Number(count) / Math.max(analytics?.summary.totalRequests || 1, 1)) * 100)}%` }} />
                </div>
                <span className="text-[var(--ide-text-muted)] w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublishingPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const tabs: { id: TabId; label: string; icon: typeof Globe }[] = [
    { id: "overview", label: "Overview", icon: Globe },
    { id: "logs", label: "Logs", icon: FileText },
    { id: "resources", label: "Resources", icon: Cpu },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col h-full" data-testid="publishing-panel">
      <div className="flex items-center justify-between px-3 h-9 border-b border-[var(--ide-border)] shrink-0">
        <span className="text-[10px] font-bold text-[var(--ide-text-secondary)] uppercase tracking-widest">Publishing</span>
        <Button variant="ghost" size="icon" className="w-6 h-6 text-[var(--ide-text-muted)] hover:text-[var(--ide-text)]" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex border-b border-[var(--ide-border)] shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-[var(--ide-accent)] text-[var(--ide-accent)]" : "border-transparent text-[var(--ide-text-muted)] hover:text-[var(--ide-text)]"}`} onClick={() => setActiveTab(tab.id)}>
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === "overview" && <OverviewTab projectId={projectId} />}
        {activeTab === "logs" && <LogsTab projectId={projectId} />}
        {activeTab === "resources" && <ResourcesTab projectId={projectId} />}
        {activeTab === "analytics" && <AnalyticsTab projectId={projectId} />}
      </div>
    </div>
  );
}
