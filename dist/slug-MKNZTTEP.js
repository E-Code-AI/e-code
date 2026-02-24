
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import"./chunk-5D5JQLUE.js";function s(e){return e.toLowerCase().trim().replace(/[^\w\s-]/g,"").replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"")}async function i(e,g){let t=s(e),r=t,n=1;for(;await g(r);)r=`${t}-${n}`,n++;return r}export{s as generateSlug,i as generateUniqueSlug};
