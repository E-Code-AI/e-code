
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{b as h,c as d,d as P}from"./chunk-ABZW7YJC.js";import{b as S}from"./chunk-ISOIQKWP.js";import{h as g}from"./chunk-RDSVFM4O.js";import"./chunk-5D5JQLUE.js";var m=class{constructor(t,n){this.clients=new Map;this.storage=n,this.wss=new g.Server({noServer:!0}),t.on("upgrade",async(e,r,i)=>{if(e.url?.startsWith("/api/resources/ws"))try{let s=e.headers.origin,c=e.headers.host;if(!S(s,c)){console.warn(`[Resources] Rejected connection from unauthorized origin: ${s}`),r.write(`HTTP/1.1 403 Forbidden\r
\r
`),r.destroy();return}let u=P(e);if(!d.checkLimit(u)){let o=Math.ceil(d.getTimeUntilReset(u)/1e3);console.warn(`[Resources] Rate limit exceeded for IP ${u}. Retry after ${o}s`),r.write(`HTTP/1.1 429 Too Many Requests\r
\r
`),r.destroy();return}let p=global.sessionStore;if(!p){console.error("[Resources] Session store not available"),r.write(`HTTP/1.1 500 Internal Server Error\r
\r
`),r.destroy();return}let y=e.headers.cookie?.split(";").map(o=>o.trim()).find(o=>o.startsWith("ecode.sid="))?.split("=")[1];if(!y){console.warn("[Resources] No session cookie found"),r.write(`HTTP/1.1 401 Unauthorized\r
\r
`),r.destroy();return}let R;try{R=decodeURIComponent(y)}catch{console.warn("[Resources] Malformed session cookie"),r.write(`HTTP/1.1 401 Unauthorized\r
\r
`),r.destroy();return}let v=R.split(".")[0].replace(/^s:/,""),w=await new Promise((o,b)=>{p.get(v,(T,M)=>{T?b(T):o(M)})});if(!w?.passport?.user?.id){console.warn("[Resources] Invalid session or user not authenticated"),r.write(`HTTP/1.1 401 Unauthorized\r
\r
`),r.destroy();return}let a=w.passport.user.id;if(!h.checkLimit(a)){let o=Math.ceil(h.getTimeUntilReset(a)/1e3);console.warn(`[Resources] Rate limit exceeded for user ${a}. Retry after ${o}s`),r.write(`HTTP/1.1 429 Too Many Requests\r
\r
`),r.destroy();return}let l=new URL(e.url,`http://${e.headers.host}`).searchParams.get("projectId");if(!l){console.warn("[Resources] Missing projectId parameter"),r.write(`HTTP/1.1 400 Bad Request\r
\r
`),r.destroy();return}if(!await this.authorizeProject(l,a)){console.warn(`[Resources] User ${a} not authorized for project ${l}`),r.write(`HTTP/1.1 403 Forbidden\r
\r
`),r.destroy();return}this.wss.handleUpgrade(e,r,i,o=>{this.wss.emit("connection",o,e,l,a)})}catch(s){console.error("[Resources] Error during WebSocket upgrade:",s),r.write(`HTTP/1.1 500 Internal Server Error\r
\r
`),r.destroy()}}),this.wss.on("connection",(e,r,i,s)=>{this.handleConnection(e,r,i,s)})}async authorizeProject(t,n){try{let e=await this.storage.getProject(t);if(!e)return console.warn(`[Resources] Project ${t} not found`),!1;if(e.ownerId===n)return!0;try{if(await this.storage.getTeamMemberByUserAndProject?.(n,t))return!0}catch(r){console.debug("[Resources] Team membership check skipped:",r)}return console.warn(`[Resources] User ${n} does not have access to project ${t}`),!1}catch(e){return console.error("[Resources] Authorization error:",e),!1}}async handleConnection(t,n,e,r){let i={ws:t,projectId:e,userId:r};this.clients.has(e)||this.clients.set(e,[]),this.clients.get(e).push(i);try{let s=await this.storage.getResourceMetrics(e,50),c=await this.storage.getLatestResourceMetrics(e);t.send(JSON.stringify({type:"initial",metrics:s,latest:c}))}catch(s){console.error("[Resources] Error fetching initial metrics:",s),t.send(JSON.stringify({type:"error",message:"Failed to fetch initial resource metrics"}))}t.on("close",()=>{this.removeClient(e,i)}),t.on("error",s=>{console.error("[Resources] WebSocket error:",s),this.removeClient(e,i)}),t.on("message",s=>{try{let c=JSON.parse(s.toString())}catch(c){console.error("[Resources] Error parsing message:",c)}})}removeClient(t,n){let e=this.clients.get(t);if(e){let r=e.indexOf(n);r>-1&&e.splice(r,1),e.length===0&&this.clients.delete(t)}}async broadcastMetricUpdate(t,n){let e=this.clients.get(t);if(!e||e.length===0)return;let r=JSON.stringify({type:"metric_update",metric:n});for(let i of e)i.ws.readyState===g.OPEN&&i.ws.send(r)}getClientCount(t){return this.clients.get(t)?.length||0}};function A(f,t){return new m(f,t)}export{m as ResourcesService,A as setupResourcesWebSocket};
