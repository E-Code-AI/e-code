
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

var u=(e,t,s)=>{let o=typeof e.isAuthenticated=="function"&&e.isAuthenticated(),i=!!e.user;if(o&&i)return s();t.status(401).json({error:"Authentication required",code:"AUTH_REQUIRED"})};var c=(e,t,s)=>{let o=typeof e.isAuthenticated=="function"&&e.isAuthenticated(),i=!!e.user;if(!o||!i)return t.status(401).json({error:"Authentication required",code:"AUTH_REQUIRED"});let n=e.user,r=["admin","superadmin","owner"];if(n.role&&r.includes(n.role.toLowerCase()))return s();console.warn(`[SECURITY] Admin access denied for user ${n.id} with role "${n.role||"undefined"}"`),t.status(403).json({error:"Admin access required",code:"ADMIN_REQUIRED"})};export{u as a,c as b};
