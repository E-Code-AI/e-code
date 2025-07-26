import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface DemoStep {
  id: string;
  title: string;
  duration: number;
  code: string[];
  terminal: string[];
  preview: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'ai-prompt',
    title: 'AI understands your idea',
    duration: 2000,
    code: [
      '// E-Code AI Agent is analyzing your request:',
      '// "Build a todo app with dark mode and categories"',
      '',
      '// 🤖 AI Planning:',
      '// - React components with hooks',
      '// - Dark mode toggle',
      '// - Category filtering',
      '// - Local storage persistence',
      '',
      '// Starting code generation...'
    ],
    terminal: [
      '🤖 E-Code AI Agent: Analyzing request...',
      '✓ Identified: Todo application',
      '✓ Features: Dark mode, categories, persistence',
      '✓ Generating project structure...',
      '✓ Creating optimal component architecture...'
    ],
    preview: '<div class="p-4 bg-gray-100"><div class="animate-pulse"><div class="h-6 bg-gray-300 rounded mb-4 w-32"></div><div class="h-4 bg-gray-300 rounded mb-2"></div><div class="h-4 bg-gray-300 rounded w-3/4"></div></div></div>'
  },
  {
    id: 'start',
    title: 'AI generates the foundation',
    duration: 2000,
    code: [
      '// E-Code AI Agent is building your app',
      '',
      'import React, { useState, useEffect } from \'react\';',
      'import { Moon, Sun, Plus, Filter } from \'lucide-react\';',
      '',
      'function TodoApp() {',
      '  const [todos, setTodos] = useState([]);',
      '  const [darkMode, setDarkMode] = useState(false);',
      '  const [category, setCategory] = useState(\'all\');'
    ],
    terminal: [
      '🤖 E-Code AI Agent: Analyzing request...',
      '✓ Identified: Todo application',
      '✓ Features: Dark mode, categories, persistence',
      '✓ Generating project structure...',
      '✓ Creating optimal component architecture...',
      '$ npm install lucide-react tailwindcss',
      '✓ Dependencies installed'
    ],
    preview: '<div class="p-4"><h1 class="text-xl font-bold">Todo App</h1><div class="flex gap-2 mt-4"><input placeholder="Add todo..." class="border p-2 flex-1 rounded"><button class="bg-orange-500 text-white px-4 py-2 rounded">Add</button></div></div>'
  },
  {
    id: 'code',
    title: 'AI writing the code',
    duration: 3000,
    code: [
      '// Welcome to E-Code!',
      '// Let\'s build a todo app with AI',
      '',
      'import React, { useState } from \'react\';',
      '',
      'function TodoApp() {',
      '  const [todos, setTodos] = useState([]);',
      '  const [input, setInput] = useState(\'\');',
      '',
      '  const addTodo = () => {',
      '    if (input.trim()) {',
      '      setTodos([...todos, {',
      '        id: Date.now(),',
      '        text: input,',
      '        completed: false',
      '      }]);',
      '      setInput(\'\');',
      '    }',
      '  };'
    ],
    terminal: [
      '$ e-code create todo-app',
      '✓ Creating new project...',
      '✓ Installing dependencies...',
      '✓ Setting up environment...',
      '✓ AI generating components...',
      '✓ Optimizing code structure...'
    ],
    preview: '<div class="p-4"><h1>Todo App</h1><div class="flex gap-2 mb-4"><input placeholder="Add todo..." class="border p-2 flex-1"><button class="bg-blue-500 text-white px-4 py-2">Add</button></div></div>'
  },
  {
    id: 'features',
    title: 'AI adds advanced features',
    duration: 3000,
    code: [
      '// E-Code AI Agent is building your app',
      '',
      'import React, { useState, useEffect } from \'react\';',
      'import { Moon, Sun, Plus, Filter } from \'lucide-react\';',
      '',
      'function TodoApp() {',
      '  const [todos, setTodos] = useState([]);',
      '  const [darkMode, setDarkMode] = useState(false);',
      '  const [category, setCategory] = useState(\'all\');',
      '  const [input, setInput] = useState(\'\');',
      '',
      '  // AI-generated smart features',
      '  const addTodo = () => {',
      '    if (input.trim()) {',
      '      const newTodo = {',
      '        id: Date.now(),',
      '        text: input,',
      '        category: detectCategory(input),',
      '        completed: false,',
      '        createdAt: new Date().toISOString()',
      '      };',
      '      setTodos([...todos, newTodo]);',
      '      setInput(\'\');',
      '    }',
      '  };'
    ],
    terminal: [
      '🤖 E-Code AI Agent: Analyzing request...',
      '✓ Identified: Todo application',
      '✓ Features: Dark mode, categories, persistence',
      '✓ Generating project structure...',
      '✓ Creating optimal component architecture...',
      '$ npm install lucide-react tailwindcss',
      '✓ Dependencies installed',
      '🤖 Adding smart categorization...',
      '✓ Implementing dark mode toggle',
      '✓ Adding local storage persistence'
    ],
    preview: '<div class="p-4 bg-white dark:bg-gray-900"><div class="flex justify-between items-center mb-4"><h1 class="text-2xl font-bold text-gray-900 dark:text-white">Smart Todo App</h1><button class="p-2 rounded bg-gray-200 dark:bg-gray-700"><svg class="w-4 h-4" fill="currentColor"><path d="M12 3v9l4-4-4-4z"/></svg></button></div><div class="flex gap-2 mb-4"><input placeholder="Add task (AI will categorize)..." class="border p-2 flex-1 rounded dark:bg-gray-800 dark:text-white"><button class="bg-orange-500 text-white px-4 py-2 rounded">Add</button></div><div class="flex gap-2 mb-4"><button class="px-3 py-1 bg-blue-100 text-blue-800 rounded">All</button><button class="px-3 py-1 bg-gray-100 text-gray-800 rounded">Work</button><button class="px-3 py-1 bg-gray-100 text-gray-800 rounded">Personal</button></div></div>'
  },
  {
    id: 'complete',
    title: 'App deployed instantly',
    duration: 2000,
    code: [
      '// E-Code AI Agent completed your app!',
      '',
      'import React, { useState, useEffect } from \'react\';',
      'import { Moon, Sun, Plus, Filter, Check } from \'lucide-react\';',
      '',
      'function TodoApp() {',
      '  const [todos, setTodos] = useState([]);',
      '  const [darkMode, setDarkMode] = useState(false);',
      '  const [category, setCategory] = useState(\'all\');',
      '  const [input, setInput] = useState(\'\');',
      '',
      '  // AI-generated smart features',
      '  const addTodo = () => { /* ... */ };',
      '  const toggleTodo = (id) => { /* ... */ };',
      '  const detectCategory = (text) => { /* AI logic */ };',
      '',
      '  useEffect(() => {',
      '    // Auto-save to localStorage',
      '    localStorage.setItem(\'todos\', JSON.stringify(todos));',
      '  }, [todos]);',
      '',
      '  return (',
      '    <div className={darkMode ? \'dark\' : \'\'}>',
      '      <div className="min-h-screen bg-white dark:bg-gray-900">',
      '        {/* Beautiful responsive UI */}',
      '      </div>',
      '    </div>',
      '  );',
      '}',
      '',
      'export default TodoApp;'
    ],
    terminal: [
      '🤖 E-Code AI Agent: Analyzing request...',
      '✓ Identified: Todo application',
      '✓ Features: Dark mode, categories, persistence',
      '✓ Generating project structure...',
      '✓ Creating optimal component architecture...',
      '$ npm install lucide-react tailwindcss',
      '✓ Dependencies installed',
      '🤖 Adding smart categorization...',
      '✓ Implementing dark mode toggle',
      '✓ Adding local storage persistence',
      '$ e-code deploy',
      '✓ Building production bundle...',
      '✓ Deployed to https://smart-todo.e-code.app',
      '🚀 Your app is live!'
    ],
    preview: '<div class="p-4 bg-white dark:bg-gray-900 min-h-[200px]"><div class="flex justify-between items-center mb-4"><h1 class="text-2xl font-bold text-gray-900">Smart Todo App</h1><button class="p-2 rounded bg-yellow-100 hover:bg-yellow-200"><svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2L13 8l6 .75-4.5 4.25L16 19l-6-3.25L4 19l1.5-6.25L1 8.75 7 8z"/></svg></button></div><div class="flex gap-2 mb-4"><input placeholder="Add task (AI categorizes automatically)..." class="border p-2 flex-1 rounded focus:ring-2 focus:ring-orange-500"><button class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded transition-colors">Add</button></div><div class="flex gap-2 mb-4"><button class="px-3 py-1 bg-orange-100 text-orange-800 rounded">All (3)</button><button class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded">Work (2)</button><button class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded">Personal (1)</button></div><div class="space-y-2"><div class="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500"><input type="checkbox" class="w-4 h-4 text-orange-500"><span class="flex-1">Review E-Code documentation</span><span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Work</span></div><div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500"><input type="checkbox" checked class="w-4 h-4 text-orange-500"><span class="flex-1 line-through text-gray-500">Build amazing todo app</span><span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Personal</span></div><div class="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500"><input type="checkbox" class="w-4 h-4 text-orange-500"><span class="flex-1">Deploy to production</span><span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Work</span></div></div><div class="mt-4 p-3 bg-green-100 rounded-lg text-center"><span class="text-green-800 font-medium">✓ Live at https://smart-todo.e-code.app</span></div></div>'
  }
];

export function AnimatedPlatformDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); // Auto-start
  const [currentLine, setCurrentLine] = useState(0);
  const [displayedCode, setDisplayedCode] = useState<string[]>([]);
  const [displayedTerminal, setDisplayedTerminal] = useState<string[]>([]);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Reset demo
  const resetDemo = () => {
    setCurrentStep(0);
    setCurrentLine(0);
    setDisplayedCode([]);
    setDisplayedTerminal([]);
    setIsPlaying(false);
  };

  // Start/pause demo
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Simulate typing animation
  useEffect(() => {
    if (!isPlaying) return;

    const step = DEMO_STEPS[currentStep];
    if (!step) return;

    const interval = setInterval(() => {
      const codeLines = step.code;
      const terminalLines = step.terminal;
      
      if (currentLine < Math.max(codeLines.length, terminalLines.length)) {
        if (currentLine < codeLines.length) {
          setDisplayedCode(prev => [...prev, codeLines[currentLine]]);
        }
        if (currentLine < terminalLines.length) {
          setDisplayedTerminal(prev => [...prev, terminalLines[currentLine]]);
        }
        setCurrentLine(prev => prev + 1);
      } else {
        // Move to next step
        setTimeout(() => {
          if (currentStep < DEMO_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
            setCurrentLine(0);
            setDisplayedCode([]);
            setDisplayedTerminal([]);
          } else {
            // Auto-restart demo after completion
            setHasCompleted(true);
            setTimeout(() => {
              setCurrentStep(0);
              setCurrentLine(0);
              setDisplayedCode([]);
              setDisplayedTerminal([]);
              setHasCompleted(false);
            }, 3000);
          }
        }, 1500);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, currentStep, currentLine]);

  const currentStepData = DEMO_STEPS[currentStep];

  return (
    <Card className="relative overflow-hidden border-2 mx-auto max-w-6xl bg-gray-900">
      {/* Window Controls */}
      <div className="bg-gray-800 p-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-gray-300 text-sm ml-3">todo-app - E-Code</span>
        </div>
        
        {/* Demo Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlay}
            className="text-gray-300 hover:text-white"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDemo}
            className="text-gray-300 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px]">
        {/* Left Side - Code Editor */}
        <div className="bg-gray-900 p-4 border-r border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gray-700 px-3 py-1 rounded-t text-sm text-gray-300">
              App.jsx
            </div>
          </div>
          
          <div className="font-mono text-sm">
            {displayedCode.map((line, index) => (
              <div key={index} className="flex">
                <span className="text-gray-500 w-8 text-right mr-3 select-none">
                  {index + 1}
                </span>
                <span className="text-gray-100">
                  {line.includes('//') ? (
                    <>
                      {line.split('//')[0]}
                      <span className="text-green-400">//{line.split('//')[1]}</span>
                    </>
                  ) : line.includes('import') ? (
                    <>
                      <span className="text-purple-400">import</span>
                      {line.replace('import', '')}
                    </>
                  ) : line.includes('function') ? (
                    <>
                      <span className="text-blue-400">function</span>
                      {line.replace('function', '')}
                    </>
                  ) : line.includes('const') || line.includes('let') ? (
                    <>
                      <span className="text-purple-400">{line.includes('const') ? 'const' : 'let'}</span>
                      {line.replace(/(const|let)/, '')}
                    </>
                  ) : (
                    line
                  )}
                </span>
              </div>
            ))}
            <div className="w-2 h-5 bg-orange-500 opacity-75 animate-pulse inline-block" />
          </div>
        </div>

        {/* Right Side - Split between Terminal and Preview */}
        <div className="flex flex-col">
          {/* Terminal */}
          <div className="bg-black p-4 flex-1 border-b border-gray-700">
            <div className="text-green-400 font-mono text-sm">
              {displayedTerminal.map((line, index) => (
                <div key={index} className="mb-1">
                  {line.startsWith('$') ? (
                    <span className="text-yellow-400">{line}</span>
                  ) : line.startsWith('✓') ? (
                    <span className="text-green-400">{line}</span>
                  ) : (
                    <span className="text-gray-300">{line}</span>
                  )}
                </div>
              ))}
              <div className="w-2 h-4 bg-green-400 animate-pulse inline-block" />
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-white p-4 flex-1">
            <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live Preview
            </div>
            <div 
              className="border rounded-lg p-4 h-full"
              dangerouslySetInnerHTML={{ __html: currentStepData?.preview || '' }}
            />
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 p-2">
        <div className="flex items-center justify-between text-sm text-gray-300">
          <span>{currentStepData?.title}</span>
          <div className="flex gap-1">
            {DEMO_STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-orange-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}