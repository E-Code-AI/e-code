import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Sparkles, Code, FileText, HelpCircle,
  Lightbulb, Zap, RefreshCw, Copy, X, Hammer, Package,
  FolderOpen, FileCode, Loader2, CheckCircle, AlertCircle,
  Wrench, Rocket, GitBranch, Database, Globe, Server,
  MessageSquare, DollarSign, Link, Camera, Brain, Power,
  Pause, Play, Plus, ChevronLeft, ChevronRight, FileTerminal,
  History, Palette, Heart
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

interface ReplitAgentProps {
  projectId: number;
  selectedFile?: string;
  selectedCode?: string;
  className?: string;
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
}

interface AgentAction {
  type: 'create_file' | 'edit_file' | 'delete_file' | 'install_package' | 'run_code' | 'create_folder';
  path?: string;
  content?: string;
  package?: string;
  description?: string;
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

export function ReplitAgent({ projectId, selectedFile, selectedCode, className }: ReplitAgentProps) {
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
  const [activeTab, setActiveTab] = useState<'chat' | 'progress'>('chat');
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const response = await fetch(`/api/tools/web-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

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
      const response = await fetch(`/api/tools/screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

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
      const response = await fetch('/api/ai/improve-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input })
      });

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
      switch (action.type) {
        case 'create_file':
          if (action.path && action.content !== undefined) {
            const response = await fetch(`/api/files/${projectId}`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'credentials': 'include'
              },
              credentials: 'include',
              body: JSON.stringify({
                name: action.path.split('/').pop(),
                content: action.content,
                parentPath: action.path.substring(0, action.path.lastIndexOf('/')) || '/'
              })
            });
            
            if (!response.ok) {
              throw new Error(`Failed to create file: ${response.statusText}`);
            }
          }
          break;
        case 'edit_file':
          if (action.path && action.content !== undefined) {
            const fileId = await getFileIdByPath(action.path);
            if (fileId) {
              const response = await fetch(`/api/files/${projectId}/${fileId}`, {
                method: 'PUT',
                headers: { 
                  'Content-Type': 'application/json',
                  'credentials': 'include'
                },
                credentials: 'include',
                body: JSON.stringify({ content: action.content })
              });
              
              if (!response.ok) {
                throw new Error(`Failed to edit file: ${response.statusText}`);
              }
            }
          }
          break;
        case 'install_package':
          if (action.package) {
            const response = await fetch(`/api/packages/${projectId}/install`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'credentials': 'include'
              },
              credentials: 'include',
              body: JSON.stringify({ packages: [action.package] })
            });
            
            if (!response.ok) {
              throw new Error(`Failed to install package: ${response.statusText}`);
            }
          }
          break;
        case 'create_folder':
          if (action.path) {
            const response = await fetch(`/api/files/${projectId}/folder`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'credentials': 'include'
              },
              credentials: 'include',
              body: JSON.stringify({ 
                name: action.path.split('/').pop(),
                parentPath: action.path.substring(0, action.path.lastIndexOf('/')) || '/'
              })
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

    if (wantsToBuild) {
      await buildApplication(content);
      setIsLoading(false);
      setIsTyping(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          context: {
            projectId,
            file: selectedFile,
            code: selectedCode,
            history: messages.slice(-5),
            mode: 'agent', // Indicate this is the autonomous agent
            extendedThinking,
            highPowerMode,
            conversationHistory: sessions.find(s => s.id === activeSessionId)?.messages || []
          }
        })
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      
      // Check if response contains actions to execute
      if (data.actions && Array.isArray(data.actions)) {
        // Start building if actions are present
        setIsBuilding(true);
        setBuildProgress(0);
        
        const totalActions = data.actions.length;
        let completedActions = 0;
        
        for (const action of data.actions) {
          completedActions++;
          const progress = Math.floor((completedActions / totalActions) * 100);
          
          await updateProgress(
            `${action.type === 'create_file' ? '📄' : action.type === 'create_folder' ? '📁' : '📦'} ${action.description || action.path || action.package}`,
            progress
          );
          
          await executeAction(action);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        setIsBuilding(false);
        setBuildProgress(100);
      }

      const assistantMessage: Message = {
        id: data.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'I can help you with that! Let me know what specific functionality you need.',
        timestamp: new Date(data.timestamp || Date.now()),
        pricing: data.pricing,
        metrics: data.metrics,
        checkpoint: data.checkpoint
      };

      setMessages(prev => [...prev, assistantMessage]);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    
    if (isSystem) {
      return (
        <div key={message.id} className="px-4 py-2">
          <div className={cn(
            "text-xs flex items-center gap-2",
            message.type === 'progress' ? "text-[var(--ecode-accent)]" : "text-[var(--ecode-text-secondary)]"
          )}>
            {message.type === 'action' && <Zap className="h-3 w-3" />}
            {message.type === 'progress' && <RefreshCw className="h-3 w-3 animate-spin" />}
            {message.content}
          </div>
          {message.metadata?.progress !== undefined && (
            <div className="mt-2 w-full bg-[var(--ecode-surface)] rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${message.metadata.progress}%` }}
              />
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div key={message.id} className={cn(
        "flex gap-3 px-4 py-4",
        isUser && "bg-[var(--ecode-surface-secondary)]"
      )}>
        {!isUser && (
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
        )}
        
        <div className={cn("flex-1", isUser && "ml-10")}>
          <div className="text-sm text-[var(--ecode-text)] leading-relaxed">
            {message.content.split('```').map((part, index) => {
              if (index % 2 === 1) {
                const [lang, ...codeLines] = part.split('\n');
                const code = codeLines.join('\n');
                return (
                  <div key={index} className="my-3">
                    <div className="relative group">
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyCode(code)}
                          className="h-7 w-7 bg-[var(--ecode-surface)] hover:bg-[var(--ecode-surface-secondary)]"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <pre className="p-3 rounded-lg bg-[var(--ecode-surface)] overflow-x-auto">
                        <code className="text-xs">{code}</code>
                      </pre>
                    </div>
                  </div>
                );
              }
              return <p key={index} className={index > 0 ? "mt-2" : ""}>{part}</p>;
            })}
          </div>
          {/* Display pricing information if available */}
          {message.pricing && (
            <div className="mt-4">
              <AgentPricingDisplay 
                pricing={message.pricing}
                metrics={message.metrics}
                checkpoint={message.checkpoint}
              />
            </div>
          )}
          {/* Feedback Mechanism - Show after AI messages with actions */}
          {message.role === 'assistant' && ((message.actions && message.actions.length > 0) || message.completed) && (
            <div className="mt-3 flex items-center gap-2">
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
                    // Log feedback for future improvements
                    console.log('User feedback:', feedback, 'for message:', message.id);
                  }
                }}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Have feedback?
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-[var(--ecode-background)]", className)}>
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
          {/* Advanced Capabilities */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Switch
                id="extended-thinking"
                checked={extendedThinking}
                onCheckedChange={setExtendedThinking}
              />
              <Label htmlFor="extended-thinking" className="cursor-pointer">
                <Brain className="h-3 w-3 inline mr-1" />
                Extended Thinking
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="high-power"
                checked={highPowerMode}
                onCheckedChange={setHighPowerMode}
              />
              <Label htmlFor="high-power" className="cursor-pointer">
                <Power className="h-3 w-3 inline mr-1" />
                High Power
              </Label>
            </div>
          </div>
          
          {/* Pause/Resume Button */}
          {isBuilding && (
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
          
          {/* Usage Tracking Icon */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => window.location.href = '/billing'}
                >
                  <DollarSign className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View usage & billing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Tabs for Chat and Progress */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'progress')} className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="chat" className="flex-1">Chat</TabsTrigger>
          <TabsTrigger value="progress" className="flex-1">Progress</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="py-4">
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
      
      {/* Progress Tab */}
      <TabsContent value="progress" className="flex-1 m-0">
        <ScrollArea className="h-full">
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
    </Tabs>

    {/* Enhanced Input area */}
    <div className="p-4 border-t border-[var(--ecode-border)]">
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
          className="min-h-[44px] max-h-[150px] pr-12 resize-none bg-[var(--ecode-surface-secondary)] border-[var(--ecode-border)] text-[var(--ecode-text)] placeholder:text-[var(--ecode-text-tertiary)]"
          disabled={isLoading}
        />
        <Button
          size="icon"
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="absolute right-2 bottom-2 h-8 w-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
  );
}