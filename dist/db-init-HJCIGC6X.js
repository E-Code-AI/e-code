
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{h as p,i as o}from"./chunk-LOJN5Z32.js";import"./chunk-NRIEQZ4F.js";import{t as d,w as y,x as u}from"./chunk-5VBXYHR2.js";import"./chunk-SUGQP5BU.js";import"./chunk-2LLTIQNM.js";import"./chunk-ERKIQN6P.js";import"./chunk-SLCWITGS.js";import"./chunk-3JUZXZ3L.js";import"./chunk-E6Z4GF7P.js";import{d as g,f as _}from"./chunk-BEGAQUQV.js";import"./chunk-G6E5POTQ.js";import"./chunk-UXMHOPI6.js";import"./chunk-KVTR5VNS.js";import"./chunk-B6UHYZUF.js";import"./chunk-5OWZ6DYH.js";import"./chunk-5D5JQLUE.js";import{scrypt as F,randomBytes as T}from"crypto";import{promisify as P}from"util";import{existsSync as A}from"fs";import{resolve as S}from"path";import v from"node:crypto";import f from"node:fs";function w(e){let t=e.migrationsFolder,r=[],a=`${t}/meta/_journal.json`;if(!f.existsSync(a))throw new Error("Can't find meta/_journal.json file");let m=f.readFileSync(`${t}/meta/_journal.json`).toString(),c=JSON.parse(m);for(let i of c.entries){let n=`${t}/${i.tag}.sql`;try{let h=f.readFileSync(`${t}/${i.tag}.sql`).toString(),j=h.split("--> statement-breakpoint").map(D=>D);r.push({sql:j,bps:i.breakpoints,folderMillis:i.when,hash:v.createHash("sha256").update(h).digest("hex")})}catch{throw new Error(`No file ${n} found in ${t} folder`)}}return r}async function b(e,t){let r=w(t);await e.dialect.migrate(r,e.session,t)}_();var s=g("db-init"),M=P(F);async function E(e){let t=T(16).toString("hex");return`${(await M(e,t,64)).toString("hex")}.${t}`}var l=!1;async function L(){try{let[e]=await p`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'preferred_ai_model'
      ) as "exists";
    `;e?.exists?s.info("[DB Init] \u2713 preferred_ai_model column already exists"):(s.info("[DB Init] Creating preferred_ai_model column..."),await p`
        ALTER TABLE users 
        ADD COLUMN preferred_ai_model varchar;
      `,s.info("[DB Init] \u2713 preferred_ai_model column created successfully"))}catch(e){s.warn("[DB Init] Failed to ensure preferred_ai_model column:",e.message)}}async function x(e=!1){if(l&&!e)return;let t=S(process.cwd(),"migrations");if(!A(t)){s.warn(`Database migrations folder not found at ${t}. Automatic migration skipped. Run \`npm run db:push\` to create the schema manually.`),l=!0;return}let r=e;if(!r)try{let[a]=await p`
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = 'users'
        ) as "exists";
      `;r=!a?.exists}catch(a){s.warn("Failed to inspect database schema, attempting automatic migration",a),r=!0}try{await b(o,{migrationsFolder:t}),l=!0}catch(a){let m=a?.message||"",c=a?.cause?.message||"",i=m+" "+c;if(i.includes("already exists")&&(i.includes("type")||i.includes("enum")||i.includes("CREATE TYPE")))l=!0;else throw s.error("Automatic database migration failed:",a),a}}async function W(){let e=3,t=null;for(;e>0;)try{await x(),await L();let r=await o.select().from(d);if(r&&r.length>0)return;let a=await E("admin"),[m]=await o.insert(d).values({username:"admin",password:a,email:"admin@plot.local",displayName:"Administrator",bio:"Platform administrator"}).returning(),c=await E("password"),[i]=await o.insert(d).values({username:"demo",password:c,email:"demo@plot.local",displayName:"Demo User",bio:"Demo account for testing"}).returning(),[n]=await o.insert(y).values({name:"My First Project",description:"A sample project to get started with PLOT",visibility:"private",language:"javascript",ownerId:i.id}).returning();await o.insert(u).values({name:"index.html",path:"/index.html",content:`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demo Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Welcome to PLOT</h1>
    <p>Your coding journey starts here</p>
  </header>
  
  <main>
    <p>This is a simple HTML page to help you get started.</p>
    <button id="myButton">Click Me!</button>
  </main>
  
  <script src="script.js"></script>
</body>
</html>`,isDirectory:!1,projectId:n.id}),await o.insert(u).values({name:"styles.css",path:"/styles.css",content:`body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  margin: 0;
  padding: 20px;
  color: #333;
}

header {
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  color: #0070F3;
}

button {
  background-color: #0070F3;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #005cc5;
}`,isDirectory:!1,projectId:n.id}),await o.insert(u).values({name:"script.js",path:"/script.js",content:`// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Get the button element
  const button = document.getElementById('myButton');
  
  // Add a click event listener
  button.addEventListener('click', function() {
    alert('Hello from PLOT! Your JavaScript is working!');
  });
});`,isDirectory:!1,projectId:n.id});return}catch(r){if(t=r,s.error("Database initialization attempt failed:",r.message),r?.code==="42P01"||/relation ".+" does not exist/.test(r?.message||""))try{s.warn("Detected missing tables after initialization attempt. Retrying migrations..."),l=!1,await x(!0)}catch(a){s.error("Forced migration retry failed:",a.message)}e--,e>0&&await new Promise(a=>setTimeout(a,(4-e)*1e3))}s.error("Failed to initialize database after all retries:",t)}export{W as initializeDatabase};
