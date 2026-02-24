
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{m as d,n as s}from"./chunk-KX76W7FR.js";import{a as n,c,f as a}from"./chunk-5D5JQLUE.js";var f=c(e=>{Object.defineProperty(e,"__esModule",{value:!0});e.getMachineId=void 0;var u=n("fs"),o=(s(),a(d));async function h(){let i=["/etc/machine-id","/var/lib/dbus/machine-id"];for(let r of i)try{return(await u.promises.readFile(r,{encoding:"utf8"})).trim()}catch(t){o.diag.debug(`error reading machine id: ${t}`)}}e.getMachineId=h});export default f();
