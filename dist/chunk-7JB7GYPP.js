
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{a as p,c as s}from"./chunk-5D5JQLUE.js";var c=s((g,y)=>{"use strict";var u=p("buffer"),n=u.Buffer,r={},t;for(t in u)u.hasOwnProperty(t)&&(t==="SlowBuffer"||t==="Buffer"||(r[t]=u[t]));var o=r.Buffer={};for(t in n)n.hasOwnProperty(t)&&(t==="allocUnsafe"||t==="allocUnsafeSlow"||(o[t]=n[t]));r.Buffer.prototype=n.prototype;(!o.from||o.from===Uint8Array.from)&&(o.from=function(e,f,i){if(typeof e=="number")throw new TypeError('The "value" argument must not be of type number. Received type '+typeof e);if(e&&typeof e.length>"u")throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof e);return n(e,f,i)});o.alloc||(o.alloc=function(e,f,i){if(typeof e!="number")throw new TypeError('The "size" argument must be of type number. Received type '+typeof e);if(e<0||e>=2*(1<<30))throw new RangeError('The value "'+e+'" is invalid for option "size"');var a=n(e);return!f||f.length===0?a.fill(0):typeof i=="string"?a.fill(f,i):a.fill(f),a});if(!r.kStringMaxLength)try{r.kStringMaxLength=process.binding("buffer").kStringMaxLength}catch{}r.constants||(r.constants={MAX_LENGTH:r.kMaxLength},r.kStringMaxLength&&(r.constants.MAX_STRING_LENGTH=r.kStringMaxLength));y.exports=r});export{c as a};
