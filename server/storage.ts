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
  Secret, InsertSecret,
  Notification, InsertNotification,
  NotificationPreferences, InsertNotificationPreferences,
  Template, InsertTemplate,
  CommunityPost, InsertCommunityPost,
  CommunityChallenge, InsertCommunityChallenge,
  Theme, InsertTheme,
  Announcement, InsertAnnouncement,
  LearningCourse, InsertLearningCourse,
  UserLearningProgress, InsertUserLearningProgress,
  UserCycles, InsertUserCycles,
  CyclesTransaction, InsertCyclesTransaction,
  ObjectStorage, InsertObjectStorage,
  Extension, InsertExtension,
  UserExtension, InsertUserExtension,
  projectLikes, projectViews, activityLog,
  insertProjectLikeSchema, insertProjectViewSchema, insertActivityLogSchema,
  projects, files, users, projectCollaborators, deployments, environmentVariables, newsletterSubscribers, bounties, bountySubmissions, loginHistory, apiTokens, blogPosts, secrets, notifications, notificationPreferences,
  templates, communityPosts, communityChallenges, themes, announcements, learningCourses, userLearningProgress, userCycles, cyclesTransactions, objectStorage, extensions, userExtensions
} from "@shared/schema";
import {
  Team, InsertTeam,
  TeamMember, InsertTeamMember,
  TeamInvitation, InsertTeamInvitation,
  TeamProject, InsertTeamProject,
  TeamWorkspace, InsertTeamWorkspace,
  TeamActivity, InsertTeamActivity,
  teams, teamMembers, teamInvitations, teamProjects, teamWorkspaces, teamActivity
} from "@shared/teams-schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import { Store } from "express-session";
import connectPg from "connect-pg-simple";
import { client } from "./db";
import * as crypto from "crypto";

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
  
  // Secrets methods
  getSecretsByUser(userId: number): Promise<Secret[]>;
  getSecret(id: number): Promise<Secret | undefined>;
  createSecret(data: InsertSecret): Promise<Secret>;
  updateSecret(id: number, data: Partial<InsertSecret>): Promise<Secret>;
  deleteSecret(id: number): Promise<void>;
  
  // Session store for authentication
  sessionStore: Store;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: number, unreadOnly?: boolean): Promise<Notification[]>;
  getNotificationById(id: number): Promise<Notification | undefined>;
  markNotificationAsRead(id: number, userId: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  deleteNotification(id: number, userId: number): Promise<void>;
  deleteAllNotifications(userId: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  
  // Notification preferences
  getNotificationPreferences(userId: number): Promise<NotificationPreferences | undefined>;
  updateNotificationPreferences(userId: number, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences>;
  
  // Project statistics methods
  trackProjectView(projectId: number, userId?: number, ipAddress?: string): Promise<void>;
  likeProject(projectId: number, userId: number): Promise<void>;
  unlikeProject(projectId: number, userId: number): Promise<void>;
  isProjectLiked(projectId: number, userId: number): Promise<boolean>;
  getProjectLikes(projectId: number): Promise<number>;
  
  // Activity log methods
  logActivity(projectId: number, userId: number, action: string, details?: any): Promise<void>;
  getProjectActivity(projectId: number, limit?: number): Promise<any[]>;
  
  // Fork methods
  forkProject(sourceProjectId: number, userId: number, newName: string): Promise<Project>;
  
  // Template methods
  getAllTemplates(published?: boolean): Promise<Template[]>;
  getTemplateBySlug(slug: string): Promise<Template | undefined>;
  getTemplatesByCategory(category: string): Promise<Template[]>;
  getFeaturedTemplates(): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, update: Partial<Template>): Promise<Template>;
  incrementTemplateUses(id: number): Promise<void>;
  
  // Community post methods
  getAllCommunityPosts(category?: string, search?: string): Promise<CommunityPost[]>;
  getCommunityPost(id: number): Promise<CommunityPost | undefined>;
  getCommunityPostsByUser(userId: number): Promise<CommunityPost[]>;
  createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost>;
  updateCommunityPost(id: number, update: Partial<CommunityPost>): Promise<CommunityPost>;
  deleteCommunityPost(id: number): Promise<void>;
  incrementCommunityPostViews(id: number): Promise<void>;
  
  // Community challenge methods
  getAllCommunityChallenges(status?: string): Promise<CommunityChallenge[]>;
  getCommunityChallenge(id: number): Promise<CommunityChallenge | undefined>;
  createCommunityChallenge(challenge: InsertCommunityChallenge): Promise<CommunityChallenge>;
  updateCommunityChallenge(id: number, update: Partial<CommunityChallenge>): Promise<CommunityChallenge>;
  
  // Theme methods
  getAllThemes(type?: string): Promise<Theme[]>;
  getThemeBySlug(slug: string): Promise<Theme | undefined>;
  getThemesByUser(userId: number): Promise<Theme[]>;
  createTheme(theme: InsertTheme): Promise<Theme>;
  updateTheme(id: number, update: Partial<Theme>): Promise<Theme>;
  incrementThemeDownloads(id: number): Promise<void>;
  
  // Announcement methods
  getActiveAnnouncements(targetAudience?: string): Promise<Announcement[]>;
  getAnnouncement(id: number): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: number, update: Partial<Announcement>): Promise<Announcement>;
  deleteAnnouncement(id: number): Promise<void>;
  
  // Learning course methods
  getAllLearningCourses(category?: string): Promise<LearningCourse[]>;
  getLearningCourseBySlug(slug: string): Promise<LearningCourse | undefined>;
  createLearningCourse(course: InsertLearningCourse): Promise<LearningCourse>;
  updateLearningCourse(id: number, update: Partial<LearningCourse>): Promise<LearningCourse>;
  incrementCourseEnrollments(id: number): Promise<void>;
  
  // User learning progress methods
  getUserLearningProgress(userId: number, courseId: number): Promise<UserLearningProgress | undefined>;
  getAllUserLearningProgress(userId: number): Promise<UserLearningProgress[]>;
  createUserLearningProgress(progress: InsertUserLearningProgress): Promise<UserLearningProgress>;
  updateUserLearningProgress(id: number, update: Partial<UserLearningProgress>): Promise<UserLearningProgress>;
  
  // Cycles methods
  getUserCycles(userId: number): Promise<UserCycles | undefined>;
  createUserCycles(cycles: InsertUserCycles): Promise<UserCycles>;
  updateUserCycles(userId: number, update: Partial<UserCycles>): Promise<UserCycles>;
  addCyclesTransaction(transaction: InsertCyclesTransaction): Promise<CyclesTransaction>;
  getCyclesTransactions(userId: number, limit?: number): Promise<CyclesTransaction[]>;
  
  // Object storage methods
  getObjectStorageByUser(userId: number, path?: string): Promise<ObjectStorage[]>;
  getObjectStorageItem(id: number): Promise<ObjectStorage | undefined>;
  createObjectStorageItem(item: InsertObjectStorage): Promise<ObjectStorage>;
  updateObjectStorageItem(id: number, update: Partial<ObjectStorage>): Promise<ObjectStorage>;
  deleteObjectStorageItem(id: number): Promise<void>;
  getObjectStorageFolders(userId: number, parentId?: number): Promise<ObjectStorage[]>;
  getObjectStorageFiles(userId: number, parentId?: number): Promise<ObjectStorage[]>;
  
  // Extensions methods
  getAllExtensions(): Promise<Extension[]>;
  getExtensionsByCategory(category: string): Promise<Extension[]>;
  getExtension(id: number): Promise<Extension | undefined>;
  getExtensionByExtensionId(extensionId: string): Promise<Extension | undefined>;
  createExtension(extension: InsertExtension): Promise<Extension>;
  updateExtension(id: number, update: Partial<Extension>): Promise<Extension>;
  getUserExtensions(userId: number): Promise<(UserExtension & { extension: Extension })[]>;
  installExtension(userId: number, extensionId: number): Promise<UserExtension>;
  uninstallExtension(userId: number, extensionId: number): Promise<void>;
  checkExtensionInstalled(userId: number, extensionId: number): Promise<boolean>;
  
  // Team methods
  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: number): Promise<Team | null>;
  getTeamBySlug(slug: string): Promise<Team | null>;
  getUserTeams(userId: number): Promise<Team[]>;
  updateTeam(id: number, update: Partial<Team>): Promise<Team>;
  deleteTeam(id: number): Promise<void>;
  
  // Team member methods
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  getTeamMember(teamId: number, userId: number): Promise<TeamMember | null>;
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  updateTeamMember(teamId: number, userId: number, update: Partial<TeamMember>): Promise<TeamMember>;
  removeTeamMember(teamId: number, userId: number): Promise<void>;
  getTeamMemberCount(teamId: number): Promise<number>;
  
  // Team invitation methods
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  getTeamInvitation(id: number): Promise<TeamInvitation | null>;
  getTeamInvitationByToken(token: string): Promise<TeamInvitation | null>;
  acceptTeamInvitation(id: number): Promise<void>;
  
  // Team project methods
  addProjectToTeam(teamProject: InsertTeamProject): Promise<TeamProject>;
  removeProjectFromTeam(teamId: number, projectId: number): Promise<void>;
  getTeamProjects(teamId: number): Promise<Project[]>;
  
  // Team workspace methods
  createTeamWorkspace(workspace: InsertTeamWorkspace): Promise<TeamWorkspace>;
  getWorkspace(id: number): Promise<TeamWorkspace | null>;
  getTeamWorkspaces(teamId: number): Promise<TeamWorkspace[]>;
  addProjectToWorkspace(workspaceId: number, projectId: number): Promise<void>;
  
  // Team activity methods
  logTeamActivity(activity: InsertTeamActivity): Promise<void>;
  getTeamActivity(teamId: number, limit?: number): Promise<TeamActivity[]>;
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
  
  // Secrets methods
  async getSecretsByUser(userId: number): Promise<Secret[]> {
    return await db.select()
      .from(secrets)
      .where(eq(secrets.userId, userId))
      .orderBy(desc(secrets.createdAt));
  }
  
  async getSecret(id: number): Promise<Secret | undefined> {
    const [secret] = await db.select()
      .from(secrets)
      .where(eq(secrets.id, id));
    return secret;
  }
  
  async createSecret(data: InsertSecret): Promise<Secret> {
    const [secret] = await db.insert(secrets)
      .values({
        userId: data.userId,
        key: data.key,
        value: data.value,
        description: data.description,
        projectId: data.projectId
      })
      .returning();
    return secret;
  }
  
  async updateSecret(id: number, data: Partial<InsertSecret>): Promise<Secret> {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.value !== undefined) updateData.value = data.value;
    if (data.description !== undefined) updateData.description = data.description;
    
    const [secret] = await db.update(secrets)
      .set(updateData)
      .where(eq(secrets.id, id))
      .returning();
      
    if (!secret) {
      throw new Error('Secret not found');
    }
    return secret;
  }
  
  async deleteSecret(id: number): Promise<void> {
    await db.delete(secrets)
      .where(eq(secrets.id, id));
  }
  
  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }
  
  async getNotifications(userId: number, unreadOnly?: boolean): Promise<Notification[]> {
    if (unreadOnly) {
      return await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.read, false)
        ))
        .orderBy(desc(notifications.createdAt));
    }
    
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }
  
  async getNotificationById(id: number): Promise<Notification | undefined> {
    const [notification] = await db.select()
      .from(notifications)
      .where(eq(notifications.id, id));
    return notification;
  }
  
  async markNotificationAsRead(id: number, userId: number): Promise<void> {
    await db.update(notifications)
      .set({ 
        read: true,
        readAt: new Date()
      })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ));
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ 
        read: true,
        readAt: new Date()
      })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
  }
  
  async deleteNotification(id: number, userId: number): Promise<void> {
    await db.delete(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ));
  }
  
  async deleteAllNotifications(userId: number): Promise<void> {
    await db.delete(notifications)
      .where(eq(notifications.userId, userId));
  }
  
  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
    return result?.count || 0;
  }
  
  // Notification preferences
  async getNotificationPreferences(userId: number): Promise<NotificationPreferences | undefined> {
    const [prefs] = await db.select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    
    // If no preferences exist, create default ones
    if (!prefs) {
      const [newPrefs] = await db.insert(notificationPreferences)
        .values({ userId })
        .returning();
      return newPrefs;
    }
    
    return prefs;
  }
  
  async updateNotificationPreferences(userId: number, preferences: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences> {
    // First check if preferences exist
    const existing = await this.getNotificationPreferences(userId);
    
    if (!existing) {
      // Create new preferences
      const [newPrefs] = await db.insert(notificationPreferences)
        .values({ userId, ...preferences })
        .returning();
      return newPrefs;
    }
    
    // Update existing preferences
    const [updatedPrefs] = await db.update(notificationPreferences)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, userId))
      .returning();
    
    return updatedPrefs;
  }

  // Project statistics methods
  async trackProjectView(projectId: number, userId?: number, ipAddress?: string): Promise<void> {
    // Record the view
    await db.insert(projectViews)
      .values({
        projectId,
        userId,
        ipAddress
      });
    
    // Increment view count on project
    await db.update(projects)
      .set({ views: sql`${projects.views} + 1` })
      .where(eq(projects.id, projectId));
  }

  async likeProject(projectId: number, userId: number): Promise<void> {
    // Check if already liked
    const existing = await db.select()
      .from(projectLikes)
      .where(and(
        eq(projectLikes.projectId, projectId),
        eq(projectLikes.userId, userId)
      ));
    
    if (existing.length === 0) {
      // Add like
      await db.insert(projectLikes)
        .values({ projectId, userId });
      
      // Increment like count
      await db.update(projects)
        .set({ likes: sql`${projects.likes} + 1` })
        .where(eq(projects.id, projectId));
    }
  }

  async unlikeProject(projectId: number, userId: number): Promise<void> {
    // Check if the like exists before deleting
    const [existingLike] = await db.select()
      .from(projectLikes)
      .where(and(
        eq(projectLikes.projectId, projectId),
        eq(projectLikes.userId, userId)
      ));
    
    if (existingLike) {
      // Delete the like
      await db.delete(projectLikes)
        .where(and(
          eq(projectLikes.projectId, projectId),
          eq(projectLikes.userId, userId)
        ));
      
      // Decrement like count
      await db.update(projects)
        .set({ likes: sql`GREATEST(${projects.likes} - 1, 0)` })
        .where(eq(projects.id, projectId));
    }
  }

  async isProjectLiked(projectId: number, userId: number): Promise<boolean> {
    const [like] = await db.select()
      .from(projectLikes)
      .where(and(
        eq(projectLikes.projectId, projectId),
        eq(projectLikes.userId, userId)
      ));
    return !!like;
  }

  async getProjectLikes(projectId: number): Promise<number> {
    const [project] = await db.select({ likes: projects.likes })
      .from(projects)
      .where(eq(projects.id, projectId));
    return project?.likes || 0;
  }

  // Activity log methods
  async logActivity(projectId: number, userId: number, action: string, details?: any): Promise<void> {
    await db.insert(activityLog)
      .values({
        projectId,
        userId,
        action,
        details
      });
  }

  async getProjectActivity(projectId: number, limit: number = 50): Promise<any[]> {
    const activities = await db.select({
      id: activityLog.id,
      projectId: activityLog.projectId,
      userId: activityLog.userId,
      action: activityLog.action,
      details: activityLog.details,
      createdAt: activityLog.createdAt,
      username: users.username,
      userAvatar: users.avatarUrl
    })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id))
      .where(eq(activityLog.projectId, projectId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
    
    return activities;
  }

  // Fork methods
  async forkProject(sourceProjectId: number, userId: number, newName: string): Promise<Project> {
    // Get source project
    const sourceProject = await this.getProject(sourceProjectId);
    if (!sourceProject) {
      throw new Error('Source project not found');
    }

    // Create new project
    const forkedProject = await this.createProject({
      name: newName,
      description: sourceProject.description || `Forked from ${sourceProject.name}`,
      visibility: sourceProject.visibility,
      language: sourceProject.language,
      ownerId: userId,
      forkedFromId: sourceProjectId,
      coverImage: sourceProject.coverImage
    });

    // Copy all files from source project
    const sourceFiles = await this.getFilesByProject(sourceProjectId);
    
    // Create a mapping of old parent IDs to new parent IDs
    const fileIdMap = new Map<number, number>();
    
    // Sort files to ensure parents are created before children
    const sortedFiles = sourceFiles.sort((a, b) => {
      if (a.parentId === null && b.parentId !== null) return -1;
      if (a.parentId !== null && b.parentId === null) return 1;
      return 0;
    });

    for (const file of sortedFiles) {
      const newParentId = file.parentId ? fileIdMap.get(file.parentId) || null : null;
      
      const newFile = await this.createFile({
        name: file.name,
        content: file.content,
        isFolder: file.isFolder,
        parentId: newParentId,
        projectId: forkedProject.id
      });
      
      if (file.id) {
        fileIdMap.set(file.id, newFile.id);
      }
    }

    // Increment fork count on source project
    await db.update(projects)
      .set({ forks: sql`${projects.forks} + 1` })
      .where(eq(projects.id, sourceProjectId));

    // Log the fork activity
    await this.logActivity(sourceProjectId, userId, 'forked', {
      forkedProjectId: forkedProject.id,
      forkedProjectName: newName
    });

    await this.logActivity(forkedProject.id, userId, 'created', {
      forkedFromId: sourceProjectId,
      forkedFromName: sourceProject.name
    });

    return forkedProject;
  }

  // Template methods implementation
  async getAllTemplates(published?: boolean): Promise<Template[]> {
    if (published !== undefined) {
      return await db.select()
        .from(templates)
        .where(eq(templates.published, published))
        .orderBy(desc(templates.uses));
    }
    return await db.select()
      .from(templates)
      .orderBy(desc(templates.uses));
  }

  async getTemplateBySlug(slug: string): Promise<Template | undefined> {
    const [template] = await db.select()
      .from(templates)
      .where(eq(templates.slug, slug));
    return template;
  }

  async getTemplatesByCategory(category: string): Promise<Template[]> {
    return await db.select()
      .from(templates)
      .where(and(
        eq(templates.category, category),
        eq(templates.published, true)
      ))
      .orderBy(desc(templates.uses));
  }

  async getFeaturedTemplates(): Promise<Template[]> {
    return await db.select()
      .from(templates)
      .where(and(
        eq(templates.isFeatured, true),
        eq(templates.published, true)
      ))
      .orderBy(desc(templates.uses))
      .limit(6);
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [newTemplate] = await db.insert(templates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateTemplate(id: number, update: Partial<Template>): Promise<Template> {
    const [updatedTemplate] = await db.update(templates)
      .set(update)
      .where(eq(templates.id, id))
      .returning();
    return updatedTemplate;
  }

  async incrementTemplateUses(id: number): Promise<void> {
    await db.update(templates)
      .set({ uses: sql`${templates.uses} + 1` })
      .where(eq(templates.id, id));
  }

  // Team methods implementation
  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams)
      .values(team)
      .returning();
    return newTeam;
  }

  async getTeam(id: number): Promise<Team | null> {
    const [team] = await db.select()
      .from(teams)
      .where(eq(teams.id, id));
    return team || null;
  }

  async getTeamBySlug(slug: string): Promise<Team | null> {
    const [team] = await db.select()
      .from(teams)
      .where(eq(teams.slug, slug));
    return team || null;
  }

  async getUserTeams(userId: number): Promise<Team[]> {
    return await db.select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      description: teams.description,
      logo: teams.logo,
      ownerId: teams.ownerId,
      plan: teams.plan,
      settings: teams.settings,
      stripeCustomerId: teams.stripeCustomerId,
      stripeSubscriptionId: teams.stripeSubscriptionId,
      memberLimit: teams.memberLimit,
      storageLimit: teams.storageLimit,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt
    })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, userId));
  }

  async updateTeam(id: number, update: Partial<Team>): Promise<Team> {
    const [updated] = await db.update(teams)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return updated;
  }

  async deleteTeam(id: number): Promise<void> {
    // Delete all related data in order
    await db.delete(teamActivity).where(eq(teamActivity.teamId, id));
    await db.delete(teamProjects).where(eq(teamProjects.teamId, id));
    await db.delete(teamWorkspaces).where(eq(teamWorkspaces.teamId, id));
    await db.delete(teamInvitations).where(eq(teamInvitations.teamId, id));
    await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
    await db.delete(teams).where(eq(teams.id, id));
  }

  // Team member methods
  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers)
      .values(member)
      .returning();
    return newMember;
  }

  async getTeamMember(teamId: number, userId: number): Promise<TeamMember | null> {
    const [member] = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));
    return member || null;
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
  }

  async updateTeamMember(teamId: number, userId: number, update: Partial<TeamMember>): Promise<TeamMember> {
    const [updated] = await db.update(teamMembers)
      .set(update)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ))
      .returning();
    return updated;
  }

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    await db.delete(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));
  }

  async getTeamMemberCount(teamId: number): Promise<number> {
    const [result] = await db.select({ count: sql`count(*)::int` })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
    return result?.count || 0;
  }

  // Team invitation methods
  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    const token = crypto.randomBytes(32).toString('hex');
    const [newInvitation] = await db.insert(teamInvitations)
      .values({ ...invitation, token })
      .returning();
    return newInvitation;
  }

  async getTeamInvitation(id: number): Promise<TeamInvitation | null> {
    const [invitation] = await db.select()
      .from(teamInvitations)
      .where(eq(teamInvitations.id, id));
    return invitation || null;
  }

  async getTeamInvitationByToken(token: string): Promise<TeamInvitation | null> {
    const [invitation] = await db.select()
      .from(teamInvitations)
      .where(eq(teamInvitations.token, token));
    return invitation || null;
  }

  async acceptTeamInvitation(id: number): Promise<void> {
    await db.update(teamInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(teamInvitations.id, id));
  }

  // Team project methods
  async addProjectToTeam(teamProject: InsertTeamProject): Promise<TeamProject> {
    const [newTeamProject] = await db.insert(teamProjects)
      .values(teamProject)
      .returning();
    return newTeamProject;
  }

  async removeProjectFromTeam(teamId: number, projectId: number): Promise<void> {
    await db.delete(teamProjects)
      .where(and(
        eq(teamProjects.teamId, teamId),
        eq(teamProjects.projectId, projectId)
      ));
  }

  async getTeamProjects(teamId: number): Promise<Project[]> {
    return await db.select({
      id: projects.id,
      name: projects.name,
      ownerId: projects.ownerId,
      description: projects.description,
      visibility: projects.visibility,
      language: projects.language,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      likes: projects.likes,
      views: projects.views,
      forks: projects.forks,
      forkedFromId: projects.forkedFromId,
      coverImage: projects.coverImage
    })
      .from(projects)
      .innerJoin(teamProjects, eq(projects.id, teamProjects.projectId))
      .where(eq(teamProjects.teamId, teamId));
  }

  // Team workspace methods
  async createTeamWorkspace(workspace: InsertTeamWorkspace): Promise<TeamWorkspace> {
    const [newWorkspace] = await db.insert(teamWorkspaces)
      .values(workspace)
      .returning();
    return newWorkspace;
  }

  async getWorkspace(id: number): Promise<TeamWorkspace | null> {
    const [workspace] = await db.select()
      .from(teamWorkspaces)
      .where(eq(teamWorkspaces.id, id));
    return workspace || null;
  }

  async getTeamWorkspaces(teamId: number): Promise<TeamWorkspace[]> {
    return await db.select()
      .from(teamWorkspaces)
      .where(eq(teamWorkspaces.teamId, teamId));
  }

  async addProjectToWorkspace(workspaceId: number, projectId: number): Promise<void> {
    // Note: This requires a workspace_projects table which doesn't exist in the schema yet
    // For now, we'll use the team_projects table with a workspace filter in settings
    const [teamProject] = await db.select()
      .from(teamProjects)
      .where(eq(teamProjects.projectId, projectId));
    
    if (teamProject) {
      await db.update(teamProjects)
        .set({ 
          permissions: { 
            ...teamProject.permissions as any, 
            workspaceId 
          } 
        })
        .where(eq(teamProjects.projectId, projectId));
    }
  }

  // Team activity methods
  async logTeamActivity(activity: InsertTeamActivity): Promise<void> {
    await db.insert(teamActivity)
      .values(activity);
  }

  async getTeamActivity(teamId: number, limit: number = 50): Promise<TeamActivity[]> {
    return await db.select()
      .from(teamActivity)
      .where(eq(teamActivity.teamId, teamId))
      .orderBy(desc(teamActivity.createdAt))
      .limit(limit);
  }

  // Community post methods
  async getAllCommunityPosts(category?: string, search?: string): Promise<CommunityPost[]> {
    let query = db.select().from(communityPosts);
    
    if (category) {
      query = query.where(eq(communityPosts.category, category));
    }
    
    return await query.orderBy(desc(communityPosts.createdAt));
  }

  async getCommunityPost(id: number): Promise<CommunityPost | undefined> {
    const [post] = await db.select()
      .from(communityPosts)
      .where(eq(communityPosts.id, id));
    return post;
  }

  async getCommunityPostsByUser(userId: number): Promise<CommunityPost[]> {
    return await db.select()
      .from(communityPosts)
      .where(eq(communityPosts.authorId, userId))
      .orderBy(desc(communityPosts.createdAt));
  }

  async createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost> {
    const [newPost] = await db.insert(communityPosts)
      .values(post)
      .returning();
    return newPost;
  }

  async updateCommunityPost(id: number, update: Partial<CommunityPost>): Promise<CommunityPost> {
    const [updated] = await db.update(communityPosts)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(communityPosts.id, id))
      .returning();
    return updated;
  }

  async deleteCommunityPost(id: number): Promise<void> {
    await db.delete(communityPosts)
      .where(eq(communityPosts.id, id));
  }

  async incrementCommunityPostViews(id: number): Promise<void> {
    await db.update(communityPosts)
      .set({ views: sql`${communityPosts.views} + 1` })
      .where(eq(communityPosts.id, id));
  }

  // Community challenge methods
  async getAllCommunityChallenges(status?: string): Promise<CommunityChallenge[]> {
    if (status) {
      return await db.select()
        .from(communityChallenges)
        .where(eq(communityChallenges.status, status as any))
        .orderBy(desc(communityChallenges.createdAt));
    }
    return await db.select()
      .from(communityChallenges)
      .orderBy(desc(communityChallenges.createdAt));
  }

  async getCommunityChallenge(id: number): Promise<CommunityChallenge | undefined> {
    const [challenge] = await db.select()
      .from(communityChallenges)
      .where(eq(communityChallenges.id, id));
    return challenge;
  }

  async createCommunityChallenge(challenge: InsertCommunityChallenge): Promise<CommunityChallenge> {
    const [newChallenge] = await db.insert(communityChallenges)
      .values(challenge)
      .returning();
    return newChallenge;
  }

  async updateCommunityChallenge(id: number, update: Partial<CommunityChallenge>): Promise<CommunityChallenge> {
    const [updated] = await db.update(communityChallenges)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(communityChallenges.id, id))
      .returning();
    return updated;
  }

  // Theme methods
  async getAllThemes(type?: string): Promise<Theme[]> {
    if (type) {
      return await db.select()
        .from(themes)
        .where(eq(themes.type, type as any))
        .orderBy(desc(themes.downloads));
    }
    return await db.select()
      .from(themes)
      .orderBy(desc(themes.downloads));
  }

  async getThemeBySlug(slug: string): Promise<Theme | undefined> {
    const [theme] = await db.select()
      .from(themes)
      .where(eq(themes.slug, slug));
    return theme;
  }

  async getThemesByUser(userId: number): Promise<Theme[]> {
    return await db.select()
      .from(themes)
      .where(eq(themes.authorId, userId))
      .orderBy(desc(themes.createdAt));
  }

  async createTheme(theme: InsertTheme): Promise<Theme> {
    const [newTheme] = await db.insert(themes)
      .values(theme)
      .returning();
    return newTheme;
  }

  async updateTheme(id: number, update: Partial<Theme>): Promise<Theme> {
    const [updated] = await db.update(themes)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(themes.id, id))
      .returning();
    return updated;
  }

  async incrementThemeDownloads(id: number): Promise<void> {
    await db.update(themes)
      .set({ downloads: sql`${themes.downloads} + 1` })
      .where(eq(themes.id, id));
  }

  // Announcement methods
  async getActiveAnnouncements(targetAudience?: string): Promise<Announcement[]> {
    const now = new Date();
    let query = db.select()
      .from(announcements)
      .where(and(
        eq(announcements.active, true),
        sql`${announcements.startsAt} <= ${now}`,
        sql`${announcements.endsAt} IS NULL OR ${announcements.endsAt} > ${now}`
      ));
    
    if (targetAudience) {
      query = query.where(eq(announcements.targetAudience, targetAudience));
    }
    
    return await query.orderBy(desc(announcements.priority), desc(announcements.createdAt));
  }

  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    const [announcement] = await db.select()
      .from(announcements)
      .where(eq(announcements.id, id));
    return announcement;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db.insert(announcements)
      .values(announcement)
      .returning();
    return newAnnouncement;
  }

  async updateAnnouncement(id: number, update: Partial<Announcement>): Promise<Announcement> {
    const [updated] = await db.update(announcements)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db.delete(announcements)
      .where(eq(announcements.id, id));
  }

  // Learning course methods
  async getAllLearningCourses(category?: string): Promise<LearningCourse[]> {
    if (category) {
      return await db.select()
        .from(learningCourses)
        .where(eq(learningCourses.category, category))
        .orderBy(desc(learningCourses.enrollments));
    }
    return await db.select()
      .from(learningCourses)
      .orderBy(desc(learningCourses.enrollments));
  }

  async getLearningCourseBySlug(slug: string): Promise<LearningCourse | undefined> {
    const [course] = await db.select()
      .from(learningCourses)
      .where(eq(learningCourses.slug, slug));
    return course;
  }

  async createLearningCourse(course: InsertLearningCourse): Promise<LearningCourse> {
    const [newCourse] = await db.insert(learningCourses)
      .values(course)
      .returning();
    return newCourse;
  }

  async updateLearningCourse(id: number, update: Partial<LearningCourse>): Promise<LearningCourse> {
    const [updated] = await db.update(learningCourses)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(learningCourses.id, id))
      .returning();
    return updated;
  }

  async incrementCourseEnrollments(id: number): Promise<void> {
    await db.update(learningCourses)
      .set({ enrollments: sql`${learningCourses.enrollments} + 1` })
      .where(eq(learningCourses.id, id));
  }

  // User learning progress methods
  async getUserLearningProgress(userId: number, courseId: number): Promise<UserLearningProgress | undefined> {
    const [progress] = await db.select()
      .from(userLearningProgress)
      .where(and(
        eq(userLearningProgress.userId, userId),
        eq(userLearningProgress.courseId, courseId)
      ));
    return progress;
  }

  async getAllUserLearningProgress(userId: number): Promise<UserLearningProgress[]> {
    return await db.select()
      .from(userLearningProgress)
      .where(eq(userLearningProgress.userId, userId))
      .orderBy(desc(userLearningProgress.lastProgressAt));
  }

  async createUserLearningProgress(progress: InsertUserLearningProgress): Promise<UserLearningProgress> {
    const [newProgress] = await db.insert(userLearningProgress)
      .values(progress)
      .returning();
    return newProgress;
  }

  async updateUserLearningProgress(id: number, update: Partial<UserLearningProgress>): Promise<UserLearningProgress> {
    const [updated] = await db.update(userLearningProgress)
      .set({ ...update, lastProgressAt: new Date() })
      .where(eq(userLearningProgress.id, id))
      .returning();
    return updated;
  }

  // Cycles methods
  async getUserCycles(userId: number): Promise<UserCycles | undefined> {
    const [cycles] = await db.select()
      .from(userCycles)
      .where(eq(userCycles.userId, userId));
    
    // If no cycles record exists, create one
    if (!cycles) {
      const [newCycles] = await db.insert(userCycles)
        .values({ userId, balance: 0, totalEarned: 0, totalSpent: 0 })
        .returning();
      return newCycles;
    }
    
    return cycles;
  }

  async createUserCycles(cycles: InsertUserCycles): Promise<UserCycles> {
    const [newCycles] = await db.insert(userCycles)
      .values(cycles)
      .returning();
    return newCycles;
  }

  async updateUserCycles(userId: number, update: Partial<UserCycles>): Promise<UserCycles> {
    const [updated] = await db.update(userCycles)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(userCycles.userId, userId))
      .returning();
    return updated;
  }

  async addCyclesTransaction(transaction: InsertCyclesTransaction): Promise<CyclesTransaction> {
    const [newTransaction] = await db.insert(cyclesTransactions)
      .values(transaction)
      .returning();
    
    // Update user cycles balance
    const userCyclesRecord = await this.getUserCycles(transaction.userId);
    if (userCyclesRecord) {
      const newBalance = userCyclesRecord.balance + transaction.amount;
      const totalEarned = transaction.amount > 0 ? userCyclesRecord.totalEarned + transaction.amount : userCyclesRecord.totalEarned;
      const totalSpent = transaction.amount < 0 ? userCyclesRecord.totalSpent + Math.abs(transaction.amount) : userCyclesRecord.totalSpent;
      
      await this.updateUserCycles(transaction.userId, {
        balance: newBalance,
        totalEarned,
        totalSpent
      });
    }
    
    return newTransaction;
  }

  async getCyclesTransactions(userId: number, limit: number = 50): Promise<CyclesTransaction[]> {
    return await db.select()
      .from(cyclesTransactions)
      .where(eq(cyclesTransactions.userId, userId))
      .orderBy(desc(cyclesTransactions.createdAt))
      .limit(limit);
  }

  // Object storage methods
  async getObjectStorageByUser(userId: number, path?: string): Promise<ObjectStorage[]> {
    let query = db.select().from(objectStorage).where(eq(objectStorage.userId, userId));
    
    if (path) {
      query = query.where(eq(objectStorage.path, path));
    }
    
    return await query.orderBy(objectStorage.path);
  }

  async getObjectStorageItem(id: number): Promise<ObjectStorage | undefined> {
    const [item] = await db.select()
      .from(objectStorage)
      .where(eq(objectStorage.id, id));
    return item;
  }

  async createObjectStorageItem(item: InsertObjectStorage): Promise<ObjectStorage> {
    const [newItem] = await db.insert(objectStorage)
      .values(item)
      .returning();
    return newItem;
  }

  async updateObjectStorageItem(id: number, update: Partial<ObjectStorage>): Promise<ObjectStorage> {
    const [updated] = await db.update(objectStorage)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(objectStorage.id, id))
      .returning();
    return updated;
  }

  async deleteObjectStorageItem(id: number): Promise<void> {
    await db.delete(objectStorage)
      .where(eq(objectStorage.id, id));
  }

  async getObjectStorageFolders(userId: number, parentId?: number): Promise<ObjectStorage[]> {
    return await db.select()
      .from(objectStorage)
      .where(and(
        eq(objectStorage.userId, userId),
        eq(objectStorage.isFolder, true),
        parentId ? eq(objectStorage.parentId, parentId) : isNull(objectStorage.parentId)
      ))
      .orderBy(objectStorage.name);
  }

  async getObjectStorageFiles(userId: number, parentId?: number): Promise<ObjectStorage[]> {
    return await db.select()
      .from(objectStorage)
      .where(and(
        eq(objectStorage.userId, userId),
        eq(objectStorage.isFolder, false),
        parentId ? eq(objectStorage.parentId, parentId) : isNull(objectStorage.parentId)
      ))
      .orderBy(objectStorage.name);
  }

  // Extensions methods
  async getAllExtensions(): Promise<Extension[]> {
    return await db.select()
      .from(extensions)
      .orderBy(desc(extensions.installs));
  }

  async getExtensionsByCategory(category: string): Promise<Extension[]> {
    return await db.select()
      .from(extensions)
      .where(eq(extensions.category, category))
      .orderBy(desc(extensions.installs));
  }

  async getExtension(id: number): Promise<Extension | undefined> {
    const [extension] = await db.select()
      .from(extensions)
      .where(eq(extensions.id, id));
    return extension;
  }

  async getExtensionByExtensionId(extensionId: string): Promise<Extension | undefined> {
    const [extension] = await db.select()
      .from(extensions)
      .where(eq(extensions.extensionId, extensionId));
    return extension;
  }

  async createExtension(extension: InsertExtension): Promise<Extension> {
    const [newExtension] = await db.insert(extensions)
      .values(extension)
      .returning();
    return newExtension;
  }

  async updateExtension(id: number, update: Partial<Extension>): Promise<Extension> {
    const [updated] = await db.update(extensions)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(extensions.id, id))
      .returning();
    return updated;
  }

  async getUserExtensions(userId: number): Promise<(UserExtension & { extension: Extension })[]> {
    const userExtensionsList = await db.select({
      id: userExtensions.id,
      userId: userExtensions.userId,
      extensionId: userExtensions.extensionId,
      installedAt: userExtensions.installedAt,
      settings: userExtensions.settings,
      extension: extensions
    })
      .from(userExtensions)
      .innerJoin(extensions, eq(userExtensions.extensionId, extensions.id))
      .where(eq(userExtensions.userId, userId));
    
    return userExtensionsList;
  }

  async installExtension(userId: number, extensionId: number): Promise<UserExtension> {
    const [installed] = await db.insert(userExtensions)
      .values({ userId, extensionId })
      .returning();
    
    // Increment install count
    await db.update(extensions)
      .set({ installs: sql`${extensions.installs} + 1` })
      .where(eq(extensions.id, extensionId));
    
    return installed;
  }

  async uninstallExtension(userId: number, extensionId: number): Promise<void> {
    await db.delete(userExtensions)
      .where(and(
        eq(userExtensions.userId, userId),
        eq(userExtensions.extensionId, extensionId)
      ));
    
    // Decrement install count
    await db.update(extensions)
      .set({ installs: sql`GREATEST(${extensions.installs} - 1, 0)` })
      .where(eq(extensions.id, extensionId));
  }

  async checkExtensionInstalled(userId: number, extensionId: number): Promise<boolean> {
    const [installed] = await db.select()
      .from(userExtensions)
      .where(and(
        eq(userExtensions.userId, userId),
        eq(userExtensions.extensionId, extensionId)
      ));
    return !!installed;
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
