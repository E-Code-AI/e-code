
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{d as T}from"./chunk-QRMNVBCN.js";import"./chunk-5ZD762ZT.js";import"./chunk-INICBF4H.js";import"./chunk-G3YIGMP2.js";import"./chunk-XQO3LM4D.js";import"./chunk-KZSAKPNO.js";import"./chunk-7JB7GYPP.js";import"./chunk-VRJIOIHQ.js";import"./chunk-UKLVEE4Y.js";import"./chunk-2GOIWGW7.js";import"./chunk-KVTR5VNS.js";import"./chunk-B6UHYZUF.js";import"./chunk-5OWZ6DYH.js";import{e as R}from"./chunk-5D5JQLUE.js";var f=R(T(),1);import{EventEmitter as b}from"events";var l=class extends b{constructor(){super();this.metrics=[];this.maxMetrics=1e4;this.metricsWindow=300*1e3;setInterval(()=>this.cleanupOldMetrics(),60*1e3)}cleanupOldMetrics(){let s=Date.now()-this.metricsWindow;this.metrics=this.metrics.filter(i=>i.timestamp.getTime()>s)}recordMetric(s){this.metrics.push(s),this.metrics.length>this.maxMetrics&&(this.metrics=this.metrics.slice(-this.maxMetrics)),this.emit("metric",s),s.responseTime>3e3&&this.emit("slow-response",s),s.statusCode>=500&&this.emit("server-error",s)}getStats(s){let i=s||this.metricsWindow,o=Date.now()-i,t=this.metrics.filter(e=>e.timestamp.getTime()>o),a={};t.forEach(e=>{let n=`${e.method} ${e.endpoint}`;a[n]||(a[n]=[]),a[n].push(e)});let r={};return Object.entries(a).forEach(([e,n])=>{let[c,m]=e.split(" "),u=n.map(p=>p.responseTime).sort((p,h)=>p-h),_=n.filter(p=>p.statusCode>=400).length;r[e]={endpoint:m,method:c,count:n.length,avgResponseTime:u.reduce((p,h)=>p+h,0)/u.length,minResponseTime:u[0]||0,maxResponseTime:u[u.length-1]||0,errorCount:_,successRate:(n.length-_)/n.length*100,p50:this.percentile(u,50),p95:this.percentile(u,95),p99:this.percentile(u,99)}}),r}percentile(s,i){if(s.length===0)return 0;let o=Math.ceil(i/100*s.length)-1;return s[o]}getHealthStatus(){let s=this.getStats(),i=[],o="healthy";Object.values(s).forEach(e=>{e.p95>2e3&&(i.push(`Slow endpoint: ${e.method} ${e.endpoint} (p95: ${e.p95}ms)`),o="degraded"),e.errorCount>0&&e.successRate<95&&(i.push(`High error rate: ${e.method} ${e.endpoint} (${e.successRate.toFixed(1)}% success)`),e.successRate<90?o="unhealthy":o!=="unhealthy"&&(o="degraded"))});let t=Object.values(s).reduce((e,n)=>e+n.count,0),a=Object.values(s).reduce((e,n)=>e+n.errorCount,0),r=(t-a)/t*100;return r<95&&(i.push(`Overall success rate low: ${r.toFixed(1)}%`),r<90?o="unhealthy":o!=="unhealthy"&&(o="degraded")),{status:o,issues:i,stats:{totalRequests:t,totalErrors:a,overallSuccessRate:r,endpointStats:s}}}getRealtimeMetrics(s=100){return this.metrics.slice(-s)}getTimeSeriesData(s=6e4){let i=Date.now(),o=[];for(let t=0;t<10;t++){let a=i-t*s,r=a-s,e=this.metrics.filter(n=>{let c=n.timestamp.getTime();return c>=r&&c<a});if(e.length>0){let n=e.reduce((m,u)=>m+u.responseTime,0)/e.length,c=e.filter(m=>m.statusCode>=400).length;o.unshift({timestamp:new Date(a),requests:e.length,avgResponseTime:n,errorCount:c,errorRate:c/e.length*100})}}return o}},g=new l;var y=(0,f.Router)();y.get("/metrics",($,d)=>{try{let s=g.getStats(),i=process.memoryUsage(),o=process.uptime(),t="";t+=`# HELP http_requests_total Total number of HTTP requests
`,t+=`# TYPE http_requests_total counter
`,Object.entries(s).forEach(([a,r])=>{let[e,...n]=a.split(" "),c=n.join(" ").replace(/"/g,'\\"');t+=`http_requests_total{method="${e}",endpoint="${c}",status="success"} ${r.count-r.errorCount}
`,t+=`http_requests_total{method="${e}",endpoint="${c}",status="error"} ${r.errorCount}
`}),t+=`
# HELP http_request_duration_seconds HTTP request latencies in seconds
`,t+=`# TYPE http_request_duration_seconds summary
`,Object.entries(s).forEach(([a,r])=>{let[e,...n]=a.split(" "),c=n.join(" ").replace(/"/g,'\\"');t+=`http_request_duration_seconds{method="${e}",endpoint="${c}",quantile="0.5"} ${r.p50/1e3}
`,t+=`http_request_duration_seconds{method="${e}",endpoint="${c}",quantile="0.95"} ${r.p95/1e3}
`,t+=`http_request_duration_seconds{method="${e}",endpoint="${c}",quantile="0.99"} ${r.p99/1e3}
`,t+=`http_request_duration_seconds_sum{method="${e}",endpoint="${c}"} ${r.avgResponseTime*r.count/1e3}
`,t+=`http_request_duration_seconds_count{method="${e}",endpoint="${c}"} ${r.count}
`}),t+=`
# HELP process_memory_heap_bytes Node.js heap memory usage
`,t+=`# TYPE process_memory_heap_bytes gauge
`,t+=`process_memory_heap_bytes{type="used"} ${i.heapUsed}
`,t+=`process_memory_heap_bytes{type="total"} ${i.heapTotal}
`,t+=`
# HELP process_memory_rss_bytes Resident set size memory
`,t+=`# TYPE process_memory_rss_bytes gauge
`,t+=`process_memory_rss_bytes ${i.rss}
`,t+=`
# HELP process_uptime_seconds Process uptime in seconds
`,t+=`# TYPE process_uptime_seconds gauge
`,t+=`process_uptime_seconds ${o}
`,t+=`
# HELP nodejs_active_handles_total Number of active handles
`,t+=`# TYPE nodejs_active_handles_total gauge
`,t+=`nodejs_active_handles_total ${process._getActiveHandles?.()?.length||0}
`,t+=`
# HELP nodejs_active_requests_total Number of active requests
`,t+=`# TYPE nodejs_active_requests_total gauge
`,t+=`nodejs_active_requests_total ${process._getActiveRequests?.()?.length||0}
`,d.set("Content-Type","text/plain; version=0.0.4"),d.send(t)}catch(s){console.error("Error generating Prometheus metrics:",s),d.status(500).send(`# Error generating metrics
`)}});var j=y;export{j as default};
