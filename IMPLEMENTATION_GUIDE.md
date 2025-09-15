# Implementation Guide: Critical Missing Features

## 1. Prompt Refinement System

### Current State
- AI agent works with user prompts as-is
- No prompt enhancement or optimization

### Implementation
```typescript
// server/ai/prompt-refinement.ts
export class PromptRefinementService {
  async refinePrompt(originalPrompt: string, context?: any): Promise<string> {
    const refinementPrompt = `
Improve this user prompt for better AI code generation:
Original: "${originalPrompt}"

Make it:
- More specific and actionable
- Include relevant technical details
- Add context about desired outcome
- Specify technology stack if missing

Return only the improved prompt.
`;
    
    const response = await this.aiProvider.generateText(refinementPrompt);
    return response.text;
  }
}
```

### UI Component
```tsx
// client/src/components/PromptRefinement.tsx
export const PromptRefinement = ({ prompt, onRefined }) => {
  const [isRefining, setIsRefining] = useState(false);
  
  const handleRefine = async () => {
    setIsRefining(true);
    try {
      const response = await fetch('/api/ai/refine-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const { refinedPrompt } = await response.json();
      onRefined(refinedPrompt);
    } finally {
      setIsRefining(false);
    }
  };
  
  return (
    <Button onClick={handleRefine} disabled={isRefining}>
      <Sparkles className="w-4 h-4 mr-2" />
      Improve prompt
    </Button>
  );
};
```

## 2. Advanced AI Capabilities Toggles

### Implementation
```typescript
// server/ai/capabilities.ts
export interface AICapabilities {
  extendedThinking: boolean;
  highPowerMode: boolean;
  creativityLevel: 'low' | 'medium' | 'high';
  codeOptimization: boolean;
}

export class AICapabilitiesManager {
  applyCapabilities(prompt: string, capabilities: AICapabilities): string {
    let enhancedPrompt = prompt;
    
    if (capabilities.extendedThinking) {
      enhancedPrompt = `Think step by step and reason through this carefully:
${enhancedPrompt}

Take time to consider edge cases and best practices.`;
    }
    
    if (capabilities.highPowerMode) {
      enhancedPrompt = `Use advanced techniques and comprehensive analysis:
${enhancedPrompt}

Provide enterprise-grade, production-ready solutions.`;
    }
    
    return enhancedPrompt;
  }
}
```

### UI Integration
```tsx
// client/src/components/AICapabilitiesPanel.tsx
export const AICapabilitiesPanel = ({ capabilities, onChange }) => {
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">AI Capabilities</h3>
      
      <div className="flex items-center space-x-2">
        <Switch
          checked={capabilities.extendedThinking}
          onCheckedChange={(checked) => 
            onChange({ ...capabilities, extendedThinking: checked })}
        />
        <Label>Extended Thinking</Label>
        <InfoIcon tooltip="AI will take more time to reason through complex problems" />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          checked={capabilities.highPowerMode}
          onCheckedChange={(checked) => 
            onChange({ ...capabilities, highPowerMode: checked })}
        />
        <Label>High Power Mode</Label>
        <InfoIcon tooltip="Use maximum AI capabilities for complex tasks" />
      </div>
    </div>
  );
};
```

## 3. Progress Tab with Real-time Updates

### Backend WebSocket Enhancement
```typescript
// server/ai/progress-tracker.ts
export class ProgressTracker {
  private progressData: Map<string, ProgressUpdate[]> = new Map();
  
  addProgress(sessionId: string, update: ProgressUpdate) {
    const history = this.progressData.get(sessionId) || [];
    history.push({
      ...update,
      timestamp: new Date(),
      id: generateId()
    });
    this.progressData.set(sessionId, history);
    
    // Emit to WebSocket
    agentWebSocketService.emitProgress(sessionId, update);
  }
  
  getProgressHistory(sessionId: string): ProgressUpdate[] {
    return this.progressData.get(sessionId) || [];
  }
}

interface ProgressUpdate {
  id: string;
  type: 'file_created' | 'file_modified' | 'package_installed' | 'command_executed';
  message: string;
  filePath?: string;
  timestamp: Date;
  status: 'in_progress' | 'completed' | 'error';
}
```

### Progress Tab Component
```tsx
// client/src/components/ProgressTab.tsx
export const ProgressTab = ({ sessionId }) => {
  const [progress, setProgress] = useState<ProgressUpdate[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket(`/ws/ai-progress/${sessionId}`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setProgress(prev => [...prev, update]);
    };
    
    return () => ws.close();
  }, [sessionId]);
  
  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-2 p-4">
        {progress.map((item) => (
          <ProgressItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

const ProgressItem = ({ item }) => {
  const handleFileClick = () => {
    if (item.filePath) {
      // Navigate to file in editor
      window.dispatchEvent(new CustomEvent('openFile', { 
        detail: { path: item.filePath } 
      }));
    }
  };
  
  return (
    <div className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
      <StatusIcon status={item.status} />
      <div className="flex-1">
        <p className="text-sm">{item.message}</p>
        {item.filePath && (
          <button 
            onClick={handleFileClick}
            className="text-xs text-blue-600 hover:underline"
          >
            📁 {item.filePath}
          </button>
        )}
        <p className="text-xs text-gray-500">
          {formatDistanceToNow(item.timestamp)} ago
        </p>
      </div>
    </div>
  );
};
```

## 4. Web Content Import and Screenshot

### Backend Service
```typescript
// server/services/web-content-service.ts
import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';

export class WebContentService {
  async captureScreenshot(url: string): Promise<Buffer> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    const screenshot = await page.screenshot({ 
      type: 'png',
      fullPage: true 
    });
    
    await browser.close();
    return screenshot;
  }
  
  async extractContent(url: string): Promise<ExtractedContent> {
    const response = await fetch(url);
    const html = await response.text();
    
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Remove scripts, styles, and other non-content elements
    const elementsToRemove = document.querySelectorAll(
      'script, style, nav, header, footer, aside, .advertisement'
    );
    elementsToRemove.forEach(el => el.remove());
    
    const title = document.querySelector('title')?.textContent || '';
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const content = document.body?.textContent?.trim() || '';
    
    return {
      title,
      description,
      content: content.slice(0, 10000), // Limit content length
      url,
      extractedAt: new Date()
    };
  }
}

interface ExtractedContent {
  title: string;
  description: string;
  content: string;
  url: string;
  extractedAt: Date;
}
```

### API Endpoints
```typescript
// server/routes/web-content.ts
app.post('/api/web-content/extract', async (req, res) => {
  try {
    const { url } = req.body;
    
    // Validate URL
    new URL(url); // Throws if invalid
    
    const content = await webContentService.extractContent(url);
    res.json(content);
  } catch (error) {
    res.status(400).json({ error: 'Invalid URL or extraction failed' });
  }
});

app.post('/api/web-content/screenshot', async (req, res) => {
  try {
    const { url } = req.body;
    
    const screenshot = await webContentService.captureScreenshot(url);
    
    res.setHeader('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    res.status(400).json({ error: 'Screenshot capture failed' });
  }
});
```

### UI Component
```tsx
// client/src/components/WebContentImport.tsx
export const WebContentImport = ({ onContentImported }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleImport = async () => {
    if (!url) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/web-content/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const content = await response.json();
      onContentImported(content);
    } catch (error) {
      toast.error('Failed to import web content');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="Enter URL to import content from..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleImport()}
        />
        <Button onClick={handleImport} disabled={isLoading || !url}>
          {isLoading ? <Spinner /> : <Download />}
          Import
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => handleScreenshot()}>
          📸 Screenshot
        </Button>
        <Button variant="outline" onClick={() => handleContentOnly()}>
          📄 Text Only
        </Button>
      </div>
    </div>
  );
};
```

## 5. Pause/Resume AI Agent

### Backend State Management
```typescript
// server/ai/agent-state.ts
export class AgentStateManager {
  private activeAgents: Map<string, AgentSession> = new Map();
  
  pauseAgent(sessionId: string): boolean {
    const session = this.activeAgents.get(sessionId);
    if (session) {
      session.status = 'paused';
      session.pausedAt = new Date();
      
      // Save current state to database
      this.saveAgentState(sessionId, session);
      
      agentWebSocketService.emitStatusChange(sessionId, 'paused');
      return true;
    }
    return false;
  }
  
  resumeAgent(sessionId: string): boolean {
    const session = this.activeAgents.get(sessionId);
    if (session && session.status === 'paused') {
      session.status = 'running';
      session.resumedAt = new Date();
      
      // Continue from where it left off
      this.continueAgentExecution(sessionId, session);
      
      agentWebSocketService.emitStatusChange(sessionId, 'running');
      return true;
    }
    return false;
  }
}

interface AgentSession {
  id: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  currentTask: string;
  completedTasks: string[];
  pausedAt?: Date;
  resumedAt?: Date;
  context: any;
}
```

### UI Controls
```tsx
// client/src/components/AIAgentControls.tsx
export const AIAgentControls = ({ sessionId, status }) => {
  const [agentStatus, setAgentStatus] = useState(status);
  
  const handlePause = async () => {
    try {
      await fetch(`/api/ai/agent/${sessionId}/pause`, { method: 'POST' });
      setAgentStatus('paused');
    } catch (error) {
      toast.error('Failed to pause agent');
    }
  };
  
  const handleResume = async () => {
    try {
      await fetch(`/api/ai/agent/${sessionId}/resume`, { method: 'POST' });
      setAgentStatus('running');
    } catch (error) {
      toast.error('Failed to resume agent');
    }
  };
  
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <StatusIndicator status={agentStatus} />
        <span className="text-sm capitalize">{agentStatus}</span>
      </div>
      
      {agentStatus === 'running' && (
        <Button size="sm" onClick={handlePause}>
          <Pause className="w-4 h-4" />
        </Button>
      )}
      
      {agentStatus === 'paused' && (
        <Button size="sm" onClick={handleResume}>
          <Play className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
```

## Implementation Priority Order

1. **Week 1**: Prompt refinement + AI capabilities toggles
2. **Week 2**: Progress tab + pause/resume functionality  
3. **Week 3**: Web content import + screenshot capture
4. **Week 4**: Enhanced checkpoint system

Each feature can be developed independently and deployed incrementally.