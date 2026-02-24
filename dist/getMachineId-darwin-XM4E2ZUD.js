
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{a}from"./chunk-65VTCB2K.js";import{m as s,n as u}from"./chunk-KX76W7FR.js";import{c,f as d}from"./chunk-5D5JQLUE.js";var g=c(e=>{Object.defineProperty(e,"__esModule",{value:!0});e.getMachineId=void 0;var o=a(),l=(u(),d(s));async function f(){try{let i=(await(0,o.execAsync)('ioreg -rd1 -c "IOPlatformExpertDevice"')).stdout.split(`
`).find(r=>r.includes("IOPlatformUUID"));if(!i)return;let n=i.split('" = "');if(n.length===2)return n[1].slice(0,-1)}catch(t){l.diag.debug(`error reading machine id: ${t}`)}}e.getMachineId=f});export default g();
