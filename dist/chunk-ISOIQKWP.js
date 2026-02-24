
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

function a(){let t=(process.env.ALLOWED_ORIGINS||process.env.REPLIT_DOMAINS||"").split(",").map(e=>e.trim()).filter(e=>e.length>0);return t.length===0?(console.warn("[SECURITY] No allowed origins configured - WebSocket connections will be rejected"),null):t.map(e=>e.toLowerCase())}function l(n){try{return!n.startsWith("http://")&&!n.startsWith("https://")&&!n.startsWith("ws://")&&!n.startsWith("wss://")?n.toLowerCase():new URL(n).host.toLowerCase()}catch(t){return console.error("[SECURITY] Failed to parse origin:",n,t),null}}function c(n,t){let e=a();if(!e||e.length===0)return console.warn("[SECURITY] Origin validation failed: No allowed origins configured"),!1;let r=n||t;if(!r)return console.warn("[SECURITY] Origin validation failed: No origin or host header present"),!1;let o=l(r);if(!o)return console.warn("[SECURITY] Origin validation failed: Could not parse origin:",r),!1;for(let i of e){let s=l(i);if(s&&(o===s||o.endsWith(`:${i}`)||o===i))return!0}return console.warn(`[SECURITY] Origin validation failed: ${o} not in allowlist:`,e),!1}function u(){let n=a();if(!n||n.length===0)throw new Error("SECURITY ERROR: No allowed origins configured. Set ALLOWED_ORIGINS or REPLIT_DOMAINS environment variable to enable WebSocket connections. Example: ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000")}export{a,c as b,u as c};
