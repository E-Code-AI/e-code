
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{e as o}from"./chunk-KOHKAKK7.js";var c=e=>e?.role==="admin",a=async(e,r,n)=>{try{if(!e.user)return r.status(401).json({message:"Authentication required",code:"UNAUTHENTICATED"});let t=o(),i=typeof e.user.id=="number"?String(e.user.id):e.user.id,s=await t.getUser(i);if(!s||!c(s))return r.status(403).json({message:"Admin access required",code:"INSUFFICIENT_PERMISSIONS"});n()}catch(t){console.error("Admin auth middleware error:",t),r.status(500).json({message:"Authorization check failed",code:"AUTH_ERROR"})}};export{a};
