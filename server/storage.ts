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
  projects, files, users, apiKeys, codeReviews, reviewComments, reviewApprovals,
  challenges, challengeSubmissions, challengeLeaderboard, mentorProfiles, mentorshipSessions,
  mobileDevices, pushNotifications, teams, teamMembers
} from "@shared/schema";
import { eq, and, desc, isNull, sql, inArray } from "drizzle-orm";
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

  async getProjectsByUserId(ownerId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.ownerId, ownerId)).orderBy(desc(projects.updatedAt));
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
    return result.rowCount > 0;
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