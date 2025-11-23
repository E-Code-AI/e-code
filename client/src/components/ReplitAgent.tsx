import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Sparkles, Code, FileText, HelpCircle,
  Lightbulb, Zap, RefreshCw, Copy, X, Hammer, Package,
  FolderOpen, FileCode, Loader2, CheckCircle, AlertCircle,
  Wrench, Rocket, GitBranch, Database, Globe, Server,
  MessageSquare, DollarSign, Link, Camera, Brain, Power,
  Pause, Play, Plus, ChevronLeft, ChevronRight, FileTerminal,
  History, Palette, Heart, Edit, BeakerIcon, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { AgentPricingDisplay } from './AgentPricingDisplay';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';
import { PendingApprovalsPanel } from './PendingApprovalsPanel';
import { AIModelSelector } from './ai/AIModelSelector';
import { ExtendedThinkingDisplay } from './agent/ExtendedThinkingDisplay';
import { AutonomousControls } from './agent/AutonomousControls';
import { PlanVisualizer } from './agent/PlanVisualizer';
import { PlanApprovalModal } from './agent/PlanApprovalModal';
import { TestingToolsPanel } from './agent/TestingToolsPanel';
import { apiRequest } from '@/lib/queryClient';
import { useAgentSession } from '@/hooks/use-agent-session';
import { MessageRenderer, AgentMessage as NewAgentMessage, Action } from './agent/messages';

interface ReplitAgentProps {
  projectId: string | number;
  selectedFile?: string;
  selectedCode?: string;
  className?: string;
  initialPrompt?: string | null;
  websocket?: WebSocket | null; // NEW: Accept external WebSocket from Editor.tsx
  onBuildComplete?: () => void; // Callback when build execution completes (Task 12)
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'code' | 'explanation' | 'suggestion' | 'error' | 'action' | 'progress' | 'building';
  metadata?: {
    language?: string;
    fileName?: string;
    action?: string;
    files?: string[];
    packages?: string[];
    progress?: number;
    buildType?: string;
    technology?: string;
  };
  pricing?: {
    complexity: string;
    costInCents: number;
    costInDollars: string;
    effortScore: number;
  };
  metrics?: {
    filesModified: number;
    linesOfCode: number;
    tokensUsed: number;
    apiCalls: number;
    executionTimeMs: number;
  };
  checkpoint?: any;
  actions?: AgentAction[];
  completed?: boolean;
  thinking?: {
    steps: Array<{
      id: string;
      type: 'reasoning' | 'analysis' | 'planning';
      title: string;
      content: string;
      status: 'active' | 'completed' | 'error';
      timestamp: Date;
      duration?: number;
    }>;
    isStreaming?: boolean;
    totalTokens?: number;
    thinkingTime?: number;
  };
}

interface AgentAction {
  type: 'create_file' | 'edit_file' | 'delete_file' | 'install_package' | 'run_code' | 'create_folder';
  path?: string;
  content?: string;
  package?: string;
  description?: string;
  actionId?: string; // From approval queue
}

interface BuildTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  keywords: string[];
  technology: string[];
  structure: {
    folders: string[];
    files: { path: string; content: string }[];
    packages: string[];
  };
}

const BUILD_TEMPLATES: BuildTemplate[] = [
  {
    id: 'todo-app',
    name: 'Todo Application',
    description: 'A simple todo list app with CRUD operations',
    icon: CheckCircle,
    keywords: ['todo', 'task', 'list', 'crud'],
    technology: ['HTML', 'CSS', 'JavaScript'],
    structure: {
      folders: ['css', 'js'],
      files: [
        { 
          path: 'index.html', 
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo App</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <h1>My Todo List</h1>
        <div class="todo-input">
            <input type="text" id="todoInput" placeholder="Add a new task...">
            <button onclick="addTodo()">Add</button>
        </div>
        <ul id="todoList"></ul>
    </div>
    <script src="js/app.js"></script>
</body>
</html>`
        },
        {
          path: 'css/style.css',
          content: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    background: #f5f5f5;
    padding: 20px;
}

.container {
    max-width: 600px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h1 {
    color: #333;
    margin-bottom: 20px;
    text-align: center;
}

.todo-input {
    display: flex;
    margin-bottom: 20px;
}

#todoInput {
    flex: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px 0 0 5px;
    font-size: 16px;
}

button {
    padding: 10px 20px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 0 5px 5px 0;
    cursor: pointer;
    font-size: 16px;
}

button:hover {
    background: #45a049;
}

#todoList {
    list-style: none;
}

.todo-item {
    display: flex;
    align-items: center;
    padding: 15px;
    background: #f9f9f9;
    margin-bottom: 10px;
    border-radius: 5px;
    transition: all 0.3s ease;
}

.todo-item:hover {
    background: #f0f0f0;
}

.todo-item.completed {
    opacity: 0.6;
    text-decoration: line-through;
}

.todo-item button {
    margin-left: auto;
    padding: 5px 10px;
    font-size: 14px;
    background: #f44336;
}

.todo-item button:hover {
    background: #da190b;
}`
        },
        {
          path: 'js/app.js',
          content: `let todos = JSON.parse(localStorage.getItem('todos')) || [];

function renderTodos() {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';
    
    todos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = 'todo-item' + (todo.completed ? ' completed' : '');
        li.innerHTML = \`
            <input type="checkbox" \${todo.completed ? 'checked' : ''} 
                   onchange="toggleTodo(\${index})">
            <span>\${todo.text}</span>
            <button onclick="deleteTodo(\${index})">Delete</button>
        \`;
        todoList.appendChild(li);
    });
}

function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    
    if (text) {
        todos.push({ text, completed: false });
        input.value = '';
        saveTodos();
        renderTodos();
    }
}

function toggleTodo(index) {
    todos[index].completed = !todos[index].completed;
    saveTodos();
    renderTodos();
}

function deleteTodo(index) {
    todos.splice(index, 1);
    saveTodos();
    renderTodos();
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// Initial render
renderTodos();

// Add todo on Enter key
document.getElementById('todoInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
});`
        }
      ],
      packages: []
    }
  },
  {
    id: 'rest-api',
    name: 'REST API',
    description: 'Express.js REST API with CRUD operations',
    icon: Server,
    keywords: ['api', 'rest', 'backend', 'server', 'express'],
    technology: ['Node.js', 'Express.js'],
    structure: {
      folders: ['routes', 'models', 'middleware'],
      files: [
        {
          path: 'package.json',
          content: `{
  "name": "rest-api",
  "version": "1.0.0",
  "description": "REST API with Express.js",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}`
        },
        {
          path: 'index.js',
          content: `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database
let items = [
  { id: 1, name: 'Item 1', description: 'First item' },
  { id: 2, name: 'Item 2', description: 'Second item' }
];

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the REST API' });
});

// Get all items
app.get('/api/items', (req, res) => {
  res.json(items);
});

// Get item by ID
app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ message: 'Item not found' });
  res.json(item);
});

// Create new item
app.post('/api/items', (req, res) => {
  const newItem = {
    id: items.length + 1,
    name: req.body.name,
    description: req.body.description
  };
  items.push(newItem);
  res.status(201).json(newItem);
});

// Update item
app.put('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ message: 'Item not found' });
  
  item.name = req.body.name || item.name;
  item.description = req.body.description || item.description;
  res.json(item);
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ message: 'Item not found' });
  
  items.splice(index, 1);
  res.status(204).send();
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server is running on port \${PORT}\`);
});`
        },
        {
          path: '.env',
          content: `PORT=5000`
        },
        {
          path: 'README.md',
          content: `# REST API

A simple REST API built with Express.js

## Endpoints

- GET /api/items - Get all items
- GET /api/items/:id - Get item by ID
- POST /api/items - Create new item
- PUT /api/items/:id - Update item
- DELETE /api/items/:id - Delete item

## Running the API

\`\`\`bash
npm install
npm start
\`\`\`

For development:
\`\`\`bash
npm run dev
\`\`\``
        }
      ],
      packages: ['express', 'cors', 'dotenv']
    }
  },
  {
    id: 'portfolio',
    name: 'Portfolio Website',
    description: 'Personal portfolio website with responsive design',
    icon: Globe,
    keywords: ['portfolio', 'website', 'personal', 'resume', 'cv'],
    technology: ['HTML', 'CSS', 'JavaScript'],
    structure: {
      folders: ['css', 'js', 'images'],
      files: [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Portfolio</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <nav class="navbar">
        <div class="container">
            <h1 class="logo">My Portfolio</h1>
            <ul class="nav-links">
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#projects">Projects</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </div>
    </nav>

    <section id="home" class="hero">
        <div class="container">
            <h1>Welcome to My Portfolio</h1>
            <p>I'm a passionate developer creating amazing experiences</p>
            <a href="#projects" class="btn">View My Work</a>
        </div>
    </section>

    <section id="about" class="about">
        <div class="container">
            <h2>About Me</h2>
            <p>I'm a creative developer with a passion for building beautiful and functional websites.</p>
        </div>
    </section>

    <section id="projects" class="projects">
        <div class="container">
            <h2>My Projects</h2>
            <div class="project-grid">
                <div class="project-card">
                    <h3>Project 1</h3>
                    <p>Description of project 1</p>
                </div>
                <div class="project-card">
                    <h3>Project 2</h3>
                    <p>Description of project 2</p>
                </div>
                <div class="project-card">
                    <h3>Project 3</h3>
                    <p>Description of project 3</p>
                </div>
            </div>
        </div>
    </section>

    <section id="contact" class="contact">
        <div class="container">
            <h2>Contact Me</h2>
            <form>
                <input type="text" placeholder="Your Name" required>
                <input type="email" placeholder="Your Email" required>
                <textarea placeholder="Your Message" rows="5" required></textarea>
                <button type="submit" class="btn">Send Message</button>
            </form>
        </div>
    </section>

    <footer>
        <div class="container">
            <p>&copy; 2024 My Portfolio. All rights reserved.</p>
        </div>
    </footer>

    <script src="js/script.js"></script>
</body>
</html>`
        },
        {
          path: 'css/style.css',
          content: `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

.navbar {
    background: #333;
    color: white;
    padding: 1rem 0;
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
}

.navbar .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo {
    font-size: 1.5rem;
}

.nav-links {
    display: flex;
    list-style: none;
    gap: 2rem;
}

.nav-links a {
    color: white;
    text-decoration: none;
    transition: color 0.3s;
}

.nav-links a:hover {
    color: #007bff;
}

.hero {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-align: center;
    padding: 150px 0 100px;
    margin-top: 60px;
}

.hero h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.hero p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
}

.btn {
    display: inline-block;
    background: white;
    color: #333;
    padding: 12px 30px;
    text-decoration: none;
    border-radius: 5px;
    transition: transform 0.3s;
}

.btn:hover {
    transform: translateY(-2px);
}

section {
    padding: 80px 0;
}

.about {
    background: #f4f4f4;
    text-align: center;
}

.projects h2, .contact h2 {
    text-align: center;
    margin-bottom: 3rem;
    font-size: 2.5rem;
}

.project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
}

.project-card {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    transition: transform 0.3s;
}

.project-card:hover {
    transform: translateY(-5px);
}

.contact {
    background: #f4f4f4;
}

form {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

form input, form textarea {
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 16px;
}

footer {
    background: #333;
    color: white;
    text-align: center;
    padding: 2rem 0;
}`
        },
        {
          path: 'js/script.js',
          content: `// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Add active class to nav links on scroll
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section');
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});`
        }
      ],
      packages: []
    }
  }
];

const QUICK_ACTIONS = [
  { id: 'explain', label: 'Explain this', icon: HelpCircle },
  { id: 'improve', label: 'Improve code', icon: Sparkles },
  { id: 'debug', label: 'Debug error', icon: Zap },
  { id: 'generate', label: 'Generate', icon: Code }
];

export function ReplitAgent({ projectId, selectedFile, selectedCode, className, initialPrompt, websocket, onBuildComplete }: ReplitAgentProps) {
  // NEW: Load persisted session for this project
  const { session, isLoading: sessionLoading, saveSession, updateMessages, updateSettings } = useAgentSession(projectId);
  const hasHydrated = useRef(false);
  const hasAutoStarted = useRef(false); // Track if we've auto-started from initialPrompt
  const externalWebSocket = useRef<WebSocket | null>(websocket || null); // Store external WebSocket
  
  // State with default values (hydrated from session in useEffect below)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I'm your AI engineering assistant. I can autonomously build entire applications for you.

🚀 **I can create:**
- Todo apps, task managers, productivity tools
- REST APIs with authentication and databases
- Personal portfolios and landing pages
- Real-time chat applications
- Dashboard and analytics tools
- E-commerce websites
- And much more!

Just tell me what you want to build, and I'll handle everything - from creating files to installing packages to setting up the complete project structure.

**Example requests:**
- "Build a todo app with dark mode"
- "Create a REST API for a blog"
- "Make a portfolio website for a photographer"
- "Build a real-time chat app"

What would you like me to build for you today?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [highPowerMode, setHighPowerMode] = useState(false);
  const [autoCheckpoints, setAutoCheckpoints] = useState(true);
  const [autoApprovePlans, setAutoApprovePlans] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-3-5-sonnet');
  const [thinkingSteps, setThinkingSteps] = useState<Array<{
    id: string;
    type: 'reasoning' | 'analysis' | 'planning';
    title: string;
    content: string;
    status: 'active' | 'completed' | 'error';
    timestamp: Date;
    duration?: number;
    isStreaming?: boolean;
  }>>([]);
  const [featureFlags, setFeatureFlags] = useState<any>(null);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'approvals' | 'progress' | 'autonomous' | 'testing'>('chat');
  const [autonomousModeEnabled, setAutonomousModeEnabled] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [isPlanApproved, setIsPlanApproved] = useState(false);
  const [showPlanApproval, setShowPlanApproval] = useState(false);
  const [progressLogs, setProgressLogs] = useState<Array<{
    id: string;
    timestamp: Date;
    message: string;
    file?: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }>>([]);
  const [sessions, setSessions] = useState<Array<{
    id: string;
    name: string;
    messages: Message[];
    createdAt: Date;
  }>>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('default');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // NEW: Hydrate persisted state from session (guarded to avoid races and flicker)
  useEffect(() => {
    // FIX: Mark as hydrated even if no session exists (first-time users)
    if (!sessionLoading && !hasHydrated.current) {
      hasHydrated.current = true;
      
      if (session) {
        console.log(`[ReplitAgent] Hydrating session for project ${projectId}`, session);
        
        // Restore messages (convert timestamps back to Date objects)
        if (session.messages && session.messages.length > 0) {
          const hydratedMessages = session.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(hydratedMessages);
        }
        
        // Restore settings
        if (session.selectedModel) setSelectedModel(session.selectedModel);
        if (session.extendedThinking !== undefined) setExtendedThinking(session.extendedThinking);
        if (session.highPowerMode !== undefined) setHighPowerMode(session.highPowerMode);
        if (session.autoCheckpoints !== undefined) setAutoCheckpoints(session.autoCheckpoints);
        if (session.autoApprovePlans !== undefined) setAutoApprovePlans(session.autoApprovePlans);
        if (session.agentMode) setAutonomousModeEnabled(session.agentMode === 'autonomous');
        
        // Restore pending actions (if any)
        if (session.pendingActions) {
          console.log(`[ReplitAgent] Restored ${session.pendingActions.length} pending actions`);
        }
      } else {
        console.log(`[ReplitAgent] No session found for project ${projectId}, starting fresh`);
      }
    }
  }, [sessionLoading, session, projectId]);

  // NEW: Auto-save messages to session when they change (Task 2b)
  useEffect(() => {
    // Only save after hydration is complete to avoid overwriting with defaults
    if (!sessionLoading && hasHydrated.current && messages.length > 0) {
      // Save messages to session (debounced to avoid too many writes)
      const timeoutId = setTimeout(() => {
        updateMessages(messages);
        console.log(`[ReplitAgent] Auto-saved ${messages.length} messages to session`);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, updateMessages, sessionLoading]);

  // NEW: Auto-save settings to session when they change (Task 2b)
  useEffect(() => {
    // Only save after hydration is complete
    if (!sessionLoading && hasHydrated.current) {
      const settings = {
        selectedModel,
        extendedThinking,
        highPowerMode,
        autoCheckpoints,
        autoApprovePlans,
        agentMode: autonomousModeEnabled ? 'autonomous' as const : 'plan' as const,
      };
      
      updateSettings(settings);
      console.log('[ReplitAgent] Auto-saved settings to session', settings);
    }
  }, [selectedModel, extendedThinking, highPowerMode, autoCheckpoints, autoApprovePlans, autonomousModeEnabled, updateSettings, sessionLoading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // REMOVED: Legacy sessionStorage loading (Task 2c)
  // Conversation/plan state now managed via useAgentSession hook
  // If conversationId/planId persistence is needed, add to AgentSessionData in useAgentSession

  // Handle initial prompt if provided (NEW: Auto-start BUILD flow instead of chat)
  useEffect(() => {
    // Wait for session to finish loading before auto-starting build
    if (!sessionLoading && initialPrompt && messages.length === 1 && !hasAutoStarted.current) {
      // Only auto-start if we haven't already hydrated a stored conversation
      if (!session?.messages?.length) {
        hasAutoStarted.current = true;
        setTimeout(async () => {
          // 🚀 AUTO-START BUILD FLOW (like Replit)
          // Generate plan instead of sending chat message
          addProgressLog('info', `🤖 Auto-starting build from prompt: "${initialPrompt}"`);
          await generatePlan(initialPrompt);
        }, 500);
      }
    }
  }, [sessionLoading, initialPrompt, projectId, messages.length, session?.messages]);

  // NEW: Handle external WebSocket from workspace bootstrap (Task 5, 6, 7)
  useEffect(() => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log('[ReplitAgent] External WebSocket provided and connected');
      externalWebSocket.current = websocket;

      // Listen for agent messages from workspace bootstrap
      const handleWebSocketMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[ReplitAgent] WebSocket message received:', message);

          // Handle different message types from autonomous agent
          switch (message.type) {
            case 'plan_started':
              addProgressLog('info', `📋 Plan started: ${message.totalTasks} tasks to execute`);
              setIsBuilding(true);
              setBuildProgress(0);
              break;

            case 'task_started':
              addProgressLog('info', `⚙️ Task ${message.taskIndex + 1}: ${message.task.description || message.task.type}`);
              setCurrentTask(message.task.description || message.task.type);
              break;

            case 'task_completed':
              const progress = ((message.taskIndex + 1) / (message.totalTasks || 1)) * 100;
              setBuildProgress(progress);
              addProgressLog('success', `✅ Task ${message.taskIndex + 1} completed`);
              break;

            case 'file_created':
              addProgressLog('success', `📄 Created file: ${message.filePath}`);
              break;

            case 'command_output':
              addProgressLog('info', `🖥️ ${message.stream}: ${message.data.trim()}`);
              break;

            case 'plan_completed':
              setIsBuilding(false);
              setBuildProgress(100);
              addProgressLog('success', '🎉 Build completed successfully!');
              toast({
                title: "Build Complete",
                description: "Your application is ready!",
              });
              if (onBuildComplete) {
                onBuildComplete();
              }
              break;

            case 'plan_failed':
              setIsBuilding(false);
              addProgressLog('error', `❌ Build failed: ${message.error}`);
              toast({
                title: "Build Failed",
                description: message.error,
                variant: "destructive",
              });
              break;

            case 'agent_message':
              // Add agent message to chat
              const newMessage: Message = {
                id: `agent-${Date.now()}`,
                role: 'assistant',
                content: message.content,
                timestamp: new Date(),
                type: message.messageType || 'explanation',
              };
              setMessages(prev => [...prev, newMessage]);
              break;

            default:
              console.log('[ReplitAgent] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[ReplitAgent] Error handling WebSocket message:', error);
        }
      };

      websocket.addEventListener('message', handleWebSocketMessage);

      // Cleanup listener when component unmounts or websocket changes
      return () => {
        websocket.removeEventListener('message', handleWebSocketMessage);
      };
    } else if (websocket && websocket.readyState === WebSocket.CONNECTING) {
      console.log('[ReplitAgent] External WebSocket connecting, waiting...');

      const handleOpen = () => {
        console.log('[ReplitAgent] External WebSocket connected');
        toast({
          title: "Agent Connected",
          description: "AI agent is building your project",
        });
      };

      websocket.addEventListener('open', handleOpen);

      return () => {
        websocket.removeEventListener('open', handleOpen);
      };
    }
  }, [websocket, onBuildComplete, toast]);

  // Load feature flags and user preferences
  useEffect(() => {
    const loadFeatureFlagsAndPreferences = async () => {
      try {
        // Load feature flags
        const flagsResponse = await fetch('/api/feature-flags');
        if (flagsResponse.ok) {
          const flags = await flagsResponse.json();
          setFeatureFlags(flags);
        }

        // Load user AI preferences
        const prefsResponse = await fetch('/api/agent/preferences');
        if (prefsResponse.ok) {
          const prefs = await prefsResponse.json();
          setUserPreferences(prefs);
          
          // Set toggle states from preferences
          setExtendedThinking(prefs.extendedThinking || false);
          setHighPowerMode(prefs.highPowerMode || false);
          setAutoCheckpoints(prefs.autoCheckpoints ?? true);
          setAutoApprovePlans(prefs.autoApprovePlans || false);
          setSelectedModel(prefs.preferredModel || 'claude-3-5-sonnet');
        }
      } catch (error) {
        console.error('Error loading feature flags or preferences:', error);
      }
    };

    loadFeatureFlagsAndPreferences();
  }, []);

  // Save preferences when toggle states change
  const savePreferences = async (updates: any) => {
    try {
      await apiRequest('PUT', '/api/agent/preferences', updates);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  // Handle model selection change
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    savePreferences({ preferredModel: modelId });
    toast({
      title: 'Model updated',
      description: `Now using ${modelId}`,
    });
  };

  // Initialize default session
  useEffect(() => {
    if (sessions.length === 0) {
      setSessions([{
        id: 'default',
        name: 'Main Chat',
        messages: messages,
        createdAt: new Date()
      }]);
    }
  }, []);

  // Web Content Import
  const handleWebImport = async () => {
    const url = prompt('Enter URL to import content from:');
    if (!url) return;

    addProgressLog('info', `Importing content from ${url}...`);
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', `/api/tools/web-import`, { url });

      if (response.ok) {
        const { content } = await response.json();
        setInput(prev => prev + '\n\n' + content);
        addProgressLog('success', 'Web content imported successfully');
        toast({ title: 'Content imported successfully' });
      } else {
        throw new Error('Failed to import content');
      }
    } catch (error) {
      addProgressLog('error', 'Failed to import web content');
      toast({ title: 'Error importing content', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Screenshot Capture
  const handleScreenshotCapture = async () => {
    const url = prompt('Enter URL to capture screenshot:');
    if (!url) return;

    addProgressLog('info', `Capturing screenshot of ${url}...`);
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', `/api/tools/screenshot`, { url });

      if (response.ok) {
        const { screenshotUrl } = await response.json();
        const screenshotMessage: Message = {
          id: Date.now().toString(),
          role: 'system',
          content: `Screenshot captured: ![Screenshot](${screenshotUrl})`,
          timestamp: new Date(),
          type: 'action'
        };
        setMessages(prev => [...prev, screenshotMessage]);
        addProgressLog('success', 'Screenshot captured successfully');
        toast({ title: 'Screenshot captured successfully' });
      } else {
        throw new Error('Failed to capture screenshot');
      }
    } catch (error) {
      addProgressLog('error', 'Failed to capture screenshot');
      toast({ title: 'Error capturing screenshot', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Prompt Refinement
  const handleImprovePrompt = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/ai/improve-prompt', { prompt: input });

      if (response.ok) {
        const { improvedPrompt } = await response.json();
        setInput(improvedPrompt);
        toast({ title: 'Prompt improved!' });
      }
    } catch (error) {
      toast({ title: 'Error improving prompt', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Progress logging
  const addProgressLog = (type: 'info' | 'success' | 'warning' | 'error', message: string, file?: string) => {
    const log = {
      id: Date.now().toString(),
      timestamp: new Date(),
      message,
      file,
      type
    };
    setProgressLogs(prev => [...prev, log]);
  };

  // Session management
  const createNewSession = () => {
    const sessionName = prompt('Enter session name:') || `Session ${sessions.length + 1}`;
    const newSession = {
      id: Date.now().toString(),
      name: sessionName,
      messages: [],
      createdAt: new Date()
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    setMessages([]);
  };

  const switchSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setMessages(session.messages);
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      inputRef.current.style.height = Math.min(scrollHeight, 150) + 'px';
    }
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      description: "Code copied to clipboard",
      duration: 2000,
    });
  };

  const executeAction = async (action: AgentAction) => {
    try {
      // If action has actionId, use approval endpoint (from AI Agent)
      if (action.actionId) {
        
        const response = await apiRequest('POST', `/api/projects/${projectId}/ai/approve/${action.actionId}`, {});
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          const errorMessage = errorData.message || errorData.error || response.statusText;
          
          // Show security error in chat
          const securityError: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `⚠️ **Security Block**: ${errorMessage}\n\nThis action was blocked by Fortune 500 security controls to protect your project.`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, securityError]);
          
          toast({
            title: "Security: Action Blocked",
            description: errorMessage,
            variant: "destructive",
            duration: 5000,
          });
          
          throw new Error(`Security blocked: ${errorMessage}`);
        }
        
        const result = await response.json();
        return; // Exit after approval endpoint handles everything
      }
      
      // Fallback: Direct file creation (for template builds without approval queue)
      switch (action.type) {
        case 'create_file':
          if (action.path && action.content !== undefined) {
            const requestBody = {
              name: action.path.split('/').pop(),
              path: action.path,
              content: action.content,
              parentPath: action.path.substring(0, action.path.lastIndexOf('/')) || '/'
            };
            
            const response = await apiRequest('POST', `/api/files/${projectId}`, requestBody);
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: response.statusText }));
              const errorMessage = errorData.message || response.statusText;
              
              const securityError: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `⚠️ **Error**: ${errorMessage}`,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, securityError]);
              
              toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
                duration: 5000,
              });
              
              throw new Error(errorMessage);
            }
          }
          break;
        case 'edit_file':
          if (action.path && action.content !== undefined) {
            const fileId = await getFileIdByPath(action.path);
            if (fileId) {
              const response = await apiRequest('PUT', `/api/files/${projectId}/${fileId}`, { content: action.content });
              
              if (!response.ok) {
                throw new Error(`Failed to edit file: ${response.statusText}`);
              }
            }
          }
          break;
        case 'install_package':
          if (action.package) {
            const response = await apiRequest('POST', `/api/packages/${projectId}/install`, { packages: [action.package] });
            
            if (!response.ok) {
              throw new Error(`Failed to install package: ${response.statusText}`);
            }
          }
          break;
        case 'create_folder':
          if (action.path) {
            const response = await apiRequest('POST', `/api/files/${projectId}/folder`, { 
              name: action.path.split('/').pop(),
              parentPath: action.path.substring(0, action.path.lastIndexOf('/')) || '/'
            });
            
            if (!response.ok) {
              throw new Error(`Failed to create folder: ${response.statusText}`);
            }
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to execute action ${action.type}:`, error);
      toast({
        title: "Action Failed",
        description: error instanceof Error ? error.message : "Failed to execute action",
        variant: "destructive"
      });
      throw error; // Re-throw to stop the build process
    }
  };

  const getFileIdByPath = async (path: string): Promise<number | null> => {
    try {
      const response = await fetch(`/api/files/${projectId}`, {
        headers: { 
          'credentials': 'include'
        },
        credentials: 'include'
      });
      if (response.ok) {
        const files = await response.json();
        const file = files.find((f: any) => f.name === path.split('/').pop());
        return file?.id || null;
      }
    } catch (error) {
      console.error('Failed to get file ID:', error);
    }
    return null;
  };

  const detectBuildType = (description: string): BuildTemplate | null => {
    const lowerDesc = description.toLowerCase();
    
    for (const template of BUILD_TEMPLATES) {
      const hasKeyword = template.keywords.some(keyword => lowerDesc.includes(keyword));
      if (hasKeyword) {
        return template;
      }
    }
    
    // Default detection based on common patterns
    if (lowerDesc.includes('api') || lowerDesc.includes('backend')) {
      return BUILD_TEMPLATES.find(t => t.id === 'rest-api') || null;
    }
    if (lowerDesc.includes('portfolio') || lowerDesc.includes('website')) {
      return BUILD_TEMPLATES.find(t => t.id === 'portfolio') || null;
    }
    if (lowerDesc.includes('todo') || lowerDesc.includes('task')) {
      return BUILD_TEMPLATES.find(t => t.id === 'todo-app') || null;
    }
    
    return null;
  };

  const buildApplication = async (description: string) => {
    setIsBuilding(true);
    setBuildProgress(0);
    
    const template = detectBuildType(description);
    
    // Announce build start
    const startMessage: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: `🏗️ **Starting to build your application**\n\nI've analyzed your request and I'm building ${template ? `a ${template.name}` : 'a custom application'} for you.`,
      timestamp: new Date(),
      type: 'building',
      metadata: { 
        progress: 0,
        buildType: template?.name || 'custom',
        technology: template?.technology.join(', ') || 'custom stack'
      }
    };
    setMessages(prev => [...prev, startMessage]);

    if (template) {
      // Build from template
      const totalSteps = template.structure.folders.length + 
                       template.structure.files.length + 
                       template.structure.packages.length + 2;
      let currentStep = 0;

      // Create folders
      for (const folder of template.structure.folders) {
        currentStep++;
        const progress = Math.floor((currentStep / totalSteps) * 100);
        
        try {
          await updateProgress(`Creating folder: ${folder}`, progress);
          await executeAction({ type: 'create_folder', path: folder });
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Failed to create folder ${folder}:`, error);
          setIsBuilding(false);
          setBuildProgress(0);
          
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ **Build failed**\n\nI encountered an error while creating the folder "${folder}". Please make sure you have access to this project and try again.`,
            timestamp: new Date(),
            type: 'error'
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }
      }

      // Create files
      for (const file of template.structure.files) {
        currentStep++;
        const progress = Math.floor((currentStep / totalSteps) * 100);
        
        try {
          await updateProgress(`Creating file: ${file.path}`, progress);
          await executeAction({ type: 'create_file', path: file.path, content: file.content });
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to create file ${file.path}:`, error);
          setIsBuilding(false);
          setBuildProgress(0);
          
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ **Build failed**\n\nI encountered an error while creating the file "${file.path}". Please make sure you have access to this project and try again.`,
            timestamp: new Date(),
            type: 'error'
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }
      }

      // Install packages
      if (template.structure.packages.length > 0) {
        currentStep++;
        const progress = Math.floor((currentStep / totalSteps) * 100);
        
        try {
          await updateProgress(`Installing packages: ${template.structure.packages.join(', ')}`, progress);
          for (const pkg of template.structure.packages) {
            await executeAction({ type: 'install_package', package: pkg });
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Failed to install packages:', error);
          // Continue anyway - packages can be installed manually later
        }
      }

      // Final step
      currentStep++;
      await updateProgress('Finalizing project setup...', 100);
      
    } else {
      // Custom build using AI
      await buildCustomApplication(description);
    }

    setIsBuilding(false);
    setBuildProgress(100);
    
    const completeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✅ **Application successfully built!**\n\nI've created ${template ? `a ${template.name}` : 'your custom application'} with all the necessary files and dependencies.\n\n**What I've built:**\n${template ? 
        `- ${template.structure.folders.length} folders\n- ${template.structure.files.length} files\n- ${template.structure.packages.length} packages installed` :
        'A custom application based on your requirements'}\n\n**Next steps:**\n- Click "Run" to start your application\n- Review the files in the file explorer\n- Ask me to make any modifications you need\n\nWould you like me to explain the code or make any changes?`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, completeMessage]);
  };

  const buildCustomApplication = async (description: string) => {
    // For custom applications, use AI to determine structure
    await updateProgress('Analyzing requirements...', 10);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await updateProgress('Designing application architecture...', 30);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await updateProgress('Creating project structure...', 50);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await updateProgress('Generating code...', 70);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await updateProgress('Setting up configuration...', 90);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const updateProgress = async (task: string, progress: number) => {
    setBuildProgress(progress);
    setCurrentTask(task);
    
    const progressMessage: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: task,
      timestamp: new Date(),
      type: 'progress',
      metadata: { progress }
    };
    setMessages(prev => [...prev, progressMessage]);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    // Enhanced build detection with more patterns
    const buildKeywords = ['build', 'create', 'make', 'develop', 'generate', 'code', 'implement', 'design'];
    const projectTypes = ['app', 'application', 'website', 'site', 'api', 'project', 'tool', 'system', 'platform'];
    
    const lowerContent = content.toLowerCase();
    const wantsToBuild = buildKeywords.some(keyword => lowerContent.includes(keyword)) && 
                        projectTypes.some(type => lowerContent.includes(type));
    const wantsPlan = lowerContent.includes('plan') || lowerContent.includes('break down') || lowerContent.includes('steps');

    // Check if user wants a plan first (Plan Mode)
    if (wantsPlan && wantsToBuild) {
      await generatePlan(content);
      setIsLoading(false);
      setIsTyping(false);
      return;
    }

    if (wantsToBuild) {
      await buildApplication(content);
      setIsLoading(false);
      setIsTyping(false);
      return;
    }

    try {
      // Use Server-Sent Events (SSE) for streaming responses
      const response = await apiRequest('POST', `/api/projects/${projectId}/ai/chat`, {
        message: content,
        context: {
          projectId,
          file: selectedFile,
          code: selectedCode,
          history: messages.slice(-5),
          mode: 'agent',
          extendedThinking,
          highPowerMode,
          conversationHistory: sessions.find(s => s.id === activeSessionId)?.messages || []
        }
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      // Handle SSE streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      
      // Create assistant message that we'll update as we stream
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            try {
              const data = JSON.parse(dataStr);
              
              if (data.type === 'done') {
                // Stream complete
                break;
              } else if (data.type === 'error') {
                throw new Error(data.content || 'AI error');
              } else if (data.type === 'thinking_start') {
                // Extended thinking started
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId 
                    ? { 
                        ...m, 
                        thinking: {
                          steps: [],
                          isStreaming: true,
                          totalTokens: 0,
                          thinkingTime: 0
                        }
                      }
                    : m
                ));
              } else if (data.type === 'thinking_update') {
                // Extended thinking update
                setMessages(prev => prev.map(m => {
                  if (m.id === assistantMessageId && m.thinking) {
                    const existingStepIndex = m.thinking.steps.findIndex(s => s.id === data.stepId);
                    const newStep = {
                      id: data.stepId || Date.now().toString(),
                      type: (data.stepType || 'reasoning') as 'reasoning' | 'analysis' | 'planning',
                      title: data.title || 'Thinking...',
                      content: data.content || '',
                      status: (data.status || 'active') as 'active' | 'completed' | 'error',
                      timestamp: new Date(),
                      duration: data.duration
                    };
                    
                    const updatedSteps = existingStepIndex >= 0
                      ? m.thinking.steps.map((s, i) => i === existingStepIndex ? newStep : s)
                      : [...m.thinking.steps, newStep];
                    
                    return {
                      ...m,
                      thinking: {
                        ...m.thinking,
                        steps: updatedSteps,
                        totalTokens: data.totalTokens || m.thinking.totalTokens
                      }
                    };
                  }
                  return m;
                }));
              } else if (data.type === 'thinking_complete') {
                // Extended thinking completed
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId && m.thinking
                    ? { 
                        ...m, 
                        thinking: {
                          ...m.thinking,
                          isStreaming: false,
                          totalTokens: data.totalTokens || m.thinking.totalTokens,
                          thinkingTime: data.thinkingTime || m.thinking.thinkingTime
                        }
                      }
                    : m
                ));
              } else if (data.type === 'action_pending_approval') {
                // AI wants to execute an action - add to message with clickable button
                const actionWithId = { ...data.action, actionId: data.actionId };
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId 
                    ? { 
                        ...m, 
                        actions: [...(m.actions || []), actionWithId]
                      }
                    : m
                ));
              } else if (data.type === 'security_blocked') {
                // Security blocked an action - show error message in chat
                const securityMessage: Message = {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: data.message || `⚠️ **Security Block**: ${data.reason}\n\nThis action was blocked by Fortune 500 security controls.`,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, securityMessage]);
                
                // Show toast notification
                toast({
                  title: "Security: Action Blocked",
                  description: data.reason || "Action blocked by security controls",
                  variant: "destructive",
                  duration: 5000,
                });
              } else if (data.type === 'action_result' && data.result?.success) {
                // File was created/updated
                addProgressLog('success', `${data.action.type === 'create_file' ? 'Created' : 'Updated'} file: ${data.action.path}`);
              } else if (data.content) {
                // Add content to assistant message
                assistantContent += data.content;
                setMessages(prev => prev.map(m => 
                  m.id === assistantMessageId 
                    ? { ...m, content: assistantContent }
                    : m
                ));
              }
            } catch (e) {
              // Invalid JSON, skip
            }
          }
        }
      }

      // Message already added during streaming, no need to add again
    } catch (error) {
      console.error('AI chat error:', error);
      
      // Fallback response for demo
      const demoMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm an AI agent that can build entire applications for you! I can:

🏗️ Create complete project structures
📝 Write code across multiple files
📦 Install necessary packages
⚙️ Set up configurations
🧪 Add tests
🚀 Deploy your application

Just tell me what you want to build, like:
- "Build a todo app with React"
- "Create a REST API with authentication"
- "Make a real-time chat application"

What would you like me to build?`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, demoMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // REAL: Execute approved plan via build execution system
  const executeBuild = async (planToExecute?: any) => {
    // Use parameter if provided, otherwise fall back to state
    const plan = planToExecute || currentPlan;
    
    if (!plan || !conversationId || !planId) {
      toast({
        title: 'Cannot execute build',
        description: 'Missing plan or conversation data',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsBuilding(true);
      setBuildProgress(0);
      addProgressLog('info', `🚀 Starting build execution... (Plan ID: ${planId})`);

      // Call build execution API with full plan payload
      const response = await apiRequest('POST', `/api/agent/build/execute`, {
        projectId,
        conversationId,
        planId,
        plan: plan, // CRITICAL: Backend requires full plan object
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        
        // Handle 409 - build already running
        if (response.status === 409) {
          const buildId = errorData.buildId;
          toast({
            title: 'Build Already Running',
            description: `Another build is already in progress for this project.`,
            variant: 'destructive',
          });
          addProgressLog('warning', `Build already running (ID: ${buildId})`);
          
          // Connect to existing build stream (only mark approved if stream exists)
          if (buildId) {
            setIsPlanApproved(true);  // Mark approved since we're connecting to active build
            streamBuildProgress(buildId);
          }
          return;
        }

        throw new Error(errorData.error || 'Failed to start build');
      }

      const { buildId } = await response.json();
      
      // ✅ CRITICAL: Only mark approved AFTER backend confirms build started
      setIsPlanApproved(true);
      addProgressLog('success', `Build started (ID: ${buildId})`);

      // Stream build progress via SSE
      streamBuildProgress(buildId);

    } catch (error: any) {
      console.error('Build execution failed:', error);
      
      // ✅ CRITICAL: Reset all build state on failure so user can retry
      setIsBuilding(false);
      setIsPlanApproved(false);
      setBuildProgress(0);
      setCurrentTask('');
      
      addProgressLog('error', `Build failed: ${error.message}`);
      toast({
        title: 'Build Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Stream build progress via SSE
  const streamBuildProgress = (buildId: string) => {
    const eventSource = new EventSource(`/api/agent/build/${buildId}/stream`);
    
    let totalTasks = 0;
    let currentTaskIndex = 0;

    // Handle 'init' event - initial build state snapshot
    eventSource.addEventListener('init', (e) => {
      const data = JSON.parse(e.data);
      totalTasks = data.totalTasks || 0;
      currentTaskIndex = data.currentTaskIndex || 0;
      const progress = totalTasks > 0 ? Math.floor((currentTaskIndex / totalTasks) * 100) : 0;
      setBuildProgress(progress);
      addProgressLog('info', `Resuming build: ${currentTaskIndex}/${totalTasks} tasks completed`);
    });

    eventSource.addEventListener('start', (e) => {
      const data = JSON.parse(e.data);
      totalTasks = data.totalTasks || 0;
      addProgressLog('info', `Build started: ${totalTasks} tasks`);
    });

    eventSource.addEventListener('task_start', (e) => {
      const data = JSON.parse(e.data);
      setCurrentTask(data.title);
      currentTaskIndex = data.taskIndex || currentTaskIndex;
      
      // Calculate progress from task index
      const progress = totalTasks > 0 ? Math.floor((currentTaskIndex / totalTasks) * 100) : 0;
      setBuildProgress(progress);
      
      addProgressLog('info', `Starting task ${currentTaskIndex + 1}/${totalTasks}: ${data.title}`);
    });

    eventSource.addEventListener('task_complete', (e) => {
      const data = JSON.parse(e.data);
      currentTaskIndex = data.taskIndex !== undefined ? data.taskIndex + 1 : currentTaskIndex + 1;
      
      // Calculate progress from completed tasks
      const progress = totalTasks > 0 ? Math.floor((currentTaskIndex / totalTasks) * 100) : 0;
      setBuildProgress(progress);
      
      addProgressLog('success', `✅ Completed ${currentTaskIndex}/${totalTasks}: ${data.title}`);
    });

    eventSource.addEventListener('task_error', (e) => {
      const data = JSON.parse(e.data);
      addProgressLog('error', `❌ Failed: ${data.title} - ${data.error}`);
    });

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      setIsBuilding(false);
      setBuildProgress(100);
      setCurrentTask('');
      addProgressLog('success', `🎉 Build completed! (${data.totalTasks} tasks)`);
      toast({
        title: 'Build Complete',
        description: 'Your project is ready!',
      });
      eventSource.close();
      
      // REAL: Auto-start preview when build completes (Task 12)
      if (onBuildComplete) {
        onBuildComplete();
      }
    });

    eventSource.addEventListener('error', (e) => {
      const data = JSON.parse((e as MessageEvent).data || '{}');
      setIsBuilding(false);
      setCurrentTask('');
      addProgressLog('error', `Build error: ${data.error || 'Unknown error'}`);
      toast({
        title: 'Build Error',
        description: data.error || 'Build execution failed',
        variant: 'destructive',
      });
      eventSource.close();
    });

    eventSource.onerror = () => {
      eventSource.close();
    };
  };

  // REAL: Load plan from backend database using conversationId
  const loadPlanFromBackend = async (convId: number, pId: string) => {
    try {
      addProgressLog('info', 'Loading plan from previous session...');
      
      const response = await apiRequest('GET', `/api/agent/${convId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract the plan from conversation messages
        if (data.conversation?.messages && data.conversation.messages.length > 0) {
          const planMessage = data.conversation.messages.find((msg: any) => msg.planId === pId);
          if (planMessage && planMessage.content) {
            const plan = JSON.parse(planMessage.content);
            setCurrentPlan(plan);
            setActiveTab('autonomous'); // Show plan in autonomous tab
            
            addProgressLog('success', `Loaded plan with ${plan.tasks?.length || 0} tasks`);
            toast({
              title: 'Plan Loaded',
              description: 'Previous plan loaded from session',
            });
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to load conversation:', response.status, errorData);
        addProgressLog('warning', 'Could not restore previous plan - starting fresh');
      }
    } catch (error) {
      console.error('Failed to load plan from backend:', error);
      addProgressLog('warning', 'Could not restore previous plan - starting fresh');
    }
  };

  // Plan approval handlers for PlanApprovalModal
  const handleApprovePlan = (plan: any) => {
    // Set currentPlan state for UI sync (modal, approvals tab, progress logs)
    if (plan) {
      setCurrentPlan(plan);
    }
    
    addProgressLog('success', 'Plan approved - starting execution');
    setShowPlanApproval(false);
    setIsPlanApproved(true);
    setActiveTab('autonomous'); // Switch to autonomous tab to show progress
    
    // Execute with plan passed directly (no delay needed - avoids state race)
    executeBuild(plan);
    
    toast({
      title: 'Execution Started',
      description: `Executing plan with ${plan?.tasks?.length || 0} tasks`,
    });
  };

  const handleRejectPlan = () => {
    addProgressLog('warning', 'Plan rejected by user');
    setShowPlanApproval(false);
    setCurrentPlan(null);
    setPlanId(null);
    setIsPlanApproved(false);
    
    toast({
      title: 'Plan Rejected',
      description: 'You can generate a new plan with different requirements',
    });
  };

  // REAL: Generate execution plan from user goal using OpenAI GPT-5 streaming
  const generatePlan = async (goal: string, context?: any) => {
    try {
      setIsLoading(true);
      addProgressLog('info', `Generating execution plan for: ${goal}`);
      
      // REAL AI-POWERED PLAN GENERATION via Server-Sent Events
      // Connect to streaming endpoint for real-time plan generation using multi-provider AI
      const response = await fetch('/api/agent/plan/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          goal,
          context: context || {
            projectType: 'web-app',
            technologies: ['react', 'typescript', 'express'],
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to connect to plan generation service'}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedPlanData = null; // 🔧 Store plan locally instead of relying on state

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            // Skip empty lines and heartbeat messages
            if (!data || data.startsWith(':')) continue;
            
            try {
              const event = JSON.parse(data);
              
              if (event.type === 'chunk' && event.data) {
                // Show streaming progress
                addProgressLog('info', event.data.content || 'Generating...');
              } else if (event.type === 'plan' && event.data) {
                // 🔧 Store plan LOCALLY - React state updates are async!
                receivedPlanData = event.data;
                
                // Update React state
                setCurrentPlan(event.data);
                
                // Auto-approve if enabled, otherwise show modal
                if (autoApprovePlans) {
                  // Auto-approve: skip modal and proceed to execution
                  addProgressLog('success', `Plan auto-approved with ${event.data.tasks?.length || 0} tasks - starting execution`);
                  setTimeout(() => {
                    handleApprovePlan(event.data);
                  }, 100);
                } else {
                  // Show modal for user approval
                  setShowPlanApproval(true);
                  addProgressLog('success', `Plan generated with ${event.data.tasks?.length || 0} tasks - awaiting approval`);
                }
              } else if (event.type === 'saved' && event.data) {
                // Capture conversationId and planId for memory retention
                const { conversationId: convId, planId: pId } = event.data;
                if (convId) setConversationId(convId);
                if (pId) setPlanId(pId);
                
                // REMOVED: Legacy sessionStorage (Task 2c)
                // conversationId/planId persistence now handled via useAgentSession if needed
              } else if (event.type === 'error') {
                throw new Error(event.data?.message || 'Plan generation failed');
              } else if (event.type === 'done') {
                // Stream completed successfully
                break;
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', data, parseError);
              // Continue processing other events
            }
          }
        }
      }

      // 🔧 Use local variable instead of React state (state update is async!)
      if (receivedPlanData) {
        toast({
          title: 'Execution Plan Ready',
          description: `Review and approve the ${receivedPlanData.tasks?.length || 0} tasks to start execution.`,
        });
        return receivedPlanData;
      } else {
        throw new Error('No plan received from AI service');
      }
    } catch (error: any) {
      console.error('Plan generation error:', error);
      addProgressLog('error', 'Failed to generate plan');
      toast({
        title: 'Plan Generation Failed',
        description: error.message || 'Could not generate execution plan',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  /**
   * Adapter: Converts legacy Message to new AgentMessage format
   * Preserves all existing functionality while enabling structured rendering
   */
  const convertLegacyMessage = (message: Message): NewAgentMessage => {
    // Map legacy actions to new Action format with stable IDs
    const convertedActions: Action[] | undefined = message.actions?.map((action, idx) => ({
      id: action.actionId || `${message.id}-action-${idx}`,
      type: action.type as any,
      path: action.path,
      content: action.content,
      command: action.type === 'run_code' ? action.content : undefined,
      package: action.package,
      description: action.description || `${action.type} ${action.path || ''}`,
      status: 'pending' as const,
      timestamp: message.timestamp,
    }));

    // Map thinking steps (already compatible structure)
    const thinking = message.thinking ? {
      steps: message.thinking.steps || [],
      isStreaming: message.thinking.isStreaming || false,
      totalTokens: message.thinking.totalTokens,
      thinkingTime: message.thinking.thinkingTime,
    } : undefined;

    // Build AgentMessage
    return {
      id: message.id,
      role: message.role,
      type: (message.type as any) || 'chat',
      content: message.content,
      timestamp: message.timestamp,
      thinking,
      actions: convertedActions,
      checkpoint: message.checkpoint,
      metadata: message.metadata ? {
        tokensUsed: message.metrics?.tokensUsed,
        executionTimeMs: message.metrics?.executionTimeMs,
        ...message.metadata,
      } : undefined,
      pricing: message.pricing,
    };
  };

  /**
   * Action approval handler - preserves existing approval workflow
   */
  const handleApproveAction = async (action: Action) => {
    try {
      // Convert Action back to legacy AgentAction for executeAction
      const legacyAction: AgentAction = {
        type: action.type as any,
        path: action.path,
        content: action.content,
        package: action.package,
        description: action.description,
      };
      
      await executeAction(legacyAction);
      
      toast({
        title: "✅ Action Approved",
        description: `${action.type === 'create_file' ? 'Created' : 'Updated'} ${action.path || action.package}`,
      });
      
      // Remove action from legacy message state
      setMessages(prev => prev.map(m => {
        if (!m.actions) return m;
        const actions = m.actions;
        if (actions.some(a => a.actionId === action.id || `${m.id}-action-${actions.indexOf(a)}` === action.id)) {
          return {
            ...m,
            actions: actions.filter(a => 
              a.actionId !== action.id && `${m.id}-action-${actions.indexOf(a)}` !== action.id
            )
          };
        }
        return m;
      }));
    } catch (error: any) {
      console.error('[Approve Action] Failed:', error);
      toast({
        title: "Approval Failed",
        description: error.message || 'Could not execute action',
        variant: 'destructive'
      });
    }
  };

  /**
   * Action rejection handler
   */
  const handleRejectAction = (action: Action) => {
    // Remove action from legacy message state
    setMessages(prev => prev.map(m => {
      if (!m.actions) return m;
      const actions = m.actions;
      if (actions.some(a => a.actionId === action.id || `${m.id}-action-${actions.indexOf(a)}` === action.id)) {
        return {
          ...m,
          actions: actions.filter(a => 
            a.actionId !== action.id && `${m.id}-action-${actions.indexOf(a)}` !== action.id
          )
        };
      }
      return m;
    }));
    
    toast({
      title: "Action Rejected",
      description: `Rejected ${action.type}`,
    });
  };

  /**
   * Renders a message using the new structured MessageRenderer
   */
  const renderMessage = (message: Message) => {
    const agentMessage = convertLegacyMessage(message);
    
    return (
      <div key={message.id}>
        <MessageRenderer 
          message={agentMessage}
          onApproveAction={handleApproveAction}
          onRejectAction={handleRejectAction}
        />
        
        {/* Preserve legacy components that aren't in MessageRenderer yet */}
        {message.pricing && (
          <div className="px-4 pb-4">
            <AgentPricingDisplay 
              pricing={message.pricing}
              metrics={message.metrics}
              checkpoint={message.checkpoint}
            />
          </div>
        )}
        
        {/* Feedback Mechanism - Show after AI messages with actions */}
        {message.role === 'assistant' && ((message.actions && message.actions.length > 0) || message.completed) && (
          <div className="px-4 pb-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                const feedback = prompt('Please share your feedback about this response:');
                if (feedback) {
                  toast({
                    title: "Thank you for your feedback!",
                    description: "We'll use this to improve our AI agent.",
                  });
                }
              }}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Have feedback?
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-[var(--ecode-background)]", className)} data-testid="replit-agent-component">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ecode-border)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-[var(--ecode-text)]">AI Agent</span>
          
          {/* Session Management */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <History className="h-3 w-3" />
                {sessions.find(s => s.id === activeSessionId)?.name || 'Main Chat'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {sessions.map(session => (
                <DropdownMenuItem
                  key={session.id}
                  onClick={() => switchSession(session.id)}
                  className={cn(session.id === activeSessionId && "bg-accent")}
                >
                  {session.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={createNewSession}>
                <Plus className="h-3 w-3 mr-2" />
                New Session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {isBuilding && (
            <div className="flex items-center gap-2 text-xs text-[var(--ecode-text-secondary)]">
              {isPaused ? (
                <Pause className="h-3 w-3" />
              ) : (
                <RefreshCw className="h-3 w-3 animate-spin" />
              )}
              <span>{currentTask}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Pause/Resume Button */}
          {isBuilding && featureFlags?.aiUx?.pauseResume !== false && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="h-8 w-8 p-0"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          )}
          
          {isBuilding && (
            <div className="text-xs text-[var(--ecode-text-secondary)]">
              {buildProgress}%
            </div>
          )}
        </div>
      </div>

      {/* Tabs for Chat, Approvals, Progress, Autonomous, and Testing - Fortune 500 Security */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'progress' | 'approvals' | 'autonomous' | 'testing')} className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b bg-white dark:bg-gray-900">
          <TabsTrigger value="chat" className="flex-1" data-testid="chat-tab">Chat</TabsTrigger>
          <TabsTrigger value="approvals" className="flex-1" data-testid="approvals-tab">
            🔒 Approvals
          </TabsTrigger>
          <TabsTrigger value="autonomous" className="flex-1" data-testid="autonomous-tab">
            <Zap className="h-4 w-4 mr-1.5" />
            Autonomous
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex-1" data-testid="testing-tab">
            <BeakerIcon className="h-4 w-4 mr-1.5" />
            Testing
          </TabsTrigger>
          {featureFlags?.aiUx?.progressTab !== false && (
            <TabsTrigger value="progress" className="flex-1" data-testid="progress-tab">Progress</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="chat" className="flex flex-1 flex-col overflow-hidden m-0">
          <ScrollArea className="flex-1">
            <div className="py-4" role="log" aria-live="polite" aria-relevant="additions">
          {messages.length === 0 ? (
            <div className="px-4 py-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm text-[var(--ecode-text)]">
                  Hi! I'm your AI coding assistant. I can help you:
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 ml-10">
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => setInput(action.label)}
                    className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-[var(--ecode-surface-secondary)] hover:bg-[var(--ecode-surface-hover)] transition-colors text-left"
                  >
                    <action.icon className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)]" />
                    <span className="text-[var(--ecode-text)]">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(renderMessage)}
              {isTyping && (
                <div className="flex gap-3 px-4 py-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-[var(--ecode-text-secondary)] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-[var(--ecode-text-secondary)] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-[var(--ecode-text-secondary)] rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
            </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </TabsContent>
      
      {/* Approvals Tab - Fortune 500 Security */}
      <TabsContent value="approvals" className="flex flex-1 flex-col overflow-hidden m-0" data-testid="approvals-content">
        <ScrollArea className="flex-1">
          <div className="p-4">
            <PendingApprovalsPanel 
              projectId={projectId}
              onActionApproved={() => {
                // Refresh messages to clear completed actions
                toast({
                  title: "Action Completed",
                  description: "The approved action has been executed.",
                });
              }}
              onActionRejected={() => {
                toast({
                  title: "Action Rejected",
                  description: "The action has been rejected.",
                });
              }}
            />
          </div>
        </ScrollArea>
      </TabsContent>

      {/* Autonomous Mode Tab - Phase 1 Feature */}
      <TabsContent value="autonomous" className="flex flex-1 flex-col overflow-hidden m-0" data-testid="autonomous-content">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <AutonomousControls
              sessionId={activeSessionId}
              onModeChange={(enabled) => {
                setAutonomousModeEnabled(enabled);
                if (enabled) {
                  addProgressLog('info', '🤖 Autonomous mode enabled - AI will work independently');
                } else {
                  addProgressLog('info', '👤 Autonomous mode disabled - manual approval required');
                }
              }}
            />
            
            {currentPlan && (
              <PlanVisualizer
                plan={currentPlan}
                onTaskClick={(taskId) => {
                  // Task clicked - could scroll to task or show details
                }}
                onApprove={() => {
                  // REAL: Execute build via backend build execution system
                  executeBuild();
                }}
                onReject={() => {
                  toast({
                    title: 'Plan Rejected',
                    description: 'Plan cancelled',
                  });
                  setCurrentPlan(null);
                  setPlanId(null);
                }}
              />
            )}
            
            {!currentPlan && (
              <div className="text-center text-muted-foreground py-12">
                <Zap className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-2">
                  {autonomousModeEnabled ? 'No Active Plan' : 'Autonomous Mode'}
                </h3>
                <p className="text-sm max-w-md mx-auto mb-4">
                  {autonomousModeEnabled 
                    ? 'Generate an execution plan to see task breakdown, dependencies, and risk assessment.'
                    : 'Enable autonomous mode to let AI work independently with smart risk-based approval. Configure your risk threshold above to control how much autonomy to grant.'}
                </p>
                <Button
                  onClick={async () => {
                    const goal = prompt('What would you like to build or accomplish?');
                    if (goal) {
                      await generatePlan(goal);
                    }
                  }}
                  data-testid="button-generate-plan"
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate Plan
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* Testing Tab - Phase 2 Feature */}
      <TabsContent value="testing" className="flex flex-1 flex-col overflow-hidden m-0" data-testid="testing-content">
        <div className="flex-1 overflow-auto p-4">
          <TestingToolsPanel 
            sessionId={activeSessionId}
            projectId={String(projectId)}
          />
        </div>
      </TabsContent>

      {/* Progress Tab */}
      {featureFlags?.aiUx?.progressTab !== false && (
        <TabsContent value="progress" className="flex flex-1 flex-col overflow-hidden m-0">
          <ScrollArea className="flex-1">
            <div className="p-4">
              {progressLogs.length === 0 ? (
                <div className="text-center text-[var(--ecode-text-secondary)] py-8">
                  <FileTerminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No progress logs yet</p>
                  <p className="text-xs mt-2">Actions will appear here as the agent works</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {progressLogs.map(log => (
                    <div key={log.id} className="flex items-start gap-2 text-sm">
                      <div className={cn(
                        "mt-1 h-2 w-2 rounded-full",
                        log.type === 'info' && "bg-blue-500",
                        log.type === 'success' && "bg-green-500",
                        log.type === 'warning' && "bg-yellow-500",
                        log.type === 'error' && "bg-red-500"
                      )} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--ecode-text)]">{log.message}</span>
                          {log.file && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => {
                                // Navigate to file
                                if (selectedFile !== log.file) {
                                  // This would trigger file selection in the parent component
                                  toast({ title: `Opening ${log.file}` });
                                }
                              }}
                            >
                              <ChevronRight className="h-3 w-3" />
                              {log.file}
                            </Button>
                          )}
                        </div>
                        <span className="text-xs text-[var(--ecode-text-tertiary)]">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      )}
    </Tabs>

    {/* Enhanced Input area */}
    <div className="p-4 border-t border-[var(--ecode-border)]">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {/* AI Model Selector - Compact inline like Replit */}
        <div className="text-xs text-[var(--ecode-text-secondary)]">AI Model:</div>
        <div className="flex-shrink-0">
          <AIModelSelector
            variant="inline"
            className="w-auto"
            onModelChange={handleModelChange}
          />
        </div>

        {/* Agent Tools Menu - Extended Thinking, High Power Mode */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Settings className="h-3 w-3 mr-1" />
              Agent Tools
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <div className="p-3 space-y-4">
              <div className="text-xs font-semibold text-[var(--ecode-text)]">Agent Tools</div>
              
              {featureFlags?.aiUx?.extendedThinking !== false && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Extended Thinking</div>
                    <div className="text-xs text-muted-foreground">Agent thinks longer for complex tasks</div>
                  </div>
                  <Switch
                    checked={extendedThinking}
                    onCheckedChange={(checked) => {
                      setExtendedThinking(checked);
                      savePreferences({ extendedThinking: checked });
                    }}
                  />
                </div>
              )}
              
              {featureFlags?.aiUx?.highPowerMode !== false && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">High Power Model</div>
                    <div className="text-xs text-muted-foreground">Uses advanced model, higher cost</div>
                  </div>
                  <Switch
                    checked={highPowerMode}
                    onCheckedChange={(checked) => {
                      setHighPowerMode(checked);
                      savePreferences({ highPowerMode: checked });
                    }}
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Auto-checkpoints</div>
                  <div className="text-xs text-muted-foreground">Automatic save points during builds</div>
                </div>
                <Switch
                  checked={autoCheckpoints}
                  onCheckedChange={(checked) => {
                    setAutoCheckpoints(checked);
                    savePreferences({ autoCheckpoints: checked });
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Auto-approve Plans</div>
                  <div className="text-xs text-muted-foreground">Skip approval modal for faster builds</div>
                </div>
                <Switch
                  checked={autoApprovePlans}
                  onCheckedChange={(checked) => {
                    setAutoApprovePlans(checked);
                    savePreferences({ autoApprovePlans: checked });
                  }}
                  data-testid="switch-auto-approve-plans"
                />
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex gap-2 mb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                  >
                    <Link className="h-3 w-3 mr-1" />
                    Import
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={handleWebImport}>
                    <Globe className="h-4 w-4 mr-2" />
                    Web Content
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => navigate(`/projects/${projectId}/import/figma`)}
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Figma Design
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate(`/projects/${projectId}/import/bolt`)}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Bolt Project
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate(`/projects/${projectId}/import/lovable`)}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Lovable App
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent>Import content from a URL</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScreenshotCapture}
                disabled={isLoading}
              >
                <Camera className="h-3 w-3 mr-1" />
                Screenshot
              </Button>
            </TooltipTrigger>
            <TooltipContent>Capture screenshot of a webpage</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {featureFlags?.aiUx?.improvePrompt !== false && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleImprovePrompt}
                  disabled={isLoading || !input.trim()}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Improve Prompt
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI-enhance your prompt for better results</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      <div className="relative">
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            extendedThinking 
              ? "Ask me to think deeply about complex problems..." 
              : highPowerMode
              ? "I'm in high power mode - ready for intensive tasks..."
              : "Ask me anything about your code..."
          }
          className="min-h-[44px] max-h-[150px] pr-12 pb-7 resize-none bg-[var(--ecode-surface-secondary)] border-[var(--ecode-border)] text-[var(--ecode-text)] placeholder:text-[var(--ecode-text-tertiary)]"
          disabled={isLoading}
          data-testid="agent-input"
          aria-label="Chat input"
        />
        {/* Keyboard shortcut hint - positioned to avoid text overlap */}
        {!input.trim() && !isLoading && (
          <div className="absolute left-3 bottom-2 text-xs text-[var(--ecode-text-tertiary)] pointer-events-none">
            <kbd className="px-1.5 py-0.5 bg-[var(--ecode-surface)] border border-[var(--ecode-border)] rounded text-[10px]">Enter</kbd> to send • <kbd className="px-1.5 py-0.5 bg-[var(--ecode-surface)] border border-[var(--ecode-border)] rounded text-[10px]">Shift+Enter</kbd> for new line
          </div>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className={cn(
                  "absolute right-2 bottom-2 h-8 w-8 transition-all",
                  isLoading 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
                )}
                data-testid="send-button"
                aria-label={isLoading ? "Processing message" : input.trim() ? "Send message" : "Type a message to send"}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isLoading ? "Processing..." : input.trim() ? "Send message (Enter)" : "Type a message first"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>

    {/* Plan Approval Modal - Shows after plan generation for user review */}
    <PlanApprovalModal
      open={showPlanApproval}
      plan={currentPlan}
      onApprove={handleApprovePlan}
      onReject={handleRejectPlan}
      onOpenChange={setShowPlanApproval}
    />
  </div>
  );
}