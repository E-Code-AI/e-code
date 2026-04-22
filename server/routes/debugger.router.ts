import { Router, Request, Response } from 'express';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger('debugger-router');

interface Breakpoint {
  id: string;
  file: string;
  line: number;
  condition?: string;
  isEnabled: boolean;
  hitCount: number;
}

interface Variable {
  name: string;
  value: any;
  type: string;
}

interface CallStackFrame {
  id: string;
  name: string;
  file: string;
  line: number;
  isActive: boolean;
}

interface DebugSession {
  projectId: string;
  isRunning: boolean;
  isPaused: boolean;
  breakpoints: Breakpoint[];
  variables: Variable[];
  callStack: CallStackFrame[];
  watchExpressions: string[];
  currentFile?: string;
  currentLine?: number;
}

// In-memory session store (one session per project)
const sessions = new Map<string, DebugSession>();

function getOrCreateSession(projectId: string): DebugSession {
  if (!sessions.has(projectId)) {
    sessions.set(projectId, {
      projectId,
      isRunning: false,
      isPaused: false,
      breakpoints: [],
      variables: [],
      callStack: [],
      watchExpressions: [],
    });
  }
  return sessions.get(projectId)!;
}

// GET /api/debug/session/:projectId
router.get('/debug/session/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const session = getOrCreateSession(projectId);
  res.json(session);
});

// POST /api/debug/start/:projectId
router.post('/debug/start/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const session = getOrCreateSession(projectId);
  session.isRunning = true;
  session.isPaused = false;
  session.variables = [];
  session.callStack = [];
  logger.info(`[Debugger] Started session for project ${projectId}`);
  res.json(session);
});

// POST /api/debug/stop/:projectId
router.post('/debug/stop/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const session = getOrCreateSession(projectId);
  session.isRunning = false;
  session.isPaused = false;
  session.variables = [];
  session.callStack = [];
  session.currentFile = undefined;
  session.currentLine = undefined;
  logger.info(`[Debugger] Stopped session for project ${projectId}`);
  res.json(session);
});

// POST /api/debug/pause/:projectId
router.post('/debug/pause/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const session = getOrCreateSession(projectId);
  if (session.isRunning) {
    session.isPaused = true;
    // Simulate paused state with sample variables and call stack
    session.variables = [
      { name: 'i', value: 0, type: 'number' },
      { name: 'result', value: [], type: 'Array' },
    ];
    session.callStack = [
      { id: '1', name: 'main', file: 'index.js', line: 1, isActive: true },
    ];
  }
  res.json(session);
});

// POST /api/debug/continue/:projectId
router.post('/debug/continue/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const session = getOrCreateSession(projectId);
  session.isPaused = false;
  session.variables = [];
  session.callStack = [];
  res.json(session);
});

// POST /api/debug/step-over/:projectId
router.post('/debug/step-over/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const session = getOrCreateSession(projectId);
  if (session.isPaused && session.callStack.length > 0) {
    const frame = session.callStack[0];
    frame.line = (frame.line || 1) + 1;
    session.currentLine = frame.line;
  }
  res.json(session);
});

// POST /api/debug/step-into/:projectId
router.post('/debug/step-into/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const session = getOrCreateSession(projectId);
  if (session.isPaused) {
    // Add a new frame to simulate stepping into a function
    const newFrame: CallStackFrame = {
      id: String(session.callStack.length + 1),
      name: 'inner',
      file: session.currentFile || 'index.js',
      line: (session.currentLine || 1) + 1,
      isActive: true,
    };
    if (session.callStack.length > 0) session.callStack[0].isActive = false;
    session.callStack.unshift(newFrame);
    session.currentLine = newFrame.line;
  }
  res.json(session);
});

// POST /api/debug/step-out/:projectId
router.post('/debug/step-out/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const session = getOrCreateSession(projectId);
  if (session.isPaused && session.callStack.length > 1) {
    session.callStack.shift();
    session.callStack[0].isActive = true;
    session.currentLine = session.callStack[0].line;
  }
  res.json(session);
});

// POST /api/debug/breakpoint/enable/:projectId/:breakpointId
router.post('/debug/breakpoint/enable/:projectId/:breakpointId', (req: Request, res: Response) => {
  const { projectId, breakpointId } = req.params;
  const session = getOrCreateSession(projectId);
  const bp = session.breakpoints.find(b => b.id === breakpointId);
  if (bp) {
    bp.isEnabled = !bp.isEnabled;
  }
  res.json(session);
});

// DELETE /api/debug/breakpoint/:projectId/:breakpointId
router.delete('/debug/breakpoint/:projectId/:breakpointId', (req: Request, res: Response) => {
  const { projectId, breakpointId } = req.params;
  const session = getOrCreateSession(projectId);
  session.breakpoints = session.breakpoints.filter(b => b.id !== breakpointId);
  res.json(session);
});

// POST /api/debug/breakpoint/:projectId — add a breakpoint
router.post('/debug/breakpoint/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { file, line, condition } = req.body;
  const session = getOrCreateSession(projectId);
  const bp: Breakpoint = {
    id: `bp-${Date.now()}`,
    file: file || 'index.js',
    line: line || 1,
    condition,
    isEnabled: true,
    hitCount: 0,
  };
  session.breakpoints.push(bp);
  res.json(session);
});

export default router;
