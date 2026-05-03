import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
const logger = {
  error: (message: string, error?: any) => {
    console.error(`[preview-devtools] ERROR: ${message}`, error);
  },
  info: (_message: string, ..._args: any[]) => {}
};

interface DevToolsClient {
  ws: WebSocket;
  projectId: number;
  userId: number;
}

export interface ConsoleMessage {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
  stack?: string;
}

export interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  type: string;
  size?: number;
  time?: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
}

export interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  attributes: Record<string, string>;
  computedStyles?: Record<string, string>;
  dimensions?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
}

// Maximum number of entries retained per project bucket
const MAX_CONSOLE_ENTRIES = 200;
const MAX_NETWORK_ENTRIES = 200;
// Evict project buckets that have had no active WS client for this long
const PROJECT_DATA_TTL_MS = 30 * 60 * 1_000; // 30 minutes

class PreviewDevToolsService extends EventEmitter {
  private clients: Map<string, DevToolsClient> = new Map();
  private projectData: Map<number, {
    console: ConsoleMessage[];
    network: NetworkRequest[];
    performance: PerformanceMetric[];
  }> = new Map();
  // Track last-active timestamp per project for TTL eviction
  private projectLastActive: Map<number, number> = new Map();

  constructor() {
    super();
    this.initializeDefaultMetrics();
    // Evict stale project buckets every 5 minutes
    setInterval(() => this.evictStaleProjects(), 5 * 60_000);
  }

  private evictStaleProjects() {
    const now = Date.now();
    for (const [pid, lastActive] of this.projectLastActive) {
      const hasClients = [...this.clients.values()].some(c => c.projectId === pid);
      if (!hasClients && now - lastActive > PROJECT_DATA_TTL_MS) {
        this.projectData.delete(pid);
        this.projectLastActive.delete(pid);
      }
    }
  }

  private touchProject(pid: number) {
    this.projectLastActive.set(pid, Date.now());
  }

  private cpuUsageBaseline = process.cpuUsage();
  private cpuTimestampBaseline = Date.now();

  private initializeDefaultMetrics() {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 5000);
  }

  addClient(ws: WebSocket, projectId: number, userId: number): string {
    const clientId = `${userId}-${projectId}-${Date.now()}`;
    this.clients.set(clientId, { ws, projectId, userId });

    // Send initial data if available
    const projectData = this.projectData.get(projectId);
    if (projectData) {
      ws.send(JSON.stringify({
        type: 'initial',
        payload: projectData
      }));
    }

    // Handle client messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(clientId, message);
      } catch (error) {
        logger.error('Failed to parse dev tools message:', error);
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
    });

    return clientId;
  }

  private handleClientMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'startInspect':
        this.startElementInspection(client.projectId);
        break;
      case 'stopInspect':
        this.stopElementInspection(client.projectId);
        break;
      case 'clearConsole':
        this.clearConsole(client.projectId);
        break;
      case 'clearNetwork':
        this.clearNetwork(client.projectId);
        break;
    }
  }

  // Console logging from preview
  private ensureProjectBucket(projectId: number) {
    if (!this.projectData.has(projectId)) {
      this.projectData.set(projectId, { console: [], network: [], performance: [] });
    }
  }

  logConsole(projectId: number, message: ConsoleMessage) {
    this.ensureProjectBucket(projectId);
    this.touchProject(projectId);

    const projectData = this.projectData.get(projectId)!;
    projectData.console.push(message);

    if (projectData.console.length > MAX_CONSOLE_ENTRIES) {
      projectData.console = projectData.console.slice(-MAX_CONSOLE_ENTRIES);
    }

    this.broadcastToProject(projectId, { type: 'console', payload: message });
  }

  // Network request tracking
  trackNetworkRequest(projectId: number, request: NetworkRequest) {
    this.ensureProjectBucket(projectId);
    this.touchProject(projectId);

    const projectData = this.projectData.get(projectId)!;
    const existingIndex = projectData.network.findIndex(r => r.id === request.id);

    if (existingIndex !== -1) {
      projectData.network[existingIndex] = { ...projectData.network[existingIndex], ...request };
    } else {
      projectData.network.push(request);
      if (projectData.network.length > MAX_NETWORK_ENTRIES) {
        projectData.network = projectData.network.slice(-MAX_NETWORK_ENTRIES);
      }
    }

    this.broadcastToProject(projectId, { type: 'network', payload: request });
  }

  // Update performance metrics using real process data
  private updatePerformanceMetrics() {
    const mem = process.memoryUsage();
    const heapUsedMB = mem.heapUsed / 1024 / 1024;
    const rssUsedMB = mem.rss / 1024 / 1024;

    const now = Date.now();
    const currentCpu = process.cpuUsage(this.cpuUsageBaseline);
    const elapsedMs = now - this.cpuTimestampBaseline;
    const cpuPercent = elapsedMs > 0
      ? Math.min(100, ((currentCpu.user + currentCpu.system) / 1000 / elapsedMs) * 100)
      : 0;
    this.cpuUsageBaseline = process.cpuUsage();
    this.cpuTimestampBaseline = now;

    const metrics: PerformanceMetric[] = [
      {
        name: 'Heap Used',
        value: Math.round(heapUsedMB * 10) / 10,
        unit: 'MB',
        status: heapUsedMB > 300 ? 'critical' : heapUsedMB > 150 ? 'warning' : 'good'
      },
      {
        name: 'RSS Memory',
        value: Math.round(rssUsedMB * 10) / 10,
        unit: 'MB',
        status: rssUsedMB > 500 ? 'critical' : rssUsedMB > 250 ? 'warning' : 'good'
      },
      {
        name: 'CPU Usage',
        value: Math.round(cpuPercent * 10) / 10,
        unit: '%',
        status: cpuPercent > 80 ? 'critical' : cpuPercent > 50 ? 'warning' : 'good'
      },
      {
        name: 'Event Loop',
        value: Math.round(elapsedMs),
        unit: 'ms',
        status: elapsedMs > 200 ? 'warning' : 'good'
      }
    ];

    Array.from(this.projectData.keys()).forEach(projectId => {
      this.broadcastToProject(projectId, {
        type: 'performance',
        payload: metrics
      });
    });
  }

  // Element inspection
  private startElementInspection(projectId: number) {
    this.broadcastToProject(projectId, {
      type: 'inspectMode',
      payload: { enabled: true }
    });
  }

  private stopElementInspection(projectId: number) {
    this.broadcastToProject(projectId, {
      type: 'inspectMode',
      payload: { enabled: false }
    });
  }

  // Send element info when selected
  sendElementInfo(projectId: number, element: ElementInfo) {
    this.touchProject(projectId);
    this.broadcastToProject(projectId, { type: 'element', payload: element });
  }

  // Clear console
  private clearConsole(projectId: number) {
    const projectData = this.projectData.get(projectId);
    if (projectData) {
      projectData.console = [];
    }
  }

  // Clear network
  private clearNetwork(projectId: number) {
    const projectData = this.projectData.get(projectId);
    if (projectData) {
      projectData.network = [];
    }
  }

  // Broadcast to all clients watching a project
  private broadcastToProject(projectId: number, data: any) {
    Array.from(this.clients.entries()).forEach(([_clientId, client]) => {
      if (client.projectId === projectId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    });
  }

  // Inject dev tools script into preview
  // bootstrapToken is forwarded so the injected script can auth REST calls and
  // the devtools WebSocket in contexts where no session cookie is present.
  getDevToolsScript(projectId: number, bootstrapToken?: string): string {
    const tokenHeader = bootstrapToken
      ? `, 'x-bootstrap-token': ${JSON.stringify(bootstrapToken)}`
      : '';
    const wsSuffix = bootstrapToken
      ? `?bootstrap=${encodeURIComponent(bootstrapToken)}`
      : '';
    return `
      <script>
        (function() {
          // Capture originalFetch FIRST — before any monkey-patching — so all
          // devtools telemetry uses the real fetch and never recurses.
          var originalFetch = window.fetch.bind(window);
          var DEVTOOLS_PREFIX = '/api/preview/devtools/';

          // Override console methods
          const originalConsole = {};
          ['log', 'info', 'warn', 'error', 'debug'].forEach(method => {
            originalConsole[method] = console[method];
            console[method] = function(...args) {
              // Send to dev tools via originalFetch (not the instrumented window.fetch)
              originalFetch('/api/preview/devtools/console', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'${tokenHeader} },
                body: JSON.stringify({
                  projectId: ${projectId},
                  level: method,
                  message: args.map(arg => {
                    try {
                      return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                    } catch (e) {
                      return String(arg);
                    }
                  }).join(' '),
                  source: new Error().stack?.split('\\n')[2]?.trim()
                })
              }).catch(() => {});
              
              // Call original method
              originalConsole[method].apply(console, args);
            };
          });

          // Track network requests — skip devtools URLs to prevent recursion
          window.fetch = function(...args) {
            var urlArg = args[0];
            var urlStr = typeof urlArg === 'string' ? urlArg : (urlArg instanceof Request ? urlArg.url : String(urlArg));
            // Pass through devtools calls and relative paths that start with the devtools prefix
            if (urlStr && (urlStr === DEVTOOLS_PREFIX || urlStr.startsWith(DEVTOOLS_PREFIX))) {
              return originalFetch.apply(window, args);
            }

            const requestId = Date.now().toString();
            const startTime = performance.now();
            const [url, options = {}] = args;
            
            // Track request start via originalFetch (never recurses)
            originalFetch('/api/preview/devtools/network', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json'${tokenHeader} },
              body: JSON.stringify({
                projectId: ${projectId},
                id: requestId,
                method: options.method || 'GET',
                url: urlStr,
                type: 'fetch',
                requestHeaders: options.headers || {}
              })
            }).catch(() => {});

            return originalFetch.apply(window, args).then(response => {
              const endTime = performance.now();
              
              // Track response via originalFetch
              response.clone().text().then(body => {
                originalFetch('/api/preview/devtools/network', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json'${tokenHeader} },
                  body: JSON.stringify({
                    projectId: ${projectId},
                    id: requestId,
                    status: response.status,
                    statusText: response.statusText,
                    time: Math.round(endTime - startTime),
                    size: body.length,
                    responseHeaders: Object.fromEntries(response.headers.entries())
                  })
                }).catch(() => {});
              });
              
              return response;
            });
          };

          // Element inspection
          let inspectMode = false;
          let highlightElement = null;

          function createHighlight() {
            const highlight = document.createElement('div');
            highlight.style.position = 'fixed';
            highlight.style.border = '2px solid #0969da';
            highlight.style.backgroundColor = 'rgba(9, 105, 218, 0.1)';
            highlight.style.pointerEvents = 'none';
            highlight.style.zIndex = '999999';
            highlight.style.display = 'none';
            document.body.appendChild(highlight);
            return highlight;
          }

          function updateHighlight(element) {
            if (!highlightElement) {
              highlightElement = createHighlight();
            }
            
            const rect = element.getBoundingClientRect();
            highlightElement.style.left = rect.left + 'px';
            highlightElement.style.top = rect.top + 'px';
            highlightElement.style.width = rect.width + 'px';
            highlightElement.style.height = rect.height + 'px';
            highlightElement.style.display = 'block';
          }

          document.addEventListener('mousemove', (e) => {
            if (!inspectMode) return;
            updateHighlight(e.target);
          });

          document.addEventListener('click', (e) => {
            if (!inspectMode) return;
            e.preventDefault();
            e.stopPropagation();
            
            const element = e.target;
            const computedStyles = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            
            originalFetch('/api/preview/devtools/element', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json'${tokenHeader} },
              body: JSON.stringify({
                projectId: ${projectId},
                tagName: element.tagName,
                id: element.id,
                className: element.className,
                attributes: Array.from(element.attributes).reduce((acc, attr) => {
                  acc[attr.name] = attr.value;
                  return acc;
                }, {}),
                computedStyles: {
                  display: computedStyles.display,
                  position: computedStyles.position,
                  width: computedStyles.width,
                  height: computedStyles.height,
                  margin: computedStyles.margin,
                  padding: computedStyles.padding,
                  backgroundColor: computedStyles.backgroundColor,
                  color: computedStyles.color,
                  fontSize: computedStyles.fontSize,
                  fontWeight: computedStyles.fontWeight
                },
                dimensions: {
                  width: rect.width,
                  height: rect.height,
                  x: rect.x,
                  y: rect.y
                }
              })
            }).catch(() => {});
            
            inspectMode = false;
            if (highlightElement) {
              highlightElement.style.display = 'none';
            }
          }, true);

          // Listen for inspect mode changes via devtools WebSocket
          try {
            var dtProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            var dtWs = new WebSocket(dtProtocol + '//' + window.location.host + '/ws/preview-devtools/${projectId}' + '${wsSuffix}');
            dtWs.onmessage = function(event) {
              try {
                var data = JSON.parse(event.data);
                if (data.type === 'inspectMode') {
                  inspectMode = data.payload.enabled;
                  if (!inspectMode && highlightElement) {
                    highlightElement.style.display = 'none';
                  }
                }
              } catch {}
            };
          } catch {}

          // Track errors
          window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error || event.message);
          });

          window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
          });
        })();
      </script>
    `;
  }
}

export const previewDevToolsService = new PreviewDevToolsService();