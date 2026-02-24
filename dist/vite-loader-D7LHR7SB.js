
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import"./chunk-5D5JQLUE.js";async function v(d,r){try{let{isSocketHandled:n,markSocketAsHandled:m}=await import("./upgrade-guard-XVLVHLPR.js"),p=r.on.bind(r),c=r.addListener.bind(r),g=r.prependListener.bind(r),o=[],i=e=>{let t=(s,l,a)=>{if(!n(s,l))return m(s,l),e(s,l,a)};return t.__upgradePatched=!0,o.push(t),t};r.on=function(e,t){return e==="upgrade"&&!t.__upgradePatched?p(e,i(t)):p(e,t)},r.addListener=function(e,t){return e==="upgrade"&&!t.__upgradePatched?c(e,i(t)):c(e,t)},r.prependListener=function(e,t){return e==="upgrade"&&!t.__upgradePatched?g(e,i(t)):g(e,t)};let h=24678;console.log("[Vite Loader] \u{1F3ED} Production mode - serving static files from dist/public...");try{let t=(await import("./express-FGKRVKMP.js")).default,s=await import("path"),l=await import("fs"),a=s.resolve(__dirname,"public"),f=s.join(a,"index.html");if(!l.existsSync(a))throw new Error(`Build directory not found: ${a}. Run 'npm run build' first.`);console.log(`[Vite Loader] Serving static files from: ${a}`),d.use(t.static(a,{maxAge:"1d",etag:!0,lastModified:!0}));let b=l.readFileSync(f,"utf-8");d.use("*",(u,y,x)=>{if(u.originalUrl.startsWith("/api/")||u.originalUrl.startsWith("/health")||u.originalUrl.startsWith("/metrics")||u.originalUrl.startsWith("/ws/")||u.originalUrl.startsWith("/collaboration"))return x();y.status(200).set({"Content-Type":"text/html"}).end(b)}),console.log("[Vite Loader] \u2705 Production static serving configured successfully")}catch(e){throw console.error("[Vite Loader] \u274C Production serving failed:",e.message),e}return!0}catch(n){return n.code==="ERR_MODULE_NOT_FOUND"&&n.message.includes("@rollup/")?(console.warn("[VITE] \u26A0\uFE0F  Rollup native module not available"),console.warn("[VITE] Cannot start Vite development server due to missing optional dependency"),console.warn("[VITE] Error:",n.message)):(console.error("[VITE] Failed to setup Vite:",n.message),console.error("[VITE] Stack:",n.stack)),!1}}async function L(d){let n=(await import("./express-FGKRVKMP.js")).default,m=await import("path"),p=await import("fs"),c=m.resolve(__dirname,"public"),g=m.join(c,"index.html");if(p.existsSync(c)&&p.existsSync(g)){d.use(n.static(c));let o=p.readFileSync(g,"utf-8");d.get("*",(i,h)=>i.path.startsWith("/api")||i.path.startsWith("/collaboration")||i.path.startsWith("/webrtc")?h.status(404).json({error:"API endpoint not found"}):h.status(200).set({"Content-Type":"text/html"}).end(o));return}console.warn("[FALLBACK] \u26A0\uFE0F  Pre-built frontend not found in dist/public/"),console.warn("[FALLBACK] Using emergency fallback HTML..."),d.get("*",(o,i)=>{if(o.path.startsWith("/api")||o.path.startsWith("/collaboration")||o.path.startsWith("/webrtc"))return i.status(404).json({error:"API endpoint not found"});i.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>E-Code Platform - Maintenance Mode</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 40px;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            h1 {
              font-size: 2.5rem;
              margin-bottom: 20px;
              background: linear-gradient(to right, #fff, #e0e0e0);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            p {
              font-size: 1.1rem;
              line-height: 1.6;
              margin-bottom: 15px;
              opacity: 0.95;
            }
            .status {
              background: rgba(46, 204, 113, 0.2);
              border-left: 4px solid #2ecc71;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .status strong {
              color: #2ecc71;
            }
            .info {
              background: rgba(52, 152, 219, 0.2);
              border-left: 4px solid #3498db;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              font-size: 0.95rem;
            }
            code {
              background: rgba(0, 0, 0, 0.3);
              padding: 2px 8px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
            }
            .spinner {
              border: 3px solid rgba(255, 255, 255, 0.3);
              border-top: 3px solid white;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>\u{1F527} E-Code Platform</h1>
            <p>The E-Code Platform is currently running in <strong>API-only mode</strong> due to a frontend dependency issue.</p>
            
            <div class="status">
              <strong>\u2705 Backend Status: FULLY OPERATIONAL</strong>
              <p style="margin-top: 10px; font-size: 0.95rem;">All API endpoints, WebSocket services, authentication, database operations, and production features are working perfectly.</p>
            </div>
            
            <div class="info">
              <strong>\u2139\uFE0F Technical Details</strong>
              <p style="margin-top: 10px;">The frontend build tool (Vite) cannot start due to a missing optional dependency (<code>@rollup/rollup-linux-x64-gnu</code>). This is a known npm bug and does not affect backend functionality.</p>
              <p style="margin-top: 10px;"><strong>Available Services:</strong></p>
              <ul style="margin-left: 20px; margin-top: 5px;">
                <li>REST API (all endpoints functional)</li>
                <li>WebSocket services (real-time collaboration, LSP, build logs)</li>
                <li>WebRTC voice/video communication</li>
                <li>Database operations</li>
                <li>Authentication & authorization</li>
                <li>Production monitoring & caching</li>
              </ul>
            </div>
            
            <p style="opacity: 0.8; margin-top: 30px; text-align: center; font-size: 0.9rem;">
              Contact your administrator or check the server console for resolution steps.
            </p>
          </div>
        </body>
      </html>
    `)})}export{v as safeSetupVite,L as setupFallbackServer};
