
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{f as p}from"./chunk-AD7FPOF5.js";import"./chunk-OMGHQKQI.js";import"./chunk-KOHKAKK7.js";import"./chunk-2CFKHX4I.js";import"./chunk-LOJN5Z32.js";import"./chunk-NRIEQZ4F.js";import"./chunk-5VBXYHR2.js";import"./chunk-SUGQP5BU.js";import"./chunk-2LLTIQNM.js";import"./chunk-ERKIQN6P.js";import"./chunk-SLCWITGS.js";import"./chunk-3JUZXZ3L.js";import"./chunk-E6Z4GF7P.js";import"./chunk-G3YIGMP2.js";import"./chunk-KZSAKPNO.js";import"./chunk-UKLVEE4Y.js";import{d as x,f as P}from"./chunk-BEGAQUQV.js";import"./chunk-G6E5POTQ.js";import"./chunk-UXMHOPI6.js";import"./chunk-KVTR5VNS.js";import"./chunk-B6UHYZUF.js";import"./chunk-5OWZ6DYH.js";import"./chunk-5D5JQLUE.js";P();import*as f from"fs/promises";import*as u from"path";import*as S from"crypto";var i=x("ScreenshotService"),b=class{constructor(){this.browser=null;this.objectStorageEnabled=!1}async initialize(){try{let e=await import("playwright").catch(()=>null);e?(this.browser=await e.chromium.launch({headless:!0,args:["--no-sandbox","--disable-setuid-sandbox"]}),i.info("Screenshot service initialized with Playwright")):i.info("Playwright not available, running in basic mode without browser automation"),this.objectStorageEnabled=await p.fileExists("screenshots/.initialized").catch(()=>!1)||!0,this.objectStorageEnabled&&i.info("Object storage integration enabled for screenshots")}catch(e){i.error("Failed to initialize screenshot service:",e),i.info("Running in basic mode without browser automation")}}async storeScreenshotInObjectStorage(e,r,t={}){let s=Date.now(),o=S.createHash("sha256").update(e).digest("hex").substring(0,8),a=t.checkpointId?`screenshots/checkpoints/${r}/${t.checkpointId}-${s}-${o}.png`:`screenshots/projects/${r}/${s}-${o}.png`,n=await p.uploadFile(a,e,{contentType:"image/png",public:!0,metadata:{projectId:r.toString(),checkpointId:t.checkpointId?.toString()||"",capturedAt:new Date().toISOString(),...t.metadata}},r,t.userId);return i.info(`Screenshot stored in object storage: ${a}`),n}async getScreenshotFromObjectStorage(e){try{return await p.downloadFile(e)}catch{return i.warn(`Failed to retrieve screenshot from object storage: ${e}`),null}}async listCheckpointScreenshots(e,r){let t=r?`screenshots/checkpoints/${e}/${r}`:`screenshots/checkpoints/${e}`;return p.listFiles(t)}async captureProjectPreview(e,r,t={}){try{let s=this.getProjectPreviewUrl(e);i.info(`Capturing screenshot for project ${e} at ${s}`);let o=t.storeInObjectStorage?"object_storage":t.storeAsBase64?"base64":"local";if(this.browser){let a=await this.browser.newPage();try{await a.setViewportSize({width:1920,height:1080}),await a.goto(s,{waitUntil:"networkidle",timeout:3e4}),await a.waitForTimeout(2e3);let n=await a.screenshot({fullPage:!1,type:"png"}),m=await a.screenshot({fullPage:!1,type:"jpeg",quality:80,clip:{x:0,y:0,width:400,height:300}}),d=new Date().toISOString().replace(/[:.]/g,"-"),h=u.join(process.cwd(),"screenshots",e.toString());await f.mkdir(h,{recursive:!0});let c=u.join(h,`screenshot-${d}.png`),g=u.join(h,`thumbnail-${d}.jpg`);await f.writeFile(c,n),await f.writeFile(g,m);let l=m.toString("base64"),v=n.toString("base64"),w,y;return t.storeInObjectStorage&&this.objectStorageEnabled&&(w=await this.storeScreenshotInObjectStorage(n,e,{...t,userId:r,metadata:{...t.metadata,captureType:"project_preview"}}),y=w.key),{screenshotPath:c,objectStorageKey:y,base64Data:t.storeAsBase64?`data:image/png;base64,${v}`:void 0,thumbnail:`data:image/jpeg;base64,${l}`,thumbnailBase64:l,storageObject:w,metadata:{width:1920,height:1080,timestamp:new Date,projectId:e,checkpointId:t.checkpointId,storageType:o}}}finally{a&&!a.isClosed()&&await a.close()}}else{i.warn("Browser not available, generating deterministic project preview");let a=await this.generateProjectPreview(e),n=Buffer.from(a).toString("base64");return{screenshotPath:`/screenshots/project-${e}-preview.png`,base64Data:t.storeAsBase64?`data:image/svg+xml;base64,${n}`:void 0,thumbnail:`data:image/svg+xml;base64,${n}`,thumbnailBase64:n,metadata:{width:1920,height:1080,timestamp:new Date,projectId:e,checkpointId:t.checkpointId,storageType:"base64"}}}}catch(s){throw i.error(`Failed to capture screenshot for project ${e}:`,s),s}}async captureForCheckpoint(e,r,t){return this.captureProjectPreview(e,r,{storeInObjectStorage:!0,storeAsBase64:!0,checkpointId:t,metadata:{captureType:"checkpoint",checkpointId:t.toString()}})}async captureWorkflowState(e){try{let r=["frontend","backend","database"],t=[];for(let s of r)try{let o=this.getWorkflowPreviewUrl(e,s);if(this.browser){let a=await this.browser.newPage();await a.setViewportSize({width:1280,height:720}),await a.goto(o,{waitUntil:"domcontentloaded",timeout:15e3});let n=await a.screenshot({type:"jpeg",quality:70});await a.close(),t.push({workflow:s,status:"running",screenshot:`data:image/jpeg;base64,${n.toString("base64")}`})}else t.push({workflow:s,status:"unknown",error:"Screenshot service not available"})}catch(o){i.error(`Failed to capture workflow ${s}:`,o),t.push({workflow:s,status:"error",error:o instanceof Error?o.message:"Unknown error"})}return{screenshots:t}}catch(r){throw i.error("Failed to capture workflow states:",r),r}}async captureErrorState(e,r){try{let t=this.generateErrorHtml(r);if(this.browser){let s=await this.browser.newPage();await s.setContent(t),await s.setViewportSize({width:800,height:600});let o=await s.screenshot({type:"png"});return await s.close(),{errorScreenshot:`data:image/png;base64,${o.toString("base64")}`,errorMessage:r.message,stackTrace:r.stack}}else return{errorScreenshot:"data:image/svg+xml;base64,"+Buffer.from(this.getErrorSvg(r.message)).toString("base64"),errorMessage:r.message,stackTrace:r.stack}}catch(t){throw i.error("Failed to capture error state:",t),t}}async cleanup(){this.browser&&(await this.browser.close(),this.browser=null)}getProjectPreviewUrl(e){return`${process.env.PREVIEW_SERVICE_URL||process.env.APP_URL||"http://localhost:3100"}/preview/${e}`}getWorkflowPreviewUrl(e,r){return`${process.env.PREVIEW_SERVICE_URL||process.env.APP_URL||"http://localhost:3100"}/preview/${e}/${r}`}async generateProjectPreview(e){try{let{storage:r}=await import("./storage-SLTJSGOC.js"),t=await r.getProjectById(e);if(!t)return this.getGenericPreviewSvg(e);let s=await r.getProjectFiles(e).catch(()=>[]),o=s.length,a=s.some(l=>l.path?.includes(".jsx")||l.path?.includes(".tsx")),n=s.some(l=>l.path?.includes(".vue")),m=s.some(l=>l.path?.endsWith(".py")),d=s.some(l=>l.path?.includes("package.json")),h="Project",c="#3b82f6",g="\u{1F4C1}";return a?(h="React App",c="#61dafb",g="\u269B\uFE0F"):n?(h="Vue App",c="#42b883",g="\u{1F7E2}"):m?(h="Python App",c="#3776ab",g="\u{1F40D}"):d&&(h="Node.js App",c="#68a063",g="\u{1F4E6}"),`<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad${e}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${c};stop-opacity:0.1" />
            <stop offset="100%" style="stop-color:${c};stop-opacity:0.05" />
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#grad${e})"/>
        <rect width="1920" height="1080" fill="#ffffff" opacity="0.95"/>
        
        <!-- Header -->
        <rect width="1920" height="80" fill="${c}" opacity="0.1"/>
        <text x="60" y="50" fill="${c}" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600">
          E-Code Platform
        </text>
        
        <!-- Project Icon and Name -->
        <text x="960" y="400" text-anchor="middle" font-size="120">
          ${g}
        </text>
        <text x="960" y="520" text-anchor="middle" fill="#111827" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="700">
          ${this.escapeXml(t.name||"Untitled Project")}
        </text>
        
        <!-- Project Type -->
        <text x="960" y="580" text-anchor="middle" fill="#6b7280" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="500">
          ${h}
        </text>
        
        <!-- Stats -->
        <text x="960" y="680" text-anchor="middle" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="18">
          ${o} file${o!==1?"s":""} \xB7 Project ID: ${e}
        </text>
        
        <!-- Description if available -->
        ${t.description?`
        <text x="960" y="760" text-anchor="middle" fill="#6b7280" font-family="system-ui, -apple-system, sans-serif" font-size="20">
          ${this.escapeXml(t.description.substring(0,80))}${t.description.length>80?"...":""}
        </text>
        `:""}
        
        <!-- Footer -->
        <text x="960" y="1000" text-anchor="middle" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="16">
          Preview generated at ${new Date().toLocaleString()}
        </text>
        <text x="960" y="1030" text-anchor="middle" fill="#d1d5db" font-family="system-ui, -apple-system, sans-serif" font-size="14">
          Real-time screenshot unavailable - Playwright not configured
        </text>
      </svg>`}catch(r){return i.error("Failed to generate project preview:",r),this.getGenericPreviewSvg(e)}}getGenericPreviewSvg(e){return`<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <rect width="1920" height="1080" fill="#f9fafb"/>
      <text x="960" y="500" text-anchor="middle" fill="#6b7280" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="600">
        Project Preview
      </text>
      <text x="960" y="560" text-anchor="middle" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="20">
        Project ID: ${e}
      </text>
      <text x="960" y="620" text-anchor="middle" fill="#d1d5db" font-family="system-ui, -apple-system, sans-serif" font-size="16">
        Real-time screenshot unavailable
      </text>
    </svg>`}escapeXml(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}getErrorSvg(e){return`<svg width="800" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="200" fill="#fee2e2"/>
      <text x="400" y="80" text-anchor="middle" fill="#dc2626" font-family="Arial" font-size="18" font-weight="bold">
        Error Captured
      </text>
      <text x="400" y="120" text-anchor="middle" fill="#7f1d1d" font-family="Arial" font-size="14">
        ${e.substring(0,80)}${e.length>80?"...":""}
      </text>
    </svg>`}generateErrorHtml(e){return`<!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #fee2e2;
          padding: 20px;
          margin: 0;
        }
        .error-container {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
          color: #dc2626;
          margin: 0 0 10px;
          font-size: 24px;
        }
        .error-message {
          color: #7f1d1d;
          margin: 10px 0;
        }
        .stack-trace {
          background: #f3f4f6;
          padding: 10px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
          overflow-x: auto;
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>Error Captured</h1>
        <div class="error-message">${e.message}</div>
        ${e.stack?`<pre class="stack-trace">${e.stack}</pre>`:""}
      </div>
    </body>
    </html>`}},E=new b;export{b as ScreenshotService,E as screenshotService};
