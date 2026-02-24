
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{d as p}from"./chunk-QRMNVBCN.js";import"./chunk-5ZD762ZT.js";import"./chunk-INICBF4H.js";import"./chunk-G3YIGMP2.js";import"./chunk-XQO3LM4D.js";import"./chunk-KZSAKPNO.js";import"./chunk-7JB7GYPP.js";import"./chunk-VRJIOIHQ.js";import"./chunk-UKLVEE4Y.js";import"./chunk-2GOIWGW7.js";import"./chunk-KVTR5VNS.js";import"./chunk-B6UHYZUF.js";import"./chunk-5OWZ6DYH.js";import{e as c}from"./chunk-5D5JQLUE.js";var s=c(p(),1),n=(0,s.Router)(),i="https://e-code.ai",h=[{url:"/",priority:1,changefreq:"daily"},{url:"/pricing",priority:.9,changefreq:"weekly"},{url:"/features",priority:.9,changefreq:"weekly"},{url:"/about",priority:.7,changefreq:"monthly"},{url:"/careers",priority:.7,changefreq:"weekly"},{url:"/contact",priority:.6,changefreq:"monthly"},{url:"/contact-sales",priority:.7,changefreq:"monthly"},{url:"/ai",priority:.9,changefreq:"weekly"},{url:"/mobile",priority:.8,changefreq:"monthly"},{url:"/desktop",priority:.8,changefreq:"monthly"},{url:"/security",priority:.7,changefreq:"monthly"},{url:"/solutions/app-builder",priority:.8,changefreq:"monthly"},{url:"/solutions/website-builder",priority:.8,changefreq:"monthly"},{url:"/solutions/game-builder",priority:.8,changefreq:"monthly"},{url:"/solutions/dashboard-builder",priority:.8,changefreq:"monthly"},{url:"/solutions/chatbot-builder",priority:.8,changefreq:"monthly"},{url:"/solutions/internal-ai-builder",priority:.8,changefreq:"monthly"},{url:"/solutions/enterprise",priority:.9,changefreq:"monthly"},{url:"/solutions/startups",priority:.8,changefreq:"monthly"},{url:"/solutions/freelancers",priority:.8,changefreq:"monthly"},{url:"/docs",priority:.9,changefreq:"daily"},{url:"/blog",priority:.8,changefreq:"daily"},{url:"/tutorials",priority:.8,changefreq:"weekly"},{url:"/changelog",priority:.7,changefreq:"weekly"},{url:"/case-studies",priority:.7,changefreq:"monthly"},{url:"/help-center",priority:.7,changefreq:"weekly"},{url:"/templates",priority:.8,changefreq:"weekly"},{url:"/community",priority:.7,changefreq:"daily"},{url:"/forum",priority:.7,changefreq:"daily"},{url:"/languages",priority:.7,changefreq:"monthly"},{url:"/compare",priority:.7,changefreq:"monthly"},{url:"/compare/github-codespaces",priority:.7,changefreq:"monthly"},{url:"/compare/codesandbox",priority:.7,changefreq:"monthly"},{url:"/compare/heroku",priority:.7,changefreq:"monthly"},{url:"/compare/glitch",priority:.7,changefreq:"monthly"},{url:"/compare/aws-cloud9",priority:.7,changefreq:"monthly"},{url:"/press",priority:.5,changefreq:"monthly"},{url:"/partners",priority:.6,changefreq:"monthly"},{url:"/status",priority:.6,changefreq:"hourly"},{url:"/terms",priority:.3,changefreq:"yearly"},{url:"/privacy",priority:.3,changefreq:"yearly"},{url:"/dpa",priority:.3,changefreq:"yearly"},{url:"/accessibility",priority:.4,changefreq:"yearly"}];n.get("/sitemap.xml",(l,t)=>{let o=new Date().toISOString(),e=`<?xml version="1.0" encoding="UTF-8"?>
`;e+=`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
`,e+=`        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
`,e+=`        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
`,e+=`        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
`;for(let r of h)e+=`  <url>
`,e+=`    <loc>${i}${r.url}</loc>
`,e+=`    <lastmod>${o}</lastmod>
`,e+=`    <changefreq>${r.changefreq}</changefreq>
`,e+=`    <priority>${r.priority}</priority>
`,e+=`  </url>
`;e+="</urlset>",t.header("Content-Type","application/xml"),t.header("Cache-Control","public, max-age=3600"),t.send(e)});n.get("/sitemap-index.xml",(l,t)=>{let o=new Date().toISOString(),e=`<?xml version="1.0" encoding="UTF-8"?>
`;e+=`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`,e+=`  <sitemap>
`,e+=`    <loc>${i}/sitemap.xml</loc>
`,e+=`    <lastmod>${o}</lastmod>
`,e+=`  </sitemap>
`,e+=`  <sitemap>
`,e+=`    <loc>${i}/sitemap-blog.xml</loc>
`,e+=`    <lastmod>${o}</lastmod>
`,e+=`  </sitemap>
`,e+="</sitemapindex>",t.header("Content-Type","application/xml"),t.header("Cache-Control","public, max-age=3600"),t.send(e)});n.get("/sitemap-blog.xml",async(l,t)=>{let o=new Date().toISOString(),e=[{slug:"introducing-ai-agents",lastmod:"2024-11-01"},{slug:"enterprise-security-features",lastmod:"2024-10-15"},{slug:"collaborative-coding-best-practices",lastmod:"2024-10-01"}],r=`<?xml version="1.0" encoding="UTF-8"?>
`;r+=`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;for(let a of e)r+=`  <url>
`,r+=`    <loc>${i}/blog/${a.slug}</loc>
`,r+=`    <lastmod>${a.lastmod}</lastmod>
`,r+=`    <changefreq>monthly</changefreq>
`,r+=`    <priority>0.6</priority>
`,r+=`  </url>
`;r+="</urlset>",t.header("Content-Type","application/xml"),t.header("Cache-Control","public, max-age=3600"),t.send(r)});var u=n;export{u as default};
