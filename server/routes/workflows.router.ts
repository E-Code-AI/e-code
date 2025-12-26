import { Router, Request, Response } from 'express';

interface ProjectWorkflow {
  id: string;
  name: string;
  command: string;
  description?: string;
  icon?: string;
  isDefault?: boolean;
  isSystem?: boolean;
  isRunning?: boolean;
}

const DEFAULT_PROJECT_WORKFLOWS: ProjectWorkflow[] = [
  { 
    id: 'run-command', 
    name: 'Run .replit run command', 
    command: '.replit run', 
    isSystem: true,
    description: 'Run the default command from .replit file'
  },
  { 
    id: 'project', 
    name: 'Project', 
    command: 'npm run dev', 
    isDefault: true, 
    isSystem: true,
    description: 'Start the development server'
  },
  { 
    id: 'start-application', 
    name: 'Start application', 
    command: 'npm run dev', 
    isSystem: true,
    description: 'Start the application workflow'
  },
];

const customWorkflows: Map<string, ProjectWorkflow[]> = new Map();

const workflowsRouter = Router();

workflowsRouter.get('/api/workflows', (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  
  const projectCustomWorkflows = projectId ? (customWorkflows.get(projectId) || []) : [];
  const allWorkflows = [...DEFAULT_PROJECT_WORKFLOWS, ...projectCustomWorkflows];
  
  res.json(allWorkflows);
});

workflowsRouter.get('/api/workflows/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const projectId = req.query.projectId as string;
  
  const workflow = DEFAULT_PROJECT_WORKFLOWS.find(w => w.id === id);
  if (workflow) {
    return res.json(workflow);
  }
  
  if (projectId) {
    const projectWorkflows = customWorkflows.get(projectId) || [];
    const customWorkflow = projectWorkflows.find(w => w.id === id);
    if (customWorkflow) {
      return res.json(customWorkflow);
    }
  }
  
  res.status(404).json({ error: 'Workflow not found' });
});

workflowsRouter.post('/api/workflows', (req: Request, res: Response) => {
  const { projectId, name, command, description } = req.body;
  
  if (!name || !command) {
    return res.status(400).json({ error: 'Name and command are required' });
  }
  
  const newWorkflow: ProjectWorkflow = {
    id: `custom-${Date.now()}`,
    name,
    command,
    description,
    isSystem: false,
    isDefault: false
  };
  
  if (projectId) {
    const existing = customWorkflows.get(projectId) || [];
    customWorkflows.set(projectId, [...existing, newWorkflow]);
  }
  
  res.status(201).json(newWorkflow);
});

workflowsRouter.post('/api/workflows/:id/run', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const workflow = DEFAULT_PROJECT_WORKFLOWS.find(w => w.id === id);
  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  
  res.json({ 
    success: true, 
    message: `Workflow ${workflow.name} started`,
    workflowId: id,
    executionId: `exec-${Date.now()}`
  });
});

workflowsRouter.delete('/api/workflows/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const projectId = req.query.projectId as string;
  
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }
  
  const projectWorkflows = customWorkflows.get(projectId) || [];
  const index = projectWorkflows.findIndex(w => w.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  
  projectWorkflows.splice(index, 1);
  customWorkflows.set(projectId, projectWorkflows);
  
  res.json({ success: true });
});

export default workflowsRouter;
