/**
 * Agent Content Generator Service
 * Phase 2 Executor: Converts file outlines into concrete file content
 * 
 * CRITICAL: This service materializes outline-based file descriptors from fallback plans
 * into actual, runnable file content that can be written to disk.
 * 
 * ✅ FIX (Dec 2, 2025): Added AI-based code generation for custom components.
 * When no template matches, uses AI provider to generate actual working code.
 */

import { createLogger } from '../utils/logger';
import type { AIProviderManager } from '../ai/ai-provider-manager';

const logger = createLogger('agent-content-generator');

export interface FileOutline {
  path: string;
  outline: string;
  language?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language?: string;
}

/**
 * Generate concrete file content from outline descriptions
 * Uses template-based generation for common file types, AI generation for custom files
 */
class AgentContentGeneratorService {
  private aiProviderManager: AIProviderManager | null = null;
  
  /**
   * Lazy-load AI provider manager to avoid circular dependencies
   */
  private async getAIProvider(): Promise<AIProviderManager | null> {
    if (!this.aiProviderManager) {
      try {
        const { aiProviderManager } = await import('../ai/ai-provider-manager');
        this.aiProviderManager = aiProviderManager;
      } catch (error) {
        logger.warn('[ContentGenerator] Could not load AI provider manager', error);
        return null;
      }
    }
    return this.aiProviderManager;
  }
  
  /**
   * Expand a file outline into concrete content
   * Uses template-based generation for common file types, AI for custom files
   * ✅ FIX (Dec 2, 2025): Call AI provider for non-template files instead of placeholders
   */
  async expandOutline(outline: FileOutline): Promise<GeneratedFile> {
    logger.info(`[ContentGenerator] Expanding outline for ${outline.path}`, {
      language: outline.language
    });

    // First, try template-based generation for common file types
    const templateContent = this.generateContentFromOutline(outline);
    
    // Check if this is placeholder content that needs AI generation
    const isPlaceholder = templateContent.includes('TODO: Implement') || 
                         templateContent.includes('TODO: Add') ||
                         templateContent.includes('TODO: Configure');
    
    if (isPlaceholder) {
      logger.info(`[ContentGenerator] Template returned placeholder for ${outline.path}, trying AI generation`);
      
      // Try AI-based code generation
      const aiContent = await this.generateWithAI(outline);
      if (aiContent) {
        logger.info(`[ContentGenerator] AI generated ${aiContent.length} chars for ${outline.path}`);
        return {
          path: outline.path,
          content: aiContent,
          language: outline.language
        };
      }
      
      // AI failed, use template placeholder as fallback
      logger.warn(`[ContentGenerator] AI generation failed for ${outline.path}, using placeholder`);
    }

    return {
      path: outline.path,
      content: templateContent,
      language: outline.language
    };
  }
  
  /**
   * ✅ NEW (Dec 2, 2025): Generate file content using AI provider
   * Creates working code from outline description
   */
  private async generateWithAI(outline: FileOutline): Promise<string | null> {
    try {
      const aiProvider = await this.getAIProvider();
      if (!aiProvider) {
        return null;
      }
      
      const { path, outline: description, language } = outline;
      const fileName = path.split('/').pop() || 'file';
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      
      // Determine the type of code to generate
      let codeType = 'code';
      if (ext === 'tsx' || ext === 'jsx') {
        codeType = 'React component';
      } else if (ext === 'ts' || ext === 'js') {
        codeType = 'TypeScript/JavaScript module';
      } else if (ext === 'css') {
        codeType = 'CSS styles';
      } else if (ext === 'py') {
        codeType = 'Python module';
      } else if (ext === 'go') {
        codeType = 'Go code';
      }
      
      const systemPrompt = `You are an expert developer that generates complete, production-ready code files. 
IMPORTANT RULES:
- Generate ONLY the raw code - no explanations, no markdown code blocks
- The code must be complete, functional, and production-ready
- Include all necessary imports at the top
- Include proper TypeScript types if applicable
- Follow modern best practices and coding conventions
- Start with the first line of actual code (import, declaration, or content)`;
      
      const userPrompt = `Generate a complete, working ${codeType} file for: ${path}

REQUIREMENTS FROM DESIGN OUTLINE:
${description}

IMPORTANT:
- Output ONLY the raw ${ext.toUpperCase()} code
- NO markdown formatting, NO code blocks, NO explanations
- Start immediately with the first import or declaration

Generate the complete ${fileName} file:`;

      logger.info(`[ContentGenerator] Requesting AI to generate ${path}`);
      
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt }
      ];
      
      // Try multiple models with fallback for code generation
      // Use actual model IDs from provider configuration
      const fallbackModels = [
        'gpt-4o',                         // OpenAI fast, reliable
        'claude-sonnet-4-5-20250929',     // Anthropic balanced
        'gemini-2.5-flash',               // Google fast
        'gpt-5.1',                        // OpenAI latest
      ];
      let result: string | null = null;
      let lastError: string | null = null;
      
      for (const modelId of fallbackModels) {
        try {
          logger.info(`[ContentGenerator] Trying model ${modelId} for ${path}`);
          result = await aiProvider.generateChat(modelId, messages, {
            max_tokens: 4000,
            temperature: 0.2
          });
          if (result && result.trim().length > 50) {
            logger.info(`[ContentGenerator] Successfully generated ${result.length} chars with ${modelId}`);
            break;
          } else {
            logger.warn(`[ContentGenerator] Model ${modelId} returned insufficient content (${result?.length || 0} chars)`);
            result = null;
          }
        } catch (modelError: any) {
          lastError = modelError.message;
          logger.warn(`[ContentGenerator] Model ${modelId} failed: ${modelError.message}`);
          continue;
        }
      }
      
      if (!result && lastError) {
        logger.error(`[ContentGenerator] All AI models failed for ${path}. Last error: ${lastError}`);
      }
      
      if (result && result.trim().length > 20) {
        // Clean up any markdown code blocks that might have been included
        let cleanedContent = result.trim();
        
        // Remove markdown code block wrappers if present
        if (cleanedContent.startsWith('```')) {
          const lines = cleanedContent.split('\n');
          lines.shift(); // Remove opening ```
          if (lines[lines.length - 1] === '```') {
            lines.pop(); // Remove closing ```
          }
          cleanedContent = lines.join('\n');
        }
        
        return cleanedContent;
      }
      
      return null;
    } catch (error: any) {
      logger.error(`[ContentGenerator] AI generation error for ${outline.path}:`, error.message);
      return null;
    }
  }

  /**
   * Batch expand multiple outlines
   */
  async expandOutlines(outlines: FileOutline[]): Promise<GeneratedFile[]> {
    const results = await Promise.all(
      outlines.map(outline => this.expandOutline(outline))
    );
    return results;
  }

  /**
   * Generate file content from path and description (no outline provided)
   * ✅ NEW (Nov 30, 2025): Handle cases where AI only provides path and description
   */
  async generateFileContent(params: { path: string; description: string; language?: string }): Promise<GeneratedFile> {
    logger.info(`[ContentGenerator] Generating content from description for ${params.path}`);
    
    // Create a pseudo-outline from the description and use existing generation logic
    const outline: FileOutline = {
      path: params.path,
      outline: params.description,
      language: params.language
    };
    
    return this.expandOutline(outline);
  }

  /**
   * Template-based content generation
   * Matches file paths and outline descriptions to generate appropriate content
   * ✅ FIX (Nov 23, 2025): Use endsWith() for path matching to handle subdirectories
   */
  private generateContentFromOutline(outline: FileOutline): string {
    const { path, outline: description } = outline;
    const fileName = path.toLowerCase();

    // Package.json - React + TypeScript + Vite + Tailwind starter
    if (fileName.endsWith('package.json')) {
      return JSON.stringify({
        name: 'starter-project',
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          preview: 'vite preview'
        },
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          '@vitejs/plugin-react': '^4.2.0',
          'autoprefixer': '^10.4.16',
          'postcss': '^8.4.32',
          'tailwindcss': '^3.3.6',
          'typescript': '^5.3.3',
          'vite': '^5.0.8'
        }
      }, null, 2);
    }

    // index.html entry point
    if (fileName.endsWith('index.html')) {
      return `<!DOCTYPE html>
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
</html>`;
    }

    // React main entry point
    if (fileName.endsWith('main.tsx') || fileName.endsWith('main.jsx')) {
      return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;
    }

    // Tailwind CSS imports - check outline OR filename for Tailwind indication
    if (fileName.endsWith('index.css') && (description.toLowerCase().includes('tailwind') || description.includes('@tailwind'))) {
      return `@tailwind base;
@tailwind components;
@tailwind utilities;`;
    }

    // Vite configuration
    if (fileName.endsWith('vite.config.ts') || fileName.endsWith('vite.config.js')) {
      return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})`;
    }

    // PostCSS configuration
    if (fileName.endsWith('postcss.config.js')) {
      return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
    }

    // Tailwind configuration
    if (fileName.endsWith('tailwind.config.js') || fileName.endsWith('tailwind.config.ts')) {
      return `export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
    }

    // TypeScript configuration
    if (fileName.endsWith('tsconfig.json')) {
      return JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true
        },
        include: ['src']
      }, null, 2);
    }

    // App component - extract goal from outline if present
    if (fileName.endsWith('app.tsx') || fileName.endsWith('app.jsx')) {
      const goalMatch = description.match(/goal:\s*"([^"]+)"/i) || 
                       description.match(/goal:\s*([^\n.]+)/i);
      const goal = goalMatch ? goalMatch[1] : 'Welcome to your new project';

      return `export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Project Initialized</h1>
        <p className="text-gray-600">${goal}</p>
      </div>
    </div>
  );
}`;
    }

    // ============================================
    // ✅ EXTENDED TEMPLATES (Nov 30, 2025)
    // IMPORTANT: These MUST come BEFORE generic fallbacks
    // Support for Python, Node.js, Go, Rust, PHP
    // ============================================

    // Python - requirements.txt
    if (fileName.endsWith('requirements.txt')) {
      const isFlask = description.toLowerCase().includes('flask');
      const isFastAPI = description.toLowerCase().includes('fastapi');
      const isDjango = description.toLowerCase().includes('django');
      
      if (isFlask) {
        return `flask>=2.3.0
flask-cors>=4.0.0
python-dotenv>=1.0.0
gunicorn>=21.2.0`;
      }
      if (isFastAPI) {
        return `fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
python-dotenv>=1.0.0`;
      }
      if (isDjango) {
        return `django>=4.2.0
django-cors-headers>=4.3.0
python-dotenv>=1.0.0
gunicorn>=21.2.0`;
      }
      return `# Python dependencies
python-dotenv>=1.0.0`;
    }

    // Python - app.py / main.py (Flask)
    if ((fileName.endsWith('app.py') || fileName.endsWith('main.py')) && 
        description.toLowerCase().includes('flask')) {
      return `from flask import Flask, jsonify, request
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
`;
    }

    // Python - main.py (FastAPI)
    if (fileName.endsWith('main.py') && description.toLowerCase().includes('fastapi')) {
      return `from fastapi import FastAPI
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
`;
    }

    // Node.js - Express server.js / index.js
    if ((fileName.endsWith('server.js') || fileName.endsWith('index.js') || fileName.endsWith('server.ts') || fileName.endsWith('index.ts')) &&
        description.toLowerCase().includes('express')) {
      const isTS = fileName.endsWith('.ts');
      if (isTS) {
        return `import express, { Request, Response } from 'express';
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
`;
      }
      return `const express = require('express');
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
`;
    }

    // Vue.js - App.vue
    if (fileName.endsWith('app.vue') || fileName.endsWith('App.vue')) {
      return `<template>
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
`;
    }

    // Svelte - App.svelte
    if (fileName.endsWith('.svelte')) {
      return `<script lang="ts">
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
`;
    }

    // Go - main.go
    if (fileName.endsWith('main.go')) {
      return `package main

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
`;
    }

    // Go - go.mod
    if (fileName.endsWith('go.mod')) {
      return `module app

go 1.21
`;
    }

    // Rust - main.rs
    if (fileName.endsWith('main.rs')) {
      return `use std::net::TcpListener;
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
`;
    }

    // Rust - Cargo.toml
    if (fileName.endsWith('Cargo.toml') || fileName.endsWith('cargo.toml')) {
      return `[package]
name = "app"
version = "0.1.0"
edition = "2021"

[dependencies]
`;
    }

    // PHP - index.php
    if (fileName.endsWith('index.php')) {
      return `<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

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
`;
    }

    // .gitignore - extended patterns
    if (fileName.endsWith('.gitignore')) {
      return `# Dependencies
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
`;
    }

    // .env / .env.example
    if (fileName.endsWith('.env') || fileName.endsWith('.env.example')) {
      return `# Environment Variables
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=

# API Keys
# API_KEY=your_api_key_here
`;
    }

    // Dockerfile
    if (fileName === 'dockerfile' || fileName.endsWith('/dockerfile')) {
      const isPython = description.toLowerCase().includes('python');
      const isNode = description.toLowerCase().includes('node');
      const isGo = description.toLowerCase().includes('go');
      
      if (isPython) {
        return `FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "main.py"]
`;
      }
      if (isGo) {
        return `FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY . .
RUN go build -o main .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .

EXPOSE 5000
CMD ["./main"]
`;
      }
      // Default to Node.js
      return `FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]
`;
    }

    // ============================================
    // GENERIC FALLBACKS (must come AFTER specific templates)
    // ============================================
    
    // Default fallback - provide sensible content based on file extension
    logger.warn(`[ContentGenerator] No template match for ${path}, using outline-based default`);
    
    // TypeScript/JavaScript files (generic fallback)
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx') || fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      const isReactComponent = fileName.endsWith('.tsx') || fileName.endsWith('.jsx') || 
                              description.toLowerCase().includes('component') || 
                              description.toLowerCase().includes('react');
      
      if (isReactComponent) {
        const componentName = path.split('/').pop()?.replace(/\.(tsx|jsx)$/, '') || 'Component';
        return `export default function ${componentName}() {
  // ${description}
  return (
    <div>
      <h1>${componentName}</h1>
      <p>TODO: Implement component based on outline</p>
    </div>
  );
}`;
      }
      
      // Regular TS/JS file
      return `/**
 * ${description}
 */

// TODO: Implement based on outline
export {};
`;
    }
    
    // CSS files (generic fallback)
    if (fileName.endsWith('.css')) {
      return `/* ${description} */

/* TODO: Add styles based on outline */
`;
    }
    
    // JSON files (generic fallback)
    if (fileName.endsWith('.json')) {
      return JSON.stringify({
        description: description,
        todo: 'Configure based on outline'
      }, null, 2);
    }
    
    // Markdown files (generic fallback)
    if (fileName.endsWith('.md')) {
      return `# ${path.split('/').pop()?.replace('.md', '') || 'Document'}

${description}

TODO: Add content based on outline
`;
    }
    
    // Plain text fallback with outline as comment
    return `${description}\n\nTODO: Implement file content based on outline\n`;
  }
}

export const agentContentGenerator = new AgentContentGeneratorService();
