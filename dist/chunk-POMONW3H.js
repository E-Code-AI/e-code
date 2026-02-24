
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{a as be}from"./chunk-IYS6BKBI.js";import{a as q}from"./chunk-ULTUEN7E.js";import{b as ye}from"./chunk-V2D75ZBJ.js";import{a as C,b as he,f as re}from"./chunk-CKQMDU5X.js";import{e as F}from"./chunk-ONP64SUH.js";import{i as T}from"./chunk-LOJN5Z32.js";import{ld as R,t as se,w as ge}from"./chunk-5VBXYHR2.js";import{a as P}from"./chunk-SUGQP5BU.js";import{Ca as N}from"./chunk-2LLTIQNM.js";import{d as Ce}from"./chunk-QRMNVBCN.js";import{c as De}from"./chunk-LXJKYSE2.js";import{c as te}from"./chunk-NB757BFP.js";import{d as D,f as ee}from"./chunk-BEGAQUQV.js";import{e as fe}from"./chunk-5D5JQLUE.js";var ke=fe(Ce(),1);ee();var me=fe(De(),1);import ve from"crypto";import*as h from"fs/promises";import*as B from"path";import{EventEmitter as Te}from"events";ee();var b=D("memory-bank-service"),Fe=".ecode/memory-bank",je=8e3,xe=/^[a-zA-Z0-9_-]+\.md$/;function oe(m){let c=B.basename(m),e=c.endsWith(".md")?c:`${c}.md`;return xe.test(e)?e:null}function ne(m,c){let e=B.resolve(m),t=B.resolve(c);return e.startsWith(t+B.sep)||e===t}var ae={"projectbrief.md":{description:"Foundation document defining core requirements and goals",template:`# Project Brief

## Overview
[High-level description of what this project does]

## Core Requirements
- Requirement 1
- Requirement 2
- Requirement 3

## Project Goals
[What success looks like for this project]

## Scope
[What is in and out of scope]
`},"productContext.md":{description:"Why this project exists and problems it solves",template:`# Product Context

## Problem Statement
[What problem does this solve?]

## Target Users
[Who will use this application?]

## User Experience Goals
[How should users feel when using this?]

## How It Should Work
[Key user flows and interactions]
`},"systemPatterns.md":{description:"System architecture and key technical decisions",template:`# System Patterns

## Architecture Overview
[High-level system design]

## Key Technical Decisions
1. [Decision]: [Rationale]
2. [Decision]: [Rationale]

## Design Patterns in Use
- [Pattern 1]: [Where/Why]
- [Pattern 2]: [Where/Why]

## Component Relationships
[How major components interact]
`},"techContext.md":{description:"Technologies, dependencies, and development setup",template:`# Technical Context

## Tech Stack
- Frontend: React, TypeScript, Tailwind CSS
- Backend: Express, Node.js
- Database: PostgreSQL
- AI: Multi-provider (OpenAI, Anthropic, Gemini)

## Development Setup
[How to run the project locally]

## Key Dependencies
[Important libraries and their purposes]

## Environment Variables
[Required configuration]
`},"activeContext.md":{description:"Current work focus and recent changes",template:`# Active Context

## Current Focus
[What is being worked on right now]

## Recent Changes
- [Date]: [Change description]

## Next Steps
- [ ] Task 1
- [ ] Task 2

## Active Decisions
[Decisions that need to be made]

---
*Updated automatically as work progresses*
`}},ie=class extends Te{constructor(){super();this.projectBasePaths=new Map;this.memoryCache=new Map}setProjectBasePath(e,t){this.projectBasePaths.set(e,t)}getMemoryBankPath(e){let t=this.projectBasePaths.get(e)||process.cwd();return B.join(t,Fe)}async isInitialized(e){try{let t=this.getMemoryBankPath(e);return await h.access(t),!0}catch{return!1}}async initialize(e,t){let o=this.getMemoryBankPath(e);await h.mkdir(o,{recursive:!0});let s=[];for(let[n,i]of Object.entries(ae)){let l=i.template;n==="projectbrief.md"&&t&&(l=`# Project Brief

## Overview
${t}

## Core Requirements
[To be extracted from requirements]

## Project Goals
[To be defined]

## Scope
[To be defined]
`);let d=B.join(o,n);await h.writeFile(d,l,"utf-8"),s.push({name:n,content:l,lastUpdated:new Date,size:Buffer.byteLength(l,"utf-8")})}let r={projectId:e,files:s,totalSize:s.reduce((n,i)=>n+i.size,0),initialized:!0,lastUpdated:new Date};return this.memoryCache.set(e,r),this.emit("initialized",{projectId:e,memoryBank:r}),b.info(`[MemoryBank] Initialized for project ${e} with ${s.length} files`),r}async initializeWithAI(e,t,o){let s=this.getMemoryBankPath(e);await h.mkdir(s,{recursive:!0}),b.info(`[MemoryBank] \u{1F916} Generating AI-powered context for project ${e}...`);let r=await this.generateAIContent(t,o),n=[];for(let[l,d]of Object.entries(r)){let y=B.join(s,l);await h.writeFile(y,d,"utf-8"),n.push({name:l,content:d,lastUpdated:new Date,size:Buffer.byteLength(d,"utf-8")})}let i={projectId:e,files:n,totalSize:n.reduce((l,d)=>l+d.size,0),initialized:!0,lastUpdated:new Date};return this.memoryCache.set(e,i),this.emit("initialized",{projectId:e,memoryBank:i,aiGenerated:!0}),b.info(`[MemoryBank] \u2705 AI-generated Memory Bank for project ${e} (${n.length} files, ${i.totalSize} bytes)`),i}async generateAIContent(e,t){let o=t?.language||"typescript",s=t?.framework||"react",r=t?.buildMode||"full-app";try{let n=`You are an expert software architect. Generate project documentation for a Memory Bank system.
The user wants to build: "${e}"
Tech stack: ${o} with ${s}
Build mode: ${r}

Generate JSON with exactly 5 keys, each containing markdown content:
1. "projectbrief.md" - Project overview, core requirements, goals, and scope
2. "productContext.md" - Problem statement, target users, UX goals, key user flows
3. "systemPatterns.md" - Architecture overview, key technical decisions, design patterns
4. "techContext.md" - Tech stack details, development setup, key dependencies, env vars
5. "activeContext.md" - Current focus (initial setup), next steps as a checklist

Keep each file concise (10-30 lines). Be specific to this project, not generic.
Output valid JSON only, no markdown code blocks.`,i=`Generate Memory Bank documentation for this project. Return JSON only.

Project: ${e}`,l=t?.preferredModel||this.selectBestAvailableModel();b.info(`[MemoryBank] \u{1F916} Using model: ${l} for Memory Bank generation`);let d=await F.generateChat(l,[{role:"system",content:n},{role:"user",content:i}],{maxTokens:4e3}),y;try{let f=d.trim();f.startsWith("```")&&(f=f.replace(/^```json?\n?/,"").replace(/\n?```$/,"")),y=JSON.parse(f)}catch(f){return b.warn("[MemoryBank] Failed to parse AI response, using fallback:",f),this.generateFallbackContent(e,t)}let $=["projectbrief.md","productContext.md","systemPatterns.md","techContext.md","activeContext.md"];for(let f of $)(!y[f]||typeof y[f]!="string")&&(b.warn(`[MemoryBank] Missing or invalid ${f}, using fallback content`),y[f]=ae[f]?.template||`# ${f}

Content to be added.`);return y}catch(n){return b.error("[MemoryBank] AI generation failed, using fallback:",n),this.generateFallbackContent(e,t)}}selectBestAvailableModel(){let e=["claude-sonnet-4-5-20250929","gpt-5-mini","gpt-4.1","gemini-2.5-flash","gemini-3-pro","grok-4"];for(let t of e)try{if(F.getAvailableProviders().length>0)return t}catch{continue}return"claude-sonnet-4-5-20250929"}generateFallbackContent(e,t){let o=t?.language||"typescript",s=t?.framework||"react",r=new Date().toISOString().split("T")[0];return{"projectbrief.md":`# Project Brief

## Overview
${e}

## Core Requirements
- Implement the core functionality described above
- Ensure responsive design for all screen sizes
- Follow best practices for ${o} development

## Project Goals
- Deliver a working MVP
- Clean, maintainable code
- Good user experience

## Scope
- Frontend: ${s} application
- Backend: API endpoints as needed
- Database: PostgreSQL for persistence
`,"productContext.md":`# Product Context

## Problem Statement
${e}

## Target Users
- Primary users who need this functionality
- Secondary users who may benefit

## User Experience Goals
- Intuitive interface
- Fast performance
- Accessible design

## How It Should Work
1. User accesses the application
2. Core functionality is immediately available
3. Data is persisted across sessions
`,"systemPatterns.md":`# System Patterns

## Architecture Overview
- Frontend: ${s} with ${o}
- Backend: Express.js API
- Database: PostgreSQL with Drizzle ORM
- Styling: Tailwind CSS with shadcn/ui

## Key Technical Decisions
1. ${s}: Modern, component-based UI
2. ${o}: Type safety and better DX
3. Drizzle ORM: Type-safe database queries

## Design Patterns in Use
- Repository pattern for data access
- Component composition for UI
- Server-side validation with Zod
`,"techContext.md":`# Technical Context

## Tech Stack
- Frontend: ${s}, ${o}, Tailwind CSS
- Backend: Express.js, Node.js
- Database: PostgreSQL
- ORM: Drizzle

## Development Setup
\`\`\`bash
npm run dev  # Start development server
\`\`\`

## Key Dependencies
- TanStack Query for data fetching
- shadcn/ui for UI components
- Zod for validation

## Environment Variables
- DATABASE_URL: PostgreSQL connection string
`,"activeContext.md":`# Active Context

## Current Focus
- Initial project setup based on user requirements
- Implementing core functionality

## Recent Changes
- [${r}] Project initialized from prompt

## Next Steps
- [ ] Set up database schema
- [ ] Create API endpoints
- [ ] Build UI components
- [ ] Connect frontend to backend
- [ ] Test and refine

---
*Auto-generated by E-Code Memory Bank*
`}}async getMemoryBank(e){if(this.memoryCache.has(e))return this.memoryCache.get(e);let t=this.getMemoryBankPath(e);try{await h.access(t)}catch{return null}try{let o=await h.readdir(t),s=[];for(let n of o)if(n.endsWith(".md")){let i=B.join(t,n),l=await h.stat(i),d=await h.readFile(i,"utf-8");s.push({name:n,content:d,lastUpdated:l.mtime,size:l.size})}let r={projectId:e,files:s,totalSize:s.reduce((n,i)=>n+i.size,0),initialized:!0,lastUpdated:new Date(Math.max(...s.map(n=>n.lastUpdated.getTime())))};return this.memoryCache.set(e,r),r}catch(o){return b.error(`[MemoryBank] Error reading memory bank for project ${e}:`,o),null}}async getFile(e,t){let o=oe(t);if(!o)return b.warn(`[MemoryBank] Rejected unsafe filename: ${t}`),null;let s=this.getMemoryBankPath(e),r=B.join(s,o);if(!ne(r,s))return b.warn(`[MemoryBank] Path traversal attempt blocked: ${t}`),null;try{let n=await h.stat(r),i=await h.readFile(r,"utf-8");return{name:o,content:i,lastUpdated:n.mtime,size:n.size}}catch{return null}}async updateFile(e,t,o){let s=oe(t);if(!s)return b.warn(`[MemoryBank] Rejected unsafe filename for update: ${t}`),null;let r=this.getMemoryBankPath(e);await h.mkdir(r,{recursive:!0});let n=B.join(r,s);if(!ne(n,r))return b.warn(`[MemoryBank] Path traversal attempt blocked on update: ${t}`),null;await h.writeFile(n,o,"utf-8");let i={name:s,content:o,lastUpdated:new Date,size:Buffer.byteLength(o,"utf-8")};return this.memoryCache.delete(e),this.emit("fileUpdated",{projectId:e,file:i}),b.info(`[MemoryBank] Updated ${s} for project ${e}`),i}async deleteFile(e,t){let o=oe(t);if(!o)return b.warn(`[MemoryBank] Rejected unsafe filename for delete: ${t}`),!1;let s=this.getMemoryBankPath(e),r=B.join(s,o);if(!ne(r,s))return b.warn(`[MemoryBank] Path traversal attempt blocked on delete: ${t}`),!1;try{return await h.unlink(r),this.memoryCache.delete(e),this.emit("fileDeleted",{projectId:e,filename:o}),!0}catch{return!1}}async getContextForAgent(e){let t=await this.getMemoryBank(e);if(!t||t.files.length===0)return"";let o=["project-brief.md","architecture.md","patterns.md","dependencies.md","recent-changes.md"],s=[],r=0,n=je*4;for(let i of o){let l=t.files.find(d=>d.name===i);if(l&&l.content.trim()){let d=`### ${l.name.replace(".md","").replace(/-/g," ").toUpperCase()}
${l.content.trim()}`;r+d.length<=n&&(s.push(d),r+=d.length)}}for(let i of t.files)if(!o.includes(i.name)&&i.content.trim()){let l=`### ${i.name.replace(".md","").replace(/-/g," ").toUpperCase()}
${i.content.trim()}`;r+l.length<=n&&(s.push(l),r+=l.length)}return s.length===0?"":`<memory_bank>
## Project Memory Bank
The following is persistent context about this project. Use this information to maintain consistency across sessions.

${s.join(`

---

`)}
</memory_bank>`}async logRecentChange(e,t,o,s){let r=await this.getFile(e,"recent-changes.md"),i=`### ${new Date().toISOString().split("T")[0]}
- ${t}
- Files affected: ${o.map(d=>`\`${d}\``).join(", ")}
${s?`- Reason: ${s}`:""}
`,l;if(r){let d=r.content.split(`
`),y=d.findIndex(f=>f.includes("## Latest Updates"));y!==-1?(d.splice(y+2,0,i),l=d.join(`
`)):l=`# Recent Changes

## Latest Updates

${i}
${r.content}`,l=l.split("###").slice(0,21).join("###")}else l=`# Recent Changes

## Latest Updates

${i}`;await this.updateFile(e,"recent-changes.md",l)}async generateArchitectureDoc(e,t,o){let s=`# Architecture

## Tech Stack
- Frontend: ${t.frontend?.join(", ")||"Not specified"}
- Backend: ${t.backend?.join(", ")||"Not specified"}
- Database: ${t.database||"Not specified"}
- Hosting: ${t.hosting||"Not specified"}

## Project Structure
\`\`\`
${o||"Structure to be analyzed"}
\`\`\`

## Key Design Decisions
*Auto-generated - update with specific decisions*

## API Design
*Document key API endpoints here*

---
*Generated by E-Code Memory Bank*
`;await this.updateFile(e,"architecture.md",s)}getDefaultTemplates(){let e={};for(let[t,o]of Object.entries(ae))e[t]={description:o.description};return e}clearCache(e){this.memoryCache.delete(e)}async updateActiveContext(e,t){try{let o=await this.getFile(e,"activeContext.md"),s=new Date().toLocaleString(),r=this.sanitizeForLogging(t.action),n=`- [${s}] ${r}${t.filesChanged?.length?` (Files: ${t.filesChanged.slice(0,5).join(", ")})`:""}`,i;if(o){let l=this.parseMarkdownSections(o.content),y=(l.get("Recent Changes")||"").split(`
`).filter(f=>f.startsWith("- [")),$=[n,...y].slice(0,15);l.set("Recent Changes",$.join(`
`)),i=this.rebuildMarkdownFromSections(o.content,l)}else i=`# Active Context

## Current Focus
Working with AI agent

## Recent Changes
${n}

## Next Steps
- [ ] Continue development

---
*Auto-updated by E-Code AI Agent*
`;await this.updateFile(e,"activeContext.md",i),b.info(`[MemoryBank] Auto-updated activeContext.md for project ${e}`),this.emit("autoUpdated",{projectId:e,file:"activeContext.md",update:t})}catch(o){b.error("[MemoryBank] Failed to auto-update activeContext.md:",o)}}parseMarkdownSections(e){let t=new Map,o=e.split(`
`),s="",r=[];for(let n of o)n.startsWith("## ")?(s&&t.set(s,r.join(`
`).trim()),s=n.substring(3).trim(),r=[]):s&&r.push(n);return s&&t.set(s,r.join(`
`).trim()),t}rebuildMarkdownFromSections(e,t){let o=e.split(`
`),s=[],r="",n=!1;for(let i of o)i.startsWith("## ")?(r=i.substring(3).trim(),s.push(i),t.has(r)?(s.push(t.get(r)),n=!0):n=!1):i.startsWith("# ")||i.startsWith("---")?(n=!1,s.push(i)):n||s.push(i);return s.join(`
`)}sanitizeForLogging(e,t=80){if(!e)return"AI interaction";let o=e.replace(/[a-zA-Z0-9_-]{20,}/g,"[REDACTED]").replace(/password[:\s]*\S+/gi,"password: [REDACTED]").replace(/api[_-]?key[:\s]*\S+/gi,"api_key: [REDACTED]").replace(/token[:\s]*\S+/gi,"token: [REDACTED]").replace(/secret[:\s]*\S+/gi,"secret: [REDACTED]").trim();return o.length>t?o.substring(0,t-3)+"...":o||"AI interaction"}},ce=new ie;ee();var G=D("fast-bootstrap"),j=[{id:"claude-haiku-4-5-20251015",avgLatencyMs:350,provider:"anthropic"},{id:"gemini-2.5-flash",avgLatencyMs:400,provider:"gemini"},{id:"gpt-5-mini",avgLatencyMs:450,provider:"openai"}],M={recommendations:0,actualFastModelUsage:0,fallbacks:0,byModel:new Map},le=class{constructor(){this.isInitialized=!1;this.initialize()}initialize(){this.isInitialized||(G.info("[FastBootstrap] \u2705 Service initialized - provides fast model recommendations",{fastModels:j.map(c=>c.id)}),this.isInitialized=!0)}getRecommendedFastModel(){let c=j[0].id;M.recommendations++;let e=M.byModel.get(c)||{recommended:0,actuallyUsed:0};return e.recommended++,M.byModel.set(c,e),G.debug(`[FastBootstrap] Recommended fast model: ${c}`),c}recordActualUsage(c,e){if(e&&this.isFastModel(c)){M.actualFastModelUsage++;let t=M.byModel.get(c)||{recommended:0,actuallyUsed:0};t.actuallyUsed++,M.byModel.set(c,t),G.debug(`[FastBootstrap] Fast model actually used: ${c}`)}else e||(M.fallbacks++,G.debug(`[FastBootstrap] Fallback to non-fast model: ${c}`))}getFastestAvailableModel(){return this.getRecommendedFastModel()}getFastModels(){return j}isFastModel(c){return j.some(e=>e.id===c)}getExpectedLatency(c){return j.find(t=>t.id===c)?.avgLatencyMs??null}getCacheStats(){let c={};for(let[t,o]of M.byModel)c[t]=o;let e=M.recommendations>0?`${(M.actualFastModelUsage/M.recommendations*100).toFixed(1)}%`:"N/A";return{fastModels:j,usage:{recommendations:M.recommendations,actualFastModelUsage:M.actualFastModelUsage,fallbacks:M.fallbacks,effectivenessRate:e,byModel:c}}}resetStats(){M={recommendations:0,actualFastModelUsage:0,fallbacks:0,byModel:new Map}}},x=new le;import*as K from"path";import{exec as Ue,spawn as we}from"child_process";import{promisify as Oe}from"util";import*as J from"fs";import*as Be from"http";var de=Oe(Ue),a=D("workspace-bootstrap"),z=(0,ke.Router)(),Le=P.object({prompt:P.string().min(5,"Prompt must be at least 5 characters"),buildMode:P.enum(["design-first","full-app","continue-planning"]).default("full-app"),options:P.object({language:P.enum(["typescript","javascript","python","rust","go"]).default("typescript"),framework:P.enum(["react","vue","svelte","express","fastapi"]).default("react"),autoStart:P.boolean().default(!0),visibility:P.enum(["public","private","unlisted"]).default("private"),designFirst:P.boolean().default(!1)}).default({language:"typescript",framework:"react",autoStart:!0,visibility:"private",designFirst:!1})});z.post("/bootstrap",q,be,async(m,c)=>{let e=Date.now(),t=m.headers["x-idempotency-key"],o=null;if(a.info("[Bootstrap] \u{1F680} POST /bootstrap REQUEST RECEIVED",{body:m.body,hasPrompt:!!m.body?.prompt,hasOptions:!!m.body?.options,rawBody:JSON.stringify(m.body),idempotencyKey:t||"none"}),t){let s=await C.check(t);if(s?.cached)return a.info(`[Bootstrap] \u2705 Returning Redis-cached response for key: ${t}`,{projectId:s.cached.projectId,sessionId:s.cached.sessionId}),c.status(200).json(s.cached);if(s?.inProgress){a.info(`[Bootstrap] \u23F3 Waiting for distributed lock on key: ${t}`);let r=await C.waitForCompletion(t,3e4);if(r)return a.info(`[Bootstrap] \u2705 Returning response after wait for key: ${t}`),c.status(200).json(r);a.warn(`[Bootstrap] Lock wait timeout, proceeding with new request: ${t}`)}if(o=await C.acquireLock(t),!o){a.info(`[Bootstrap] Lock acquisition failed, waiting for other request: ${t}`);let r=await C.waitForCompletion(t,3e4);return r?c.status(200).json(r):c.status(409).json({success:!1,error:"Concurrent request in progress",message:"Please retry in a few seconds"})}a.info(`[Bootstrap] \u{1F512} Distributed lock acquired for key: ${t}`,{lockId:o})}try{a.info("[Bootstrap] Attempting to parse request body...");let{prompt:s,buildMode:r,options:n}=Le.parse(m.body);a.info("[Bootstrap] \u2705 Request validated successfully",{promptLength:s.length,buildMode:r,autoStart:n.autoStart,language:n.language,framework:n.framework});let i=s;r==="design-first"?i=`[DESIGN FIRST MODE - Create a quick visual prototype in ~3 minutes]

${s}

Focus on: UI/UX design, visual layout, clickable prototype. Skip backend initially.`:r==="full-app"&&(i=`[FULL APP MODE - Build complete working MVP in ~10 minutes]

${s}

Include: Full-stack development, backend + frontend, database integration, working functionality.`);let l=m.user,d=l.id,y=l.username||"user";a.info(`[Bootstrap] Authenticated user ${d}`,{username:y}),a.info("\u{1F680} [Bootstrap] RECEIVED REQUEST from user",d,"prompt:",s.substring(0,50)),a.info(`[Bootstrap] Starting workspace creation for user ${d}`,{prompt:s,options:n});let $=s.length>50?`${s.substring(0,47)}...`:s,f=Ne($,y),[Me,Se]=await Promise.all([T.insert(ge).values({name:$,description:i,slug:f,ownerId:d,tenantId:d,language:n.language||"typescript",visibility:n.visibility||"private"}).returning(),T.select().from(se).where(N(se.id,d)).limit(1)]),[g]=Me,[Ae]=Se;a.info(`[Bootstrap] Project created: ${g.id}`,{projectId:g.id,slug:f});let Pe=K.join(process.cwd(),"projects",String(g.id));ce.setProjectBasePath(g.id,Pe);let w=Ae?.preferredAiModel||null,U=F.getAvailableModels();if(U.length===0)throw new Error("No AI models available. Please configure at least one provider (OpenAI, Anthropic, Gemini, xAI, or Moonshot).");if(w)U.some(A=>A.id===w)?a.info(`[Bootstrap] Using user's preferred model: ${w}`):(a.warn(`[Bootstrap] Preferred model ${w} not available, falling back to first available`),w=U[0].id);else{let u=x.getRecommendedFastModel();U.some(k=>k.id===u)?(w=u,x.recordActualUsage(w,!0),a.info(`[Bootstrap] No preference - using recommended fast model: ${w}`)):(w=U[0].id,x.recordActualUsage(w,!1),a.info(`[Bootstrap] No preference - fast model unavailable, using: ${w}`))}ce.initializeWithAI(g.id,s,{language:n.language,framework:n.framework,buildMode:r,preferredModel:w}).then(()=>{a.info(`[Bootstrap] \u2705 Memory Bank AI-generated for project ${g.id} using model ${w}`)}).catch(u=>{a.warn("[Bootstrap] Memory Bank AI generation failed (non-blocking):",u)});let S=K.join(process.cwd(),"projects",String(g.id)),ue=Date.now(),$e=re.createSession(String(d),String(g.id),w),Ie=ye.createScaffold({projectId:String(g.id),language:n.language,framework:n.framework,prompt:s,projectName:$}).catch(u=>(a.warn(`[Bootstrap] Scaffold creation warning (recoverable): ${u.message}`,{projectId:g.id,error:u.message}),null)),[p,H]=await Promise.all([$e,Ie]);if(H?a.info(`[Bootstrap] \u2705 Parallel phase 1 completed in ${Date.now()-ue}ms`,{sessionId:p.id,scaffoldDurationMs:H.durationMs,filesCreated:H.filesCreated.length}):a.info(`[Bootstrap] Session created in ${Date.now()-ue}ms (scaffold deferred)`,{sessionId:p.id}),await T.update(R).set({context:{files:p.context?.files||[],currentFile:p.context?.currentFile,workingDirectory:S,environment:p.context?.environment||{},capabilities:p.context?.capabilities||[],projectId:g.id}}).where(N(R.id,p.id)),process.env.FAST_BOOTSTRAP!=="false")(async()=>{try{let u=Date.now();await de("npm install --prefer-offline --no-audit",{cwd:S,timeout:12e4}),a.info(`[Bootstrap] \u2705 Background npm install completed in ${Date.now()-u}ms`,{projectId:g.id})}catch(u){a.warn("[Bootstrap] Background npm install failed:",{error:u.message})}})(),a.info("[Bootstrap] \u26A1 Fast bootstrap: npm install delegated to background");else try{a.info(`[Bootstrap] Running npm install in ${S}`);let{stdout:u}=await de("npm install --prefer-offline --no-audit",{cwd:S,timeout:12e4});a.info("[Bootstrap] \u2705 npm install completed",{stdout:u.substring(0,500)})}catch(u){a.warn("[Bootstrap] npm install failed:",{error:u.message})}if(process.env.ENABLE_BOOTSTRAP_VALIDATION==="true")try{a.info("[Bootstrap] Running validation suite (can be disabled via ENABLE_BOOTSTRAP_VALIDATION=false)");try{let u=K.join(S,"package.json"),A=!1;if(J.existsSync(u)){let k=JSON.parse(J.readFileSync(u,"utf-8"));A=!!(k.scripts&&k.scripts.build)}if(A){a.info(`[Bootstrap] Running npm run build in ${S}`);let k=await de("npm run build",{cwd:S,timeout:18e4});a.info("[Bootstrap] \u2705 Build completed successfully",{stdout:k.stdout.substring(0,500)})}else{a.info("[Bootstrap] No build script found, running npm run dev health check");try{let k=we("npm",["run","dev"],{cwd:S,stdio:"pipe"}),O=await new Promise(E=>{let _=!1,Z=setTimeout(()=>{_=!0;try{k.kill("SIGTERM")}catch{}E({success:!0})},5e3);k.on("error",v=>{clearTimeout(Z),E({success:!1,error:v.message})}),k.on("exit",(v,I)=>{clearTimeout(Z),E(_&&I==="SIGTERM"?{success:!0}:v===0?{success:!0}:{success:!1,error:I?`Crashed with ${I}`:`Exited with code ${v}`})})});O.success?a.info("[Bootstrap] \u2705 Dev server health check passed"):a.warn(`[Bootstrap] Dev check failed: ${O.error}`)}catch(k){a.warn(`[Bootstrap] Dev server health check warning: ${k.message}`)}}}catch(u){a.warn(`[Bootstrap] Build verification warning: ${u.message}`)}try{a.info("[Bootstrap] Running viewport validation across mobile/tablet/desktop");let u=new he,A=3099,k=we("npx",["vite","--port",String(A),"--host","0.0.0.0"],{cwd:S,stdio:"pipe",env:{...process.env}}),O=3e4,E=500,_=async()=>{let I=Date.now();for(;Date.now()-I<O;){try{if(await new Promise(W=>{let Y=Be.get(`http://localhost:${A}`,V=>{V.statusCode&&V.statusCode<500?(V.resume(),W(!0)):(V.resume(),W(!1))});Y.on("error",()=>W(!1)),Y.setTimeout(1e3,()=>{Y.destroy(),W(!1)})}))return!0}catch{}await new Promise(L=>setTimeout(L,E))}return!1};if(!await Promise.race([_(),new Promise((I,L)=>setTimeout(()=>L(new Error("Dev server startup timeout exceeded")),O+5e3))]).catch(I=>(a.error("[Bootstrap] Server wait failed:",{error:I.message}),!1)))throw k.kill("SIGTERM"),new Error("Dev server failed to start within 30 seconds");a.info(`[Bootstrap] Dev server ready on port ${A}, running viewport tests`);let v=await u.validateViewports(`http://localhost:${A}`,{timeout:3e4});k.kill("SIGTERM"),await T.update(R).set({context:{files:p.context?.files||[],currentFile:p.context?.currentFile,workingDirectory:p.context?.workingDirectory||S,environment:p.context?.environment||{},capabilities:p.context?.capabilities||[],projectId:p.context?.projectId||g.id,viewportValidation:{success:v.success,score:v.overallScore,issues:v.issues,testedAt:typeof v.testedAt=="string"?v.testedAt:new Date(v.testedAt).toISOString()}}}).where(N(R.id,p.id)),v.success?a.info(`[Bootstrap] \u2705 Viewport validation passed: ${v.overallScore}% score`):a.error(`[Bootstrap] \u274C Viewport validation FAILED: ${v.issues.join(", ")}`)}catch(u){a.error(`[Bootstrap] Viewport validation error: ${u.message}`)}}catch(u){a.warn(`[Bootstrap] Validation suite warning: ${u.message}`)}let Ee=`${ze(m)}/ws/agent?projectId=${g.id}&sessionId=${p.id}`,Re=_e({type:"agent_bootstrap",projectId:String(g.id),conversationId:p.id,sessionId:p.id,userId:Number(d),timestamp:Date.now()}),Q=Date.now()-e;a.info(`[Bootstrap] Workspace ready in ${Q}ms - returning token IMMEDIATELY`,{projectId:g.id,sessionId:p.id,modelId:w,elapsed:Q});let X="Building complete working MVP (~10 minutes)...";r==="design-first"?X="Creating quick visual prototype (~3 minutes)...":r==="continue-planning"&&(X="Workspace ready for planning refinement. No build started yet.");let pe={success:!0,projectId:g.id,projectSlug:f,sessionId:p.id,bootstrapToken:Re,workspaceUrl:Ee,buildMode:r,status:"ready",message:X,timing:{totalMs:Q,projectCreationMs:0,sessionCreationMs:0,workflowCreationMs:0}};t&&o&&(await C.complete(t,o,pe),a.info(`[Bootstrap] \u2705 Redis cached response for key: ${t}`,{projectId:g.id,sessionId:p.id})),c.status(200).json(pe),r!=="continue-planning"?(a.info("[Bootstrap] \u{1F680} Starting autonomous workspace IMMEDIATELY (fire-and-forget)",{sessionId:p.id,projectId:g.id,buildMode:r,promptPreview:s.substring(0,50)}),setImmediate(()=>{try{re.startAutonomousWorkspace({sessionId:p.id,projectId:String(g.id),userId:String(d),prompt:i,options:{language:n.language,framework:n.framework,buildMode:r}}).then(()=>{a.info(`[Bootstrap] \u2705 Autonomous workspace creation COMPLETED for session ${p.id}`)}).catch(u=>{a.error(`[Bootstrap] \u274C Autonomous workspace creation FAILED for session ${p.id}:`,u)})}catch(u){a.error(`[Bootstrap] \u274C Synchronous error starting autonomous workspace for session ${p.id}:`,u)}})):a.info("[Bootstrap] \u{1F4CB} Skipping autonomous workspace for continue-planning mode",{sessionId:p.id,projectId:g.id})}catch(s){let r=Date.now()-e,n={elapsed:r,userId:m.user?m.user.id:"unknown",prompt:m.body?.prompt?.substring(0,100)||"none",buildMode:m.body?.buildMode||"unknown",errorName:s.name||"UnknownError",errorMessage:s.message||"No message",errorCode:s.code||"UNKNOWN",errorStack:s.stack?.split(`
`).slice(0,10).join(`
`)||"No stack trace",correlationId:m.correlationId||ve.randomUUID()},i=500,l="INTERNAL_ERROR",d="An unexpected error occurred while creating your workspace. Please try again.";if(s.name==="ZodError"?(i=400,l="VALIDATION_ERROR",d="Invalid request data. Please check your input.",a.warn(`[Bootstrap] Validation failed after ${r}ms`,{...n,validationErrors:s.errors})):s.message?.includes("No AI models available")?(i=503,l="AI_PROVIDER_UNAVAILABLE",d="AI services are temporarily unavailable. Please try again in a few moments.",a.error(`[Bootstrap] \u274C AI PROVIDER FAILURE after ${r}ms`,n)):s.message?.includes("duplicate key")||s.code==="23505"?(i=409,l="DUPLICATE_PROJECT",d="A project with this name already exists. Please try a different name.",a.warn(`[Bootstrap] Duplicate project after ${r}ms`,n)):s.message?.includes("connection")||s.code==="ECONNREFUSED"?(i=503,l="DATABASE_UNAVAILABLE",d="Database connection failed. Please try again.",a.error(`[Bootstrap] \u274C DATABASE FAILURE after ${r}ms`,n)):s.message?.includes("timeout")||s.code==="ETIMEDOUT"?(i=504,l="TIMEOUT",d="Request timed out. Please try again.",a.error(`[Bootstrap] \u274C TIMEOUT after ${r}ms`,n)):a.error(`[Bootstrap] \u274C UNEXPECTED ERROR after ${r}ms`,n),t&&o)try{await C.fail(t,o)}catch(y){a.warn(`[Bootstrap] Failed to release Redis lock: ${y.message}`)}if(s.name==="ZodError")return c.status(i).json({success:!1,error:l,message:d,details:s.errors,correlationId:n.correlationId});c.status(i).json({success:!1,error:l,message:d,correlationId:n.correlationId})}});z.get("/bootstrap/:token/status",q,async(m,c)=>{try{let e=m.params.token,t=We(e);if(!t)return c.status(401).json({success:!1,error:"Invalid or expired bootstrap token"});let{projectId:o,sessionId:s}=t,[r]=await T.select().from(R).where(N(R.id,s));c.json({success:!0,status:r.isActive?"ready":"provisioning",projectId:o,sessionId:s,workspaceUrl:`/ws/agent?projectId=${o}&sessionId=${s}`})}catch(e){a.error("[Bootstrap Status] Error:",e),c.status(500).json({success:!1,error:e.message})}});function Ne(m,c=""){let e=m.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").substring(0,40),t=ve.randomBytes(2).toString("hex");return`${c?`${c}-`:""}${e}-${t}`}function ze(m){let c=m.secure||m.headers["x-forwarded-proto"]==="https"?"wss":"ws",e=m.headers.host||"localhost:5000";return`${c}://${e}`}function _e(m){return me.default.sign(m,te(),{expiresIn:"24h",issuer:"e-code-platform",subject:"workspace-bootstrap"})}function We(m){try{let c=me.default.verify(m,te()),e=Date.now()-c.timestamp,t=1440*60*1e3;return e>t?(a.warn("[Bootstrap Token] Token expired",{ageMs:e,maxAgeMs:t}),null):c}catch(c){return a.error("[Bootstrap Token] Verification failed:",c),null}}z.get("/bootstrap/metrics",q,async(m,c)=>{try{let e=x.getCacheStats();c.json({success:!0,metrics:{fastModels:e.fastModels,usage:e.usage,optimization:{fastModelRecommendationsEnabled:!0,parallelExecutionEnabled:!0,backgroundNpmInstallEnabled:!0,note:"Fast model recommendations may not always be used due to provider availability"},timestamp:new Date().toISOString()}})}catch(e){a.error("[Bootstrap Metrics] Error:",e),c.status(500).json({success:!1,error:"Failed to retrieve metrics"})}});z.get("/bootstrap/fast-check",async(m,c)=>{try{let e=x.getCacheStats(),t=F.getAvailableModels(),o=e.fastModels.filter(r=>t.some(n=>n.id===r.id)),s=o.length>0;c.json({success:!0,ready:s,fastModels:e.fastModels,availableFastModels:o.map(r=>r.id),effectiveness:e.usage.effectivenessRate,message:s?`Fast model recommendations active - ${o.length} fast model(s) available`:"No fast models currently available - recommendations will fall back to other models"})}catch{c.status(500).json({success:!1,ready:!1,error:"Fast bootstrap check failed"})}});var wt=z;export{ce as a,wt as b};
