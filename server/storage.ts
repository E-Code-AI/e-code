// @ts-nocheck
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
  VoiceVideoSession, InsertVoiceVideoSession,
  VoiceVideoParticipant, InsertVoiceVideoParticipant,
  GpuInstance, InsertGpuInstance,
  GpuUsage, InsertGpuUsage,
  Assignment, InsertAssignment,
  Submission, InsertSubmission,

  projects, files, users, apiKeys, codeReviews, reviewComments, reviewApprovals,
  challenges, challengeSubmissions, challengeLeaderboard, mentorProfiles, mentorshipSessions,
  mobileDevices, pushNotifications, teams, teamMembers, deployments,
  comments, checkpoints, projectTimeTracking, projectScreenshots, taskSummaries, usageTracking,
  userCredits, budgetLimits, usageAlerts, autoscaleDeployments, reservedVmDeployments,
  scheduledDeployments, staticDeployments, objectStorageBuckets, objectStorageFiles,
  keyValueStore, aiConversations, dynamicIntelligence, webSearchHistory,
  gitRepositories, gitCommits, customDomains, secrets, environmentVariables,
  voiceVideoSessions, voiceVideoParticipants, gpuInstances, gpuUsage,
  assignments, submissions, aiUsageRecords,
  insertUserCreditsSchema, insertBudgetLimitSchema, insertUsageAlertSchema,
  insertAutoscaleDeploymentSchema, insertReservedVmDeploymentSchema,
  insertScheduledDeploymentSchema, insertStaticDeploymentSchema,
  insertObjectStorageBucketSchema, insertObjectStorageFileSchema,
  insertKeyValueStoreSchema, insertAiConversationSchema,
  insertDynamicIntelligenceSchema, insertWebSearchHistorySchema,
  insertGitRepositorySchema, insertGitCommitSchema, insertCustomDomainSchema,
  insertSecretSchema, insertEnvironmentVariableSchema
} from "@shared/schema";
import { z } from "zod";

// Define the types that were missing
type UserCredits = typeof userCredits.$inferSelect;
type InsertUserCredits = z.infer<typeof insertUserCreditsSchema>;
type BudgetLimit = typeof budgetLimits.$inferSelect;
type InsertBudgetLimit = z.infer<typeof insertBudgetLimitSchema>;
type UsageAlert = typeof usageAlerts.$inferSelect;
type InsertUsageAlert = z.infer<typeof insertUsageAlertSchema>;
type AutoscaleDeployment = typeof autoscaleDeployments.$inferSelect;
type InsertAutoscaleDeployment = z.infer<typeof insertAutoscaleDeploymentSchema>;
type ReservedVmDeployment = typeof reservedVmDeployments.$inferSelect;
type InsertReservedVmDeployment = z.infer<typeof insertReservedVmDeploymentSchema>;
type ScheduledDeployment = typeof scheduledDeployments.$inferSelect;
type InsertScheduledDeployment = z.infer<typeof insertScheduledDeploymentSchema>;
type StaticDeployment = typeof staticDeployments.$inferSelect;
type InsertStaticDeployment = z.infer<typeof insertStaticDeploymentSchema>;
type ObjectStorageBucket = typeof objectStorageBuckets.$inferSelect;
type InsertObjectStorageBucket = z.infer<typeof insertObjectStorageBucketSchema>;
type ObjectStorageFile = typeof objectStorageFiles.$inferSelect;
type InsertObjectStorageFile = z.infer<typeof insertObjectStorageFileSchema>;
type KeyValueStore = typeof keyValueStore.$inferSelect;
type InsertKeyValueStore = z.infer<typeof insertKeyValueStoreSchema>;
type AiConversation = typeof aiConversations.$inferSelect;
type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
type DynamicIntelligence = typeof dynamicIntelligence.$inferSelect;
type InsertDynamicIntelligence = z.infer<typeof insertDynamicIntelligenceSchema>;
type WebSearchHistory = typeof webSearchHistory.$inferSelect;
type InsertWebSearchHistory = z.infer<typeof insertWebSearchHistorySchema>;
type GitRepository = typeof gitRepositories.$inferSelect;
type InsertGitRepository = z.infer<typeof insertGitRepositorySchema>;
type GitCommit = typeof gitCommits.$inferSelect;
type InsertGitCommit = z.infer<typeof insertGitCommitSchema>;
type CustomDomain = typeof customDomains.$inferSelect;
type InsertCustomDomain = z.infer<typeof insertCustomDomainSchema>;

import { eq, and, desc, isNull, sql, inArray, gte, lte, SQL } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import { Store } from "express-session";
import connectPg from "connect-pg-simple";
import { client } from "./db";
import * as crypto from "crypto";
import {
  projectImports,
  type ProjectImport,
  type InsertProjectImport,
} from "@shared/schema/imports";

type ApiKeyInsertModel = typeof apiKeys.$inferInsert;
type CodeReviewInsertModel = typeof codeReviews.$inferInsert;
type ChallengeInsertModel = typeof challenges.$inferInsert;
type MentorProfileInsertModel = typeof mentorProfiles.$inferInsert;

type UsageMetricInput = {
  metricType: string;
  value: number | string;
  unit: string;
  billingPeriodStart?: Date;
  billingPeriodEnd?: Date;
};

type UsageMetricMetadata = {
  unit?: string;
  [key: string]: unknown;
};

const normalizeStringArray = (value: unknown, fallback: string[] = []): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (value === null || value === undefined) {
    return [...fallback];
  }

  return [String(value)];
const toMutableArray = <T>(value: readonly T[] | T[] | null | undefined): T[] | null | undefined => {
  if (Array.isArray(value)) {
    return [...value];
  }
  return value;
};

// Storage interface definition
export interface IStorage {
  // Mobile-specific methods
  getUserByUsername(username: string): Promise<User | undefined>;
  createFile(data: { projectId: number; path: string; content: string }): Promise<File>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(fileId: number, data: { content: string }): Promise<void>;
  updateFile(id: number, file: Partial<InsertFile>): Promise<File | undefined>;
  getTrendingProjects(options: { limit: number }): Promise<any[]>;
  getFeaturedProjects(options: { limit: number }): Promise<any[]>;
  pinProject(projectId: number, userId: number): Promise<void>;
  unpinProject(projectId: number, userId: number): Promise<void>;
  trackUsage(userId: number, data: UsageMetricInput): Promise<void>;
  updateUserStripeInfo(userId: number, data: any): Promise<User | undefined>;
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  upsertUser(user: UpsertUser): Promise<User>;
  saveEmailVerificationToken(email: string, token: string): Promise<void>;

  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  getProjectBySlug(slug: string, ownerId?: number): Promise<Project | null>;
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

  // AI Usage Tracking for billing
  createAIUsageRecord(record: {
    userId: number;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    creditsCost: number;
    purpose?: string;
    projectId?: number;
    metadata?: any;
  }): Promise<any>;
  getAIUsageStats(userId: number, startDate?: Date, endDate?: Date): Promise<any[]>;
  getUserCredits(userId: number): Promise<UserCredits | undefined>;

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
  trackUsage(
    userId: number,
    eventType: string,
    quantity: number,
    metadata?: UsageMetricMetadata
  ): Promise<void>;
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

  // Agent operations
  getAgentWorkSteps(projectId: number, sessionId: string): Promise<any[]>;
  createAgentCheckpoint(checkpoint: {
    projectId: number;
    userId: number;
    message: string;
    changes: number;
    sessionId: string;
    timestamp: Date;
  }): Promise<any>;

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

  // Voice/Video Session operations
  createVoiceVideoSession(session: InsertVoiceVideoSession): Promise<VoiceVideoSession>;
  getProjectVoiceVideoSessions(projectId: number): Promise<VoiceVideoSession[]>;
  endVoiceVideoSession(sessionId: number): Promise<VoiceVideoSession | undefined>;
  addVoiceVideoParticipant(participant: InsertVoiceVideoParticipant): Promise<VoiceVideoParticipant>;
  removeVoiceVideoParticipant(sessionId: number, userId: number): Promise<void>;

  // GPU Instance operations
  createGpuInstance(instance: InsertGpuInstance): Promise<GpuInstance>;
  getProjectGpuInstances(projectId: number): Promise<GpuInstance[]>;
  updateGpuInstanceStatus(instanceId: number, status: string): Promise<GpuInstance | undefined>;
  createGpuUsage(usage: InsertGpuUsage): Promise<GpuUsage>;
  getGpuUsageByInstance(instanceId: number): Promise<GpuUsage[]>;

  // Assignment operations
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignments(filters?: { courseId?: number; createdBy?: number }): Promise<Assignment[]>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined>;

  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionsByAssignment(assignmentId: number): Promise<Submission[]>;
  getSubmissionsByStudent(studentId: number): Promise<Submission[]>;
  gradeSubmission(submissionId: number, grade: number, feedback: string, gradedBy: number): Promise<Submission | undefined>;

  // Secret management operations
  createSecret(secret: any): Promise<any>;
  getProjectSecrets(projectId: number): Promise<any[]>;
  getSecret(id: number): Promise<any | undefined>;
  deleteSecret(id: number): Promise<boolean>;

  // Missing methods from routes.ts
  getProjectCollaborators(projectId: number): Promise<any[]>;
  isProjectCollaborator(projectId: number, userId: number): Promise<boolean>;
  forkProject(projectId: number, userId: number): Promise<Project>;
  likeProject(projectId: number, userId: number): Promise<void>;
  unlikeProject(projectId: number, userId: number): Promise<void>;
  isProjectLiked(projectId: number, userId: number): Promise<boolean>;
  getProjectLikes(projectId: number): Promise<number>;
  trackProjectView(projectId: number, userId: number): Promise<void>;
  getProjectActivity(projectId: number, limit?: number): Promise<any[]>;
  getProjectFiles(projectId: number): Promise<any[]>;
  getFileById(id: number): Promise<any | undefined>;
  getAdminApiKey(provider: string): Promise<any>;
  createCLIToken(userId: number): Promise<any>;
  getUserCLITokens(userId: number): Promise<any[]>;
  getMobileSession(userId: number, deviceId: string): Promise<any | undefined>;
  createMobileSession(session: any): Promise<any>;
  updateMobileSession(userId: number, deviceId: string, session: any): Promise<any | undefined>;
  getUserMobileSessions(userId: number): Promise<any[]>;
  getProjectDeployments(projectId: number): Promise<any[]>;
  getRecentDeployments(userId: number): Promise<any[]>;

  // User Credits and Billing operations
  getUserCredits(userId: number): Promise<any | undefined>;
  createUserCredits(credits: any): Promise<any>;
  updateUserCredits(userId: number, credits: any): Promise<any | undefined>;
  addCredits(userId: number, amount: number): Promise<any | undefined>;
  deductCredits(userId: number, amount: number): Promise<any | undefined>;
  getBudgetLimits(userId: number): Promise<any | undefined>;
  createBudgetLimits(limits: any): Promise<any>;
  updateBudgetLimits(userId: number, limits: any): Promise<any | undefined>;
  createUsageAlert(alert: any): Promise<any>;
  getUsageAlerts(userId: number): Promise<any[]>;
  markAlertSent(alertId: number): Promise<void>;

  // Deployment Type-Specific operations
  createAutoscaleDeployment(config: any): Promise<any>;
  getAutoscaleDeployment(deploymentId: number): Promise<any | undefined>;
  updateAutoscaleDeployment(deploymentId: number, config: any): Promise<any | undefined>;
  createReservedVmDeployment(config: any): Promise<any>;
  getReservedVmDeployment(deploymentId: number): Promise<any | undefined>;
  updateReservedVmDeployment(deploymentId: number, config: any): Promise<any | undefined>;
  createScheduledDeployment(config: any): Promise<any>;
  getScheduledDeployment(deploymentId: number): Promise<any | undefined>;
  updateScheduledDeployment(deploymentId: number, config: any): Promise<any | undefined>;
  createStaticDeployment(config: any): Promise<any>;
  getStaticDeployment(deploymentId: number): Promise<any | undefined>;
  updateStaticDeployment(deploymentId: number, config: any): Promise<any | undefined>;

  // Object Storage operations
  createObjectStorageBucket(bucket: any): Promise<any>;
  getObjectStorageBucket(id: number): Promise<any | undefined>;
  getProjectObjectStorageBuckets(projectId: number): Promise<any[]>;
  deleteObjectStorageBucket(id: number): Promise<boolean>;
  createObjectStorageFile(file: any): Promise<any>;
  getObjectStorageFile(id: number): Promise<any | undefined>;
  getBucketFiles(bucketId: number): Promise<any[]>;
  deleteObjectStorageFile(id: number): Promise<boolean>;

  // Key-Value Store operations
  setKeyValue(projectId: number, key: string, value: any, expiresAt?: Date): Promise<any>;
  getKeyValue(projectId: number, key: string): Promise<any | undefined>;
  deleteKeyValue(projectId: number, key: string): Promise<boolean>;
  getProjectKeyValues(projectId: number): Promise<any[]>;

  // AI Conversation operations
  createAiConversation(conversation: any): Promise<any>;
  getAiConversation(id: number): Promise<any | undefined>;
  getProjectAiConversations(projectId: number): Promise<any[]>;
  updateAiConversation(id: number, updates: any): Promise<any | undefined>;
  addMessageToConversation(conversationId: number, message: any): Promise<any | undefined>;

  // Dynamic Intelligence operations
  getDynamicIntelligence(userId: number): Promise<any | undefined>;
  createDynamicIntelligence(settings: any): Promise<any>;
  updateDynamicIntelligence(userId: number, settings: any): Promise<any | undefined>;

  // Web Search operations
  createWebSearchHistory(search: any): Promise<any>;
  getConversationSearchHistory(conversationId: number): Promise<any[]>;

  // Git Integration operations
  createGitRepository(repo: any): Promise<any>;
  getGitRepository(projectId: number): Promise<any | undefined>;
  updateGitRepository(projectId: number, updates: any): Promise<any | undefined>;
  createGitCommit(commit: any): Promise<any>;
  getRepositoryCommits(repositoryId: number): Promise<any[]>;

  // Custom Domain operations
  createCustomDomain(domain: any): Promise<any>;
  getCustomDomain(id: number): Promise<any | undefined>;
  getProjectCustomDomains(projectId: number): Promise<any[]>;
  updateCustomDomain(id: number, updates: any): Promise<any | undefined>;
  deleteCustomDomain(id: number): Promise<boolean>;

  // Sales and Support operations
  createSalesInquiry(inquiry: any): Promise<any>;
  getSalesInquiries(status?: string): Promise<any[]>;
  updateSalesInquiry(id: number, updates: any): Promise<any | undefined>;
  createAbuseReport(report: any): Promise<any>;
  getAbuseReports(status?: string): Promise<any[]>;
  updateAbuseReport(id: number, updates: any): Promise<any | undefined>;
  
  // Kubernetes User Environment operations
  saveUserEnvironment(environment: any): Promise<void>;
  getUserEnvironment(userId: number): Promise<any | null>;
  updateUserEnvironment(environment: any): Promise<void>;
  deleteUserEnvironment(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private db = db; // Use the imported db instance

  // Mobile-specific project feeds
  async getTrendingProjects({ limit }: { limit: number }): Promise<Project[]> {
    return await this.db
      .select()
      .from(projects)
      .orderBy(desc(projects.views), desc(projects.updatedAt))
      .limit(limit);
  }

  async getFeaturedProjects({ limit }: { limit: number }): Promise<Project[]> {
    return await this.db
      .select()
      .from(projects)
      .where(eq(projects.isPinned, true))
      .orderBy(desc(projects.updatedAt))
      .limit(limit);
  }

  async pinProject(projectId: number, userId: number): Promise<void> {
    await this.db
      .update(projects)
      .set({ isPinned: true, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)));

    // Optionally record the pin action for analytics
    await this.trackUsage(userId, "project.pin", 1, { unit: "action" });
  }

  async unpinProject(projectId: number, userId: number): Promise<void> {
    await this.db
      .update(projects)
      .set({ isPinned: false, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)));

    await this.trackUsage(userId, "project.unpin", 1, { unit: "action" });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await this.db.delete(users).where(eq(users.id, id));
    return result.length > 0;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await this.db
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

  async saveEmailVerificationToken(email: string, token: string): Promise<void> {
    // Store verification token temporarily
    // In production, this would use a separate token storage table
    // For now, we'll just log it
    console.log(`Email verification token for ${email}: ${token}`);
  }

  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    return await this.db.select().from(projects).where(eq(projects.ownerId, userId));
  }

  // Alias for backward compatibility
  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return this.getProjectsByUser(userId);
  }

  async getProjectBySlug(slug: string, ownerId?: number): Promise<Project | null> {
    try {
      const condition =
        ownerId !== undefined
          ? and(eq(projects.slug, slug), eq(projects.ownerId, ownerId))
          : eq(projects.slug, slug);

      const result = await this.db
        .select()
        .from(projects)
        .where(condition)
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error getting project by slug:', error);
      return null;
    }
  }



  async createProject(projectData: InsertProject): Promise<Project> {
    // Import the generateUniqueSlug function
    const { generateUniqueSlug } = await import('./utils/slug');

    // Generate a unique slug if not provided
    if (!projectData.slug && projectData.name) {
      projectData.slug = await generateUniqueSlug(
        projectData.name,
        async (slug) => {
          const existing = await this.getProjectBySlug(slug);
          return !!existing;
        }
      );
    }

    const [project] = await this.db.insert(projects).values(projectData).returning();
    return project;
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await this.db
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await this.db.delete(projects).where(eq(projects.id, id));
    return result.length > 0;
  }

  async incrementProjectViews(id: number): Promise<void> {
    await this.db
      .update(projects)
      .set({ views: sql`${projects.views} + 1` })
      .where(eq(projects.id, id));
  }

  // File operations
  async getFile(id: number): Promise<File | undefined> {
    const [file] = await this.db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async getFilesByProjectId(projectId: number): Promise<File[]> {
    return await this.db.select().from(files).where(eq(files.projectId, projectId)).orderBy(files.path);
  }

  async createFile(data: { projectId: number; path: string; content: string }): Promise<File>;
  async createFile(fileData: InsertFile): Promise<File>;
  async createFile(
    fileData: InsertFile | { projectId: number; path: string; content: string }
  ): Promise<File> {
    const values: InsertFile = "name" in fileData
      ? fileData
      : {
          name: fileData.path.split("/").pop() ?? fileData.path,
          path: fileData.path,
          projectId: fileData.projectId,
          content: fileData.content,
          isDirectory: false,
        };

    const [file] = await this.db.insert(files).values(values).returning();
    return file;
  }

  async updateFile(id: number, data: { content: string }): Promise<void>;
  async updateFile(id: number, fileData: Partial<InsertFile>): Promise<File | undefined>;
  async updateFile(
    id: number,
    fileData: { content: string } | Partial<InsertFile>
  ): Promise<void | (File | undefined)> {
    const update: Partial<InsertFile> = "content" in fileData && Object.keys(fileData).length === 1
      ? { content: fileData.content }
      : { ...fileData };

    const [file] = await this.db
      .update(files)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();

    if ("content" in fileData && Object.keys(fileData).length === 1) {
      return;
    }

    return file;
  }

  async deleteFile(id: number): Promise<boolean> {
    const result = await this.db.delete(files).where(eq(files.id, id));
    return result.length > 0;
  }

  // API Key operations
  async createApiKey(apiKeyData: InsertApiKey): Promise<ApiKey> {
    const values = {
      ...apiKeyData,
      permissions: normalizeStringArray(apiKeyData.permissions, []),
    } satisfies InsertApiKey;

    const [apiKey] = await this.db.insert(apiKeys).values(values).returning();
    return apiKey;
  }

  async getUserApiKeys(userId: number): Promise<ApiKey[]> {
    return await this.db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKey(id: number): Promise<ApiKey | undefined> {
    const [apiKey] = await this.db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey;
  }

  async updateApiKey(id: number, apiKeyData: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    const baseUpdate = apiKeyData as Partial<ApiKeyInsertModel>;
    const updateData: Partial<ApiKeyInsertModel> = {
      ...baseUpdate,
      ...(apiKeyData.permissions !== undefined
        ? {
            permissions: normalizeStringArray(apiKeyData.permissions, []) as ApiKeyInsertModel["permissions"],
          }
        : {}),
    };

    const [apiKey] = await this.db
      .update(apiKeys)
      .set(updateData)
      .where(eq(apiKeys.id, id))
      .returning();
    return apiKey;
  }

  async deleteApiKey(id: number): Promise<boolean> {
    const result = await this.db.delete(apiKeys).where(eq(apiKeys.id, id));
    return result.length > 0;
  }

  // Code Review operations
  async createCodeReview(reviewData: InsertCodeReview): Promise<CodeReview> {
    const values = {
      ...reviewData,
      filesChanged: normalizeStringArray(reviewData.filesChanged, []),
    } satisfies InsertCodeReview;

    const [review] = await this.db.insert(codeReviews).values(values).returning();
    const normalizedReview: InsertCodeReview = {
      ...reviewData,
      filesChanged: toMutableArray<string>(reviewData.filesChanged),
    };

    const [review] = await this.db.insert(codeReviews).values([normalizedReview]).returning();
    return review;
  }

  async getCodeReview(id: number): Promise<CodeReview | undefined> {
    const [review] = await this.db.select().from(codeReviews).where(eq(codeReviews.id, id));
    return review;
  }

  async getProjectCodeReviews(projectId: number): Promise<CodeReview[]> {
    return await this.db.select().from(codeReviews).where(eq(codeReviews.projectId, projectId)).orderBy(desc(codeReviews.createdAt));
  }

  async updateCodeReview(id: number, reviewData: Partial<InsertCodeReview>): Promise<CodeReview | undefined> {
    const baseReview = reviewData as Partial<CodeReviewInsertModel>;
    const reviewUpdate: Partial<CodeReviewInsertModel> = {
      ...baseReview,
      ...(reviewData.filesChanged !== undefined
        ? {
            filesChanged: normalizeStringArray(reviewData.filesChanged, []) as CodeReviewInsertModel["filesChanged"],
          }
        : {}),
      updatedAt: new Date(),
    const normalizedReview: Partial<InsertCodeReview> = {
      ...reviewData,
      filesChanged: toMutableArray<string>(reviewData.filesChanged),
    };

    const [review] = await this.db
      .update(codeReviews)
      .set(reviewUpdate)
      .set({ ...normalizedReview, updatedAt: new Date() })
      .where(eq(codeReviews.id, id))
      .returning();
    return review;
  }

  // Challenge operations
  async createChallenge(challengeData: InsertChallenge): Promise<Challenge> {
    const challengeValues = {
      ...challengeData,
      tags: normalizeStringArray(challengeData.tags, []),
      testCases: Array.isArray(challengeData.testCases)
        ? [...challengeData.testCases]
        : [],
    } satisfies InsertChallenge;

    const [challenge] = await this.db.insert(challenges).values(challengeValues).returning();
    const normalizedChallenge: InsertChallenge = {
      ...challengeData,
      tags: toMutableArray<string>(challengeData.tags),
      testCases: toMutableArray<any>(challengeData.testCases),
    };

    const [challenge] = await this.db.insert(challenges).values([normalizedChallenge]).returning();
    return challenge;
  }

  async getChallenge(id: number): Promise<Challenge | undefined> {
    const [challenge] = await this.db.select().from(challenges).where(eq(challenges.id, id));
    return challenge;
  }

  async getChallengesByCategory(category: string): Promise<Challenge[]> {
    return await this.db.select().from(challenges).where(eq(challenges.category, category)).orderBy(desc(challenges.createdAt));
  }

  async updateChallenge(id: number, challengeData: Partial<InsertChallenge>): Promise<Challenge | undefined> {
    const baseChallenge = challengeData as Partial<ChallengeInsertModel>;
    const challengeUpdate: Partial<ChallengeInsertModel> = {
      ...baseChallenge,
      ...(challengeData.tags !== undefined
        ? { tags: normalizeStringArray(challengeData.tags, []) as ChallengeInsertModel["tags"] }
        : {}),
      updatedAt: new Date(),
    const normalizedChallenge: Partial<InsertChallenge> = {
      ...challengeData,
      tags: toMutableArray<string>(challengeData.tags),
      testCases: toMutableArray<any>(challengeData.testCases),
    };

    const [challenge] = await this.db
      .update(challenges)
      .set(challengeUpdate)
      .set({ ...normalizedChallenge, updatedAt: new Date() })
      .where(eq(challenges.id, id))
      .returning();
    return challenge;
  }

  // Mentorship operations
  async createMentorProfile(profileData: InsertMentorProfile): Promise<MentorProfile> {
    const profileValues = {
      ...profileData,
      expertise: normalizeStringArray(profileData.expertise, []),
      availability:
        profileData.availability && typeof profileData.availability === "object"
          ? { ...profileData.availability }
          : {},
    } satisfies InsertMentorProfile;

    const [profile] = await this.db.insert(mentorProfiles).values(profileValues).returning();
    const normalizedProfile: InsertMentorProfile = {
      ...profileData,
      expertise: toMutableArray<string>(profileData.expertise),
    };

    const [profile] = await this.db.insert(mentorProfiles).values([normalizedProfile]).returning();
    return profile;
  }

  async getMentorProfile(userId: number): Promise<MentorProfile | undefined> {
    const [profile] = await this.db.select().from(mentorProfiles).where(eq(mentorProfiles.userId, userId));
    return profile;
  }

  async updateMentorProfile(userId: number, profileData: Partial<InsertMentorProfile>): Promise<MentorProfile | undefined> {
    const baseMentor = profileData as Partial<MentorProfileInsertModel>;
    const mentorUpdate: Partial<MentorProfileInsertModel> = {
      ...baseMentor,
      ...(profileData.expertise !== undefined
        ? {
            expertise: normalizeStringArray(profileData.expertise, []) as MentorProfileInsertModel["expertise"],
          }
        : {}),
      ...(profileData.availability !== undefined
        ? {
            availability:
              profileData.availability && typeof profileData.availability === "object"
                ? { ...profileData.availability }
                : {},
          }
        : {}),
    const normalizedProfile: Partial<InsertMentorProfile> = {
      ...profileData,
      expertise: toMutableArray<string>(profileData.expertise),
    };

    const [profile] = await this.db
      .update(mentorProfiles)
      .set(mentorUpdate)
      .set({ ...normalizedProfile })
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
    const [deployment] = await this.db.insert(deployments).values(deploymentData).returning();
    return deployment;
  }

  async getDeployments(projectId: number): Promise<Deployment[]> {
    return await this.db.select().from(deployments).where(eq(deployments.projectId, projectId));
  }

  async updateDeployment(id: number, deploymentData: Partial<InsertDeployment>): Promise<Deployment | undefined> {
    const [deployment] = await this.db
      .update(deployments)
      .set({ ...deploymentData, updatedAt: new Date() })
      .where(eq(deployments.id, id))
      .returning();
    return deployment;
  }

  async getProjectDeployments(projectId: number): Promise<Deployment[]> {
    return await this.db.select().from(deployments).where(eq(deployments.projectId, projectId));
  }

  async getRecentDeployments(userId: number): Promise<Deployment[]> {
    const userProjects = await this.getProjectsByUser(userId);
    const projectIds = userProjects.map(p => p.id);

    if (projectIds.length === 0) return [];

    return await this.db
      .select()
      .from(deployments)
      .where(sql`${deployments.projectId} = ANY(${projectIds})`)
      .orderBy(desc(deployments.createdAt))
      .limit(10);
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
    const userTeams = await this.db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        description: teams.description,
        // logo: teams.logo, // Field doesn't exist in schema
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
    const [newComment] = await this.db.insert(comments).values(commentData).returning();
    return newComment;
  }

  async getProjectComments(projectId: number): Promise<Comment[]> {
    return await this.db.select().from(comments).where(eq(comments.projectId, projectId)).orderBy(desc(comments.createdAt));
  }

  async getFileComments(fileId: number): Promise<Comment[]> {
    return await this.db.select().from(comments).where(eq(comments.fileId, fileId)).orderBy(desc(comments.createdAt));
  }

  async updateComment(id: number, comment: Partial<InsertComment>): Promise<Comment | undefined> {
    const [updated] = await this.db.update(comments).set({ ...comment, updatedAt: new Date() }).where(eq(comments.id, id)).returning();
    return updated;
  }

  async deleteComment(id: number): Promise<boolean> {
    const result = await this.db.delete(comments).where(eq(comments.id, id));
    return result.length > 0;
  }

  // Checkpoints operations
  async createCheckpoint(checkpoint: any): Promise<Checkpoint> {
    const filesSnapshot = await this.getFilesByProjectId(checkpoint.projectId);
    const [newCheckpoint] = await this.db.insert(checkpoints).values({
      ...checkpoint,
      // Store files snapshot in metadata field instead
    }).returning();
    return newCheckpoint;
  }

  async getProjectCheckpoints(projectId: number): Promise<Checkpoint[]> {
    return await this.db.select().from(checkpoints).where(eq(checkpoints.projectId, projectId)).orderBy(desc(checkpoints.createdAt));
  }

  // Agent operations
  async getAgentWorkSteps(projectId: number, sessionId: string): Promise<any[]> {
    // For now, return empty array as we don't have a dedicated table for work steps
    // In a real implementation, this would query a work_steps table
    return [];
  }

  async createAgentCheckpoint(checkpoint: {
    projectId: number;
    userId: number;
    message: string;
    changes: number;
    sessionId: string;
    timestamp: Date;
  }): Promise<any> {
    // Create a checkpoint using the existing checkpoint system
    const newCheckpoint = await this.createCheckpoint({
      projectId: checkpoint.projectId,
      userId: checkpoint.userId,
      message: checkpoint.message,
      metadata: {
        changes: checkpoint.changes,
        sessionId: checkpoint.sessionId,
        agentCheckpoint: true
      }
    });
    return newCheckpoint;
  }

  async getCheckpoint(id: number): Promise<Checkpoint | undefined> {
    const [checkpoint] = await this.db.select().from(checkpoints).where(eq(checkpoints.id, id));
    return checkpoint;
  }

  async restoreCheckpoint(checkpointId: number): Promise<boolean> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    if (!checkpoint) return false;

    // Restore files from snapshot
    const filesSnapshot = checkpoint.metadata as any; // Use metadata field instead of filesSnapshot
    for (const file of filesSnapshot) {
      await this.updateFile(file.id, { content: file.content });
    }
    return true;
  }

  // Time tracking operations
  async startTimeTracking(tracking: InsertTimeTracking): Promise<TimeTracking> {
    const [newTracking] = await this.db.insert(projectTimeTracking).values(tracking).returning();
    return newTracking;
  }

  async stopTimeTracking(trackingId: number): Promise<TimeTracking | undefined> {
    const now = new Date();
    const [tracking] = await this.db.select().from(projectTimeTracking).where(eq(projectTimeTracking.id, trackingId));
    if (!tracking) return undefined;

    const duration = Math.floor((now.getTime() - tracking.startTime.getTime()) / 1000);
    const [updated] = await this.db.update(projectTimeTracking)
      .set({ endTime: now, duration, active: false })
      .where(eq(projectTimeTracking.id, trackingId))
      .returning();
    return updated;
  }

  async getActiveTimeTracking(projectId: number, userId: number): Promise<TimeTracking | undefined> {
    const [tracking] = await this.db.select().from(projectTimeTracking)
      .where(and(
        eq(projectTimeTracking.projectId, projectId),
        eq(projectTimeTracking.userId, userId),
        eq(projectTimeTracking.active, true)
      ));
    return tracking;
  }

  async getProjectTimeTracking(projectId: number): Promise<TimeTracking[]> {
    return await this.db.select().from(projectTimeTracking).where(eq(projectTimeTracking.projectId, projectId)).orderBy(desc(projectTimeTracking.startTime));
  }

  // Screenshot operations
  async createScreenshot(screenshot: InsertScreenshot): Promise<Screenshot> {
    const [newScreenshot] = await this.db.insert(projectScreenshots).values(screenshot).returning();
    return newScreenshot;
  }

  async getProjectScreenshots(projectId: number): Promise<Screenshot[]> {
    return await this.db.select().from(projectScreenshots).where(eq(projectScreenshots.projectId, projectId)).orderBy(desc(projectScreenshots.createdAt));
  }

  async getScreenshot(id: number): Promise<Screenshot | undefined> {
    const [screenshot] = await this.db.select().from(projectScreenshots).where(eq(projectScreenshots.id, id));
    return screenshot;
  }

  async deleteScreenshot(id: number): Promise<boolean> {
    const result = await this.db.delete(projectScreenshots).where(eq(projectScreenshots.id, id));
    return result.length > 0;
  }

  // Task summary operations
  async createTaskSummary(summary: InsertTaskSummary): Promise<TaskSummary> {
    const [newSummary] = await this.db.insert(taskSummaries).values(summary).returning();
    return newSummary;
  }

  async getProjectTaskSummaries(projectId: number): Promise<TaskSummary[]> {
    return await this.db.select().from(taskSummaries).where(eq(taskSummaries.projectId, projectId)).orderBy(desc(taskSummaries.createdAt));
  }

  async updateTaskSummary(id: number, summary: Partial<InsertTaskSummary>): Promise<TaskSummary | undefined> {
    const [updated] = await this.db.update(taskSummaries).set(summary).where(eq(taskSummaries.id, id)).returning();
    return updated;
  }

  // Stripe operations
  async updateUserStripeInfo(userId: number, data: any): Promise<User | undefined>;
  async updateUserStripeInfo(
    userId: number,
    stripeData: {
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      stripePriceId?: string;
      subscriptionStatus?: string;
      subscriptionCurrentPeriodEnd?: Date;
    }
  ): Promise<User | undefined>;
  async updateUserStripeInfo(
    userId: number,
    stripeData: any
  ): Promise<User | undefined> {
    const updatePayload = {
      ...stripeData,
      updatedAt: new Date(),
    };

    const [updated] = await this.db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, userId))
      .returning();

    return updated;
  }

  async updateStripeCustomerId(userId: number, customerId: string): Promise<User | undefined> {
    const [updated] = await this.db.update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  // Usage tracking operations
  async trackUsage(userId: number, data: UsageMetricInput): Promise<void>;
  async trackUsage(
    userId: number,
    eventType: string,
    quantity: number,
    metadata?: UsageMetricMetadata
  ): Promise<void>;
  async trackUsage(
    userId: number,
    arg2: UsageMetricInput | string,
    arg3?: number,
    arg4?: UsageMetricMetadata
  ): Promise<void> {
    const now = new Date();
    const defaultPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const metric: UsageMetricInput =
      typeof arg2 === "string"
        ? {
            metricType: arg2,
            value: arg3 ?? 0,
            unit: arg4?.unit ?? "request",
            billingPeriodStart: defaultPeriodStart,
            billingPeriodEnd: defaultPeriodEnd,
          }
        : {
            metricType: arg2.metricType,
            value: arg2.value,
            unit: arg2.unit,
            billingPeriodStart: arg2.billingPeriodStart ?? defaultPeriodStart,
            billingPeriodEnd: arg2.billingPeriodEnd ?? defaultPeriodEnd,
          };

    const billingPeriodStart = metric.billingPeriodStart ?? defaultPeriodStart;
    const billingPeriodEnd = metric.billingPeriodEnd ?? defaultPeriodEnd;

    await this.db.insert(usageTracking).values({
      userId,
      metricType: metric.metricType,
      value: typeof metric.value === "number" ? metric.value.toString() : metric.value,
      unit: metric.unit,
      billingPeriodStart,
      billingPeriodEnd,
    });
  }

  async getUsageStats(userId: number, startDate?: Date, endDate?: Date): Promise<any> {
    let query = eq(usageTracking.userId, userId);

    if (startDate && endDate) {
      query = and(
        query,
        sql`${usageTracking.billingPeriodStart} >= ${startDate}`,
        sql`${usageTracking.billingPeriodEnd} <= ${endDate}`
      ) as any;
    }

    const results = await this.db.select({
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

    const results = await this.db.select({
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

    const results = await this.db.select()
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

    const results = await this.db.select({
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
  async createProjectImport(data: any): Promise<ProjectImport> {
    const importType = (data.importType ?? data.type ?? '').trim();
    const sourceUrl = data.sourceUrl ?? data.url;

    if (!data.projectId || !data.userId || !importType || !sourceUrl) {
      throw new Error('Invalid project import data');
    }

    const insertData: InsertProjectImport = {
      projectId: data.projectId,
      userId: data.userId,
      importType,
      sourceUrl,
      status: data.status ?? 'pending',
      metadata: typeof data.metadata === 'object' && data.metadata !== null ? data.metadata : {},
    };

    if (data.completedAt) {
      insertData.completedAt = data.completedAt;
    }

    if (data.error) {
      insertData.error = data.error;
    }

    const [created] = await this.db
      .insert(projectImports)
      .values(insertData)
      .returning();

    return {
      ...created,
      type: created.importType,
      url: created.sourceUrl,
    };
  }

  async updateProjectImport(id: number, updates: any): Promise<ProjectImport | undefined> {
    const updateData: Partial<InsertProjectImport> = {};

    if (updates?.projectId) {
      updateData.projectId = updates.projectId;
    }

    if (updates?.userId) {
      updateData.userId = updates.userId;
    }

    if (updates?.importType || updates?.type) {
      updateData.importType = updates.importType ?? updates.type;
    }

    if (updates?.sourceUrl || updates?.url) {
      updateData.sourceUrl = updates.sourceUrl ?? updates.url;
    }

    if (updates?.status) {
      updateData.status = updates.status;
    }

    if (updates?.metadata !== undefined) {
      updateData.metadata = typeof updates.metadata === 'object' && updates.metadata !== null
        ? updates.metadata
        : {};
    }

    if (updates?.completedAt !== undefined) {
      updateData.completedAt = updates.completedAt;
    }

    if (updates?.error !== undefined) {
      updateData.error = updates.error;
    }

    if (Object.keys(updateData).length === 0) {
      return await this.getProjectImport(id);
    }

    const [updated] = await this.db
      .update(projectImports)
      .set(updateData)
      .where(eq(projectImports.id, id))
      .returning();

    if (!updated) {
      return undefined;
    }

    return {
      ...updated,
      type: updated.importType,
      url: updated.sourceUrl,
    };
  }

  async getProjectImport(id: number): Promise<ProjectImport | undefined> {
    const [record] = await this.db
      .select()
      .from(projectImports)
      .where(eq(projectImports.id, id));

    if (!record) {
      return undefined;
    }

    return {
      ...record,
      type: record.importType,
      url: record.sourceUrl,
    };
  }

  async getProjectImports(projectId: number): Promise<ProjectImport[]> {
    const records = await this.db
      .select()
      .from(projectImports)
      .where(eq(projectImports.projectId, projectId))
      .orderBy(desc(projectImports.createdAt));

    return records.map((record) => ({
      ...record,
      type: record.importType,
      url: record.sourceUrl,
    }));
  }

  async getImportStatistics(): Promise<any> {
    const [counts, recent] = await Promise.all([
      this.db
        .select({
          importType: projectImports.importType,
          count: sql<number>`COUNT(*)`,
        })
        .from(projectImports)
        .groupBy(projectImports.importType),
      this.db
        .select()
        .from(projectImports)
        .orderBy(desc(projectImports.createdAt))
        .limit(10),
    ]);

    const stats = {
      figma: 0,
      bolt: 0,
      lovable: 0,
      webContent: 0,
      total: 0,
      byType: {} as Record<string, number>,
      recent: [] as any[],
    };

    counts.forEach(({ importType, count }) => {
      const normalized = (importType || '').toLowerCase();
      const numericCount = Number(count) || 0;

      stats.total += numericCount;
      stats.byType[importType] = numericCount;

      switch (normalized) {
        case 'figma':
          stats.figma = numericCount;
          break;
        case 'bolt':
          stats.bolt = numericCount;
          break;
        case 'lovable':
          stats.lovable = numericCount;
          break;
        case 'web':
        case 'web_content':
        case 'webcontent':
        case 'web-import':
          stats.webContent += numericCount;
          break;
        default:
          break;
      }
    });

    stats.recent = recent.map((item) => ({
      ...item,
      type: item.importType,
      url: item.sourceUrl,
    }));

    return stats;
  }

  // Secret management operations
  async createSecret(secret: any): Promise<any> {
    const secretsTable = 'secrets'; // Assuming a secrets table exists
    const [created] = await this.db.execute(sql`
      INSERT INTO ${sql.identifier(secretsTable)} (user_id, key, value, description, project_id, created_at, updated_at)
      VALUES (${secret.userId}, ${secret.key}, ${secret.value}, ${secret.description || null}, ${secret.projectId || null}, ${new Date()}, ${new Date()})
      RETURNING *
    `);
    return created;
  }

  async getProjectSecrets(projectId: number): Promise<any[]> {
    const secretsTable = 'secrets';
    const results = await this.db.execute(sql`
      SELECT id, key, description, project_id, created_at, updated_at
      FROM ${sql.identifier(secretsTable)}
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `);
    return results || [];
  }

  async getSecret(id: number): Promise<any | undefined> {
    const secretsTable = 'secrets';
    const [result] = await this.db.execute(sql`
      SELECT * FROM ${sql.identifier(secretsTable)}
      WHERE id = ${id}
    `);
    return result;
  }

  async deleteSecret(id: number): Promise<boolean> {
    const secretsTable = 'secrets';
    const result = await this.db.execute(sql`
      DELETE FROM ${sql.identifier(secretsTable)}
      WHERE id = ${id}
    `);
    return (result as any).length > 0;
  }

  // Deployment methods
  async saveDeployment(deployment: any): Promise<void> {
    // Store deployment in memory or database
    console.log('Saving deployment:', deployment);
  }

  async getDeployment(deploymentId: string): Promise<any | null> {
    // Retrieve deployment from storage
    return null;
  }



  // Collaboration methods
  async getProjectCollaborators(projectId: number): Promise<any[]> {
    // Return empty array for now - proper implementation would use a collaborators table
    return [];
  }

  async isProjectCollaborator(projectId: number, userId: number): Promise<boolean> {
    const project = await this.getProject(projectId);
    return project?.ownerId === userId;
  }

  // Project activity methods
  async forkProject(projectId: number, userId: number): Promise<Project> {
    const originalProject = await this.getProject(projectId);
    if (!originalProject) throw new Error('Project not found');

    const forkedProject = await this.createProject({
      name: `${originalProject.name} (Fork)`,
      ownerId: userId,
      description: originalProject.description,
      language: originalProject.language,
      visibility: 'private',
      forkedFromId: projectId
    });

    // Copy files from original project
    const originalFiles = await this.getFilesByProjectId(projectId);
    for (const file of originalFiles) {
      await this.createFile({
        projectId: forkedProject.id,
        name: file.name,
        path: file.path,
        content: file.content,
        isDirectory: file.isDirectory
      });
    }

    return forkedProject;
  }

  async likeProject(projectId: number, userId: number): Promise<void> {
    // Placeholder - would use a project_likes table
    await this.db
      .update(projects)
      .set({ likes: sql`${projects.likes} + 1` })
      .where(eq(projects.id, projectId));
  }

  async unlikeProject(projectId: number, userId: number): Promise<void> {
    await this.db
      .update(projects)
      .set({ likes: sql`GREATEST(${projects.likes} - 1, 0)` })
      .where(eq(projects.id, projectId));
  }

  async isProjectLiked(projectId: number, userId: number): Promise<boolean> {
    // Placeholder - would check project_likes table
    return false;
  }

  async getProjectLikes(projectId: number): Promise<number> {
    const project = await this.getProject(projectId);
    return project?.likes || 0;
  }

  async trackProjectView(projectId: number, userId: number): Promise<void> {
    await this.incrementProjectViews(projectId);
  }

  async getProjectActivity(projectId: number, limit = 50): Promise<any[]> {
    const fetchLimit = Math.max(limit, 20);

    const [taskEvents, screenshotEvents, timeEntries, commentEvents, importEvents, deploymentEvents, fileEvents] = await Promise.all([
      this.db
        .select({
          id: taskSummaries.id,
          userId: taskSummaries.userId,
          createdAt: taskSummaries.createdAt,
          taskDescription: taskSummaries.taskDescription,
          summary: taskSummaries.summary,
          completed: taskSummaries.completed,
          filesChanged: taskSummaries.filesChanged,
          linesAdded: taskSummaries.linesAdded,
          linesDeleted: taskSummaries.linesDeleted,
        })
        .from(taskSummaries)
        .where(eq(taskSummaries.projectId, projectId))
        .orderBy(desc(taskSummaries.createdAt))
        .limit(fetchLimit),
      this.db
        .select({
          id: projectScreenshots.id,
          userId: projectScreenshots.userId,
          createdAt: projectScreenshots.createdAt,
          url: projectScreenshots.url,
          thumbnailUrl: projectScreenshots.thumbnailUrl,
          description: projectScreenshots.description,
        })
        .from(projectScreenshots)
        .where(eq(projectScreenshots.projectId, projectId))
        .orderBy(desc(projectScreenshots.createdAt))
        .limit(fetchLimit),
      this.db
        .select({
          id: projectTimeTracking.id,
          userId: projectTimeTracking.userId,
          startTime: projectTimeTracking.startTime,
          endTime: projectTimeTracking.endTime,
          duration: projectTimeTracking.duration,
          createdAt: projectTimeTracking.createdAt,
          active: projectTimeTracking.active,
        })
        .from(projectTimeTracking)
        .where(eq(projectTimeTracking.projectId, projectId))
        .orderBy(desc(projectTimeTracking.createdAt))
        .limit(fetchLimit),
      this.db
        .select({
          id: comments.id,
          authorId: comments.authorId,
          createdAt: comments.createdAt,
          content: comments.content,
          fileId: comments.fileId,
          lineNumber: comments.lineNumber,
          resolved: comments.resolved,
        })
        .from(comments)
        .where(eq(comments.projectId, projectId))
        .orderBy(desc(comments.createdAt))
        .limit(fetchLimit),
      this.db
        .select({
          id: projectImports.id,
          userId: projectImports.userId,
          createdAt: projectImports.createdAt,
          completedAt: projectImports.completedAt,
          importType: projectImports.importType,
          status: projectImports.status,
          sourceUrl: projectImports.sourceUrl,
          metadata: projectImports.metadata,
          error: projectImports.error,
        })
        .from(projectImports)
        .where(eq(projectImports.projectId, projectId))
        .orderBy(desc(projectImports.createdAt))
        .limit(fetchLimit),
      this.db
        .select({
          id: deployments.id,
          createdAt: deployments.createdAt,
          status: deployments.status,
          environment: deployments.environment,
          type: deployments.type,
          url: deployments.url,
          metadata: deployments.metadata,
        })
        .from(deployments)
        .where(eq(deployments.projectId, projectId))
        .orderBy(desc(deployments.createdAt))
        .limit(fetchLimit),
      this.db
        .select({
          id: files.id,
          name: files.name,
          path: files.path,
          isDirectory: files.isDirectory,
          createdAt: files.createdAt,
          updatedAt: files.updatedAt,
        })
        .from(files)
        .where(eq(files.projectId, projectId))
        .orderBy(desc(files.updatedAt))
        .limit(fetchLimit),
    ]);

    const activities = [
      ...taskEvents.map((task) => ({
        id: `task-${task.id}`,
        type: 'task_summary',
        userId: task.userId,
        timestamp: task.createdAt,
        details: {
          description: task.taskDescription,
          summary: task.summary,
          completed: task.completed,
          filesChanged: task.filesChanged,
          linesAdded: task.linesAdded,
          linesDeleted: task.linesDeleted,
        },
      })),
      ...screenshotEvents.map((shot) => ({
        id: `screenshot-${shot.id}`,
        type: 'screenshot',
        userId: shot.userId,
        timestamp: shot.createdAt,
        details: {
          url: shot.url,
          thumbnailUrl: shot.thumbnailUrl,
          description: shot.description,
        },
      })),
      ...timeEntries.map((entry) => ({
        id: `time-${entry.id}`,
        type: 'time_tracking',
        userId: entry.userId,
        timestamp: entry.endTime ?? entry.startTime ?? entry.createdAt,
        details: {
          startTime: entry.startTime,
          endTime: entry.endTime,
          duration: entry.duration,
          active: entry.active,
        },
      })),
      ...commentEvents.map((comment) => ({
        id: `comment-${comment.id}`,
        type: 'comment',
        userId: comment.authorId,
        timestamp: comment.createdAt,
        details: {
          content: comment.content,
          fileId: comment.fileId,
          lineNumber: comment.lineNumber,
          resolved: comment.resolved,
        },
      })),
      ...importEvents.map((imp) => ({
        id: `import-${imp.id}`,
        type: 'import',
        userId: imp.userId,
        timestamp: imp.createdAt,
        details: {
          importType: imp.importType,
          status: imp.status,
          sourceUrl: imp.sourceUrl,
          completedAt: imp.completedAt,
          metadata: imp.metadata,
          error: imp.error,
        },
      })),
      ...deploymentEvents.map((deployment) => ({
        id: `deployment-${deployment.id}`,
        type: 'deployment',
        timestamp: deployment.createdAt,
        details: {
          status: deployment.status,
          environment: deployment.environment,
          deploymentType: deployment.type,
          url: deployment.url,
          metadata: deployment.metadata,
        },
      })),
      ...fileEvents.map((file) => ({
        id: `file-${file.id}`,
        type: file.createdAt?.getTime() === file.updatedAt?.getTime() ? 'file_created' : 'file_updated',
        timestamp: file.updatedAt ?? file.createdAt,
        details: {
          name: file.name,
          path: file.path,
          isDirectory: file.isDirectory,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        },
      })),
    ];

    activities.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime;
    });

    return activities.slice(0, limit);
  }

  // File methods
  async getProjectFiles(projectId: number): Promise<any[]> {
    return await this.getFilesByProjectId(projectId);
  }

  async getFileById(id: number): Promise<any | undefined> {
    return await this.getFile(id);
  }

  async getAdminApiKey(provider: string): Promise<any> {
    return await this.getActiveAdminApiKey(provider);
  }

  // CLI token methods
  async createCLIToken(userId: number): Promise<any> {
    const token = crypto.randomBytes(32).toString('hex');
    const [created] = await this.db.insert(apiKeys).values({
      userId,
      name: 'CLI Token',
      key: token,
      permissions: ['cli:access'],
      lastUsed: null
    }).returning();
    return created;
  }

  async getUserCLITokens(userId: number): Promise<any[]> {
    return await this.db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.userId, userId),
        sql`'cli:access' = ANY(permissions)`
      ))
      .orderBy(desc(apiKeys.createdAt));
  }

  // Mobile session methods
  async getMobileSession(userOrSessionId: number | string, deviceId?: string): Promise<any | undefined> {
    if (typeof userOrSessionId === 'number' && deviceId) {
      const [session] = await this.db
        .select()
        .from(mobileDevices)
        .where(and(
          eq(mobileDevices.userId, userOrSessionId),
          eq(mobileDevices.deviceId, deviceId),
        ))
        .limit(1);

      return session ? this.formatMobileSession(session) : undefined;
    }

    const numericId = typeof userOrSessionId === 'string' ? Number(userOrSessionId) : userOrSessionId;
    if (!Number.isFinite(numericId)) {
      return undefined;
    }

    const [byId] = await this.db
      .select()
      .from(mobileDevices)
      .where(eq(mobileDevices.id, numericId))
      .limit(1);

    return byId ? this.formatMobileSession(byId) : undefined;
  }

  async createMobileSession(session: any): Promise<any> {
    if (!session?.userId || !session?.deviceId || !session?.platform) {
      throw new Error('Invalid mobile session data');
    }

    const existing = await this.getMobileSession(session.userId, session.deviceId);
    if (existing) {
      return await this.updateMobileSession(session.userId, session.deviceId, session);
    }

    const now = new Date();

    const [created] = await this.db
      .insert(mobileDevices)
      .values({
        userId: session.userId,
        deviceId: session.deviceId,
        platform: session.platform,
        deviceName: session.deviceModel ?? session.deviceName ?? session.deviceId,
        pushToken: session.pushToken ?? null,
        appVersion: session.appVersion ?? null,
        isActive: session.isActive ?? true,
        lastSeen: now,
      })
      .returning();

    return this.formatMobileSession(created, {
      osVersion: session.osVersion,
      deviceModel: session.deviceModel ?? session.deviceName,
      lastActiveAt: now,
      pushToken: session.pushToken,
      appVersion: session.appVersion,
      platform: session.platform,
      isActive: session.isActive ?? true,
    });
  }

  async updateMobileSession(userOrSessionId: number, deviceOrUpdates: any, maybeUpdates?: any): Promise<any | undefined> {
    let whereClause;
    let updates;

    if (typeof deviceOrUpdates === 'string') {
      updates = maybeUpdates ?? {};
      whereClause = and(
        eq(mobileDevices.userId, userOrSessionId),
        eq(mobileDevices.deviceId, deviceOrUpdates),
      );
    } else {
      updates = deviceOrUpdates ?? {};
      whereClause = eq(mobileDevices.id, userOrSessionId);
    }

    const updateData = this.buildMobileSessionUpdate(updates);

    if (Object.keys(updateData).length === 0) {
      if (typeof deviceOrUpdates === 'string') {
        return await this.getMobileSession(userOrSessionId, deviceOrUpdates);
      }

      return await this.getMobileSession(userOrSessionId);
    }

    const [updated] = await this.db
      .update(mobileDevices)
      .set(updateData)
      .where(whereClause)
      .returning();

    if (!updated) {
      return undefined;
    }

    return this.formatMobileSession(updated, updates);
  }

  async getUserMobileSessions(userId: number): Promise<any[]> {
    const sessions = await this.db
      .select()
      .from(mobileDevices)
      .where(eq(mobileDevices.userId, userId))
      .orderBy(desc(mobileDevices.lastSeen));

    return sessions.map((session) => this.formatMobileSession(session));
  }

  private buildMobileSessionUpdate(updates: any): Record<string, any> {
    const data: Record<string, any> = {};

    if (updates?.platform !== undefined) {
      data.platform = updates.platform;
    }

    if (updates?.appVersion !== undefined) {
      data.appVersion = updates.appVersion;
    }

    if (updates?.pushToken !== undefined) {
      data.pushToken = updates.pushToken;
    }

    if (updates?.deviceModel !== undefined || updates?.deviceName !== undefined) {
      data.deviceName = updates.deviceModel ?? updates.deviceName;
    }

    if (updates?.isActive !== undefined) {
      data.isActive = updates.isActive;
    }

    if (updates?.lastActiveAt) {
      data.lastSeen = updates.lastActiveAt;
    } else if (updates?.lastSeen) {
      data.lastSeen = updates.lastSeen;
    }

    if (Object.keys(data).length > 0 && data.lastSeen === undefined) {
      data.lastSeen = new Date();
    }

    return data;
  }

  private formatMobileSession(record: any, overrides: any = {}) {
    const lastActive = overrides.lastActiveAt
      ?? overrides.lastSeen
      ?? record.lastSeen
      ?? record.updatedAt
      ?? record.createdAt
      ?? new Date();

    return {
      id: record.id,
      userId: record.userId,
      deviceId: record.deviceId,
      platform: overrides.platform ?? record.platform,
      appVersion: overrides.appVersion ?? record.appVersion,
      pushToken: overrides.pushToken ?? record.pushToken,
      deviceModel: overrides.deviceModel ?? overrides.deviceName ?? record.deviceName ?? null,
      osVersion: overrides.osVersion ?? record.osVersion ?? 'unknown',
      isActive: overrides.isActive ?? record.isActive ?? true,
      lastActiveAt: lastActive,
      lastActive: lastActive,
      createdAt: record.createdAt,
    };
  }

  // User Credits and Billing operations
  async getUserCredits(userId: number): Promise<UserCredits | undefined> {
    const [credits] = await this.db.select().from(userCredits).where(eq(userCredits.userId, userId));

    // If no credits record exists, create one with default credits
    if (!credits) {
      const [newCredits] = await this.db
        .insert(userCredits)
        .values({ userId })
        .returning();
      return newCredits;
    }

    return credits;
  }

  async createUserCredits(credits: InsertUserCredits): Promise<UserCredits> {
    const [created] = await this.db.insert(userCredits).values(credits).returning();
    return created;
  }

  async updateUserCredits(userId: number, credits: Partial<InsertUserCredits>): Promise<UserCredits | undefined> {
    const [updated] = await this.db
      .update(userCredits)
      .set({ ...credits, updatedAt: new Date() })
      .where(eq(userCredits.userId, userId))
      .returning();
    return updated;
  }

  async addCredits(userId: number, amount: number): Promise<UserCredits | undefined> {
    const [updated] = await this.db
      .update(userCredits)
      .set({ 
        remainingCredits: sql`${userCredits.remainingCredits} + ${amount}`,
        extraCredits: sql`${userCredits.extraCredits} + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(userCredits.userId, userId))
      .returning();
    return updated;
  }

  async deductCredits(userId: number, amount: number): Promise<UserCredits | undefined> {
    const [updated] = await this.db
      .update(userCredits)
      .set({ 
        remainingCredits: sql`GREATEST(${userCredits.remainingCredits} - ${amount}, 0)`,
        updatedAt: new Date()
      })
      .where(eq(userCredits.userId, userId))
      .returning();
    return updated;
  }

  async getBudgetLimits(userId: number): Promise<BudgetLimit | undefined> {
    const [limits] = await this.db.select().from(budgetLimits).where(eq(budgetLimits.userId, userId));
    return limits;
  }

  async createBudgetLimits(limits: InsertBudgetLimit): Promise<BudgetLimit> {
    const [created] = await this.db.insert(budgetLimits).values(limits).returning();
    return created;
  }

  async updateBudgetLimits(userId: number, limits: Partial<InsertBudgetLimit>): Promise<BudgetLimit | undefined> {
    const [updated] = await this.db
      .update(budgetLimits)
      .set({ ...limits, updatedAt: new Date() })
      .where(eq(budgetLimits.userId, userId))
      .returning();
    return updated;
  }

  async createUsageAlert(alert: InsertUsageAlert): Promise<UsageAlert> {
    const [created] = await this.db.insert(usageAlerts).values(alert).returning();
    return created;
  }

  async getUsageAlerts(userId: number): Promise<UsageAlert[]> {
    return await this.db.select().from(usageAlerts).where(eq(usageAlerts.userId, userId));
  }

  async markAlertSent(alertId: number): Promise<void> {
    await this.db
      .update(usageAlerts)
      .set({ sent: true, sentAt: new Date() })
      .where(eq(usageAlerts.id, alertId));
  }

  // Deployment Type-Specific operations
  async createAutoscaleDeployment(config: InsertAutoscaleDeployment): Promise<AutoscaleDeployment> {
    const [created] = await this.db.insert(autoscaleDeployments).values(config).returning();
    return created;
  }

  async getAutoscaleDeployment(deploymentId: number): Promise<AutoscaleDeployment | undefined> {
    const [deployment] = await this.db.select().from(autoscaleDeployments).where(eq(autoscaleDeployments.deploymentId, deploymentId));
    return deployment;
  }

  async updateAutoscaleDeployment(deploymentId: number, config: Partial<InsertAutoscaleDeployment>): Promise<AutoscaleDeployment | undefined> {
    const [updated] = await this.db
      .update(autoscaleDeployments)
      .set(config)
      .where(eq(autoscaleDeployments.deploymentId, deploymentId))
      .returning();
    return updated;
  }

  async createReservedVmDeployment(config: InsertReservedVmDeployment): Promise<ReservedVmDeployment> {
    const [created] = await this.db.insert(reservedVmDeployments).values(config).returning();
    return created;
  }

  async getReservedVmDeployment(deploymentId: number): Promise<ReservedVmDeployment | undefined> {
    const [deployment] = await this.db.select().from(reservedVmDeployments).where(eq(reservedVmDeployments.deploymentId, deploymentId));
    return deployment;
  }

  async updateReservedVmDeployment(deploymentId: number, config: Partial<InsertReservedVmDeployment>): Promise<ReservedVmDeployment | undefined> {
    const [updated] = await this.db
      .update(reservedVmDeployments)
      .set(config)
      .where(eq(reservedVmDeployments.deploymentId, deploymentId))
      .returning();
    return updated;
  }

  async createScheduledDeployment(config: InsertScheduledDeployment): Promise<ScheduledDeployment> {
    const [created] = await this.db.insert(scheduledDeployments).values(config).returning();
    return created;
  }

  async getScheduledDeployment(deploymentId: number): Promise<ScheduledDeployment | undefined> {
    const [deployment] = await this.db.select().from(scheduledDeployments).where(eq(scheduledDeployments.deploymentId, deploymentId));
    return deployment;
  }

  async updateScheduledDeployment(deploymentId: number, config: Partial<InsertScheduledDeployment>): Promise<ScheduledDeployment | undefined> {
    const [updated] = await this.db
      .update(scheduledDeployments)
      .set(config)
      .where(eq(scheduledDeployments.deploymentId, deploymentId))
      .returning();
    return updated;
  }

  async createStaticDeployment(config: InsertStaticDeployment): Promise<StaticDeployment> {
    const [created] = await this.db.insert(staticDeployments).values(config).returning();
    return created;
  }

  async getStaticDeployment(deploymentId: number): Promise<StaticDeployment | undefined> {
    const [deployment] = await this.db.select().from(staticDeployments).where(eq(staticDeployments.deploymentId, deploymentId));
    return deployment;
  }

  async updateStaticDeployment(deploymentId: number, config: Partial<InsertStaticDeployment>): Promise<StaticDeployment | undefined> {
    const [updated] = await this.db
      .update(staticDeployments)
      .set(config)
      .where(eq(staticDeployments.deploymentId, deploymentId))
      .returning();
    return updated;
  }

  // Object Storage operations
  async createObjectStorageBucket(bucket: InsertObjectStorageBucket): Promise<ObjectStorageBucket> {
    const [created] = await this.db.insert(objectStorageBuckets).values(bucket).returning();
    return created;
  }

  async getObjectStorageBucket(id: number): Promise<ObjectStorageBucket | undefined> {
    const [bucket] = await this.db.select().from(objectStorageBuckets).where(eq(objectStorageBuckets.id, id));
    return bucket;
  }

  async getProjectObjectStorageBuckets(projectId: number): Promise<ObjectStorageBucket[]> {
    return await this.db.select().from(objectStorageBuckets).where(eq(objectStorageBuckets.projectId, projectId));
  }

  async deleteObjectStorageBucket(id: number): Promise<boolean> {
    const result = await this.db.delete(objectStorageBuckets).where(eq(objectStorageBuckets.id, id));
    return result.length > 0;
  }

  async createObjectStorageFile(file: InsertObjectStorageFile): Promise<ObjectStorageFile> {
    const [created] = await this.db.insert(objectStorageFiles).values(file).returning();
    return created;
  }

  async getObjectStorageFile(id: number): Promise<ObjectStorageFile | undefined> {
    const [file] = await this.db.select().from(objectStorageFiles).where(eq(objectStorageFiles.id, id));
    return file;
  }

  async getBucketFiles(bucketId: number): Promise<ObjectStorageFile[]> {
    return await this.db.select().from(objectStorageFiles).where(eq(objectStorageFiles.bucketId, bucketId));
  }

  async deleteObjectStorageFile(id: number): Promise<boolean> {
    const result = await this.db.delete(objectStorageFiles).where(eq(objectStorageFiles.id, id));
    return result.length > 0;
  }

  // Key-Value Store operations
  async setKeyValue(projectId: number, key: string, value: any, expiresAt?: Date): Promise<KeyValueStore> {
    const existing = await this.getKeyValue(projectId, key);

    if (existing) {
      const [updated] = await this.db
        .update(keyValueStore)
        .set({ value, expiresAt, updatedAt: new Date() })
        .where(and(
          eq(keyValueStore.projectId, projectId),
          eq(keyValueStore.key, key)
        ))
        .returning();
      return updated;
    }

    const [created] = await this.db.insert(keyValueStore).values({
      projectId,
      key,
      value,
      expiresAt
    }).returning();
    return created;
  }

  async getKeyValue(projectId: number, key: string): Promise<KeyValueStore | undefined> {
    const [kv] = await this.db
      .select()
      .from(keyValueStore)
      .where(and(
        eq(keyValueStore.projectId, projectId),
        eq(keyValueStore.key, key)
      ));

    if (kv && kv.expiresAt && new Date(kv.expiresAt) < new Date()) {
      await this.deleteKeyValue(projectId, key);
      return undefined;
    }

    return kv;
  }

  async deleteKeyValue(projectId: number, key: string): Promise<boolean> {
    const result = await this.db
      .delete(keyValueStore)
      .where(and(
        eq(keyValueStore.projectId, projectId),
        eq(keyValueStore.key, key)
      ));
    return result.length > 0;
  }

  async getProjectKeyValues(projectId: number): Promise<KeyValueStore[]> {
    const kvs = await this.db
      .select()
      .from(keyValueStore)
      .where(eq(keyValueStore.projectId, projectId));

    // Filter out expired keys
    const now = new Date();
    return kvs.filter(kv => !kv.expiresAt || new Date(kv.expiresAt) >= now);
  }

  // AI Conversation operations
  async createAiConversation(conversation: InsertAiConversation): Promise<AiConversation> {
    const [created] = await this.db.insert(aiConversations).values(conversation).returning();
    return created;
  }

  async getAiConversation(id: number): Promise<AiConversation | undefined> {
    const [conversation] = await this.db.select().from(aiConversations).where(eq(aiConversations.id, id));
    return conversation;
  }

  async getProjectAiConversations(projectId: number): Promise<AiConversation[]> {
    return await this.db.select().from(aiConversations).where(eq(aiConversations.projectId, projectId));
  }

  async updateAiConversation(id: number, updates: Partial<InsertAiConversation>): Promise<AiConversation | undefined> {
    const [updated] = await this.db
      .update(aiConversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiConversations.id, id))
      .returning();
    return updated;
  }

  async addMessageToConversation(conversationId: number, message: any): Promise<AiConversation | undefined> {
    const conversation = await this.getAiConversation(conversationId);
    if (!conversation) return undefined;

    const messages = [...conversation.messages as any[], message];
    const [updated] = await this.db
      .update(aiConversations)
      .set({ 
        messages,
        totalTokensUsed: sql`${aiConversations.totalTokensUsed} + ${message.tokens || 0}`,
        updatedAt: new Date()
      })
      .where(eq(aiConversations.id, conversationId))
      .returning();
    return updated;
  }

  // Dynamic Intelligence operations
  async getDynamicIntelligence(userId: number): Promise<DynamicIntelligence | undefined> {
    const [settings] = await this.db.select().from(dynamicIntelligence).where(eq(dynamicIntelligence.userId, userId));
    return settings;
  }

  async createDynamicIntelligence(settings: InsertDynamicIntelligence): Promise<DynamicIntelligence> {
    const [created] = await this.db.insert(dynamicIntelligence).values(settings).returning();
    return created;
  }

  async updateDynamicIntelligence(userId: number, settings: Partial<InsertDynamicIntelligence>): Promise<DynamicIntelligence | undefined> {
    const [updated] = await this.db
      .update(dynamicIntelligence)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(dynamicIntelligence.userId, userId))
      .returning();
    return updated;
  }

  // Web Search operations
  async createWebSearchHistory(search: InsertWebSearchHistory): Promise<WebSearchHistory> {
    const [created] = await this.db.insert(webSearchHistory).values(search).returning();
    return created;
  }

  async getConversationSearchHistory(conversationId: number): Promise<WebSearchHistory[]> {
    return await this.db.select().from(webSearchHistory).where(eq(webSearchHistory.conversationId, conversationId));
  }

  // Git Integration operations
  async createGitRepository(repo: InsertGitRepository): Promise<GitRepository> {
    const [created] = await this.db.insert(gitRepositories).values(repo).returning();
    return created;
  }

  async getGitRepository(projectId: number): Promise<GitRepository | undefined> {
    const [repo] = await this.db.select().from(gitRepositories).where(eq(gitRepositories.projectId, projectId));
    return repo;
  }

  async updateGitRepository(projectId: number, updates: Partial<InsertGitRepository>): Promise<GitRepository | undefined> {
    const [updated] = await this.db
      .update(gitRepositories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(gitRepositories.projectId, projectId))
      .returning();
    return updated;
  }

  async createGitCommit(commit: InsertGitCommit): Promise<GitCommit> {
    const [created] = await this.db.insert(gitCommits).values(commit).returning();
    return created;
  }

  async getRepositoryCommits(repositoryId: number): Promise<GitCommit[]> {
    return await this.db.select().from(gitCommits).where(eq(gitCommits.repositoryId, repositoryId));
  }

  // Custom Domain operations
  async createCustomDomain(domain: InsertCustomDomain): Promise<CustomDomain> {
    const [created] = await this.db.insert(customDomains).values(domain).returning();
    return created;
  }

  async getCustomDomain(id: number): Promise<CustomDomain | undefined> {
    const [domain] = await this.db.select().from(customDomains).where(eq(customDomains.id, id));
    return domain;
  }

  async getProjectCustomDomains(projectId: number): Promise<CustomDomain[]> {
    return await this.db.select().from(customDomains).where(eq(customDomains.projectId, projectId));
  }

  async updateCustomDomain(id: number, updates: Partial<InsertCustomDomain>): Promise<CustomDomain | undefined> {
    const [updated] = await this.db
      .update(customDomains)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customDomains.id, id))
      .returning();
    return updated;
  }

  async deleteCustomDomain(id: number): Promise<boolean> {
    const result = await this.db.delete(customDomains).where(eq(customDomains.id, id));
    return result.length > 0;
  }

  // Sales and Support operations
  async createSalesInquiry(inquiry: any): Promise<any> {
    return {
      id: Date.now(),
      ...inquiry,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async getSalesInquiries(status?: string): Promise<any[]> {
    // Would query from sales_inquiries table
    return [];
  }

  async updateSalesInquiry(id: number, updates: any): Promise<any | undefined> {
    // Would update sales_inquiries table
    return { id, ...updates };
  }

  async createAbuseReport(report: any): Promise<any> {
    return {
      id: Date.now(),
      ...report,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async getAbuseReports(status?: string): Promise<any[]> {
    // Would query from abuse_reports table
    return [];
  }

  async updateAbuseReport(id: number, updates: any): Promise<any | undefined> {
    // Would update abuse_reports table
    return { id, ...updates };
  }
  
  // Kubernetes User Environment operations
  private userEnvironments = new Map<number, any>();
  
  async saveUserEnvironment(environment: any): Promise<void> {
    this.userEnvironments.set(environment.userId, environment);
    // In production, this would save to a database table
  }
  
  async getUserEnvironment(userId: number): Promise<any | null> {
    return this.userEnvironments.get(userId) || null;
    // In production, this would query from user_environments table
  }
  
  async updateUserEnvironment(environment: any): Promise<void> {
    this.userEnvironments.set(environment.userId, environment);
    // In production, this would update the user_environments table
  }
  
  async deleteUserEnvironment(userId: number): Promise<void> {
    this.userEnvironments.delete(userId);
    // In production, this would delete from user_environments table
  }

  // Voice/Video Session operations
  async createVoiceVideoSession(session: InsertVoiceVideoSession): Promise<VoiceVideoSession> {
    const [created] = await this.db.insert(voiceVideoSessions).values(session).returning();
    return created;
  }

  async getProjectVoiceVideoSessions(projectId: number): Promise<VoiceVideoSession[]> {
    return await this.db.select().from(voiceVideoSessions)
      .where(eq(voiceVideoSessions.projectId, projectId))
      .orderBy(desc(voiceVideoSessions.startedAt));
  }

  async endVoiceVideoSession(sessionId: number): Promise<VoiceVideoSession | undefined> {
    const [updated] = await this.db
      .update(voiceVideoSessions)
      .set({ 
        status: 'ended',
        endedAt: new Date()
      })
      .where(eq(voiceVideoSessions.id, sessionId))
      .returning();
    return updated;
  }

  async addVoiceVideoParticipant(participant: InsertVoiceVideoParticipant): Promise<VoiceVideoParticipant> {
    const [created] = await this.db.insert(voiceVideoParticipants).values(participant).returning();
    return created;
  }

  async removeVoiceVideoParticipant(sessionId: number, userId: number): Promise<void> {
    await this.db
      .update(voiceVideoParticipants)
      .set({ leftAt: new Date() })
      .where(and(
        eq(voiceVideoParticipants.sessionId, sessionId),
        eq(voiceVideoParticipants.userId, userId),
        isNull(voiceVideoParticipants.leftAt)
      ));
  }

  // GPU Instance operations
  async createGpuInstance(instance: InsertGpuInstance): Promise<GpuInstance> {
    const [created] = await this.db.insert(gpuInstances).values(instance).returning();
    return created;
  }

  async getProjectGpuInstances(projectId: number): Promise<GpuInstance[]> {
    return await this.db.select().from(gpuInstances)
      .where(eq(gpuInstances.projectId, projectId))
      .orderBy(desc(gpuInstances.createdAt));
  }

  async updateGpuInstanceStatus(instanceId: number, status: string): Promise<GpuInstance | undefined> {
    const [updated] = await this.db
      .update(gpuInstances)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(gpuInstances.id, instanceId))
      .returning();
    return updated;
  }

  async createGpuUsage(usage: InsertGpuUsage): Promise<GpuUsage> {
    const [created] = await this.db.insert(gpuUsage).values(usage).returning();
    return created;
  }

  async getGpuUsageByInstance(instanceId: number): Promise<GpuUsage[]> {
    return await this.db.select().from(gpuUsage)
      .where(eq(gpuUsage.instanceId, instanceId))
      .orderBy(desc(gpuUsage.createdAt));
  }

  // Assignment operations
  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [created] = await this.db.insert(assignments).values(assignment).returning();
    return created;
  }

  async getAssignments(filters?: { courseId?: number; createdBy?: number }): Promise<Assignment[]> {
    const conditions = [];

    if (filters?.courseId) {
      conditions.push(eq(assignments.courseId, filters.courseId));
    }
    if (filters?.createdBy) {
      conditions.push(eq(assignments.createdBy, filters.createdBy));
    }

    if (conditions.length > 0) {
      return await this.db.select().from(assignments)
        .where(and(...conditions))
        .orderBy(desc(assignments.createdAt));
    }

    return await this.db.select().from(assignments)
      .orderBy(desc(assignments.createdAt));
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    const [assignment] = await this.db.select().from(assignments).where(eq(assignments.id, id));
    return assignment;
  }

  async updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [updated] = await this.db
      .update(assignments)
      .set({ ...assignment, updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    return updated;
  }

  // Submission operations
  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const [created] = await this.db.insert(submissions).values(submission).returning();
    return created;
  }

  async getSubmissionsByAssignment(assignmentId: number): Promise<Submission[]> {
    return await this.db.select().from(submissions)
      .where(eq(submissions.assignmentId, assignmentId))
      .orderBy(desc(submissions.submittedAt));
  }

  async getSubmissionsByStudent(studentId: number): Promise<Submission[]> {
    return await this.db.select().from(submissions)
      .where(eq(submissions.studentId, studentId))
      .orderBy(desc(submissions.submittedAt));
  }

  async gradeSubmission(submissionId: number, grade: number, feedback: string, gradedBy: number): Promise<Submission | undefined> {
    const [updated] = await this.db
      .update(submissions)
      .set({ 
        grade,
        feedback,
        gradedBy,
        gradedAt: new Date(),
        status: 'graded'
      })
      .where(eq(submissions.id, submissionId))
      .returning();
    return updated;
  }

  // AI Usage Tracking for billing
  async createAIUsageRecord(record: {
    userId: number;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    creditsCost: number;
    purpose?: string;
    projectId?: number;
    metadata?: any;
  }): Promise<any> {
    const [created] = await this.db.insert(aiUsageRecords).values({
      userId: record.userId,
      model: record.model,
      provider: record.provider,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      totalTokens: record.totalTokens,
      creditsCost: record.creditsCost.toString(),
      purpose: record.purpose,
      projectId: record.projectId,
      conversationId: record.metadata?.conversationId,
      metadata: record.metadata || {},
    }).returning();

    // Also deduct credits from user account
    await this.db
      .update(userCredits)
      .set({
        remainingCredits: sql`${userCredits.remainingCredits} - ${record.creditsCost}`,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, record.userId));

    return created;
  }

  async getAIUsageStats(userId: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    const filters: SQL[] = [eq(aiUsageRecords.userId, userId)];

    if (startDate) {
      filters.push(gte(aiUsageRecords.createdAt, startDate));
    }

    if (endDate) {
      filters.push(lte(aiUsageRecords.createdAt, endDate));
    }

    const whereClause = filters.length > 1 ? and(...filters) : filters[0];

    return await this.db
      .select()
      .from(aiUsageRecords)
      .where(whereClause)
      .orderBy(desc(aiUsageRecords.createdAt));
  }
}

// Initialize storage
export const storage = new DatabaseStorage();

// Session store with pg pool
import { Pool } from 'pg';

// Create a native pg pool for session store
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const pgStore = connectPg(session);
export const sessionStore = new pgStore({
  pool: pgPool,
  createTableIfMissing: true,
  ttl: 7 * 24 * 60 * 60, // 7 days
});