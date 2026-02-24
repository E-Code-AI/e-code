
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{c as p}from"./chunk-5D5JQLUE.js";var d=p((w,o)=>{"use strict";o.exports=y;o.exports.append=v;var g=/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;function v(e,a){if(typeof e!="string")throw new TypeError("header argument is required");if(!a)throw new TypeError("field argument is required");for(var r=Array.isArray(a)?a:f(String(a)),t=0;t<r.length;t++)if(!g.test(r[t]))throw new TypeError("field argument contains an invalid header name");if(e==="*")return e;var n=e,s=f(e.toLowerCase());if(r.indexOf("*")!==-1||s.indexOf("*")!==-1)return"*";for(var i=0;i<r.length;i++){var u=r[i].toLowerCase();s.indexOf(u)===-1&&(s.push(u),n=n?n+", "+r[i]:r[i])}return n}function f(e){for(var a=0,r=[],t=0,n=0,s=e.length;n<s;n++)switch(e.charCodeAt(n)){case 32:t===a&&(t=a=n+1);break;case 44:r.push(e.substring(t,a)),t=a=n+1;break;default:a=n+1;break}return r.push(e.substring(t,a)),r}function y(e,a){if(!e||!e.getHeader||!e.setHeader)throw new TypeError("res argument is required");var r=e.getHeader("Vary")||"",t=Array.isArray(r)?r.join(", "):String(r);(r=v(t,a))&&e.setHeader("Vary",r)}});export{d as a};
