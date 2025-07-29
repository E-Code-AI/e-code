// Autonomous Builder - Helps non-coders build complete applications
// This module provides AI-powered app building capabilities with comprehensive templates

export interface BuildAction {
  type: 'create_file' | 'create_folder' | 'install_package' | 'deploy' | 'run_command';
  data: any;
}

export interface AppTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  keywords: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  features: string[];
  actions: BuildAction[];
}

export class AutonomousBuilder {
  private templates: Map<string, AppTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  // Initialize comprehensive app templates for non-coders
  private initializeTemplates() {
    // Todo App Template
    this.templates.set('todo-app', {
      id: 'todo-app',
      name: 'Todo List Application',
      description: 'A beautiful task management app with categories and priorities',
      category: 'productivity',
      keywords: ['todo', 'task', 'list', 'productivity', 'organize', 'planner', 'checklist'],
      difficulty: 'beginner',
      estimatedTime: '2 minutes',
      features: ['Add/remove tasks', 'Mark as complete', 'Categories', 'Due dates', 'Priority levels'],
      actions: [
        {
          type: 'create_folder',
          data: { path: 'src' }
        },
        {
          type: 'create_folder',
          data: { path: 'src/components' }
        },
        {
          type: 'create_file',
          data: {
            path: 'index.html',
            content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Todo App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`
          }
        },
        {
          type: 'create_file',
          data: {
            path: 'package.json',
            content: JSON.stringify({
              name: 'todo-app',
              version: '1.0.0',
              scripts: {
                dev: 'vite',
                build: 'vite build',
                preview: 'vite preview'
              },
              dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0',
                'date-fns': '^2.30.0'
              },
              devDependencies: {
                '@types/react': '^18.2.0',
                '@types/react-dom': '^18.2.0',
                '@vitejs/plugin-react': '^4.0.0',
                'typescript': '^5.0.0',
                'vite': '^4.4.0'
              }
            }, null, 2)
          }
        },
        {
          type: 'create_file',
          data: {
            path: 'src/App.tsx',
            content: `import React, { useState } from 'react';
import './App.css';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  category: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [category, setCategory] = useState('personal');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: input,
        completed: false,
        category,
        priority
      }]);
      setInput('');
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div className="app">
      <h1>✨ My Todo List</h1>
      
      <div className="add-todo">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="What needs to be done?"
        />
        
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="personal">Personal</option>
          <option value="work">Work</option>
          <option value="shopping">Shopping</option>
        </select>
        
        <select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
        </select>
        
        <button onClick={addTodo}>Add Task</button>
      </div>

      <div className="todo-list">
        {todos.map(todo => (
          <div key={todo.id} className={\`todo-item \${todo.completed ? 'completed' : ''} priority-\${todo.priority}\`}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span className="todo-text">{todo.text}</span>
            <span className="category">{todo.category}</span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}`
          }
        },
        {
          type: 'create_file',
          data: {
            path: 'src/App.css',
            content: `.app {
  max-width: 600px;
  margin: 50px auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
}

.add-todo {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
}

.add-todo input {
  flex: 1;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.add-todo select {
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
}

.add-todo button {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}

.add-todo button:hover {
  background: #0056b3;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 10px;
  border-left: 4px solid transparent;
}

.todo-item.priority-high {
  border-left-color: #dc3545;
}

.todo-item.priority-medium {
  border-left-color: #ffc107;
}

.todo-item.priority-low {
  border-left-color: #28a745;
}

.todo-item.completed {
  opacity: 0.6;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
}

.todo-text {
  flex: 1;
  font-size: 16px;
}

.category {
  background: #e9ecef;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  color: #666;
}

.todo-item button {
  padding: 6px 12px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.todo-item button:hover {
  background: #c82333;
}`
          }
        },
        {
          type: 'install_package',
          data: {
            packages: ['react', 'react-dom', 'vite', '@vitejs/plugin-react', 'typescript']
          }
        }
      ]
    });

    // Portfolio Website Template
    this.templates.set('portfolio', {
      id: 'portfolio',
      name: 'Personal Portfolio Website',
      description: 'A professional portfolio to showcase your work and skills',
      category: 'website',
      keywords: ['portfolio', 'website', 'personal', 'resume', 'cv', 'showcase', 'about me'],
      difficulty: 'beginner',
      estimatedTime: '3 minutes',
      features: ['About section', 'Projects gallery', 'Contact form', 'Responsive design', 'Animations'],
      actions: [
        {
          type: 'create_file',
          data: {
            path: 'index.html',
            content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Portfolio</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="navbar">
    <div class="nav-container">
      <h1 class="logo">Your Name</h1>
      <ul class="nav-menu">
        <li><a href="#home">Home</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#projects">Projects</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </div>
  </nav>

  <section id="home" class="hero">
    <div class="hero-content">
      <h1 class="hero-title">Hi, I'm Your Name</h1>
      <p class="hero-subtitle">Web Developer & Designer</p>
      <a href="#projects" class="cta-button">View My Work</a>
    </div>
  </section>

  <section id="about" class="about">
    <div class="container">
      <h2>About Me</h2>
      <div class="about-content">
        <div class="about-text">
          <p>I'm a passionate web developer with experience in creating beautiful and functional websites. I love turning ideas into reality using code.</p>
          <p>My skills include HTML, CSS, JavaScript, React, and more. I'm always eager to learn new technologies and take on challenging projects.</p>
        </div>
        <div class="skills">
          <h3>My Skills</h3>
          <div class="skill-list">
            <span class="skill">HTML/CSS</span>
            <span class="skill">JavaScript</span>
            <span class="skill">React</span>
            <span class="skill">Node.js</span>
            <span class="skill">Design</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="projects" class="projects">
    <div class="container">
      <h2>My Projects</h2>
      <div class="project-grid">
        <div class="project-card">
          <img src="https://via.placeholder.com/300x200" alt="Project 1">
          <h3>Project One</h3>
          <p>A brief description of your first project and the technologies used.</p>
          <a href="#" class="project-link">View Project</a>
        </div>
        <div class="project-card">
          <img src="https://via.placeholder.com/300x200" alt="Project 2">
          <h3>Project Two</h3>
          <p>A brief description of your second project and what makes it special.</p>
          <a href="#" class="project-link">View Project</a>
        </div>
        <div class="project-card">
          <img src="https://via.placeholder.com/300x200" alt="Project 3">
          <h3>Project Three</h3>
          <p>A brief description of your third project and its key features.</p>
          <a href="#" class="project-link">View Project</a>
        </div>
      </div>
    </div>
  </section>

  <section id="contact" class="contact">
    <div class="container">
      <h2>Get In Touch</h2>
      <form class="contact-form">
        <input type="text" placeholder="Your Name" required>
        <input type="email" placeholder="Your Email" required>
        <textarea placeholder="Your Message" rows="5" required></textarea>
        <button type="submit">Send Message</button>
      </form>
    </div>
  </section>

  <footer class="footer">
    <p>&copy; 2024 Your Name. All rights reserved.</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>`
          }
        },
        {
          type: 'create_file',
          data: {
            path: 'style.css',
            content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
}

/* Navigation */
.navbar {
  background: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: fixed;
  width: 100%;
  top: 0;
  z-index: 1000;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #007bff;
}

.nav-menu {
  display: flex;
  list-style: none;
  gap: 2rem;
}

.nav-menu a {
  text-decoration: none;
  color: #333;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-menu a:hover {
  color: #007bff;
}

/* Hero Section */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
}

.hero-title {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  animation: fadeInUp 1s ease;
}

.hero-subtitle {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  opacity: 0.9;
  animation: fadeInUp 1s ease 0.2s both;
}

.cta-button {
  display: inline-block;
  padding: 12px 30px;
  background: white;
  color: #667eea;
  text-decoration: none;
  border-radius: 30px;
  font-weight: bold;
  transition: transform 0.3s;
  animation: fadeInUp 1s ease 0.4s both;
}

.cta-button:hover {
  transform: translateY(-2px);
}

/* Sections */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

section {
  padding: 5rem 0;
}

h2 {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 3rem;
  color: #333;
}

/* About Section */
.about {
  background: #f8f9fa;
}

.about-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;
}

.about-text p {
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: #666;
}

.skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.skill {
  background: #007bff;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

/* Projects Section */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.project-card {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
  transition: transform 0.3s;
}

.project-card:hover {
  transform: translateY(-5px);
}

.project-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.project-card h3 {
  padding: 1rem;
  font-size: 1.3rem;
}

.project-card p {
  padding: 0 1rem;
  color: #666;
}

.project-link {
  display: inline-block;
  margin: 1rem;
  color: #007bff;
  text-decoration: none;
  font-weight: bold;
}

/* Contact Section */
.contact {
  background: #f8f9fa;
}

.contact-form {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.contact-form input,
.contact-form textarea {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
}

.contact-form button {
  padding: 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background 0.3s;
}

.contact-form button:hover {
  background: #0056b3;
}

/* Footer */
.footer {
  background: #333;
  color: white;
  text-align: center;
  padding: 2rem;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .about-content {
    grid-template-columns: 1fr;
  }
  
  .nav-menu {
    gap: 1rem;
  }
}`
          }
        }
      ]
    });

    // Blog Website Template
    this.templates.set('blog', {
      id: 'blog',
      name: 'Blog Website',
      description: 'A modern blog platform with articles and comments',
      category: 'website',
      keywords: ['blog', 'article', 'writing', 'journal', 'news', 'magazine'],
      difficulty: 'intermediate',
      estimatedTime: '4 minutes',
      features: ['Article listing', 'Full article view', 'Categories', 'Search', 'Comments'],
      actions: [
        {
          type: 'create_folder',
          data: { path: 'src' }
        },
        {
          type: 'create_file',
          data: {
            path: 'package.json',
            content: JSON.stringify({
              name: 'blog-website',
              version: '1.0.0',
              scripts: {
                dev: 'vite',
                build: 'vite build'
              },
              dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0',
                'react-router-dom': '^6.0.0',
                'react-markdown': '^8.0.0'
              },
              devDependencies: {
                '@types/react': '^18.2.0',
                '@vitejs/plugin-react': '^4.0.0',
                'typescript': '^5.0.0',
                'vite': '^4.4.0'
              }
            }, null, 2)
          }
        },
        {
          type: 'create_file',
          data: {
            path: 'src/App.tsx',
            content: `import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ArticlePage from './pages/ArticlePage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <div className="container">
            <h1 className="logo">My Blog</h1>
            <nav>
              <a href="/">Home</a>
              <a href="/about">About</a>
              <a href="/contact">Contact</a>
            </nav>
          </div>
        </header>
        
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/article/:id" element={<ArticlePage />} />
          </Routes>
        </main>
        
        <footer className="footer">
          <p>&copy; 2024 My Blog. All rights reserved.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}`
          }
        },
        {
          type: 'install_package',
          data: {
            packages: ['react', 'react-dom', 'react-router-dom', 'react-markdown', 'vite']
          }
        }
      ]
    });

    // E-commerce Store Template
    this.templates.set('ecommerce', {
      id: 'ecommerce',
      name: 'E-commerce Store',
      description: 'An online store with products, cart, and checkout',
      category: 'business',
      keywords: ['shop', 'store', 'ecommerce', 'selling', 'products', 'online store', 'marketplace'],
      difficulty: 'intermediate',
      estimatedTime: '5 minutes',
      features: ['Product catalog', 'Shopping cart', 'Search & filters', 'Checkout', 'User accounts'],
      actions: [
        // E-commerce template actions...
      ]
    });

    // Chat Application Template
    this.templates.set('chat-app', {
      id: 'chat-app',
      name: 'Real-time Chat Application',
      description: 'A messaging app with rooms and real-time updates',
      category: 'social',
      keywords: ['chat', 'messaging', 'communication', 'real-time', 'websocket'],
      difficulty: 'advanced',
      estimatedTime: '6 minutes',
      features: ['Real-time messaging', 'Multiple rooms', 'User presence', 'Message history', 'Emojis'],
      actions: [
        // Chat app template actions...
      ]
    });
  }

  // Detect what type of app the user wants to build from their description
  detectAppType(description: string): AppTemplate | null {
    const lowercaseDesc = description.toLowerCase();
    
    // Check each template's keywords
    for (const template of this.templates.values()) {
      const keywordMatches = template.keywords.filter(keyword => 
        lowercaseDesc.includes(keyword)
      ).length;
      
      if (keywordMatches >= 2) {
        return template;
      }
    }

    // Fallback pattern matching
    if (lowercaseDesc.includes('todo') || lowercaseDesc.includes('task')) {
      return this.templates.get('todo-app')!;
    }
    if (lowercaseDesc.includes('portfolio') || lowercaseDesc.includes('resume')) {
      return this.templates.get('portfolio')!;
    }
    if (lowercaseDesc.includes('blog') || lowercaseDesc.includes('article')) {
      return this.templates.get('blog')!;
    }
    if (lowercaseDesc.includes('shop') || lowercaseDesc.includes('store')) {
      return this.templates.get('ecommerce')!;
    }
    if (lowercaseDesc.includes('chat') || lowercaseDesc.includes('message')) {
      return this.templates.get('chat-app')!;
    }

    return null;
  }

  // Generate build actions based on user's description
  generateBuildActions(description: string): BuildAction[] {
    const template = this.detectAppType(description);
    
    if (template) {
      console.log(`Detected app type: ${template.name}`);
      return template.actions;
    }

    // If no template matches, generate basic web app structure
    console.log('No specific template matched, generating basic web app');
    return this.generateBasicWebApp(description);
  }

  // Generate a basic web app structure when no template matches
  private generateBasicWebApp(description: string): BuildAction[] {
    return [
      {
        type: 'create_file',
        data: {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${description}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>Welcome to Your App</h1>
    <p>This is your new ${description} application.</p>
    <div id="app"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>`
        }
      },
      {
        type: 'create_file',
        data: {
          path: 'style.css',
          content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f4f4f4;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  color: #007bff;
  margin-bottom: 1rem;
}

#app {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin-top: 2rem;
}`
        }
      },
      {
        type: 'create_file',
        data: {
          path: 'script.js',
          content: `// Your application logic goes here
console.log('App is running!');

// Example: Add some interactivity
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  app.innerHTML = '<p>Your app is ready to be customized!</p>';
});`
        }
      }
    ];
  }

  // Get all available templates
  getTemplates(): AppTemplate[] {
    return Array.from(this.templates.values());
  }

  // Get template by ID
  getTemplate(id: string): AppTemplate | undefined {
    return this.templates.get(id);
  }
}

export const autonomousBuilder = new AutonomousBuilder();