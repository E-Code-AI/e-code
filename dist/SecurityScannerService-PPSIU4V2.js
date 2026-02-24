
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{b as g,c as y,d as P}from"./chunk-ABZW7YJC.js";import{b}from"./chunk-ISOIQKWP.js";import{h as u}from"./chunk-RDSVFM4O.js";import"./chunk-5D5JQLUE.js";var d=class{constructor(t,s){this.clients=new Map;this.storage=s,this.wss=new u.Server({noServer:!0}),t.on("upgrade",async(e,r,i)=>{if(e.url?.startsWith("/api/security-scans/ws"))try{let n=e.headers.origin,a=e.headers.host;if(!b(n,a)){console.warn(`[SecurityScanner] Rejected connection from unauthorized origin: ${n}`),r.write(`HTTP/1.1 403 Forbidden\r
\r
`),r.destroy();return}let S=P(e);if(!y.checkLimit(S)){let o=Math.ceil(y.getTimeUntilReset(S)/1e3);console.warn(`[SecurityScanner] Rate limit exceeded for IP ${S}. Retry after ${o}s`),r.write(`HTTP/1.1 429 Too Many Requests\r
\r
`),r.destroy();return}let m=global.sessionStore;if(!m){console.error("[SecurityScanner] Session store not available"),r.write(`HTTP/1.1 500 Internal Server Error\r
\r
`),r.destroy();return}let f=e.headers.cookie?.split(";").map(o=>o.trim()).find(o=>o.startsWith("ecode.sid="))?.split("=")[1];if(!f){console.warn("[SecurityScanner] No session cookie found"),r.write(`HTTP/1.1 401 Unauthorized\r
\r
`),r.destroy();return}let p;try{p=decodeURIComponent(f)}catch{console.warn("[SecurityScanner] Malformed session cookie"),r.write(`HTTP/1.1 401 Unauthorized\r
\r
`),r.destroy();return}let v=p.split(".")[0].replace(/^s:/,""),w=await new Promise((o,C)=>{m.get(v,(T,M)=>{T?C(T):o(M)})});if(!w?.passport?.user?.id){console.warn("[SecurityScanner] Invalid session or user not authenticated"),r.write(`HTTP/1.1 401 Unauthorized\r
\r
`),r.destroy();return}let c=w.passport.user.id;if(!g.checkLimit(c)){let o=Math.ceil(g.getTimeUntilReset(c)/1e3);console.warn(`[SecurityScanner] Rate limit exceeded for user ${c}. Retry after ${o}s`),r.write(`HTTP/1.1 429 Too Many Requests\r
\r
`),r.destroy();return}let l=new URL(e.url,`http://${e.headers.host}`).searchParams.get("projectId");if(!l){console.warn("[SecurityScanner] Missing projectId parameter"),r.write(`HTTP/1.1 400 Bad Request\r
\r
`),r.destroy();return}if(!await this.authorizeProject(l,c)){console.warn(`[SecurityScanner] User ${c} not authorized for project ${l}`),r.write(`HTTP/1.1 403 Forbidden\r
\r
`),r.destroy();return}this.wss.handleUpgrade(e,r,i,o=>{this.wss.emit("connection",o,e,l,c)})}catch(n){console.error("[SecurityScanner] Error during WebSocket upgrade:",n),r.write(`HTTP/1.1 500 Internal Server Error\r
\r
`),r.destroy()}}),this.wss.on("connection",(e,r,i,n)=>{this.handleConnection(e,r,i,n)})}async authorizeProject(t,s){try{let e=await this.storage.getProject(t);if(!e)return console.warn(`[SecurityScanner] Project ${t} not found`),!1;if(e.ownerId===s)return!0;try{if(await this.storage.getTeamMemberByUserAndProject?.(s,t))return!0}catch(r){console.debug("[SecurityScanner] Team membership check skipped:",r)}return console.warn(`[SecurityScanner] User ${s} does not have access to project ${t}`),!1}catch(e){return console.error("[SecurityScanner] Authorization error:",e),!1}}async handleConnection(t,s,e,r){let i={ws:t,projectId:e,userId:r};this.clients.has(e)||this.clients.set(e,[]),this.clients.get(e).push(i);try{let n=await this.storage.getSecurityScans(e,10),a=await this.storage.getProjectVulnerabilities(e,"open");t.send(JSON.stringify({type:"initial",scans:n,vulnerabilities:a}))}catch(n){console.error("[SecurityScanner] Error fetching initial data:",n),t.send(JSON.stringify({type:"error",message:"Failed to fetch initial security scan data"}))}t.on("close",()=>{this.removeClient(e,i)}),t.on("error",n=>{console.error("[SecurityScanner] WebSocket error:",n),this.removeClient(e,i)}),t.on("message",n=>{try{let a=JSON.parse(n.toString())}catch(a){console.error("[SecurityScanner] Error parsing message:",a)}})}removeClient(t,s){let e=this.clients.get(t);if(e){let r=e.indexOf(s);r>-1&&e.splice(r,1),e.length===0&&this.clients.delete(t)}}async broadcastScanUpdate(t,s){let e=this.clients.get(t);if(!e||e.length===0)return;let r=JSON.stringify({type:"scan_update",scan:s});for(let i of e)i.ws.readyState===u.OPEN&&i.ws.send(r)}async broadcastVulnerabilityUpdate(t,s){let e=this.clients.get(t);if(!e||e.length===0)return;let r=JSON.stringify({type:"vulnerability_update",vulnerability:s});for(let i of e)i.ws.readyState===u.OPEN&&i.ws.send(r)}getClientCount(t){return this.clients.get(t)?.length||0}};function z(h,t){return new d(h,t)}export{d as SecurityScannerService,z as setupSecurityScannerWebSocket};
