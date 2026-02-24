
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import"./chunk-5D5JQLUE.js";import o from"crypto";var p="aes-256-gcm",T=16,f=16;function E(){let t=process.env.CREDENTIAL_ENCRYPTION_KEY||process.env.SESSION_SECRET;if(!t)throw new Error("CREDENTIAL_ENCRYPTION_KEY or SESSION_SECRET environment variable is required for credential encryption");return o.createHash("sha256").update(t).digest()}function g(t){let c=E(),r=o.randomBytes(T),n=o.createCipheriv(p,c,r),e=n.update(t,"utf8","base64");e+=n.final("base64");let s=n.getAuthTag();return{ciphertext:Buffer.concat([Buffer.from(e,"base64"),s]).toString("base64"),iv:r.toString("hex")}}function h(t,c){let r=E(),n=Buffer.from(c,"hex"),e=Buffer.from(t,"base64"),s=e.subarray(e.length-f),a=e.subarray(0,e.length-f),i=o.createDecipheriv(p,r,n);i.setAuthTag(s);let u=i.update(a,void 0,"utf8");return u+=i.final("utf8"),u}function y(){return!!(process.env.CREDENTIAL_ENCRYPTION_KEY||process.env.SESSION_SECRET)}export{h as decryptToken,g as encryptToken,y as isEncryptionConfigured};
