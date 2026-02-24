
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{a as p,c as b}from"./chunk-5D5JQLUE.js";var i=b((l,m)=>{var u=p("buffer"),e=u.Buffer;function a(r,f){for(var n in r)f[n]=r[n]}e.from&&e.alloc&&e.allocUnsafe&&e.allocUnsafeSlow?m.exports=u:(a(u,l),l.Buffer=o);function o(r,f,n){return e(r,f,n)}o.prototype=Object.create(e.prototype);a(e,o);o.from=function(r,f,n){if(typeof r=="number")throw new TypeError("Argument must not be a number");return e(r,f,n)};o.alloc=function(r,f,n){if(typeof r!="number")throw new TypeError("Argument must be a number");var t=e(r);return f!==void 0?typeof n=="string"?t.fill(f,n):t.fill(f):t.fill(0),t};o.allocUnsafe=function(r){if(typeof r!="number")throw new TypeError("Argument must be a number");return e(r)};o.allocUnsafeSlow=function(r){if(typeof r!="number")throw new TypeError("Argument must be a number");return u.SlowBuffer(r)}});export{i as a};
