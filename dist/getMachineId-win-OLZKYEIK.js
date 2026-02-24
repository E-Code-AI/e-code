
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{a as g}from"./chunk-65VTCB2K.js";import{m as o,n as u}from"./chunk-KX76W7FR.js";import{a as s,c as a,f as d}from"./chunk-5D5JQLUE.js";var _=a(e=>{Object.defineProperty(e,"__esModule",{value:!0});e.getMachineId=void 0;var n=s("process"),h=g(),y=(u(),d(o));async function E(){let c="QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid",t="%windir%\\System32\\REG.exe";n.arch==="ia32"&&"PROCESSOR_ARCHITEW6432"in n.env&&(t="%windir%\\sysnative\\cmd.exe /c "+t);try{let r=(await(0,h.execAsync)(`${t} ${c}`)).stdout.split("REG_SZ");if(r.length===2)return r[1].trim()}catch(i){y.diag.debug(`error reading machine id: ${i}`)}}e.getMachineId=E});export default _();
