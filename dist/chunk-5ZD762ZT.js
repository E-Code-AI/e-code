
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{a as p,c as u}from"./chunk-5D5JQLUE.js";var a=u(t=>{var s=p("crypto");t.sign=function(e,r){if(typeof e!="string")throw new TypeError("Cookie value must be provided as a string.");if(typeof r!="string")throw new TypeError("Secret string must be provided.");return e+"."+s.createHmac("sha256",r).update(e).digest("base64").replace(/\=+$/,"")};t.unsign=function(e,r){if(typeof e!="string")throw new TypeError("Signed cookie string must be provided.");if(typeof r!="string")throw new TypeError("Secret string must be provided.");var i=e.slice(0,e.lastIndexOf(".")),o=t.sign(i,r);return n(o)==n(e)?i:!1};function n(e){return s.createHash("sha1").update(e).digest("hex")}});export{a};
