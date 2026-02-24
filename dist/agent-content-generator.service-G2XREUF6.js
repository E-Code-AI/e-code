
import { createRequire as __esbuild_createRequire } from 'module';
import { fileURLToPath as __esbuild_fileURLToPath } from 'url';
import { dirname as __esbuild_dirname } from 'path';
const require = __esbuild_createRequire(import.meta.url);
const __filename = __esbuild_fileURLToPath(import.meta.url);
const __dirname = __esbuild_dirname(__filename);

import{d as x,f as y}from"./chunk-BEGAQUQV.js";import"./chunk-G6E5POTQ.js";import"./chunk-UXMHOPI6.js";import"./chunk-KVTR5VNS.js";import"./chunk-B6UHYZUF.js";import"./chunk-5OWZ6DYH.js";import"./chunk-5D5JQLUE.js";y();var l=x("agent-content-generator"),v=class{constructor(){this.aiProviderManager=null}async getAIProvider(){if(!this.aiProviderManager)try{let{aiProviderManager:n}=await import("./ai-provider-manager-EM5IAJYS.js");this.aiProviderManager=n}catch(n){return l.warn("[ContentGenerator] Could not load AI provider manager",n),null}return this.aiProviderManager}async expandOutline(n){l.info(`[ContentGenerator] Expanding outline for ${n.path}`,{language:n.language});let o=this.generateContentFromOutline(n);if(o.includes("TODO: Implement")||o.includes("TODO: Add")||o.includes("TODO: Configure")){l.info(`[ContentGenerator] Template returned placeholder for ${n.path}, trying AI generation`);let e=await this.generateWithAI(n);if(e)return l.info(`[ContentGenerator] AI generated ${e.length} chars for ${n.path}`),{path:n.path,content:e,language:n.language};l.warn(`[ContentGenerator] AI generation failed for ${n.path}, using placeholder`)}return{path:n.path,content:o,language:n.language}}async generateWithAI(n){try{let o=await this.getAIProvider();if(!o)return null;let{path:t,outline:e,language:s}=n,c=t.split("/").pop()||"file",a=c.split(".").pop()?.toLowerCase()||"",d="code";a==="tsx"||a==="jsx"?d="React component":a==="ts"||a==="js"?d="TypeScript/JavaScript module":a==="css"?d="CSS styles":a==="py"?d="Python module":a==="go"&&(d="Go code");let f=`You are an expert developer that generates complete, production-ready code files. 
IMPORTANT RULES:
- Generate ONLY the raw code - no explanations, no markdown code blocks
- The code must be complete, functional, and production-ready
- Include all necessary imports at the top
- Include proper TypeScript types if applicable
- Follow modern best practices and coding conventions
- Start with the first line of actual code (import, declaration, or content)`,i=`Generate a complete, working ${d} file for: ${t}

REQUIREMENTS FROM DESIGN OUTLINE:
${e}

IMPORTANT:
- Output ONLY the raw ${a.toUpperCase()} code
- NO markdown formatting, NO code blocks, NO explanations
- Start immediately with the first import or declaration

Generate the complete ${c} file:`;l.info(`[ContentGenerator] Requesting AI to generate ${t}`);let r=[{role:"system",content:f},{role:"user",content:i}],g=["gpt-5-mini","claude-sonnet-4-5-20250929","gemini-2.5-flash","gpt-5.2"],p=null,h=null;for(let u of g)try{if(l.info(`[ContentGenerator] Trying model ${u} for ${t}`),p=await o.generateChat(u,r,{max_tokens:4e3,temperature:.2}),p&&p.trim().length>50){l.info(`[ContentGenerator] Successfully generated ${p.length} chars with ${u}`);break}else l.warn(`[ContentGenerator] Model ${u} returned insufficient content (${p?.length||0} chars)`),p=null}catch(m){h=m.message,l.warn(`[ContentGenerator] Model ${u} failed: ${m.message}`);continue}if(!p&&h&&l.error(`[ContentGenerator] All AI models failed for ${t}. Last error: ${h}`),p&&p.trim().length>20){let u=p.trim();if(u.startsWith("```")){let m=u.split(`
`);m.shift(),m[m.length-1]==="```"&&m.pop(),u=m.join(`
`)}return u}return null}catch(o){return l.error(`[ContentGenerator] AI generation error for ${n.path}:`,o.message),null}}async expandOutlines(n){return await Promise.all(n.map(t=>this.expandOutline(t)))}async generateFileContent(n){l.info(`[ContentGenerator] Generating content from description for ${n.path}`);let o={path:n.path,outline:n.description,language:n.language};return this.expandOutline(o)}generateContentFromOutline(n){let{path:o,outline:t}=n,e=o.toLowerCase();if(e.endsWith("package.json"))return JSON.stringify({name:"starter-project",version:"1.0.0",type:"module",scripts:{dev:"vite",build:"tsc && vite build",preview:"vite preview"},dependencies:{react:"^18.2.0","react-dom":"^18.2.0"},devDependencies:{"@types/react":"^18.2.0","@types/react-dom":"^18.2.0","@vitejs/plugin-react":"^4.2.0",autoprefixer:"^10.4.16",postcss:"^8.4.32",tailwindcss:"^3.3.6",typescript:"^5.3.3",vite:"^5.0.8"}},null,2);if(e.endsWith("index.html"))return`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Starter Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;if(e.endsWith("main.tsx")||e.endsWith("main.jsx"))return`import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;if(e.endsWith("index.css")&&(t.toLowerCase().includes("tailwind")||t.includes("@tailwind")))return`@tailwind base;
@tailwind components;
@tailwind utilities;`;if(e.endsWith("vite.config.ts")||e.endsWith("vite.config.js"))return`import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})`;if(e.endsWith("postcss.config.js"))return`export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;if(e.endsWith("tailwind.config.js")||e.endsWith("tailwind.config.ts"))return`export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}`;if(e.endsWith("tsconfig.json"))return JSON.stringify({compilerOptions:{target:"ES2020",useDefineForClassFields:!0,lib:["ES2020","DOM","DOM.Iterable"],module:"ESNext",skipLibCheck:!0,moduleResolution:"bundler",allowImportingTsExtensions:!0,resolveJsonModule:!0,isolatedModules:!0,noEmit:!0,jsx:"react-jsx",strict:!0},include:["src"]},null,2);if(e.endsWith("app.tsx")||e.endsWith("app.jsx")){let s=t.match(/goal:\s*"([^"]+)"/i)||t.match(/goal:\s*([^\n.]+)/i);return`export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Project Initialized</h1>
        <p className="text-gray-600">${s?s[1]:"Welcome to your new project"}</p>
      </div>
    </div>
  );
}`}if(e.endsWith("requirements.txt")){let s=t.toLowerCase().includes("flask"),c=t.toLowerCase().includes("fastapi"),a=t.toLowerCase().includes("django");return s?`flask>=2.3.0
flask-cors>=4.0.0
python-dotenv>=1.0.0
gunicorn>=21.2.0`:c?`fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
python-dotenv>=1.0.0`:a?`django>=4.2.0
django-cors-headers>=4.3.0
python-dotenv>=1.0.0
gunicorn>=21.2.0`:`# Python dependencies
python-dotenv>=1.0.0`}if((e.endsWith("app.py")||e.endsWith("main.py"))&&t.toLowerCase().includes("flask"))return`from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({"message": "Welcome to the API", "status": "running"})

@app.route('/api/health')
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
`;if(e.endsWith("main.py")&&t.toLowerCase().includes("fastapi"))return`from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to the API", "status": "running"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
`;if((e.endsWith("server.js")||e.endsWith("index.js")||e.endsWith("server.ts")||e.endsWith("index.ts"))&&t.toLowerCase().includes("express"))return e.endsWith(".ts")?`import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the API', status: 'running' });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`:`const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API', status: 'running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;if(e.endsWith("app.vue")||e.endsWith("App.vue"))return`<template>
  <div id="app" class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">Vue App</h1>
      <p class="text-gray-600">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const message = ref('Welcome to your new Vue project')
</script>

<style scoped>
#app {
  font-family: system-ui, -apple-system, sans-serif;
}
</style>
`;if(e.endsWith(".svelte"))return`<script lang="ts">
  let message = 'Welcome to your new Svelte project';
</script>

<main class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="text-center">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">Svelte App</h1>
    <p class="text-gray-600">{message}</p>
  </div>
</main>

<style>
  main {
    font-family: system-ui, -apple-system, sans-serif;
  }
</style>
`;if(e.endsWith("main.go"))return`package main

import (
        "encoding/json"
        "log"
        "net/http"
        "os"
)

type Response struct {
        Message string \`json:"message"\`
        Status  string \`json:"status"\`
}

func main() {
        port := os.Getenv("PORT")
        if port == "" {
                port = "5000"
        }

        http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
                w.Header().Set("Content-Type", "application/json")
                json.NewEncoder(w).Encode(Response{
                        Message: "Welcome to the API",
                        Status:  "running",
                })
        })

        http.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
                w.Header().Set("Content-Type", "application/json")
                json.NewEncoder(w).Encode(Response{Status: "healthy"})
        })

        log.Printf("Server starting on port %s", port)
        log.Fatal(http.ListenAndServe(":"+port, nil))
}
`;if(e.endsWith("go.mod"))return`module app

go 1.21
`;if(e.endsWith("main.rs"))return`use std::net::TcpListener;
use std::io::{Read, Write};

fn main() {
    let listener = TcpListener::bind("0.0.0.0:5000").unwrap();
    println!("Server running on port 5000");

    for stream in listener.incoming() {
        let mut stream = stream.unwrap();
        let mut buffer = [0; 1024];
        stream.read(&mut buffer).unwrap();

        let response = r#"HTTP/1.1 200 OK
Content-Type: application/json

{"message": "Welcome to the API", "status": "running"}"#;

        stream.write(response.as_bytes()).unwrap();
        stream.flush().unwrap();
    }
}
`;if(e.endsWith("Cargo.toml")||e.endsWith("cargo.toml"))return`[package]
name = "app"
version = "0.1.0"
edition = "2021"

[dependencies]
`;if(e.endsWith("index.php"))return`<?php
header('Content-Type: application/json');

// CORS Security: Define your allowed origins here
$allowedOrigins = [
    'https://your-production-domain.com',
    // Add more allowed origins as needed
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} elseif (getenv('APP_ENV') === 'development') {
    header('Access-Control-Allow-Origin: http://localhost:3000');
}
// Note: No header set for unrecognized origins (CORS blocks request)

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($path === '/' || $path === '') {
    echo json_encode([
        'message' => 'Welcome to the API',
        'status' => 'running'
    ]);
} elseif ($path === '/api/health') {
    echo json_encode(['status' => 'healthy']);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
}
`;if(e.endsWith(".gitignore"))return`# Dependencies
node_modules/
vendor/
__pycache__/
*.pyc
.venv/
venv/

# Build outputs
dist/
build/
target/
*.exe
*.dll
*.so

# IDE
.vscode/
.idea/
*.swp
*.swo

# Environment
.env
.env.local
*.log

# OS
.DS_Store
Thumbs.db
`;if(e.endsWith(".env")||e.endsWith(".env.example"))return`# Environment Variables
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=

# API Keys
# API_KEY=your_api_key_here
`;if(e==="dockerfile"||e.endsWith("/dockerfile")){let s=t.toLowerCase().includes("python"),c=t.toLowerCase().includes("node"),a=t.toLowerCase().includes("go");return s?`FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "main.py"]
`:a?`FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY . .
RUN go build -o main .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .

EXPOSE 5000
CMD ["./main"]
`:`FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]
`}if(l.warn(`[ContentGenerator] No template match for ${o}, generating enhanced fallback`),e.endsWith(".ts")||e.endsWith(".tsx")||e.endsWith(".js")||e.endsWith(".jsx")){let s=e.endsWith(".tsx")||e.endsWith(".jsx")||t.toLowerCase().includes("component")||t.toLowerCase().includes("react"),c=t.toLowerCase().includes("hook")||e.startsWith("use"),a=t.toLowerCase().includes("service")||e.includes("service"),d=t.toLowerCase().includes("util")||e.includes("util"),f=t.toLowerCase().includes("context")||e.includes("context");if(s){let i=o.split("/").pop()?.replace(/\.(tsx|jsx)$/,"")||"Component",r=i.charAt(0).toUpperCase()+i.slice(1);return`import { useState, useEffect } from 'react';

interface ${r}Props {
  className?: string;
  children?: React.ReactNode;
}

export default function ${r}({ className, children }: ${r}Props) {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setIsLoading(false);
  }, []);
  
  if (isLoading) {
    return <div className={className}>Loading...</div>;
  }
  
  return (
    <div className={\`${i.toLowerCase()} \${className || ''}\`}>
      <div className="${i.toLowerCase()}-content">
        {children}
      </div>
    </div>
  );
}`}if(c){let i=o.split("/").pop()?.replace(/\.(tsx?|jsx?)$/,"")||"useCustomHook";return`import { useState, useEffect, useCallback } from 'react';

interface ${i.charAt(0).toUpperCase()+i.slice(1)}Result {
  data: unknown;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function ${i}(): ${i.charAt(0).toUpperCase()+i.slice(1)}Result {
  const [data, setData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Implement fetch logic here
      setData({});
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  return { data, isLoading, error, refetch };
}

export default ${i};`}if(a){let i=o.split("/").pop()?.replace(/\.(tsx?|jsx?)$/,"")||"service",r=i.split("-").map(g=>g.charAt(0).toUpperCase()+g.slice(1)).join("")+"Service";return`import { createLogger } from '../utils/logger';

const logger = createLogger('${i}');

export interface ${r}Options {
  baseUrl?: string;
  timeout?: number;
}

export class ${r} {
  private baseUrl: string;
  private timeout: number;
  
  constructor(options: ${r}Options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.timeout = options.timeout || 30000;
    logger.info('[${r}] Service initialized');
  }
  
  async execute(params: Record<string, unknown>): Promise<unknown> {
    logger.info('[${r}] Executing operation', { params });
    
    try {
      // Implement service logic here
      return { success: true, data: params };
    } catch (error: any) {
      logger.error('[${r}] Operation failed', { error: error.message });
      throw error;
    }
  }
}

export const ${i.replace(/-./g,g=>g[1].toUpperCase())} = new ${r}();`}if(f){let i=o.split("/").pop()?.replace(/\.(tsx?|jsx?)$/,"")||"AppContext",r=i.charAt(0).toUpperCase()+i.slice(1);return`import { createContext, useContext, useState, ReactNode } from 'react';

interface ${r}State {
  value: unknown;
  setValue: (value: unknown) => void;
}

const ${r} = createContext<${r}State | undefined>(undefined);

export function ${r}Provider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<unknown>(null);
  
  return (
    <${r}.Provider value={{ value, setValue }}>
      {children}
    </${r}.Provider>
  );
}

export function use${r}() {
  const context = useContext(${r});
  if (context === undefined) {
    throw new Error('use${r} must be used within a ${r}Provider');
  }
  return context;
}

export default ${r};`}return d?`/**
 * Utility functions for: ${t}
 */

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function parseValue<T>(value: string, defaultValue: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}`:`/**
 * ${t}
 * Generated fallback - implement specific functionality as needed
 */

export interface ModuleOptions {
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export function initialize(options: ModuleOptions = {}): void {
  console.log('Module initialized with options:', options);
}

export function execute(input: unknown): unknown {
  return { processed: true, input };
}

export default { initialize, execute };
`}if(e.endsWith(".css")){let s=o.split("/").pop()?.replace(".css","").toLowerCase()||"component";return`/* ${t} */

.${s} {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.${s}-header {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.${s}-content {
  flex: 1;
}

.${s}-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e5e7eb);
}

@media (max-width: 768px) {
  .${s} {
    padding: 0.75rem;
  }
}
`}if(e.endsWith(".json")){let s=o.split("/").pop()?.replace(".json","")||"config";return s.includes("tsconfig")?JSON.stringify({compilerOptions:{target:"ES2020",module:"ESNext",moduleResolution:"bundler",strict:!0,esModuleInterop:!0,skipLibCheck:!0},include:["src/**/*"],exclude:["node_modules"]},null,2):JSON.stringify({name:s,version:"1.0.0",description:t,config:{}},null,2)}if(e.endsWith(".md")){let c=(o.split("/").pop()?.replace(".md","")||"Document").split("-").map(a=>a.charAt(0).toUpperCase()+a.slice(1)).join(" ");return`# ${c}

${t}

## Overview

This document describes ${c.toLowerCase()}.

## Getting Started

1. Install dependencies
2. Configure settings
3. Run the application

## Usage

\`\`\`typescript
// Example usage
import { feature } from './feature';

feature.initialize();
\`\`\`

## API Reference

See the source code for detailed API documentation.

## Contributing

Please read the contributing guidelines before submitting changes.
`}return e.endsWith(".yml")||e.endsWith(".yaml")?`# ${t}

version: '1.0'

settings:
  enabled: true
  
# Add configuration here
`:e.endsWith(".sh")?`#!/bin/bash
# ${t}

set -e

echo "Script started..."

# Add commands here

echo "Script completed."
`:`${t}

Content generated as fallback. Please implement specific functionality as needed.
`}},O=new v;export{O as agentContentGenerator};
