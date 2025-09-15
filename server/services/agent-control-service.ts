import { EventEmitter } from 'events';

interface AgentSession {
  id: string;
  userId: number;
  state: 'running' | 'paused' | 'stopped';
  createdAt: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  stoppedAt?: Date;
  context: any; // Serializable state
  abortController?: AbortController;
  currentStep?: string;
  progress: number;
  metadata: {
    extendedThinking: boolean;
    highPowerMode: boolean;
    projectId?: number;
  };
}

interface AgentStep {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  progress?: number;
  details?: string;
}

export class AgentControlService extends EventEmitter {
  private static instance: AgentControlService;
  private sessions = new Map<string, AgentSession>();
  private sessionSteps = new Map<string, AgentStep[]>();
  
  static getInstance(): AgentControlService {
    if (!AgentControlService.instance) {
      AgentControlService.instance = new AgentControlService();
    }
    return AgentControlService.instance;
  }
  
  async createSession(
    userId: number, 
    options: {
      extendedThinking?: boolean;
      highPowerMode?: boolean;
      projectId?: number;
    } = {}
  ): Promise<string> {
    const sessionId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: AgentSession = {
      id: sessionId,
      userId,
      state: 'running',
      createdAt: new Date(),
      context: {},
      progress: 0,
      metadata: {
        extendedThinking: options.extendedThinking || false,
        highPowerMode: options.highPowerMode || false,
        projectId: options.projectId,
      },
      abortController: new AbortController(),
    };
    
    this.sessions.set(sessionId, session);
    this.sessionSteps.set(sessionId, []);
    
    // Emit session created event
    this.emit('session_created', { sessionId, session });
    
    return sessionId;
  }
  
  async pauseSession(sessionId: string, reason: string = 'user_requested'): Promise<{
    success: boolean;
    canResume: boolean;
    reason: string;
  }> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.state !== 'running') {
      throw new Error(`Cannot pause session in state: ${session.state}`);
    }
    
    try {
      // Signal abort to current operations
      if (session.abortController) {
        session.abortController.abort();
      }
      
      // Update session state
      session.state = 'paused';
      session.pausedAt = new Date();
      
      // Create new abort controller for when resumed
      session.abortController = new AbortController();
      
      // Persist session state
      await this.persistSessionState(sessionId, session);
      
      // Emit pause event
      this.emit('session_paused', { sessionId, reason, session });
      
      return {
        success: true,
        canResume: true,
        reason
      };
    } catch (error) {
      console.error('Error pausing session:', error);
      return {
        success: false,
        canResume: false,
        reason: 'Failed to pause session'
      };
    }
  }
  
  async resumeSession(sessionId: string): Promise<{
    success: boolean;
    session: AgentSession;
  }> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.state !== 'paused') {
      throw new Error(`Cannot resume session in state: ${session.state}`);
    }
    
    try {
      // Update session state
      session.state = 'running';
      session.resumedAt = new Date();
      
      // Create new abort controller
      session.abortController = new AbortController();
      
      // Emit resume event
      this.emit('session_resumed', { sessionId, session });
      
      return {
        success: true,
        session
      };
    } catch (error) {
      console.error('Error resuming session:', error);
      throw error;
    }
  }
  
  async stopSession(sessionId: string, reason: string = 'user_requested'): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Signal abort to current operations
    if (session.abortController) {
      session.abortController.abort();
    }
    
    // Update session state
    session.state = 'stopped';
    session.stoppedAt = new Date();
    
    // Emit stop event
    this.emit('session_stopped', { sessionId, reason, session });
    
    // Clean up after a delay
    setTimeout(() => {
      this.sessions.delete(sessionId);
      this.sessionSteps.delete(sessionId);
    }, 60000); // Keep for 1 minute for cleanup
  }
  
  async addStep(sessionId: string, step: Omit<AgentStep, 'id' | 'startTime'>): Promise<string> {
    const stepId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const fullStep: AgentStep = {
      ...step,
      id: stepId,
      startTime: new Date(),
    };
    
    const steps = this.sessionSteps.get(sessionId) || [];
    steps.push(fullStep);
    this.sessionSteps.set(sessionId, steps);
    
    // Update session current step
    const session = this.sessions.get(sessionId);
    if (session) {
      session.currentStep = stepId;
    }
    
    // Emit step event
    this.emit('step_started', { sessionId, step: fullStep });
    
    return stepId;
  }
  
  async updateStep(sessionId: string, stepId: string, updates: Partial<AgentStep>): Promise<void> {
    const steps = this.sessionSteps.get(sessionId) || [];
    const stepIndex = steps.findIndex(s => s.id === stepId);
    
    if (stepIndex === -1) {
      throw new Error('Step not found');
    }
    
    steps[stepIndex] = { ...steps[stepIndex], ...updates };
    this.sessionSteps.set(sessionId, steps);
    
    // Emit step update event
    this.emit('step_updated', { sessionId, step: steps[stepIndex] });
  }
  
  async completeStep(sessionId: string, stepId: string, result?: any): Promise<void> {
    await this.updateStep(sessionId, stepId, {
      status: 'completed',
      endTime: new Date(),
      details: result ? JSON.stringify(result, null, 2) : undefined,
    });
    
    // Update overall progress
    const steps = this.sessionSteps.get(sessionId) || [];
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const progress = Math.round((completedSteps / steps.length) * 100);
    
    const session = this.sessions.get(sessionId);
    if (session) {
      session.progress = progress;
      this.emit('progress_update', { sessionId, progress });
    }
    
    const step = steps.find(s => s.id === stepId);
    if (step) {
      this.emit('step_completed', { sessionId, step });
    }
  }
  
  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  getSessionSteps(sessionId: string): AgentStep[] {
    return this.sessionSteps.get(sessionId) || [];
  }
  
  getUserSessions(userId: number): AgentSession[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }
  
  getAbortSignal(sessionId: string): AbortSignal | undefined {
    const session = this.sessions.get(sessionId);
    return session?.abortController?.signal;
  }
  
  private async persistSessionState(sessionId: string, session: AgentSession): Promise<void> {
    // In a real implementation, this would save to Redis or database
    // For now, we'll just log it
    console.log(`Persisting session state for ${sessionId}:`, {
      state: session.state,
      context: session.context,
      progress: session.progress,
    });
  }
  
  // Cleanup method to be called periodically
  cleanup(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [sessionId, session] of this.sessions) {
      const age = now.getTime() - session.createdAt.getTime();
      if (age > maxAge && session.state === 'stopped') {
        this.sessions.delete(sessionId);
        this.sessionSteps.delete(sessionId);
      }
    }
  }
}