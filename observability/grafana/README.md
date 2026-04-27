# Grafana dashboards

Dashboard-as-code for E-code. Import these JSON files into any Grafana
(>= v10) instance pointed at the Prometheus datasource scraping the
E-code `/metrics` endpoint.

## Files

- `e-code-overview.json` — production overview dashboard. Five sections:
  - **Traffic & errors**: req/s by route, error rate (4xx %), active connections.
  - **Latency**: p50/p95/p99 across the service, plus per-route p95.
  - **Process & runtime**: heap/rss memory, CPU%, event-loop lag.
  - **AI / generation**: AI request rate by model and by type.

## Importing

Manual:

1. Grafana → Dashboards → New → Import → Upload JSON file.
2. Pick your Prometheus datasource when prompted.
3. The `job` template variable populates from `label_values(http_requests_total, job)`.

Provisioned (recommended for production):

```yaml
# /etc/grafana/provisioning/dashboards/e-code.yaml
apiVersion: 1
providers:
  - name: 'e-code'
    orgId: 1
    folder: 'E-code'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards/e-code
```

Then drop `e-code-overview.json` at `/var/lib/grafana/dashboards/e-code/`.

## Metric source

The dashboard targets the metric names emitted by
`server/monitoring/prometheus.ts`:

- `http_requests_total{method, route, status}`
- `http_request_duration_seconds_bucket{method, route, le}` (histogram)
- `active_connections`
- `process_memory_bytes{type}`
- `system_memory_bytes{type}`
- `ai_requests_total{type, model}`
- `nodejs_cpu_usage_percent`
- `nodejs_event_loop_lag_seconds`
- `process_uptime_seconds`

If you change a metric name in `prometheus.ts`, also update the matching
panel `expr` in `e-code-overview.json` and bump the `version` field.

## Prometheus scrape config

Minimal scrape entry for the e-code service:

```yaml
scrape_configs:
  - job_name: e-code
    metrics_path: /metrics
    static_configs:
      - targets: ['e-code.internal:5000']
```

The `job` label set here is what the dashboard's `$job` variable filters on.
