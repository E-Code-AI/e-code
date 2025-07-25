import { 
  Project, InsertProject, 
  File, InsertFile,
  User, InsertUser,
  ProjectCollaborator, InsertProjectCollaborator,
  Deployment, InsertDeployment,
  EnvironmentVariable, InsertEnvironmentVariable,
  NewsletterSubscriber, InsertNewsletterSubscriber,
  projects, files, users, projectCollaborators, deployments, environmentVariables, newsletterSubscribers
} from "@shared/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import { Store } from "express-session";
import connectPg from "connect-pg-simple";
import { client } from "./db";

// Storage interface definition
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project methods
  getAllProjects(): Promise<Project[]>;
  getProjectsByUser(userId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, update: Partial<Project>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  
  // File methods
  getFile(id: number): Promise<File | undefined>;
  getFilesByProject(projectId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, update: Partial<File>): Promise<File>;
  deleteFile(id: number): Promise<void>;
  
  // Collaborator methods
  getProjectCollaborators(projectId: number): Promise<ProjectCollaborator[]>;
  getUserCollaborations(userId: number): Promise<Project[]>;
  addCollaborator(collaborator: InsertProjectCollaborator): Promise<ProjectCollaborator>;
  isProjectCollaborator(projectId: number, userId: number): Promise<boolean>;
  
  // Deployment methods
  getDeployments(projectId: number): Promise<Deployment[]>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeployment(id: number, update: Partial<Deployment>): Promise<Deployment>;
  
  // Environment variable methods
  getEnvironmentVariables(projectId: number): Promise<EnvironmentVariable[]>;
  getEnvironmentVariable(id: number): Promise<EnvironmentVariable | undefined>;
  createEnvironmentVariable(variable: InsertEnvironmentVariable): Promise<EnvironmentVariable>;
  updateEnvironmentVariable(id: number, update: Partial<EnvironmentVariable>): Promise<EnvironmentVariable>;
  deleteEnvironmentVariable(id: number): Promise<void>;
  
  // Newsletter methods
  getNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  getNewsletterSubscriber(email: string): Promise<NewsletterSubscriber | undefined>;
  subscribeToNewsletter(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  unsubscribeFromNewsletter(email: string): Promise<void>;
  confirmNewsletterSubscription(email: string, token: string): Promise<boolean>;
  
  // Session store for authentication
  sessionStore: Store;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: Store;
  
  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'session',
      pruneSessionInterval: 60,
    });
    
    this.initializeSessionStore();
  }
  
  private async initializeSessionStore() {
    try {
      // Check if the session table exists already
      const result = await client`
        SELECT EXISTS (
          SELECT FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename = 'session'
        );
      `;
      
      const tableExists = result[0].exists;
      console.log(`Session table exists: ${tableExists}`);
      
      // If the table doesn't exist, it will be handled by createTableIfMissing
      if (!tableExists) {
        console.log('Session table will be created automatically');
      }
    } catch (error) {
      console.error('Error checking session table:', error);
      // Don't block the application startup on error
    }
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  
  // Project methods
  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }
  
  async getProjectsByUser(userId: number): Promise<Project[]> {
    // Get all projects where user is owner
    const ownedProjects = await db.select()
      .from(projects)
      .where(eq(projects.ownerId, userId));
    
    // Get all projects where user is collaborator
    const collaborations = await db.select({
      project: projects
    })
    .from(projectCollaborators)
    .innerJoin(projects, eq(projectCollaborators.projectId, projects.id))
    .where(eq(projectCollaborators.userId, userId));
    
    // Combine and deduplicate
    const collaborativeProjects = collaborations.map(c => c.project);
    const allProjects = [...ownedProjects, ...collaborativeProjects];
    
    // Deduplicate by project id
    const projectMap = new Map<number, Project>();
    allProjects.forEach(project => {
      projectMap.set(project.id, project);
    });
    
    return Array.from(projectMap.values());
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }
  
  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }
  
  async updateProject(id: number, update: Partial<Project>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({...update, updatedAt: new Date()})
      .where(eq(projects.id, id))
      .returning();
      
    if (!updatedProject) {
      throw new Error('Project not found');
    }
    
    return updatedProject;
  }
  
  async deleteProject(id: number): Promise<void> {
    // Delete all files first
    await db.delete(files).where(eq(files.projectId, id));
    
    // Delete collaborators
    await db.delete(projectCollaborators).where(eq(projectCollaborators.projectId, id));
    
    // Delete deployments
    await db.delete(deployments).where(eq(deployments.projectId, id));
    
    // Delete the project
    await db.delete(projects).where(eq(projects.id, id));
  }
  
  // File methods
  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }
  
  async getFilesByProject(projectId: number): Promise<File[]> {
    return await db.select()
      .from(files)
      .where(eq(files.projectId, projectId))
      .orderBy(files.isFolder, desc(files.name));
  }
  
  async createFile(fileData: InsertFile): Promise<File> {
    const [file] = await db.insert(files).values(fileData).returning();
    
    // Update project updatedAt
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, fileData.projectId));
      
    return file;
  }
  
  async updateFile(id: number, update: Partial<File>): Promise<File> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    
    if (!file) {
      throw new Error('File not found');
    }
    
    const [updatedFile] = await db
      .update(files)
      .set({...update, updatedAt: new Date()})
      .where(eq(files.id, id))
      .returning();
      
    // Update project updatedAt  
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, file.projectId));
      
    return updatedFile;
  }
  
  async deleteFile(id: number): Promise<void> {
    // Get the file to get its projectId for later
    const [file] = await db.select().from(files).where(eq(files.id, id));
    
    if (!file) {
      throw new Error('File not found');
    }
    
    // If it's a folder, recursively delete all children
    if (file.isFolder) {
      const children = await db.select()
        .from(files)
        .where(eq(files.parentId, id));
        
      for (const child of children) {
        await this.deleteFile(child.id);
      }
    }
    
    // Delete the file
    await db.delete(files).where(eq(files.id, id));
    
    // Update project updatedAt
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, file.projectId));
  }
  
  // Collaborator methods
  async getProjectCollaborators(projectId: number): Promise<ProjectCollaborator[]> {
    return await db.select()
      .from(projectCollaborators)
      .where(eq(projectCollaborators.projectId, projectId));
  }
  
  async getUserCollaborations(userId: number): Promise<Project[]> {
    // Get all projects where user is a collaborator
    const collaborations = await db.select({
      project: projects
    })
    .from(projectCollaborators)
    .innerJoin(projects, eq(projectCollaborators.projectId, projects.id))
    .where(eq(projectCollaborators.userId, userId));
    
    return collaborations.map(c => c.project);
  }
  
  async addCollaborator(collaboratorData: InsertProjectCollaborator): Promise<ProjectCollaborator> {
    const [collaborator] = await db
      .insert(projectCollaborators)
      .values(collaboratorData)
      .returning();
      
    return collaborator;
  }
  
  async isProjectCollaborator(projectId: number, userId: number): Promise<boolean> {
    const [collaborator] = await db.select()
      .from(projectCollaborators)
      .where(and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId)
      ));
    
    return !!collaborator;
  }
  
  // Deployment methods
  async getDeployments(projectId: number): Promise<Deployment[]> {
    return await db.select()
      .from(deployments)
      .where(eq(deployments.projectId, projectId))
      .orderBy(desc(deployments.createdAt));
  }
  
  async createDeployment(deploymentData: InsertDeployment): Promise<Deployment> {
    const [deployment] = await db
      .insert(deployments)
      .values(deploymentData)
      .returning();
      
    return deployment;
  }
  
  async updateDeployment(id: number, update: Partial<Deployment>): Promise<Deployment> {
    const [updatedDeployment] = await db
      .update(deployments)
      .set({...update, updatedAt: new Date()})
      .where(eq(deployments.id, id))
      .returning();
      
    if (!updatedDeployment) {
      throw new Error('Deployment not found');
    }
    
    return updatedDeployment;
  }

  // Environment variable methods
  async getEnvironmentVariables(projectId: number): Promise<EnvironmentVariable[]> {
    try {
      return await db.select()
        .from(environmentVariables)
        .where(eq(environmentVariables.projectId, projectId));
    } catch (error: any) {
      if (error.message?.includes('relation "environment_variables" does not exist')) {
        console.log('Environment variables table does not exist yet');
        return [];
      }
      throw error;
    }
  }

  async getEnvironmentVariable(id: number): Promise<EnvironmentVariable | undefined> {
    const [variable] = await db.select()
      .from(environmentVariables)
      .where(eq(environmentVariables.id, id));
    
    return variable;
  }

  async createEnvironmentVariable(variableData: InsertEnvironmentVariable): Promise<EnvironmentVariable> {
    const [variable] = await db
      .insert(environmentVariables)
      .values(variableData)
      .returning();
    
    // Update project updatedAt
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, variableData.projectId));
    
    return variable;
  }

  async updateEnvironmentVariable(id: number, update: Partial<EnvironmentVariable>): Promise<EnvironmentVariable> {
    const [variable] = await db.select()
      .from(environmentVariables)
      .where(eq(environmentVariables.id, id));
    
    if (!variable) {
      throw new Error('Environment variable not found');
    }
    
    const [updatedVariable] = await db
      .update(environmentVariables)
      .set({...update, updatedAt: new Date()})
      .where(eq(environmentVariables.id, id))
      .returning();
    
    // Update project updatedAt
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, variable.projectId));
    
    return updatedVariable;
  }

  async deleteEnvironmentVariable(id: number): Promise<void> {
    const [variable] = await db.select()
      .from(environmentVariables)
      .where(eq(environmentVariables.id, id));
    
    if (!variable) {
      throw new Error('Environment variable not found');
    }
    
    await db.delete(environmentVariables)
      .where(eq(environmentVariables.id, id));
    
    // Update project updatedAt
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, variable.projectId));
  }

  // Newsletter methods
  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    try {
      return await db.select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.isActive, true))
        .orderBy(desc(newsletterSubscribers.subscribedAt));
    } catch (error: any) {
      if (error.message?.includes('relation "newsletter_subscribers" does not exist')) {
        console.log('Newsletter subscribers table does not exist yet');
        return [];
      }
      throw error;
    }
  }

  async getNewsletterSubscriber(email: string): Promise<NewsletterSubscriber | undefined> {
    try {
      const [subscriber] = await db.select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, email));
      return subscriber;
    } catch (error: any) {
      if (error.message?.includes('relation "newsletter_subscribers" does not exist')) {
        return undefined;
      }
      throw error;
    }
  }

  async subscribeToNewsletter(subscriberData: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    // Check if already subscribed
    const existing = await this.getNewsletterSubscriber(subscriberData.email);
    
    if (existing) {
      if (existing.isActive) {
        throw new Error('Email already subscribed');
      }
      
      // Reactivate subscription
      const [reactivated] = await db
        .update(newsletterSubscribers)
        .set({ 
          isActive: true, 
          subscribedAt: new Date(),
          unsubscribedAt: null 
        })
        .where(eq(newsletterSubscribers.email, subscriberData.email))
        .returning();
      
      return reactivated;
    }
    
    // Create new subscription
    const [subscriber] = await db
      .insert(newsletterSubscribers)
      .values({
        ...subscriberData,
        confirmationToken: subscriberData.confirmationToken || Math.random().toString(36).substring(2, 15)
      })
      .returning();
    
    return subscriber;
  }

  async unsubscribeFromNewsletter(email: string): Promise<void> {
    await db
      .update(newsletterSubscribers)
      .set({ 
        isActive: false,
        unsubscribedAt: new Date()
      })
      .where(eq(newsletterSubscribers.email, email));
  }

  async confirmNewsletterSubscription(email: string, token: string): Promise<boolean> {
    const subscriber = await this.getNewsletterSubscriber(email);
    
    if (!subscriber || subscriber.confirmationToken !== token) {
      return false;
    }
    
    if (subscriber.confirmedAt) {
      return true; // Already confirmed
    }
    
    await db
      .update(newsletterSubscribers)
      .set({ confirmedAt: new Date() })
      .where(eq(newsletterSubscribers.email, email));
    
    return true;
  }
}

// In-memory storage implementation (kept for backwards compatibility)
export class MemStorage implements IStorage {
  private projects: Map<number, Project>;
  private files: Map<number, File>;
  private users: Map<number, User>;
  private collaborators: Map<number, ProjectCollaborator>;
  private deployments: Map<number, Deployment>;
  private environmentVariables: Map<number, EnvironmentVariable>;
  private projectIdCounter: number;
  private fileIdCounter: number;
  private userIdCounter: number;
  private collaboratorIdCounter: number;
  private deploymentIdCounter: number;
  private environmentVariableIdCounter: number;
  sessionStore: Store;

  constructor() {
    this.projects = new Map();
    this.files = new Map();
    this.users = new Map();
    this.collaborators = new Map();
    this.deployments = new Map();
    this.environmentVariables = new Map();
    this.projectIdCounter = 1;
    this.fileIdCounter = 1;
    this.userIdCounter = 1;
    this.collaboratorIdCounter = 1;
    this.deploymentIdCounter = 1;
    this.environmentVariableIdCounter = 1;
    
    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values())
      .find(user => user.username === username);
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const now = new Date();
    const user: User = {
      id: this.userIdCounter++,
      username: userData.username,
      password: userData.password,
      email: userData.email ?? null,
      displayName: userData.displayName ?? null,
      avatarUrl: userData.avatarUrl ?? null,
      bio: userData.bio ?? null,
      createdAt: now,
      updatedAt: now
    };
    
    this.users.set(user.id, user);
    return user;
  }

  // Project methods
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProjectsByUser(userId: number): Promise<Project[]> {
    // Get owned projects
    const ownedProjects = Array.from(this.projects.values())
      .filter(project => project.ownerId === userId);
    
    // Get collaborations
    const collaborations = Array.from(this.collaborators.values())
      .filter(collab => collab.userId === userId)
      .map(collab => this.projects.get(collab.projectId))
      .filter(Boolean) as Project[];
    
    // Combine and deduplicate
    const allProjects = [...ownedProjects, ...collaborations];
    const projectMap = new Map<number, Project>();
    
    allProjects.forEach(project => {
      projectMap.set(project.id, project);
    });
    
    return Array.from(projectMap.values());
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const now = new Date();
    const project: Project = {
      id: this.projectIdCounter++,
      name: projectData.name,
      ownerId: projectData.ownerId,
      description: projectData.description ?? null,
      visibility: projectData.visibility ?? 'private',
      language: projectData.language ?? null,
      createdAt: now,
      updatedAt: now
    };
    
    this.projects.set(project.id, project);
    return project;
  }
  
  async updateProject(id: number, update: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error('Project not found');
    }
    
    const now = new Date();
    const updatedProject: Project = {
      ...project,
      ...update,
      updatedAt: now
    };
    
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  async deleteProject(id: number): Promise<void> {
    // Check if project exists
    if (!this.projects.has(id)) {
      throw new Error('Project not found');
    }
    
    // Delete all files for this project
    const projectFiles = Array.from(this.files.values())
      .filter(file => file.projectId === id);
      
    for (const file of projectFiles) {
      this.files.delete(file.id);
    }
    
    // Delete collaborators
    const projectCollabs = Array.from(this.collaborators.values())
      .filter(collab => collab.projectId === id);
      
    for (const collab of projectCollabs) {
      this.collaborators.delete(collab.id);
    }
    
    // Delete deployments
    const projectDeployments = Array.from(this.deployments.values())
      .filter(deploy => deploy.projectId === id);
      
    for (const deploy of projectDeployments) {
      this.deployments.delete(deploy.id);
    }
    
    // Delete the project
    this.projects.delete(id);
  }

  // File methods
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesByProject(projectId: number): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => file.projectId === projectId)
      .sort((a, b) => {
        // Folders first
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        // Alphabetically by name
        return a.name.localeCompare(b.name);
      });
  }

  async createFile(fileData: InsertFile): Promise<File> {
    const now = new Date();
    const file: File = {
      id: this.fileIdCounter++,
      name: fileData.name,
      projectId: fileData.projectId,
      content: fileData.content ?? null,
      isFolder: fileData.isFolder ?? false,
      parentId: fileData.parentId ?? null,
      createdAt: now,
      updatedAt: now
    };
    
    this.files.set(file.id, file);
    
    // Update the project's updatedAt
    const project = await this.getProject(file.projectId);
    if (project) {
      this.projects.set(project.id, {
        ...project,
        updatedAt: now
      });
    }
    
    return file;
  }

  async updateFile(id: number, update: Partial<File>): Promise<File> {
    const file = this.files.get(id);
    if (!file) {
      throw new Error('File not found');
    }
    
    const now = new Date();
    const updatedFile: File = {
      ...file,
      ...update,
      updatedAt: now
    };
    
    this.files.set(id, updatedFile);
    
    // Update the project's updatedAt
    const project = await this.getProject(file.projectId);
    if (project) {
      this.projects.set(project.id, {
        ...project,
        updatedAt: now
      });
    }
    
    return updatedFile;
  }

  async deleteFile(id: number): Promise<void> {
    const file = this.files.get(id);
    if (!file) {
      throw new Error('File not found');
    }
    
    // If it's a folder, delete all children recursively
    if (file.isFolder) {
      const childFiles = Array.from(this.files.values())
        .filter(f => f.parentId === id);
      
      for (const childFile of childFiles) {
        await this.deleteFile(childFile.id);
      }
    }
    
    this.files.delete(id);
    
    // Update the project's updatedAt
    const project = await this.getProject(file.projectId);
    if (project) {
      this.projects.set(project.id, {
        ...project,
        updatedAt: new Date()
      });
    }
  }
  
  // Collaborator methods
  async getProjectCollaborators(projectId: number): Promise<ProjectCollaborator[]> {
    return Array.from(this.collaborators.values())
      .filter(collab => collab.projectId === projectId);
  }
  
  async addCollaborator(collaboratorData: InsertProjectCollaborator): Promise<ProjectCollaborator> {
    const now = new Date();
    const collaborator: ProjectCollaborator = {
      id: this.collaboratorIdCounter++,
      projectId: collaboratorData.projectId,
      userId: collaboratorData.userId,
      role: collaboratorData.role ?? 'member',
      createdAt: now
    };
    
    this.collaborators.set(collaborator.id, collaborator);
    return collaborator;
  }
  
  // Deployment methods
  async getDeployments(projectId: number | null): Promise<Deployment[]> {
    if (projectId === null) {
      return Array.from(this.deployments.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return Array.from(this.deployments.values())
      .filter(deploy => deploy.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getDeployment(id: number): Promise<Deployment | undefined> {
    return this.deployments.get(id);
  }
  
  async createDeployment(deploymentData: InsertDeployment): Promise<Deployment> {
    const now = new Date();
    const deployment: Deployment = {
      id: this.deploymentIdCounter++,
      projectId: deploymentData.projectId,
      version: deploymentData.version,
      status: deploymentData.status ?? 'pending',
      url: deploymentData.url ?? null,
      logs: deploymentData.logs ?? null,
      createdAt: now,
      updatedAt: now
    };
    
    this.deployments.set(deployment.id, deployment);
    return deployment;
  }
  
  async updateDeployment(id: number, update: Partial<Deployment>): Promise<Deployment> {
    const deployment = this.deployments.get(id);
    if (!deployment) {
      throw new Error('Deployment not found');
    }
    
    const now = new Date();
    const updatedDeployment: Deployment = {
      ...deployment,
      ...update,
      updatedAt: now
    };
    
    this.deployments.set(id, updatedDeployment);
    return updatedDeployment;
  }

  // Environment variable methods
  async getEnvironmentVariables(projectId: number): Promise<EnvironmentVariable[]> {
    return Array.from(this.environmentVariables.values())
      .filter(variable => variable.projectId === projectId);
  }

  async getEnvironmentVariable(id: number): Promise<EnvironmentVariable | undefined> {
    return this.environmentVariables.get(id);
  }

  async createEnvironmentVariable(variableData: InsertEnvironmentVariable): Promise<EnvironmentVariable> {
    const now = new Date();
    const variable: EnvironmentVariable = {
      id: this.environmentVariableIdCounter++,
      projectId: variableData.projectId,
      key: variableData.key,
      value: variableData.value,
      isSecret: variableData.isSecret ?? false,
      createdAt: now,
      updatedAt: now
    };

    this.environmentVariables.set(variable.id, variable);

    // Update the project's updatedAt
    const project = await this.getProject(variable.projectId);
    if (project) {
      this.projects.set(project.id, {
        ...project,
        updatedAt: now
      });
    }

    return variable;
  }

  async updateEnvironmentVariable(id: number, update: Partial<EnvironmentVariable>): Promise<EnvironmentVariable> {
    const variable = this.environmentVariables.get(id);
    if (!variable) {
      throw new Error('Environment variable not found');
    }

    const now = new Date();
    const updatedVariable: EnvironmentVariable = {
      ...variable,
      ...update,
      updatedAt: now
    };

    this.environmentVariables.set(id, updatedVariable);

    // Update the project's updatedAt
    const project = await this.getProject(variable.projectId);
    if (project) {
      this.projects.set(project.id, {
        ...project,
        updatedAt: now
      });
    }

    return updatedVariable;
  }

  async deleteEnvironmentVariable(id: number): Promise<void> {
    const variable = this.environmentVariables.get(id);
    if (!variable) {
      throw new Error('Environment variable not found');
    }

    this.environmentVariables.delete(id);

    // Update the project's updatedAt
    const project = await this.getProject(variable.projectId);
    if (project) {
      this.projects.set(project.id, {
        ...project,
        updatedAt: new Date()
      });
    }
  }
  
  async getUserCollaborations(userId: number): Promise<Project[]> {
    // Get all projects where user is a collaborator
    const collaborations = Array.from(this.collaborators.values())
      .filter(collab => collab.userId === userId)
      .map(collab => this.projects.get(collab.projectId))
      .filter(Boolean) as Project[];
    
    return collaborations;
  }
  
  async isProjectCollaborator(projectId: number, userId: number): Promise<boolean> {
    return Array.from(this.collaborators.values())
      .some(collab => collab.projectId === projectId && collab.userId === userId);
  }

  // Newsletter methods (in-memory implementation)
  private newsletterSubscribers: Map<string, NewsletterSubscriber> = new Map();
  private newsletterIdCounter = 1;

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return Array.from(this.newsletterSubscribers.values())
      .filter(sub => sub.isActive)
      .sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime());
  }

  async getNewsletterSubscriber(email: string): Promise<NewsletterSubscriber | undefined> {
    return this.newsletterSubscribers.get(email);
  }

  async subscribeToNewsletter(subscriberData: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const existing = this.newsletterSubscribers.get(subscriberData.email);
    
    if (existing) {
      if (existing.isActive) {
        throw new Error('Email already subscribed');
      }
      
      // Reactivate subscription
      const reactivated: NewsletterSubscriber = {
        ...existing,
        isActive: true,
        subscribedAt: new Date(),
        unsubscribedAt: null
      };
      
      this.newsletterSubscribers.set(subscriberData.email, reactivated);
      return reactivated;
    }
    
    // Create new subscription
    const now = new Date();
    const subscriber: NewsletterSubscriber = {
      id: this.newsletterIdCounter++,
      email: subscriberData.email,
      isActive: subscriberData.isActive ?? true,
      subscribedAt: now,
      unsubscribedAt: null,
      confirmationToken: subscriberData.confirmationToken || Math.random().toString(36).substring(2, 15),
      confirmedAt: null
    };
    
    this.newsletterSubscribers.set(subscriber.email, subscriber);
    return subscriber;
  }

  async unsubscribeFromNewsletter(email: string): Promise<void> {
    const subscriber = this.newsletterSubscribers.get(email);
    if (subscriber) {
      this.newsletterSubscribers.set(email, {
        ...subscriber,
        isActive: false,
        unsubscribedAt: new Date()
      });
    }
  }

  async confirmNewsletterSubscription(email: string, token: string): Promise<boolean> {
    const subscriber = this.newsletterSubscribers.get(email);
    
    if (!subscriber || subscriber.confirmationToken !== token) {
      return false;
    }
    
    if (subscriber.confirmedAt) {
      return true; // Already confirmed
    }
    
    this.newsletterSubscribers.set(email, {
      ...subscriber,
      confirmedAt: new Date()
    });
    
    return true;
  }
}

// Export storage instance - use DatabaseStorage for production
export const storage = new DatabaseStorage();
