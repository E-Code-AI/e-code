export const API_BASE_URL = process.env.ECODE_API_URL || 'https://api.e-code.com';
export const WEB_BASE_URL = process.env.ECODE_WEB_URL || 'https://e-code.com';
export const WS_BASE_URL = process.env.ECODE_WS_URL || 'wss://api.e-code.com';

export const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'cpp',
  'c',
  'csharp',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'scala',
  'r',
  'julia',
  'dart',
  'elixir',
  'clojure',
  'haskell'
];

export const TEMPLATES = [
  { id: 'html-css-js', name: 'HTML/CSS/JS', language: 'javascript' },
  { id: 'react', name: 'React', language: 'javascript' },
  { id: 'vue', name: 'Vue.js', language: 'javascript' },
  { id: 'angular', name: 'Angular', language: 'typescript' },
  { id: 'svelte', name: 'Svelte', language: 'javascript' },
  { id: 'nextjs', name: 'Next.js', language: 'javascript' },
  { id: 'express', name: 'Express API', language: 'javascript' },
  { id: 'fastapi', name: 'FastAPI', language: 'python' },
  { id: 'django', name: 'Django', language: 'python' },
  { id: 'flask', name: 'Flask', language: 'python' },
  { id: 'rails', name: 'Ruby on Rails', language: 'ruby' },
  { id: 'spring', name: 'Spring Boot', language: 'java' },
  { id: 'gin', name: 'Gin', language: 'go' },
  { id: 'actix', name: 'Actix Web', language: 'rust' }
];

export const DEPLOYMENT_TYPES = [
  { id: 'static', name: 'Static Hosting', description: 'For static websites and SPAs' },
  { id: 'autoscale', name: 'Autoscale', description: 'Automatically scales with traffic' },
  { id: 'reserved-vm', name: 'Reserved VM', description: 'Dedicated virtual machine' },
  { id: 'serverless', name: 'Serverless', description: 'Event-driven functions' },
  { id: 'scheduled', name: 'Scheduled Jobs', description: 'Cron-like scheduled tasks' }
];