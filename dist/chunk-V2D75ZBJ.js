
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{d as y,f as w}from"./chunk-BEGAQUQV.js";w();import*as i from"fs/promises";import*as c from"path";var n=y("speculative-scaffold"),m={"react-vite-fullstack":{directories:["client/src","client/src/components","client/src/components/ui","client/src/hooks","client/src/lib","client/src/pages","client/public","server","server/routes","shared"],files:{"package.json":JSON.stringify({name:"fullstack-app",version:"1.0.0",type:"module",scripts:{dev:'concurrently "npm run dev:server" "npm run dev:client"',"dev:server":"tsx watch server/index.ts","dev:client":"vite",build:"vite build && tsc -p tsconfig.server.json",start:"node dist/server/index.js",preview:"vite preview"},dependencies:{react:"^18.2.0","react-dom":"^18.2.0",express:"^4.18.2",cors:"^2.8.5",wouter:"^3.0.0","@tanstack/react-query":"^5.0.0","lucide-react":"^0.300.0",clsx:"^2.0.0","tailwind-merge":"^2.0.0"},devDependencies:{"@types/react":"^18.2.0","@types/react-dom":"^18.2.0","@types/express":"^4.17.21","@types/cors":"^2.8.17","@types/node":"^20.0.0","@vitejs/plugin-react":"^4.2.0",autoprefixer:"^10.4.16",concurrently:"^8.2.2",postcss:"^8.4.32",tailwindcss:"^3.4.0",tsx:"^4.7.0",typescript:"^5.3.0",vite:"^5.0.0"}},null,2),"vite.config.ts":`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist/client'
  }
});`,"tsconfig.json":JSON.stringify({compilerOptions:{target:"ES2020",useDefineForClassFields:!0,lib:["ES2020","DOM","DOM.Iterable"],module:"ESNext",skipLibCheck:!0,moduleResolution:"bundler",allowImportingTsExtensions:!0,resolveJsonModule:!0,isolatedModules:!0,noEmit:!0,jsx:"react-jsx",strict:!0,baseUrl:".",paths:{"@/*":["client/src/*"],"@shared/*":["shared/*"]}},include:["client/src","shared"]},null,2),"tsconfig.server.json":JSON.stringify({compilerOptions:{target:"ES2020",module:"ESNext",moduleResolution:"bundler",outDir:"./dist/server",rootDir:"./server",strict:!0,esModuleInterop:!0,skipLibCheck:!0},include:["server/**/*"]},null,2),"tailwind.config.js":`/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};`,"postcss.config.js":`export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`,"client/index.html":`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,"client/src/main.tsx":`import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);`,"client/src/App.tsx":`import { Route, Switch } from 'wouter';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Switch>
        <Route path="/" component={HomePage} />
      </Switch>
    </div>
  );
}`,"client/src/index.css":`@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}`,"client/src/pages/HomePage.tsx":`import { useQuery } from '@tanstack/react-query';

export default function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetch('/api/health').then(res => res.json())
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="text-title">
        Welcome to Your App
      </h1>
      <p className="text-gray-600 mb-8" data-testid="text-description">
        Your full-stack application is ready to customize.
      </p>
      <div className="bg-white rounded-lg shadow p-6" data-testid="card-status">
        <h2 className="text-[15px] font-semibold mb-2">Server Status</h2>
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <p className="text-green-600" data-testid="text-status">
            {data?.status || 'Connected'}
          </p>
        )}
      </div>
    </div>
  );
}`,"client/src/lib/utils.ts":`import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,"server/index.ts":`import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRouter);

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,"server/routes/health.ts":`import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;`,"shared/types.ts":`export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}`,".gitignore":`node_modules
dist
.env
.env.local
*.log
.DS_Store`,".env.example":`PORT=3001
NODE_ENV=development`},dependencies:{react:"^18.2.0","react-dom":"^18.2.0",express:"^4.18.2",cors:"^2.8.5",wouter:"^3.0.0","@tanstack/react-query":"^5.0.0"},devDependencies:{"@types/react":"^18.2.0","@vitejs/plugin-react":"^4.2.0",typescript:"^5.3.0",vite:"^5.0.0",tailwindcss:"^3.4.0"}},react:{directories:["src","src/components","src/components/ui","src/hooks","src/lib","src/pages","public"],files:{"package.json":JSON.stringify({name:"react-app",version:"1.0.0",type:"module",scripts:{dev:"vite",build:"vite build",preview:"vite preview"},dependencies:{react:"^18.2.0","react-dom":"^18.2.0",wouter:"^3.0.0","@tanstack/react-query":"^5.0.0","lucide-react":"^0.300.0",clsx:"^2.0.0","tailwind-merge":"^2.0.0"},devDependencies:{"@types/react":"^18.2.0","@types/react-dom":"^18.2.0","@vitejs/plugin-react":"^4.2.0",autoprefixer:"^10.4.16",postcss:"^8.4.32",tailwindcss:"^3.4.0",typescript:"^5.3.0",vite:"^5.0.0"}},null,2),"vite.config.ts":`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5000,
    host: '0.0.0.0'
  }
});`,"tsconfig.json":JSON.stringify({compilerOptions:{target:"ES2020",useDefineForClassFields:!0,lib:["ES2020","DOM","DOM.Iterable"],module:"ESNext",skipLibCheck:!0,moduleResolution:"bundler",allowImportingTsExtensions:!0,resolveJsonModule:!0,isolatedModules:!0,noEmit:!0,jsx:"react-jsx",strict:!0,baseUrl:".",paths:{"@/*":["src/*"]}},include:["src"]},null,2),"tailwind.config.js":`/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};`,"postcss.config.js":`export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`,"index.html":`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,"src/main.tsx":`import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);`,"src/App.tsx":`import { Route, Switch } from 'wouter';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Switch>
        <Route path="/" component={HomePage} />
      </Switch>
    </div>
  );
}`,"src/index.css":`@tailwind base;
@tailwind components;
@tailwind utilities;`,"src/pages/HomePage.tsx":`export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="text-title">
        Welcome to Your App
      </h1>
      <p className="text-gray-600" data-testid="text-description">
        Start building your application!
      </p>
    </div>
  );
}`,"src/lib/utils.ts":`import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,".gitignore":`node_modules
dist
.env
.env.local
`},dependencies:{react:"^18.2.0","react-dom":"^18.2.0",wouter:"^3.0.0","@tanstack/react-query":"^5.0.0"},devDependencies:{"@types/react":"^18.2.0","@vitejs/plugin-react":"^4.2.0",typescript:"^5.3.0",vite:"^5.0.0",tailwindcss:"^3.4.0"}},express:{directories:["src","src/routes","src/middleware","src/utils"],files:{"package.json":JSON.stringify({name:"express-api",version:"1.0.0",type:"module",scripts:{dev:"tsx watch src/index.ts",start:"node dist/index.js",build:"tsc"},dependencies:{express:"^4.18.2",cors:"^2.8.5",helmet:"^7.1.0",zod:"^3.22.0"},devDependencies:{"@types/express":"^4.17.21","@types/cors":"^2.8.17","@types/node":"^20.0.0",tsx:"^4.7.0",typescript:"^5.3.0"}},null,2),"tsconfig.json":JSON.stringify({compilerOptions:{target:"ES2020",module:"ESNext",moduleResolution:"bundler",outDir:"./dist",rootDir:"./src",strict:!0,esModuleInterop:!0,skipLibCheck:!0},include:["src/**/*"]},null,2),"src/index.ts":`import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './routes/api';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on http://0.0.0.0:\${PORT}\`);
});`,"src/routes/api.ts":`import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Example route with validation
router.get('/items', (req, res) => {
  res.json({ items: [], total: 0 });
});

router.post('/items', (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional()
  });
  
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors });
  }
  
  res.status(201).json({ id: Date.now(), ...result.data });
});

export default router;`,"src/middleware/errorHandler.ts":`import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
}`,".gitignore":`node_modules
dist
.env
`,".env.example":`PORT=5000
NODE_ENV=development`},dependencies:{express:"^4.18.2",cors:"^2.8.5",helmet:"^7.1.0",zod:"^3.22.0"},devDependencies:{"@types/express":"^4.17.21",tsx:"^4.7.0",typescript:"^5.3.0"}},default:{directories:["src"],files:{"package.json":JSON.stringify({name:"project",version:"1.0.0",type:"module",scripts:{start:"node src/index.js",dev:"node --watch src/index.js"},dependencies:{},devDependencies:{}},null,2),"src/index.js":`console.log('Hello, World!');

// Your code here
`,".gitignore":`node_modules
.env
`},dependencies:{},devDependencies:{}}},f=class{constructor(r=c.join(process.cwd(),"projects")){this.projectsRoot=r}detectFramework(r,e){if(e)return e.toLowerCase();if(!r)return"default";let t=r.toLowerCase();return t.includes("react")||t.includes("frontend")||t.includes("ui")?"react":t.includes("express")||t.includes("api")||t.includes("backend")||t.includes("server")?"express":t.includes("next")||t.includes("nextjs")?"react":"default"}async createScaffold(r){let e=Date.now(),t=[];try{let{projectId:s,language:d,framework:g,prompt:x}=r,p=c.join(this.projectsRoot,s);n.info(`[Scaffold] Starting speculative scaffolding for project ${s}`,{framework:g,language:d,prompt:x?.substring(0,50)});let a=this.detectFramework(x,g),l=m[a]||m.default;n.info(`[Scaffold] Detected framework: ${a}`),await i.mkdir(p,{recursive:!0});for(let o of l.directories){let u=c.join(p,o);await i.mkdir(u,{recursive:!0}),n.debug(`[Scaffold] Created directory: ${o}`)}for(let[o,u]of Object.entries(l.files)){let h=c.join(p,o);try{await i.access(h),n.debug(`[Scaffold] Skipping existing file: ${o}`)}catch{await i.writeFile(h,u,"utf-8"),t.push(o),n.debug(`[Scaffold] Created file: ${o}`)}}let v=Date.now()-e;return n.info(`[Scaffold] Scaffolding completed in ${v}ms`,{filesCreated:t.length,projectId:s,framework:a}),{success:!0,filesCreated:t,durationMs:v,framework:a,dependencies:Object.keys(l.dependencies||{}),devDependencies:Object.keys(l.devDependencies||{})}}catch(s){let d=Date.now()-e;return n.error("[Scaffold] Scaffolding failed:",{error:s.message}),{success:!1,filesCreated:t,durationMs:d,framework:"unknown",dependencies:[],devDependencies:[],error:s.message}}}async hasExistingScaffold(r){let e=c.join(this.projectsRoot,r);try{let t=c.join(e,"package.json");return await i.access(t),!0}catch{return!1}}getAvailableFrameworks(){return Object.keys(m)}detectAppType(r){if(!r)return"default";let e=r.toLowerCase(),t=e.includes("backend")||e.includes("api")||e.includes("database")||e.includes("server")||e.includes("auth"),s=e.includes("frontend")||e.includes("ui")||e.includes("react")||e.includes("dashboard")||e.includes("website")||e.includes("app");return t&&s||e.includes("full-stack")||e.includes("fullstack")||e.includes("crud")||e.includes("todo")||e.includes("blog")||e.includes("e-commerce")||e.includes("ecommerce")||e.includes("store")||e.includes("marketplace")?"react-vite-fullstack":s&&!t?"react":t&&!s?"express":"react-vite-fullstack"}},S=new f;export{f as a,S as b};
