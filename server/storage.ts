import {
  User, InsertUser, UpsertUser,
  Project, InsertProject,
  File, InsertFile,
  ApiKey, InsertApiKey,
  CodeReview, InsertCodeReview,
  Challenge, InsertChallenge,
  MentorProfile, InsertMentorProfile,
  ChallengeSubmission,
  MentorshipSession,
  MobileDevice,
  ReviewComment,
  ReviewApproval,
  Deployment, InsertDeployment,
  Comment, InsertComment,
  Checkpoint, InsertCheckpoint,
  TimeTracking, InsertTimeTracking,
  Screenshot, InsertScreenshot,
  TaskSummary, InsertTaskSummary,
  projects, files, users, apiKeys, codeReviews, reviewComments, reviewApprovals,
  challenges, challengeSubmissions, challengeLeaderboard, mentorProfiles, mentorshipSessions,
  mobileDevices, pushNotifications, teams, teamMembers, deployments,
  comments, checkpoints, projectTimeTracking, projectScreenshots, taskSummaries, usageTracking
} from "@shared/schema";
import { eq, and, desc, isNull, sql, inArray, gte, lte } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import { Store } from "express-session";
import connectPg from "connect-pg-simple";
import { client } from "./db";
import * as crypto from "crypto";

// Storage interface definition
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  getProjectBySlug(slug: string): Promise<Project | undefined>;
  getProjectsByUserId(ownerId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  incrementProjectViews(id: number): Promise<void>;

  // File operations
  getFile(id: number): Promise<File | undefined>;
  getFilesByProjectId(projectId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, file: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;

  // API Key operations
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getUserApiKeys(userId: number): Promise<ApiKey[]>;
  getApiKey(id: number): Promise<ApiKey | undefined>;
  updateApiKey(id: number, apiKey: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: number): Promise<boolean>;

  // Code Review operations
  createCodeReview(review: InsertCodeReview): Promise<CodeReview>;
  getCodeReview(id: number): Promise<CodeReview | undefined>;
  getProjectCodeReviews(projectId: number): Promise<CodeReview[]>;
  updateCodeReview(id: number, review: Partial<InsertCodeReview>): Promise<CodeReview | undefined>;

  // Challenge operations
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  getChallenge(id: number): Promise<Challenge | undefined>;
  getChallengesByCategory(category: string): Promise<Challenge[]>;
  updateChallenge(id: number, challenge: Partial<InsertChallenge>): Promise<Challenge | undefined>;

  // Mentorship operations
  createMentorProfile(profile: InsertMentorProfile): Promise<MentorProfile>;
  getMentorProfile(userId: number): Promise<MentorProfile | undefined>;
  updateMentorProfile(userId: number, profile: Partial<InsertMentorProfile>): Promise<MentorProfile | undefined>;

  // Template operations
  getAllTemplates(publishedOnly?: boolean): Promise<any[]>;
  pinProject(projectId: number, userId: number): Promise<void>;
  unpinProject(projectId: number, userId: number): Promise<void>;

  // Login history operations
  createLoginHistory(history: any): Promise<any>;
  
  // Admin API Key operations (for centralized AI services)
  getActiveAdminApiKey(provider: string): Promise<any>;
  trackAIUsage(userId: number, tokens: number, mode: string): Promise<void>;
  createAiUsageRecord(record: any): Promise<any>;
  updateUserAiTokens(userId: number, tokensUsed: number): Promise<void>;

  // Deployment operations
  createDeployment(deploymentData: InsertDeployment): Promise<Deployment>;
  getDeployments(projectId: number): Promise<Deployment[]>;
  updateDeployment(id: number, deploymentData: Partial<InsertDeployment>): Promise<Deployment | undefined>;
  
  // Audit log operations
  getAuditLogs(filters: { userId?: number; action?: string; dateRange?: string }): Promise<any[]>;
  
  // Storage operations
  getStorageBuckets(): Promise<any[]>;
  createStorageBucket(bucket: { projectId: number; name: string; region: string; isPublic: boolean }): Promise<any>;
  getProjectStorageBuckets(projectId: number): Promise<any[]>;
  getStorageObjects(bucketId: string): Promise<any[]>;
  deleteStorageObject(bucketId: string, objectKey: string): Promise<void>;
  
  // Team operations
  getUserTeams(userId: number): Promise<any[]>;
  
  // Theme operations  
  getUserThemeSettings(userId: number): Promise<any>;
  updateUserThemeSettings(userId: number, settings: any): Promise<any>;
  getInstalledThemes(userId: number): Promise<any[]>;
  installTheme(userId: number, themeId: string): Promise<void>;
  uninstallTheme(userId: number, themeId: string): Promise<void>;
  createCustomTheme(userId: number, theme: any): Promise<any>;

  // Stripe operations
  updateUserStripeInfo(userId: number, stripeData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    subscriptionStatus?: string;
    subscriptionCurrentPeriodEnd?: Date;
  }): Promise<User | undefined>;
  updateStripeCustomerId(userId: number, customerId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Usage tracking operations
  trackUsage(userId: number, eventType: string, quantity: number, metadata?: any): Promise<void>;
  getUsageStats(userId: number, startDate?: Date, endDate?: Date): Promise<any>;
  getUserUsage(userId: number, billingPeriodStart?: Date): Promise<any>;
  getUsageHistory(userId: number, startDate: Date, endDate: Date, metricType?: string): Promise<any[]>;
  getUsageSummary(userId: number, period: string): Promise<any>;

  // Comments operations
  createComment(comment: InsertComment): Promise<Comment>;
  getProjectComments(projectId: number): Promise<Comment[]>;
  getFileComments(fileId: number): Promise<Comment[]>;
  updateComment(id: number, comment: Partial<InsertComment>): Promise<Comment | undefined>;
  deleteComment(id: number): Promise<boolean>;

  // Checkpoints operations
  createCheckpoint(checkpoint: any): Promise<Checkpoint>;
  getProjectCheckpoints(projectId: number): Promise<Checkpoint[]>;
  getCheckpoint(id: number): Promise<Checkpoint | undefined>;
  restoreCheckpoint(checkpointId: number): Promise<boolean>;

  // Time tracking operations
  startTimeTracking(tracking: InsertTimeTracking): Promise<TimeTracking>;
  stopTimeTracking(trackingId: number): Promise<TimeTracking | undefined>;
  getActiveTimeTracking(projectId: number, userId: number): Promise<TimeTracking | undefined>;
  getProjectTimeTracking(projectId: number): Promise<TimeTracking[]>;

  // Screenshot operations
  createScreenshot(screenshot: InsertScreenshot): Promise<Screenshot>;
  getProjectScreenshots(projectId: number): Promise<Screenshot[]>;
  getScreenshot(id: number): Promise<Screenshot | undefined>;
  deleteScreenshot(id: number): Promise<boolean>;

  // Task summary operations
  createTaskSummary(summary: InsertTaskSummary): Promise<TaskSummary>;
  getProjectTaskSummaries(projectId: number): Promise<TaskSummary[]>;
  updateTaskSummary(id: number, summary: Partial<InsertTaskSummary>): Promise<TaskSummary | undefined>;
  
  // Secret management operations
  createSecret(secret: any): Promise<any>;
  getProjectSecrets(projectId: number): Promise<any[]>;
  getSecret(id: number): Promise<any | undefined>;
  deleteSecret(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.length > 0;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.ownerId, userId));
  }

  // Alias for backward compatibility
  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return this.getProjectsByUser(userId);
  }

  async getProjectBySlug(slug: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.slug, slug));
    return project;
  }



  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.length > 0;
  }

  async incrementProjectViews(id: number): Promise<void> {
    await db
      .update(projects)
      .set({ views: sql`${projects.views} + 1` })
      .where(eq(projects.id, id));
  }

  // File operations
  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async getFilesByProjectId(projectId: number): Promise<File[]> {
    return await db.select().from(files).where(eq(files.projectId, projectId)).orderBy(files.path);
  }

  async createFile(fileData: InsertFile): Promise<File> {
    const [file] = await db.insert(files).values(fileData).returning();
    return file;
  }

  async updateFile(id: number, fileData: Partial<InsertFile>): Promise<File | undefined> {
    const [file] = await db
      .update(files)
      .set({ ...fileData, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    return file;
  }

  async deleteFile(id: number): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id));
    return result.length > 0;
  }

  // API Key operations
  async createApiKey(apiKeyData: InsertApiKey): Promise<ApiKey> {
    const [apiKey] = await db.insert(apiKeys).values(apiKeyData).returning();
    return apiKey;
  }

  async getUserApiKeys(userId: number): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKey(id: number): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey;
  }

  async updateApiKey(id: number, apiKeyData: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    const [apiKey] = await db
      .update(apiKeys)
      .set(apiKeyData)
      .where(eq(apiKeys.id, id))
      .returning();
    return apiKey;
  }

  async deleteApiKey(id: number): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return result.length > 0;
  }

  // Code Review operations
  async createCodeReview(reviewData: InsertCodeReview): Promise<CodeReview> {
    const [review] = await db.insert(codeReviews).values(reviewData).returning();
    return review;
  }

  async getCodeReview(id: number): Promise<CodeReview | undefined> {
    const [review] = await db.select().from(codeReviews).where(eq(codeReviews.id, id));
    return review;
  }

  async getProjectCodeReviews(projectId: number): Promise<CodeReview[]> {
    return await db.select().from(codeReviews).where(eq(codeReviews.projectId, projectId)).orderBy(desc(codeReviews.createdAt));
  }

  async updateCodeReview(id: number, reviewData: Partial<InsertCodeReview>): Promise<CodeReview | undefined> {
    const [review] = await db
      .update(codeReviews)
      .set({ ...reviewData, updatedAt: new Date() })
      .where(eq(codeReviews.id, id))
      .returning();
    return review;
  }

  // Challenge operations
  async createChallenge(challengeData: InsertChallenge): Promise<Challenge> {
    const [challenge] = await db.insert(challenges).values(challengeData).returning();
    return challenge;
  }

  async getChallenge(id: number): Promise<Challenge | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    return challenge;
  }

  async getChallengesByCategory(category: string): Promise<Challenge[]> {
    return await db.select().from(challenges).where(eq(challenges.category, category)).orderBy(desc(challenges.createdAt));
  }

  async updateChallenge(id: number, challengeData: Partial<InsertChallenge>): Promise<Challenge | undefined> {
    const [challenge] = await db
      .update(challenges)
      .set({ ...challengeData, updatedAt: new Date() })
      .where(eq(challenges.id, id))
      .returning();
    return challenge;
  }

  // Mentorship operations
  async createMentorProfile(profileData: InsertMentorProfile): Promise<MentorProfile> {
    const [profile] = await db.insert(mentorProfiles).values(profileData).returning();
    return profile;
  }

  async getMentorProfile(userId: number): Promise<MentorProfile | undefined> {
    const [profile] = await db.select().from(mentorProfiles).where(eq(mentorProfiles.userId, userId));
    return profile;
  }

  async updateMentorProfile(userId: number, profileData: Partial<InsertMentorProfile>): Promise<MentorProfile | undefined> {
    const [profile] = await db
      .update(mentorProfiles)
      .set(profileData)
      .where(eq(mentorProfiles.userId, userId))
      .returning();
    return profile;
  }

  // Template operations
  async getAllTemplates(publishedOnly?: boolean): Promise<any[]> {
    // Return built-in templates for now
    const templates = [
      {
        id: 'nextjs-blog',
        slug: 'nextjs-blog',
        name: 'Next.js Blog',
        description: 'A modern blog with Next.js and Tailwind CSS',
        category: 'web',
        tags: ['nextjs', 'react', 'blog', 'tailwind'],
        authorName: 'E-Code',
        authorVerified: true,
        uses: 1250,
        stars: 89,
        forks: 23,
        language: 'javascript',
        framework: 'nextjs',
        difficulty: 'beginner',
        estimatedTime: 30,
        features: ['SEO optimized', 'Dark mode', 'Markdown support'],
        isFeatured: true,
        isOfficial: true,
        createdAt: new Date()
      },
      {
        id: 'react-dashboard',
        slug: 'react-dashboard',
        name: 'React Admin Dashboard',
        description: 'Professional admin dashboard with charts and analytics',
        category: 'web',
        tags: ['react', 'dashboard', 'admin', 'charts'],
        authorName: 'E-Code',
        authorVerified: true,
        uses: 2100,
        stars: 156,
        forks: 45,
        language: 'javascript',
        framework: 'react',
        difficulty: 'intermediate',
        estimatedTime: 45,
        features: ['Charts', 'Tables', 'Authentication', 'Responsive'],
        isFeatured: true,
        isOfficial: true,
        createdAt: new Date()
      },
      {
        id: 'python-api',
        slug: 'python-api',
        name: 'Python REST API',
        description: 'FastAPI backend with authentication and database',
        category: 'backend',
        tags: ['python', 'fastapi', 'api', 'rest'],
        authorName: 'E-Code',
        authorVerified: true,
        uses: 1800,
        stars: 120,
        forks: 34,
        language: 'python',
        framework: 'fastapi',
        difficulty: 'intermediate',
        estimatedTime: 40,
        features: ['JWT Auth', 'PostgreSQL', 'Swagger docs', 'Docker'],
        isFeatured: true,
        isOfficial: true,
        createdAt: new Date()
      }
    ];

    return publishedOnly ? templates : templates;
  }

  async pinProject(projectId: number, userId: number): Promise<void> {
    await db
      .update(projects)
      .set({ isPinned: true })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)));
  }

  async unpinProject(projectId: number, userId: number): Promise<void> {
    await db
      .update(projects)
      .set({ isPinned: false })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)));
  }

  async createLoginHistory(history: any): Promise<any> {
    // Simple implementation - just log for now since we don't have a login_history table
    console.log('Login attempt logged:', history);
    return { id: Date.now(), ...history };
  }

  // Admin API Key operations (for centralized AI services)
  async getActiveAdminApiKey(provider: string): Promise<any> {
    // For now, return the environment variables as admin keys
    const envKeyMap: Record<string, string> = {
      'openai': 'OPENAI_API_KEY',
      'anthropic': 'ANTHROPIC_API_KEY',
      'gemini': 'GEMINI_API_KEY',
      'xai': 'XAI_API_KEY',
      'perplexity': 'PERPLEXITY_API_KEY',
      'mixtral': 'MIXTRAL_API_KEY',
      'llama': 'LLAMA_API_KEY',
      'cohere': 'COHERE_API_KEY',
      'deepseek': 'DEEPSEEK_API_KEY',
      'mistral': 'MISTRAL_API_KEY'
    };
    
    const envKey = envKeyMap[provider];
    if (envKey && process.env[envKey]) {
      return {
        provider,
        apiKey: process.env[envKey],
        isActive: true
      };
    }
    
    return null;
  }

  async trackAIUsage(userId: number, tokens: number, mode: string): Promise<void> {
    // For now, just log the usage
    console.log(`AI usage tracked - User: ${userId}, Tokens: ${tokens}, Mode: ${mode}`);
  }

  async createAiUsageRecord(record: any): Promise<any> {
    // For now, just log and return the record
    console.log('AI usage record created:', record);
    return { id: Date.now(), ...record, createdAt: new Date() };
  }

  async updateUserAiTokens(userId: number, tokensUsed: number): Promise<void> {
    // For now, just log the token usage
    console.log(`Updated AI tokens for user ${userId}: ${tokensUsed} tokens used`);
  }

  // Deployment operations
  async createDeployment(deploymentData: InsertDeployment): Promise<Deployment> {
    const [deployment] = await db.insert(deployments).values(deploymentData).returning();
    return deployment;
  }

  async getDeployments(projectId: number): Promise<Deployment[]> {
    return await db.select().from(deployments).where(eq(deployments.projectId, projectId));
  }

  async updateDeployment(id: number, deploymentData: Partial<InsertDeployment>): Promise<Deployment | undefined> {
    const [deployment] = await db
      .update(deployments)
      .set({ ...deploymentData, updatedAt: new Date() })
      .where(eq(deployments.id, id))
      .returning();
    return deployment;
  }
  
  // Audit log operations
  async getAuditLogs(filters: { userId?: number; action?: string; dateRange?: string }): Promise<any[]> {
    // For now, return empty array - in production, this would query an audit logs table
    return [];
  }
  
  // Storage operations
  async getStorageBuckets(): Promise<any[]> {
    // Return sample buckets for now - in production, this would query a storage_buckets table
    return [
      {
        id: 'global-assets',
        name: 'global-assets',
        region: 'us-east-1',
        created: new Date('2024-01-01'),
        isPublic: true,
        objectCount: 0,
        totalSize: 0,
      }
    ];
  }
  
  async createStorageBucket(bucket: { projectId: number; name: string; region: string; isPublic: boolean }): Promise<any> {
    // In production, this would create a bucket in the storage_buckets table
    return {
      id: crypto.randomBytes(8).toString('hex'),
      ...bucket,
      created: new Date(),
      objectCount: 0,
      totalSize: 0,
    };
  }
  
  async getProjectStorageBuckets(projectId: number): Promise<any[]> {
    // Return project-specific buckets - in production, query by projectId
    return [
      {
        id: `project-${projectId}-assets`,
        name: `project-${projectId}-assets`,
        region: 'us-east-1',
        created: new Date(),
        isPublic: true,
        objectCount: 0,
        totalSize: 0,
      }
    ];
  }
  
  async getStorageObjects(bucketId: string): Promise<any[]> {
    // Return empty array for now - in production, query storage_objects table
    return [];
  }
  
  async deleteStorageObject(bucketId: string, objectKey: string): Promise<void> {
    // In production, delete from storage_objects table
    console.log(`Deleting object ${objectKey} from bucket ${bucketId}`);
  }
  
  // Team operations
  async getUserTeams(userId: number): Promise<any[]> {
    const userTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        description: teams.description,
        avatar: teams.avatar,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt
      })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, userId));
    
    return userTeams;
  }
  
  // Theme operations
  async getUserThemeSettings(userId: number): Promise<any> {
    // In production, query user_theme_settings table
    return {
      theme: 'dark',
      accentColor: '#0066cc',
      fontSize: 'medium',
      fontFamily: 'system'
    };
  }
  
  async updateUserThemeSettings(userId: number, settings: any): Promise<any> {
    // In production, update user_theme_settings table
    return settings;
  }
  
  async getInstalledThemes(userId: number): Promise<any[]> {
    // In production, query user_installed_themes table
    return [
      { id: 'dark', name: 'Dark', installed: true },
      { id: 'light', name: 'Light', installed: true }
    ];
  }
  
  async installTheme(userId: number, themeId: string): Promise<void> {
    // In production, insert into user_installed_themes table
    console.log(`Installing theme ${themeId} for user ${userId}`);
  }
  
  async uninstallTheme(userId: number, themeId: string): Promise<void> {
    // In production, delete from user_installed_themes table
    console.log(`Uninstalling theme ${themeId} for user ${userId}`);
  }
  
  async createCustomTheme(userId: number, theme: any): Promise<any> {
    // In production, insert into custom_themes table
    return {
      id: `custom-${Date.now()}`,
      ...theme,
      createdBy: userId,
      createdAt: new Date()
    };
  }

  // Comments operations
  async createComment(comment: InsertComment): Promise<Comment> {
    // Map authorId field if it exists in the input
    const commentData = { ...comment };
    if ('authorId' in commentData && !('userId' in commentData)) {
      // @ts-ignore - handling schema mismatch
      commentData.authorId = commentData.authorId || commentData.userId;
    }
    const [newComment] = await db.insert(comments).values(commentData).returning();
    return newComment;
  }

  async getProjectComments(projectId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.projectId, projectId)).orderBy(desc(comments.createdAt));
  }

  async getFileComments(fileId: number): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.fileId, fileId)).orderBy(desc(comments.createdAt));
  }

  async updateComment(id: number, comment: Partial<InsertComment>): Promise<Comment | undefined> {
    const [updated] = await db.update(comments).set({ ...comment, updatedAt: new Date() }).where(eq(comments.id, id)).returning();
    return updated;
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id));
    return result.length > 0;
  }

  // Checkpoints operations
  async createCheckpoint(checkpoint: any): Promise<Checkpoint> {
    const filesSnapshot = await this.getFilesByProjectId(checkpoint.projectId);
    const [newCheckpoint] = await db.insert(checkpoints).values({
      ...checkpoint,
      filesSnapshot: filesSnapshot
    }).returning();
    return newCheckpoint;
  }

  async getProjectCheckpoints(projectId: number): Promise<Checkpoint[]> {
    return await db.select().from(checkpoints).where(eq(checkpoints.projectId, projectId)).orderBy(desc(checkpoints.createdAt));
  }

  async getCheckpoint(id: number): Promise<Checkpoint | undefined> {
    const [checkpoint] = await db.select().from(checkpoints).where(eq(checkpoints.id, id));
    return checkpoint;
  }

  async restoreCheckpoint(checkpointId: number): Promise<boolean> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    if (!checkpoint) return false;
    
    // Restore files from snapshot
    const filesSnapshot = checkpoint.filesSnapshot as any[];
    for (const file of filesSnapshot) {
      await this.updateFile(file.id, { content: file.content });
    }
    return true;
  }

  // Time tracking operations
  async startTimeTracking(tracking: InsertTimeTracking): Promise<TimeTracking> {
    const [newTracking] = await db.insert(projectTimeTracking).values(tracking).returning();
    return newTracking;
  }

  async stopTimeTracking(trackingId: number): Promise<TimeTracking | undefined> {
    const now = new Date();
    const [tracking] = await db.select().from(projectTimeTracking).where(eq(projectTimeTracking.id, trackingId));
    if (!tracking) return undefined;
    
    const duration = Math.floor((now.getTime() - tracking.startTime.getTime()) / 1000);
    const [updated] = await db.update(projectTimeTracking)
      .set({ endTime: now, duration, active: false })
      .where(eq(projectTimeTracking.id, trackingId))
      .returning();
    return updated;
  }

  async getActiveTimeTracking(projectId: number, userId: number): Promise<TimeTracking | undefined> {
    const [tracking] = await db.select().from(projectTimeTracking)
      .where(and(
        eq(projectTimeTracking.projectId, projectId),
        eq(projectTimeTracking.userId, userId),
        eq(projectTimeTracking.active, true)
      ));
    return tracking;
  }

  async getProjectTimeTracking(projectId: number): Promise<TimeTracking[]> {
    return await db.select().from(projectTimeTracking).where(eq(projectTimeTracking.projectId, projectId)).orderBy(desc(projectTimeTracking.startTime));
  }

  // Screenshot operations
  async createScreenshot(screenshot: InsertScreenshot): Promise<Screenshot> {
    const [newScreenshot] = await db.insert(projectScreenshots).values(screenshot).returning();
    return newScreenshot;
  }

  async getProjectScreenshots(projectId: number): Promise<Screenshot[]> {
    return await db.select().from(projectScreenshots).where(eq(projectScreenshots.projectId, projectId)).orderBy(desc(projectScreenshots.createdAt));
  }

  async getScreenshot(id: number): Promise<Screenshot | undefined> {
    const [screenshot] = await db.select().from(projectScreenshots).where(eq(projectScreenshots.id, id));
    return screenshot;
  }

  async deleteScreenshot(id: number): Promise<boolean> {
    const result = await db.delete(projectScreenshots).where(eq(projectScreenshots.id, id));
    return result.length > 0;
  }

  // Task summary operations
  async createTaskSummary(summary: InsertTaskSummary): Promise<TaskSummary> {
    const [newSummary] = await db.insert(taskSummaries).values(summary).returning();
    return newSummary;
  }

  async getProjectTaskSummaries(projectId: number): Promise<TaskSummary[]> {
    return await db.select().from(taskSummaries).where(eq(taskSummaries.projectId, projectId)).orderBy(desc(taskSummaries.createdAt));
  }

  async updateTaskSummary(id: number, summary: Partial<InsertTaskSummary>): Promise<TaskSummary | undefined> {
    const [updated] = await db.update(taskSummaries).set(summary).where(eq(taskSummaries.id, id)).returning();
    return updated;
  }

  // Stripe operations
  async updateUserStripeInfo(userId: number, stripeData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    subscriptionStatus?: string;
    subscriptionCurrentPeriodEnd?: Date;
  }): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ ...stripeData, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateStripeCustomerId(userId: number, customerId: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Usage tracking operations
  async trackUsage(userId: number, eventType: string, quantity: number, metadata?: any): Promise<void> {
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    await db.insert(usageTracking).values({
      userId,
      metricType: eventType,
      value: quantity.toString(),
      unit: metadata?.unit || 'request',
      billingPeriodStart,
      billingPeriodEnd
    });
  }

  async getUsageStats(userId: number, startDate?: Date, endDate?: Date): Promise<any> {
    let query = eq(usageTracking.userId, userId);
    
    if (startDate && endDate) {
      query = and(
        query,
        sql`${usageTracking.billingPeriodStart} >= ${startDate}`,
        sql`${usageTracking.billingPeriodEnd} <= ${endDate}`
      );
    }

    const results = await db.select({
      metricType: usageTracking.metricType,
      total: sql<number>`SUM(CAST(${usageTracking.value} AS NUMERIC))`,
      unit: usageTracking.unit,
      count: sql<number>`COUNT(*)`
    })
    .from(usageTracking)
    .where(query)
    .groupBy(usageTracking.metricType, usageTracking.unit);

    // Transform results into usage stats object
    const stats: any = {};
    results.forEach(row => {
      stats[row.metricType] = {
        total: parseFloat(row.total?.toString() || '0'),
        count: parseInt(row.count?.toString() || '0'),
        unit: row.unit
      };
    });

    return stats;
  }

  async getUserUsage(userId: number, billingPeriodStart?: Date): Promise<any> {
    const query = billingPeriodStart 
      ? and(
          eq(usageTracking.userId, userId),
          eq(usageTracking.billingPeriodStart, billingPeriodStart)
        )
      : eq(usageTracking.userId, userId);

    const results = await db.select({
      metricType: usageTracking.metricType,
      total: sql<number>`SUM(${usageTracking.value})`,
      unit: usageTracking.unit
    })
    .from(usageTracking)
    .where(query)
    .groupBy(usageTracking.metricType, usageTracking.unit);

    // Transform results into usage object
    const usage: any = {};
    results.forEach(row => {
      usage[row.metricType] = {
        used: parseFloat(row.total?.toString() || '0'),
        unit: row.unit
      };
    });

    return usage;
  }

  async getUsageHistory(userId: number, startDate: Date, endDate: Date, metricType?: string): Promise<any[]> {
    let query = and(
      eq(usageTracking.userId, userId),
      gte(usageTracking.timestamp, startDate),
      lte(usageTracking.timestamp, endDate)
    );
    
    if (metricType) {
      query = and(query, eq(usageTracking.metricType, metricType));
    }
    
    const results = await db.select()
      .from(usageTracking)
      .where(query)
      .orderBy(desc(usageTracking.timestamp));
    
    return results.map(row => ({
      id: row.id,
      metricType: row.metricType,
      value: parseFloat(row.value),
      unit: row.unit,
      timestamp: row.timestamp,
      billingPeriodStart: row.billingPeriodStart,
      billingPeriodEnd: row.billingPeriodEnd
    }));
  }

  async getUsageSummary(userId: number, period: string): Promise<any> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    switch (period) {
      case 'current':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    const results = await db.select({
      metricType: usageTracking.metricType,
      total: sql<number>`SUM(CAST(${usageTracking.value} AS NUMERIC))`,
      unit: usageTracking.unit,
      count: sql<number>`COUNT(*)`
    })
    .from(usageTracking)
    .where(and(
      eq(usageTracking.userId, userId),
      gte(usageTracking.timestamp, startDate),
      lte(usageTracking.timestamp, endDate)
    ))
    .groupBy(usageTracking.metricType, usageTracking.unit);
    
    // Transform results into summary object
    const summary: any = {};
    results.forEach(row => {
      summary[row.metricType] = parseFloat(row.total?.toString() || '0');
    });
    
    return summary;
  }

  // Project Imports
  async createProjectImport(data: any): Promise<any> {
    // For now, return a mock import since we don't have the imports table in DB yet
    const importRecord = {
      id: Date.now(),
      ...data,
      createdAt: new Date(),
      completedAt: null
    };
    return importRecord;
  }

  async updateProjectImport(id: number, updates: any): Promise<any> {
    // Mock implementation for now
    return { id, ...updates };
  }

  async getProjectImport(id: number): Promise<any | undefined> {
    // Mock implementation for now
    return undefined;
  }

  async getProjectImports(projectId: number): Promise<any[]> {
    // Mock implementation for now
    return [];
  }

  async createFile(fileData: any): Promise<any> {
    // Mock implementation for file creation
    return { id: Date.now(), ...fileData };
  }

  async getImportStatistics(): Promise<any> {
    // Mock implementation for import statistics
    return {
      figma: 12,
      bolt: 8,
      lovable: 5,
      webContent: 23,
      total: 48,
      recent: [
        {
          id: 1,
          type: 'figma',
          url: 'https://figma.com/file/example',
          projectId: 1,
          status: 'completed',
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          type: 'bolt',
          url: 'https://bolt.new/project',
          projectId: 2,
          status: 'completed',
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 3,
          type: 'lovable',
          url: 'https://lovable.dev/app',
          projectId: 3,
          status: 'processing',
          createdAt: new Date(Date.now() - 7200000).toISOString()
        }
      ]
    };
  }
  
  // Secret management operations
  async createSecret(secret: any): Promise<any> {
    const secretsTable = 'secrets'; // Assuming a secrets table exists
    const [created] = await db.execute(sql`
      INSERT INTO ${sql.identifier(secretsTable)} (user_id, key, value, description, project_id, created_at, updated_at)
      VALUES (${secret.userId}, ${secret.key}, ${secret.value}, ${secret.description || null}, ${secret.projectId || null}, ${new Date()}, ${new Date()})
      RETURNING *
    `);
    return created;
  }
  
  async getProjectSecrets(projectId: number): Promise<any[]> {
    const secretsTable = 'secrets';
    const results = await db.execute(sql`
      SELECT id, key, description, project_id, created_at, updated_at
      FROM ${sql.identifier(secretsTable)}
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `);
    return results.rows || [];
  }
  
  async getSecret(id: number): Promise<any | undefined> {
    const secretsTable = 'secrets';
    const [result] = await db.execute(sql`
      SELECT * FROM ${sql.identifier(secretsTable)}
      WHERE id = ${id}
    `);
    return result;
  }
  
  async deleteSecret(id: number): Promise<boolean> {
    const secretsTable = 'secrets';
    const result = await db.execute(sql`
      DELETE FROM ${sql.identifier(secretsTable)}
      WHERE id = ${id}
    `);
    return result.rowCount > 0;
  }
}

// Initialize storage
export const storage = new DatabaseStorage();

// Session store
const pgStore = connectPg(session);
export const sessionStore = new pgStore({
  pool: client,
  createTableIfMissing: true,
  ttl: 7 * 24 * 60 * 60, // 7 days
});