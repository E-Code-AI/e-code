
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{d as v,f as c}from"./chunk-BEGAQUQV.js";import"./chunk-G6E5POTQ.js";import"./chunk-UXMHOPI6.js";import"./chunk-KVTR5VNS.js";import"./chunk-B6UHYZUF.js";import"./chunk-5OWZ6DYH.js";import"./chunk-5D5JQLUE.js";c();var s=v("interval-registry"),a=class n{constructor(){this.intervals=new Map}static getInstance(){return n.instance||(n.instance=new n),n.instance}register(e,t,r,l="unknown"){let i=`${l}:${e}`;this.intervals.has(i)&&this.unregister(i);let o=setInterval(t,r);return this.intervals.set(i,{id:o,name:e,intervalMs:r,createdAt:new Date,service:l}),s.debug(`Registered interval: ${i} (${r}ms)`),o}unregister(e){let t=this.intervals.get(e);return t?(clearInterval(t.id),this.intervals.delete(e),s.debug(`Unregistered interval: ${e}`),!0):!1}clearAll(){let e=this.intervals.size;for(let[t,r]of this.intervals)clearInterval(r.id),s.debug(`Cleared interval: ${t}`);this.intervals.clear(),s.info(`Cleared ${e} intervals on shutdown`)}getStats(){let e={};for(let t of this.intervals.values())e[t.service]=(e[t.service]||0)+1;return{total:this.intervals.size,byService:e}}list(){return Array.from(this.intervals.entries()).map(([e,t])=>({key:e,name:t.name,service:t.service,intervalMs:t.intervalMs}))}},g=a.getInstance();function d(n,e,t,r="unknown"){return g.register(t,n,e,r)}export{g as intervalRegistry,d as safeSetInterval};
