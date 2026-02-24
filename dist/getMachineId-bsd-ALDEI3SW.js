
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{a as d}from"./chunk-65VTCB2K.js";import{m as s,n as u}from"./chunk-KX76W7FR.js";import{a as i,c as n,f as c}from"./chunk-5D5JQLUE.js";var h=n(t=>{Object.defineProperty(t,"__esModule",{value:!0});t.getMachineId=void 0;var a=i("fs"),o=d(),r=(u(),c(s));async function g(){try{return(await a.promises.readFile("/etc/hostid",{encoding:"utf8"})).trim()}catch(e){r.diag.debug(`error reading machine id: ${e}`)}try{return(await(0,o.execAsync)("kenv -q smbios.system.uuid")).stdout.trim()}catch(e){r.diag.debug(`error reading machine id: ${e}`)}}t.getMachineId=g});export default h();
