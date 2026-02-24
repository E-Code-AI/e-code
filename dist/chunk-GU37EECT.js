
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{b as A}from"./chunk-BWT2KM2E.js";import{a as $,e as g}from"./chunk-ONP64SUH.js";import{d as l}from"./chunk-KOHKAKK7.js";import{d as N,f as O}from"./chunk-BEGAQUQV.js";var v=class{constructor(){this.EXPIRATION_MS=300*1e3}async addAction(t,e,n){let r=new Date,a=new Date(r.getTime()+this.EXPIRATION_MS);return(await l.createAiApproval({userId:t,projectId:e,action:n,status:"pending",expiresAt:a})).id}async getPendingActions(t,e){return await this.cleanupExpired(),(await l.getPendingAiApprovals(t,e)).map(r=>({id:r.id,action:r.action,createdAt:r.createdAt,expiresAt:r.expiresAt}))}async approve(t,e){let n=await l.getAiApproval(t);return n?n.userId!==e?(console.warn(`[ApprovalQueue] User ${e} cannot approve action ${t} (owned by ${n.userId})`),null):n.status!=="pending"?(console.warn(`[ApprovalQueue] Action ${t} already processed (status: ${n.status})`),null):n.expiresAt<new Date?(console.warn(`[ApprovalQueue] Action ${t} expired`),await l.updateAiApprovalStatus(t,"expired",e),null):(await l.updateAiApprovalStatus(t,"approved",e),n.action):(console.warn(`[ApprovalQueue] Action ${t} not found in database`),null)}async reject(t,e,n){let r=await l.getAiApproval(t);return!r||r.userId!==e?!1:r.status!=="pending"?(console.warn(`[ApprovalQueue] Cannot reject action ${t} (status: ${r.status})`),!1):(await l.updateAiApprovalStatus(t,"rejected",e,n),!0)}async cleanupExpired(){return await l.expireOldAiApprovals()}async getStats(t){return await this.cleanupExpired(),{message:"Database-backed approval queue is operational",implementation:"PostgreSQL with full persistence"}}},b=new v;O();var p=N("project-ai-agent-service"),j=class{constructor(t){this.storage=t;let e=process.env.ANTHROPIC_API_KEY;e||p.warn("[ProjectAIAgent] No ANTHROPIC_API_KEY configured. Anthropic features will be unavailable. Set ANTHROPIC_API_KEY environment variable or use a different AI provider."),this.anthropic=new $({apiKey:e||"not-configured"})}getAvailableModels(){return g.getAvailableModels()}async*processChat(t,e,n,r){let a=await A.checkRateLimit(t,e);if(!a.allowed){yield JSON.stringify({type:"error",content:`Rate limit exceeded. ${a.remaining} requests remaining. Try again at ${a.resetAt?.toISOString()}`});return}try{let o=await this.storage.getProject(e);if(!o){yield JSON.stringify({type:"error",content:"Project not found"});return}let h=(await this.storage.getProjectFiles(e)).map(i=>i.path).join(`
`),u=`You are an AI coding assistant helping to build a ${o.language} project named "${o.name}".

Current project files:
${h||"No files yet"}

When the user asks you to build something:
1. Analyze their request
2. Create the necessary files with complete, working code
3. Respond with JSON actions to create/edit files
4. Use this exact JSON format:

{
  "type": "action",
  "action": {
    "type": "create_file" | "edit_file",
    "path": "filename.ext",
    "content": "full file content here"
  }
}

For explanations, use:
{
  "type": "message",
  "content": "your explanation"
}

Always generate complete, production-ready code. No placeholders or TODOs.`;r?.file&&r?.code&&(u+=`

User is currently viewing file: ${r.file}

Current code:
${r.code}`);let f=[];r?.history&&f.push(...r.history.slice(-20)),f.push({role:"user",content:n});let s=r?.modelId;s||(s=(await this.storage.getUser(t))?.preferredAiModel||void 0);let y=g.getAvailableModels();if(y.length===0){yield JSON.stringify({type:"error",content:"No AI providers configured. Please configure at least one API key (OpenAI, Anthropic, Gemini, xAI, or Groq)."});return}s||(s=y[0].id,p.info(`[ProjectAIAgent] No model preference found, using fallback: ${s}`));let c=g.getModelById(s);if(!c){yield JSON.stringify({type:"error",content:`Model "${s}" not found or provider not configured`});return}p.info(`[ProjectAIAgent] Using model: ${c.name} (${c.id}) from provider: ${c.provider}`);let S=await g.streamChat(s,f.filter(i=>i.role!=="system").map(i=>({role:i.role,content:i.content})),{system:u,max_tokens:4e3,temperature:.7}),I="";for await(let i of S)i&&(I+=i,yield i);yield`
`;let{actions:_,rejected:w}=A.extractValidActions(I,e);w.length>0&&(p.warn("[ProjectAIAgent] Rejected insecure actions"),yield JSON.stringify({type:"security_warning",message:`${w.length} actions blocked by security filters`})+`
`);for(let i of _){let x=await b.addAction(t,e,i);yield JSON.stringify({type:"action_pending_approval",actionId:x,action:i,message:"Action requires approval. Use /api/projects/:id/ai/approve/:actionId to approve."})+`
`}for(let i of w)await A.logAction(t,e,i.action,{success:!1,error:`Rejected: ${i.reason}`}),yield JSON.stringify({type:"security_blocked",action:i.action,reason:i.reason,message:`\u26A0\uFE0F **Security Block**: ${i.reason}

This action was blocked by Fortune 500 security controls to protect your project.`})+`
`}catch(o){p.error("[ProjectAIAgent] Error processing chat:",o),yield JSON.stringify({type:"error",content:o.message||"An error occurred while processing your request"})}}async generateBuildActions(t,e,n,r){try{let a=await this.storage.getProject(e);if(!a)throw new Error("Project not found");let d=(await this.storage.getProjectFiles(e)).map(c=>c.path).join(`
`),h=`You are an AI coding assistant building a ${a.language} project named "${a.name}".

Current project files:
${d||"No files yet"}

User wants to build:
${n}

Generate ALL necessary files with complete, working code. Respond with JSON actions:
{
  "type": "action",
  "action": {
    "type": "create_file",
    "path": "filename.ext",
    "content": "full file content"
  }
}

Generate EVERY file needed for a complete, working application. No placeholders or TODOs.`,u=r;if(!u){let c=g.getAvailableModels();if(c.length===0)throw new Error("No AI providers configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or XAI_API_KEY environment variable.");u=c[0].id}let f=await g.generateChat(u,[{role:"system",content:h},{role:"user",content:n}],{max_tokens:8e3,temperature:.7}),{actions:s,rejected:y}=A.extractValidActions(f,e);return{actions:s,rejected:y}}catch(a){throw p.error("[ProjectAIAgent] Error generating build actions:",a),a}}async executeAction(t,e){try{switch(e.type){case"create_file":return await this.createFile(t,e.path,e.content);case"edit_file":return await this.editFile(t,e.path,e.content);default:return{success:!1,error:"Unknown action type"}}}catch(n){return p.error("[ProjectAIAgent] Error executing action:",n),{success:!1,error:n.message}}}async createFile(t,e,n){try{let r=e.split("/").pop()||e,a=e.substring(0,e.lastIndexOf("/"))||"/",o=parseInt(t,10);if(isNaN(o))throw new Error(`Invalid projectId: ${t}`);let d=await this.storage.createFile({projectId:o,name:r,path:e,content:n,parentId:null,isDirectory:!1});return{success:!0,file:{id:d.id,path:d.path,name:d.name}}}catch(r){return p.error("[ProjectAIAgent] Error creating file:",r),{success:!1,error:r.message}}}async editFile(t,e,n){try{let a=(await this.storage.getProjectFiles(t)).find(o=>o.path===e);return a?(await this.storage.updateFile(a.id,{content:n}),{success:!0,file:{id:a.id,path:a.path,name:a.name}}):await this.createFile(t,e,n)}catch(r){return p.error("[ProjectAIAgent] Error editing file:",r),{success:!1,error:r.message}}}detectLanguage(t){let e=t.split(".").pop()?.toLowerCase();return{js:"javascript",jsx:"javascript",ts:"typescript",tsx:"typescript",py:"python",html:"html",css:"css",json:"json",md:"markdown"}[e||""]||"plaintext"}},P=null,T=m=>(P||(P=new j(m)),P);export{b as a,j as b,T as c};
