import { 
  Project, InsertProject, 
  File, InsertFile,
  User, InsertUser,
  ProjectCollaborator, InsertProjectCollaborator,
  Deployment, InsertDeployment,
  EnvironmentVariable, InsertEnvironmentVariable,
  NewsletterSubscriber, InsertNewsletterSubscriber,
  Bounty, InsertBounty,
  BountySubmission, InsertBountySubmission,
  LoginHistory, InsertLoginHistory,
  ApiToken, InsertApiToken,
  BlogPost, InsertBlogPost,
  projects, files, users, projectCollaborators, deployments, environmentVariables, newsletterSubscribers, bounties, bountySubmissions, loginHistory, apiTokens, blogPosts
} from "@shared/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
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
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, update: Partial<User>): Promise<User>;
  
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
  
  // Bounty methods
  getAllBounties(): Promise<Bounty[]>;
  getBounty(id: number): Promise<Bounty | undefined>;
  getBountiesByUser(userId: number): Promise<Bounty[]>;
  createBounty(bounty: InsertBounty): Promise<Bounty>;
  updateBounty(id: number, update: Partial<Bounty>): Promise<Bounty>;
  deleteBounty(id: number): Promise<void>;
  
  // Bounty submission methods
  getBountySubmissions(bountyId: number): Promise<BountySubmission[]>;
  getBountySubmission(id: number): Promise<BountySubmission | undefined>;
  getUserBountySubmissions(userId: number): Promise<BountySubmission[]>;
  createBountySubmission(submission: InsertBountySubmission): Promise<BountySubmission>;
  updateBountySubmission(id: number, update: Partial<BountySubmission>): Promise<BountySubmission>;
  
  // Login history methods
  createLoginHistory(loginHistory: InsertLoginHistory): Promise<LoginHistory>;
  getLoginHistory(userId: number, limit?: number): Promise<LoginHistory[]>;
  getRecentFailedLogins(userId: number, minutes: number): Promise<number>;
  
  // API token methods
  createApiToken(token: InsertApiToken): Promise<ApiToken>;
  getApiToken(tokenHash: string): Promise<ApiToken | undefined>;
  getUserApiTokens(userId: number): Promise<ApiToken[]>;
  updateApiToken(id: number, update: Partial<ApiToken>): Promise<ApiToken>;
  deleteApiToken(id: number): Promise<void>;
  
  // Blog methods
  getAllBlogPosts(published?: boolean): Promise<BlogPost[]>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  getBlogPostsByCategory(category: string): Promise<BlogPost[]>;
  getFeaturedBlogPosts(): Promise<BlogPost[]>;
  createBlogPost(data: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, data: Partial<InsertBlogPost>): Promise<BlogPost | undefined>;
  incrementBlogPostViews(slug: string): Promise<void>;
  
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }
  
  async updateUser(id: number, update: Partial<User>): Promise<User> {
    const [user] = await db.update(users)
      .set({...update, updatedAt: new Date()})
      .where(eq(users.id, id))
      .returning();
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

  // Bounty methods
  async getAllBounties(): Promise<Bounty[]> {
    try {
      return await db.select()
        .from(bounties)
        .orderBy(desc(bounties.createdAt));
    } catch (error: any) {
      if (error.message?.includes('relation "bounties" does not exist')) {
        console.log('Bounties table does not exist yet');
        return [];
      }
      throw error;
    }
  }

  async getBounty(id: number): Promise<Bounty | undefined> {
    try {
      const [bounty] = await db.select()
        .from(bounties)
        .where(eq(bounties.id, id));
      return bounty;
    } catch (error: any) {
      if (error.message?.includes('relation "bounties" does not exist')) {
        return undefined;
      }
      throw error;
    }
  }

  async getBountiesByUser(userId: number): Promise<Bounty[]> {
    try {
      return await db.select()
        .from(bounties)
        .where(eq(bounties.authorId, userId))
        .orderBy(desc(bounties.createdAt));
    } catch (error: any) {
      if (error.message?.includes('relation "bounties" does not exist')) {
        return [];
      }
      throw error;
    }
  }

  async createBounty(bountyData: InsertBounty): Promise<Bounty> {
    const [bounty] = await db
      .insert(bounties)
      .values(bountyData)
      .returning();
    
    return bounty;
  }

  async updateBounty(id: number, update: Partial<Bounty>): Promise<Bounty> {
    const [updatedBounty] = await db
      .update(bounties)
      .set({...update, updatedAt: new Date()})
      .where(eq(bounties.id, id))
      .returning();
    
    if (!updatedBounty) {
      throw new Error('Bounty not found');
    }
    
    return updatedBounty;
  }

  async deleteBounty(id: number): Promise<void> {
    // Delete all submissions first
    await db.delete(bountySubmissions).where(eq(bountySubmissions.bountyId, id));
    
    // Delete the bounty
    await db.delete(bounties).where(eq(bounties.id, id));
  }

  // Bounty submission methods
  async getBountySubmissions(bountyId: number): Promise<BountySubmission[]> {
    try {
      return await db.select()
        .from(bountySubmissions)
        .where(eq(bountySubmissions.bountyId, bountyId))
        .orderBy(desc(bountySubmissions.submittedAt));
    } catch (error: any) {
      if (error.message?.includes('relation "bounty_submissions" does not exist')) {
        console.log('Bounty submissions table does not exist yet');
        return [];
      }
      throw error;
    }
  }

  async getUserBountySubmissions(userId: number): Promise<BountySubmission[]> {
    try {
      return await db.select()
        .from(bountySubmissions)
        .where(eq(bountySubmissions.userId, userId))
        .orderBy(desc(bountySubmissions.submittedAt));
    } catch (error: any) {
      if (error.message?.includes('relation "bounty_submissions" does not exist')) {
        return [];
      }
      throw error;
    }
  }

  async createBountySubmission(submissionData: InsertBountySubmission): Promise<BountySubmission> {
    const [submission] = await db
      .insert(bountySubmissions)
      .values(submissionData)
      .returning();
    
    // Update bounty status if needed
    const bountySubmissionsCount = await db.select()
      .from(bountySubmissions)
      .where(eq(bountySubmissions.bountyId, submissionData.bountyId));
    
    if (bountySubmissionsCount.length === 1) {
      await db
        .update(bounties)
        .set({ status: 'in-progress', updatedAt: new Date() })
        .where(eq(bounties.id, submissionData.bountyId));
    }
    
    return submission;
  }

  async updateBountySubmission(id: number, update: Partial<BountySubmission>): Promise<BountySubmission> {
    const [updatedSubmission] = await db
      .update(bountySubmissions)
      .set({...update, reviewedAt: update.status === 'accepted' || update.status === 'rejected' ? new Date() : undefined})
      .where(eq(bountySubmissions.id, id))
      .returning();
    
    if (!updatedSubmission) {
      throw new Error('Bounty submission not found');
    }
    
    // If submission is accepted, update bounty status and winner
    if (update.status === 'accepted') {
      await db
        .update(bounties)
        .set({ 
          status: 'completed', 
          winnerId: updatedSubmission.userId,
          updatedAt: new Date() 
        })
        .where(eq(bounties.id, updatedSubmission.bountyId));
    }
    
    return updatedSubmission;
  }
  
  async getBountySubmission(id: number): Promise<BountySubmission | undefined> {
    try {
      const [submission] = await db.select()
        .from(bountySubmissions)
        .where(eq(bountySubmissions.id, id));
      return submission;
    } catch (error: any) {
      if (error.message?.includes('relation "bounty_submissions" does not exist')) {
        return undefined;
      }
      throw error;
    }
  }
  
  // Login history methods
  async createLoginHistory(loginHistoryData: InsertLoginHistory): Promise<LoginHistory> {
    const [history] = await db
      .insert(loginHistory)
      .values(loginHistoryData)
      .returning();
    return history;
  }
  
  async getLoginHistory(userId: number, limit: number = 10): Promise<LoginHistory[]> {
    return await db.select()
      .from(loginHistory)
      .where(eq(loginHistory.userId, userId))
      .orderBy(desc(loginHistory.createdAt))
      .limit(limit);
  }
  
  async getRecentFailedLogins(userId: number, minutes: number): Promise<number> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    const result = await db.select()
      .from(loginHistory)
      .where(
        and(
          eq(loginHistory.userId, userId),
          eq(loginHistory.successful, false),
          sql`${loginHistory.createdAt} >= ${cutoffTime}`
        )
      );
    return result.length;
  }
  
  // API token methods
  async createApiToken(tokenData: InsertApiToken): Promise<ApiToken> {
    const [token] = await db
      .insert(apiTokens)
      .values(tokenData)
      .returning();
    return token;
  }
  
  async getApiToken(tokenHash: string): Promise<ApiToken | undefined> {
    const [token] = await db.select()
      .from(apiTokens)
      .where(eq(apiTokens.tokenHash, tokenHash));
    
    if (token) {
      // Update last used time
      await db.update(apiTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiTokens.id, token.id));
    }
    
    return token;
  }
  
  async getUserApiTokens(userId: number): Promise<ApiToken[]> {
    return await db.select()
      .from(apiTokens)
      .where(eq(apiTokens.userId, userId))
      .orderBy(desc(apiTokens.createdAt));
  }
  
  async updateApiToken(id: number, update: Partial<ApiToken>): Promise<ApiToken> {
    const [token] = await db.update(apiTokens)
      .set(update)
      .where(eq(apiTokens.id, id))
      .returning();
    
    if (!token) {
      throw new Error('API token not found');
    }
    
    return token;
  }
  
  async deleteApiToken(id: number): Promise<void> {
    await db.delete(apiTokens)
      .where(eq(apiTokens.id, id));
  }
  
  // Blog methods
  async getAllBlogPosts(published: boolean = true): Promise<BlogPost[]> {
    try {
      if (published) {
        return await db.select()
          .from(blogPosts)
          .where(eq(blogPosts.published, true))
          .orderBy(desc(blogPosts.publishedAt));
      }
      return await db.select()
        .from(blogPosts)
        .orderBy(desc(blogPosts.publishedAt));
    } catch (error: any) {
      if (error.message?.includes('relation "blog_posts" does not exist')) {
        console.log('Blog posts table does not exist yet');
        return [];
      }
      throw error;
    }
  }
  
  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    try {
      const [post] = await db.select()
        .from(blogPosts)
        .where(eq(blogPosts.slug, slug));
      
      if (post) {
        // Increment views
        await this.incrementBlogPostViews(slug);
      }
      
      return post;
    } catch (error: any) {
      if (error.message?.includes('relation "blog_posts" does not exist')) {
        return undefined;
      }
      throw error;
    }
  }
  
  async getBlogPostsByCategory(category: string): Promise<BlogPost[]> {
    try {
      return await db.select()
        .from(blogPosts)
        .where(and(
          eq(blogPosts.category, category),
          eq(blogPosts.published, true)
        ))
        .orderBy(desc(blogPosts.publishedAt));
    } catch (error: any) {
      if (error.message?.includes('relation "blog_posts" does not exist')) {
        return [];
      }
      throw error;
    }
  }
  
  async getFeaturedBlogPosts(): Promise<BlogPost[]> {
    try {
      return await db.select()
        .from(blogPosts)
        .where(and(
          eq(blogPosts.featured, true),
          eq(blogPosts.published, true)
        ))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(5);
    } catch (error: any) {
      if (error.message?.includes('relation "blog_posts" does not exist')) {
        return [];
      }
      throw error;
    }
  }
  
  async createBlogPost(data: InsertBlogPost): Promise<BlogPost> {
    const [post] = await db.insert(blogPosts)
      .values({
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        author: data.author,
        authorRole: data.authorRole,
        category: data.category,
        tags: data.tags,
        coverImage: data.coverImage,
        readTime: data.readTime,
        featured: data.featured,
        published: data.published,
        publishedAt: data.publishedAt || new Date(),
        views: data.views || 0
      })
      .returning();
    return post;
  }
  
  async updateBlogPost(id: number, data: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.author !== undefined) updateData.author = data.author;
    if (data.authorRole !== undefined) updateData.authorRole = data.authorRole;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.readTime !== undefined) updateData.readTime = data.readTime;
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.published !== undefined) updateData.published = data.published;
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt;
    if (data.views !== undefined) updateData.views = data.views;
    
    const [post] = await db.update(blogPosts)
      .set(updateData)
      .where(eq(blogPosts.id, id))
      .returning();
    return post;
  }
  
  async incrementBlogPostViews(slug: string): Promise<void> {
    await db.update(blogPosts)
      .set({ views: sql`${blogPosts.views} + 1` })
      .where(eq(blogPosts.slug, slug));
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
  private loginHistory: Map<number, LoginHistory>;
  private apiTokens: Map<number, ApiToken>;
  private projectIdCounter: number;
  private fileIdCounter: number;
  private userIdCounter: number;
  private collaboratorIdCounter: number;
  private deploymentIdCounter: number;
  private environmentVariableIdCounter: number;
  private loginHistoryIdCounter: number;
  private apiTokenIdCounter: number;
  sessionStore: Store;

  constructor() {
    this.projects = new Map();
    this.files = new Map();
    this.users = new Map();
    this.collaborators = new Map();
    this.deployments = new Map();
    this.environmentVariables = new Map();
    this.loginHistory = new Map();
    this.apiTokens = new Map();
    this.bounties = new Map();
    this.bountySubmissions = new Map();
    this.blogPosts = new Map();
    this.projectIdCounter = 1;
    this.fileIdCounter = 1;
    this.userIdCounter = 1;
    this.collaboratorIdCounter = 1;
    this.deploymentIdCounter = 1;
    this.environmentVariableIdCounter = 1;
    this.loginHistoryIdCounter = 1;
    this.apiTokenIdCounter = 1;
    this.bountyIdCounter = 1;
    this.bountySubmissionIdCounter = 1;
    this.blogPostIdCounter = 1;
    
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values())
      .find(user => user.email === email);
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
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
      emailVerified: userData.emailVerified ?? false,
      emailVerificationToken: userData.emailVerificationToken ?? null,
      emailVerificationExpiry: userData.emailVerificationExpiry ?? null,
      passwordResetToken: userData.passwordResetToken ?? null,
      passwordResetExpiry: userData.passwordResetExpiry ?? null,
      failedLoginAttempts: userData.failedLoginAttempts ?? 0,
      accountLockedUntil: userData.accountLockedUntil ?? null,
      twoFactorEnabled: userData.twoFactorEnabled ?? false,
      twoFactorSecret: userData.twoFactorSecret ?? null,
      lastLoginAt: userData.lastLoginAt ?? null,
      lastLoginIp: userData.lastLoginIp ?? null,
      createdAt: now,
      updatedAt: now
    };
    
    this.users.set(user.id, user);
    return user;
  }
  
  async updateUser(id: number, update: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser = {
      ...user,
      ...update,
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
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
  
  // Authentication methods
  async createLoginHistory(loginData: InsertLoginHistory): Promise<LoginHistory> {
    const now = new Date();
    const login: LoginHistory = {
      id: this.loginHistoryIdCounter++,
      userId: loginData.userId,
      ipAddress: loginData.ipAddress,
      userAgent: loginData.userAgent ?? null,
      successful: loginData.successful,
      failureReason: loginData.failureReason ?? null,
      createdAt: now
    };
    
    this.loginHistory.set(login.id, login);
    return login;
  }
  
  async getLoginHistory(userId: number, limit: number = 10): Promise<LoginHistory[]> {
    const history = Array.from(this.loginHistory.values())
      .filter(login => login.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return history.slice(0, limit);
  }
  
  async getRecentFailedLogins(userId: number, minutes: number): Promise<number> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    const failedLogins = Array.from(this.loginHistory.values())
      .filter(login => 
        login.userId === userId && 
        !login.successful && 
        new Date(login.createdAt).getTime() >= cutoffTime.getTime()
      );
    return failedLogins.length;
  }
  
  async createApiToken(tokenData: InsertApiToken): Promise<ApiToken> {
    const now = new Date();
    const token: ApiToken = {
      id: this.apiTokenIdCounter++,
      userId: tokenData.userId,
      name: tokenData.name,
      token: tokenData.token,
      tokenHash: tokenData.tokenHash,
      expiresAt: tokenData.expiresAt ?? null,
      lastUsedAt: tokenData.lastUsedAt ?? null,
      scopes: tokenData.scopes,
      createdAt: now
    };
    
    this.apiTokens.set(token.id, token);
    return token;
  }
  
  async getApiToken(tokenHash: string): Promise<ApiToken | undefined> {
    const token = Array.from(this.apiTokens.values())
      .find(t => t.tokenHash === tokenHash);
    
    if (token) {
      // Update last used time
      token.lastUsedAt = new Date();
      this.apiTokens.set(token.id, token);
    }
    
    return token;
  }
  
  async getUserApiTokens(userId: number): Promise<ApiToken[]> {
    return Array.from(this.apiTokens.values())
      .filter(token => token.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async updateApiToken(id: number, update: Partial<ApiToken>): Promise<ApiToken> {
    const token = this.apiTokens.get(id);
    if (!token) {
      throw new Error('API token not found');
    }
    
    const updatedToken = {
      ...token,
      ...update
    };
    
    this.apiTokens.set(id, updatedToken);
    return updatedToken;
  }
  
  async deleteApiToken(id: number): Promise<void> {
    this.apiTokens.delete(id);
  }
  
  // Bounty methods
  private bounties: Map<number, Bounty> = new Map();
  private bountySubmissions: Map<number, BountySubmission> = new Map();
  private bountyIdCounter = 1;
  private bountySubmissionIdCounter = 1;
  
  async getAllBounties(): Promise<Bounty[]> {
    return Array.from(this.bounties.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getBounty(id: number): Promise<Bounty | undefined> {
    return this.bounties.get(id);
  }
  
  async getBountiesByUser(userId: number): Promise<Bounty[]> {
    return Array.from(this.bounties.values())
      .filter(bounty => bounty.authorId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createBounty(bountyData: InsertBounty): Promise<Bounty> {
    const now = new Date();
    const bounty: Bounty = {
      id: this.bountyIdCounter++,
      title: bountyData.title,
      description: bountyData.description,
      amount: bountyData.amount,
      currency: bountyData.currency ?? 'cycles',
      status: bountyData.status ?? 'open',
      authorId: bountyData.authorId,
      winnerId: bountyData.winnerId ?? null,
      createdAt: now,
      updatedAt: now
    };
    
    this.bounties.set(bounty.id, bounty);
    return bounty;
  }
  
  async updateBounty(id: number, update: Partial<Bounty>): Promise<Bounty> {
    const bounty = this.bounties.get(id);
    if (!bounty) {
      throw new Error('Bounty not found');
    }
    
    const updatedBounty = {
      ...bounty,
      ...update,
      updatedAt: new Date()
    };
    
    this.bounties.set(id, updatedBounty);
    return updatedBounty;
  }
  
  async deleteBounty(id: number): Promise<void> {
    this.bounties.delete(id);
  }
  
  async getBountySubmissions(bountyId: number): Promise<BountySubmission[]> {
    return Array.from(this.bountySubmissions.values())
      .filter(submission => submission.bountyId === bountyId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }
  
  async getBountySubmission(id: number): Promise<BountySubmission | undefined> {
    return this.bountySubmissions.get(id);
  }
  
  async getUserBountySubmissions(userId: number): Promise<BountySubmission[]> {
    return Array.from(this.bountySubmissions.values())
      .filter(submission => submission.userId === userId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }
  
  async createBountySubmission(submissionData: InsertBountySubmission): Promise<BountySubmission> {
    const now = new Date();
    const submission: BountySubmission = {
      id: this.bountySubmissionIdCounter++,
      bountyId: submissionData.bountyId,
      userId: submissionData.userId,
      status: submissionData.status ?? 'submitted',
      submissionUrl: submissionData.submissionUrl,
      feedback: submissionData.feedback ?? null,
      submittedAt: now,
      reviewedAt: null
    };
    
    this.bountySubmissions.set(submission.id, submission);
    return submission;
  }
  
  async updateBountySubmission(id: number, update: Partial<BountySubmission>): Promise<BountySubmission> {
    const submission = this.bountySubmissions.get(id);
    if (!submission) {
      throw new Error('Bounty submission not found');
    }
    
    const updatedSubmission = {
      ...submission,
      ...update,
      reviewedAt: update.status === 'accepted' || update.status === 'rejected' ? new Date() : submission.reviewedAt
    };
    
    this.bountySubmissions.set(id, updatedSubmission);
    return updatedSubmission;
  }
  
  // Blog methods
  private blogPosts: Map<number, BlogPost> = new Map();
  private blogPostIdCounter = 1;
  
  async getAllBlogPosts(published: boolean = true): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values())
      .filter(post => !published || post.published)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }
  
  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const post = Array.from(this.blogPosts.values()).find(p => p.slug === slug);
    if (post) {
      // Increment views
      await this.incrementBlogPostViews(slug);
    }
    return post;
  }
  
  async getBlogPostsByCategory(category: string): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values())
      .filter(post => post.category === category && post.published)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }
  
  async getFeaturedBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.blogPosts.values())
      .filter(post => post.featured && post.published)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 5);
  }
  
  async createBlogPost(data: InsertBlogPost): Promise<BlogPost> {
    const now = new Date();
    const post: BlogPost = {
      id: this.blogPostIdCounter++,
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      author: data.author,
      authorRole: data.authorRole ?? null,
      category: data.category,
      tags: data.tags ?? null,
      coverImage: data.coverImage ?? null,
      readTime: data.readTime,
      featured: data.featured ?? false,
      published: data.published ?? true,
      publishedAt: data.publishedAt ?? now,
      views: data.views ?? 0,
      createdAt: now,
      updatedAt: now
    };
    
    this.blogPosts.set(post.id, post);
    return post;
  }
  
  async updateBlogPost(id: number, data: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const post = this.blogPosts.get(id);
    if (!post) return undefined;
    
    const updatedPost = {
      ...post,
      ...data,
      updatedAt: new Date()
    };
    
    this.blogPosts.set(id, updatedPost);
    return updatedPost;
  }
  
  async incrementBlogPostViews(slug: string): Promise<void> {
    const post = Array.from(this.blogPosts.values()).find(p => p.slug === slug);
    if (post) {
      post.views++;
      this.blogPosts.set(post.id, post);
    }
  }
}

// Export storage instance - use DatabaseStorage for production
export const storage = new DatabaseStorage();
