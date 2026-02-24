
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{d as i,f as s}from"./chunk-BEGAQUQV.js";s();var a=i("upgrade-guard"),t=Symbol("websocket.upgrade.handled");function u(e,n){e.socket&&(e.socket[t]=!0),n&&(n[t]=!0)}function g(e,n){return!!(e.socket&&e.socket[t]===!0||n&&n[t]===!0)}function h(e){let n=e.on.bind(e);return e.on=function(r,o){return r==="connection"?n("connection",(c,d)=>{u(d),o(c,d)}):n(r,o)},e}var p=new Set(["/socket.io","/socket.io/"]);function l(e){try{let n=new URL(e.url,`http://${e.headers.host||"localhost"}`);return!!(n.pathname==="/"&&n.searchParams.has("token"))}catch{return!1}}function y(e,n){let r=m(e);if(p.has(r)){a.debug(`[Upgrade Guard] Skipping ${r} - managed by ws library`);return}if(l(e)){a.debug(`[Upgrade Guard] Skipping Vite HMR connection on ${r}`);return}a.debug(`[Upgrade Guard] Checking socket for ${r} (remoteAddress: ${n.remoteAddress})`),a.debug(`[Upgrade Guard] request.socket marked: ${!!e.socket?.[t]}`),a.debug(`[Upgrade Guard] raw socket marked: ${!!n?.[t]}`),setImmediate(()=>{let o=g(e,n);a.debug(`[Upgrade Guard] setImmediate check for ${r}: isHandled=${o}`),a.debug(`[Upgrade Guard] setImmediate - request.socket marked: ${!!e.socket?.[t]}`),a.debug(`[Upgrade Guard] setImmediate - raw socket marked: ${!!n?.[t]}`),o?a.debug(`[Upgrade Guard] Socket for ${r} is correctly handled - preserving`):(a.warn(`[Upgrade Guard] Destroying unhandled WebSocket upgrade: ${r}`),n.write(`HTTP/1.1 404 Not Found\r
Connection: close\r
Content-Type: text/plain\r
Content-Length: 28\r
\r
WebSocket endpoint not found`),n.destroy())})}function m(e){try{return new URL(e.url,`http://${e.headers.host||"localhost"}`).pathname}catch{return e.url||"<unknown>"}}export{t as a,u as b,g as c,h as d,y as e};
