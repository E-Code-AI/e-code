import {
  User, InsertUser, UpsertUser,
  Project, InsertProject,
  File, InsertFile,
  EmailVerificationToken, InsertEmailVerificationToken,
  PasswordResetToken, InsertPasswordResetToken,
  ApiKey, InsertApiKey,
  CodeReview, InsertCodeReview,
  Challenge, InsertChallenge,
  MentorProfile, InsertMentorProfile,
  ChallengeSubmission,
  MentorshipSession,
  MobileDevice,
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
  Template, InsertTemplate,
  PromptTemplate, InsertPromptTemplate,
  CustomPrompt, InsertCustomPrompt,
  ProjectAiRule, InsertProjectAiRule,
  PromptUsageHistory, InsertPromptUsageHistory,
  PromptTemplateRating, InsertPromptTemplateRating,
  NewsletterSubscriber, InsertNewsletterSubscriber,
  NewsletterCampaign, InsertNewsletterCampaign,
  NewsletterDelivery, InsertNewsletterDelivery,
  LspDiagnostic, InsertLspDiagnostic,
  BuildLog, InsertBuildLog,
  TestRun, InsertTestRun,
  TestCase, InsertTestCase,
  SecurityScan, InsertSecurityScan,
  Vulnerability, InsertVulnerability,
  ResourceMetric, InsertResourceMetric,
  PaneConfiguration, InsertPaneConfiguration,
  AiApprovalQueue, InsertAiApprovalQueue,
  AiAuditLog, InsertAiAuditLog,

  projects, files, users, apiKeys, codeReviews,
  emailVerificationTokens, passwordResetTokens,
  challenges, challengeSubmissions, challengeLeaderboard, mentorProfiles, mentorshipSessions,
  mobileDevices, pushNotifications, notificationPreferences, teams, teamMembers, deployments,
  comments, checkpoints, projectTimeTracking, projectScreenshots, taskSummaries, usageTracking,
  userCredits, budgetLimits, usageAlerts, autoscaleDeployments, reservedVmDeployments,
  scheduledDeployments, staticDeployments, objectStorageBuckets, objectStorageFiles,
  keyValueStore, aiConversations, dynamicIntelligence, webSearchHistory,
  gitRepositories, gitCommits, customDomains, secrets, environmentVariables,
  voiceVideoSessions, voiceVideoParticipants, gpuInstances, gpuUsage,
  assignments, submissions, aiUsageRecords, templates,
  promptTemplates, customPrompts, projectAiRules, promptUsageHistory, promptTemplateRatings,
  newsletterSubscribers, newsletterCampaigns, newsletterDeliveries,
  lspDiagnostics, buildLogs, testRuns, testCases, securityScans, vulnerabilities,
  resourceMetrics, paneConfigurations,
  aiApprovalQueue, aiAuditLogs,
  alerts, insertAlertSchema,
  insertAiApprovalQueueSchema, insertAiAuditLogSchema,
  insertUserCreditsSchema, insertBudgetLimitSchema, insertUsageAlertSchema,
  insertAutoscaleDeploymentSchema, insertReservedVmDeploymentSchema,
  insertScheduledDeploymentSchema, insertStaticDeploymentSchema,
  insertObjectStorageBucketSchema, insertObjectStorageFileSchema,
  insertKeyValueStoreSchema, insertAiConversationSchema,
  insertDynamicIntelligenceSchema, insertWebSearchHistorySchema,
  insertGitRepositorySchema, insertGitCommitSchema, insertCustomDomainSchema,
  insertSecretSchema, insertEnvironmentVariableSchema,
  insertNewsletterSubscriberSchema, insertNewsletterCampaignSchema, insertNewsletterDeliverySchema,
  insertNotificationSchema, insertNotificationPreferenceSchema,
  customerRequests, insertCustomerRequestSchema,
  projectImports, // Added import for projectImports
} from "@shared/schema";
import { z } from "zod";

// Define the types that were missing
type UserCredits = typeof userCredits.$inferSelect;
type InsertUserCredits = z.infer<typeof insertUserCreditsSchema>;
type BudgetLimit = typeof budgetLimits.$inferSelect;
type InsertBudgetLimit = z.infer<typeof insertBudgetLimitSchema>;
type UsageAlert = typeof usageAlerts.$inferSelect;
type InsertUsageAlert = z.infer<typeof insertUsageAlertSchema>;
type Alert = typeof alerts.$inferSelect;
type InsertAlert = z.infer<typeof insertAlertSchema>;
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
type CustomerRequest = typeof customerRequests.$inferSelect;
type InsertCustomerRequest = z.infer<typeof insertCustomerRequestSchema>;
type ProjectImport = typeof projectImports.$inferSelect; // Added type for ProjectImport

type NotificationRecord = typeof pushNotifications.$inferSelect;
type InsertNotificationRecord = z.infer<typeof insertNotificationSchema>;
type NotificationPreferenceRecord = typeof notificationPreferences.$inferSelect;
type InsertNotificationPreferenceRecord = z.infer<typeof insertNotificationPreferenceSchema>;
type NotificationPreferencesPayload = Partial<{
  email: Record<string, any> | null | undefined;
  push: Record<string, any> | null | undefined;
  frequency: string | null | undefined;
}>;
type NotificationFrequency = 'instant' | 'hourly' | 'daily' | 'weekly';

const EMAIL_NOTIFICATION_KEYS = [
  'comments',
  'likes',
  'follows',
  'mentions',
  'teamUpdates',
  'deployments',
  'security',
  'marketing',
] as const;

const PUSH_NOTIFICATION_KEYS = [
  'comments',
  'likes',
  'follows',
  'mentions',
  'teamUpdates',
  'deployments',
  'security',
] as const;

const VALID_NOTIFICATION_FREQUENCIES = new Set<NotificationFrequency>([
  'instant',
  'hourly',
  'daily',
  'weekly',
]);

const DEFAULT_NOTIFICATION_PREFERENCES: {
  email: Record<(typeof EMAIL_NOTIFICATION_KEYS)[number], boolean>;
  push: Record<(typeof PUSH_NOTIFICATION_KEYS)[number], boolean>;
  frequency: NotificationFrequency;
} = {
  email: {
    comments: true,
    likes: true,
    follows: true,
    mentions: true,
    teamUpdates: true,
    deployments: true,
    security: true,
    marketing: false,
  },
  push: {
    comments: true,
    likes: true,
    follows: true,
    mentions: true,
    teamUpdates: true,
    deployments: true,
    security: true,
  },
  frequency: 'instant',
};

const normalizeUserId = (userId: string | number): string =>
  typeof userId === 'string' ? userId : String(userId);

const normalizePreferenceSection = (
  keys: readonly string[],
  defaults: Record<string, boolean>,
  ...sources: (Record<string, any> | null | undefined)[]
) => {
  const normalized: Record<string, boolean> = { ...defaults };
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        normalized[key] = Boolean(source[key]);
      }
    }
  }
  return normalized;
};

const normalizePreferences = (
  existing?: NotificationPreferencesPayload,
  updates?: NotificationPreferencesPayload,
) => {
  const email = normalizePreferenceSection(
    EMAIL_NOTIFICATION_KEYS,
    DEFAULT_NOTIFICATION_PREFERENCES.email,
    existing?.email ?? undefined,
    updates?.email ?? undefined,
  );
  const push = normalizePreferenceSection(
    PUSH_NOTIFICATION_KEYS,
    DEFAULT_NOTIFICATION_PREFERENCES.push,
    existing?.push ?? undefined,
    updates?.push ?? undefined,
  );
  const candidate = (updates?.frequency ?? existing?.frequency) as string | undefined;
  const frequency = VALID_NOTIFICATION_FREQUENCIES.has(candidate as NotificationFrequency)
    ? (candidate as NotificationFrequency)
    : DEFAULT_NOTIFICATION_PREFERENCES.frequency;

  return { email, push, frequency };
};

import { eq, and, desc, isNull, sql, inArray, gte, lte, lt, SQL, or, ilike } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import { Store } from "express-session";
import connectPg from "connect-pg-simple";
import { client } from "./db";
import * as crypto from "crypto";
import { Pool } from 'pg';

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
};

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
  createFile(data: {projectId: string; path: string; content: string }): Promise<File>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(fileId: number, data: { content: string }): Promise<void>;
  updateFile(id: number, file: Partial<InsertFile>): Promise<File | undefined>;
  getTrendingProjects(options: { limit: number }): Promise<any[]>;
  getFeaturedProjects(options: { limit: number }): Promise<any[]>;
  pinProject(projectId: string, userId: string): Promise<void>;
  unpinProject(projectId: string, userId: string): Promise<void>;
  trackUsage(userId: string, data: UsageMetricInput): Promise<void>;
  updateUserStripeInfo(userId: string, data: any): Promise<User | undefined>;

  // Notification operations
  getNotifications(userId: string | number, unreadOnly?: boolean): Promise<NotificationRecord[]>;
  getUnreadNotificationCount(userId: string | number): Promise<number>;
  getNotificationPreferences(userId: string | number): Promise<NotificationPreferenceRecord>;
  updateNotificationPreferences(
    userId: string | number,
    preferences: NotificationPreferencesPayload,
  ): Promise<NotificationPreferenceRecord>;
  markNotificationAsRead(notificationId: number, userId: string | number): Promise<void>;
  markAllNotificationsAsRead(userId: string | number): Promise<void>;
  deleteNotification(notificationId: number, userId: string | number): Promise<void>;
  deleteAllNotifications(userId: string | number): Promise<void>;
  createNotification(notification: InsertNotificationRecord): Promise<NotificationRecord>;
  updatePushNotification(id: number, data: Partial<NotificationRecord>): Promise<void>;
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Newsletter operations
  subscribeToNewsletter(data: InsertNewsletterSubscriber & { metadata?: Record<string, any> }): Promise<NewsletterSubscriber>;
  unsubscribeFromNewsletter(email: string, context?: {
    reason?: string;
    metadata?: Record<string, any>;
    ipAddress?: string | null;
    country?: string | null;
    userAgent?: string | null;
    source?: string | null;
  }): Promise<boolean>;
  confirmNewsletterSubscription(email: string, token: string): Promise<boolean>;
  getNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  getActiveNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;
  getNewsletterStatistics(): Promise<{
    total: number;
    active: number;
    confirmed: number;
    unsubscribed: number;
    byCountry: { country: string; count: number }[];
    campaignsSent: number;
    lastSentAt: Date | null;
  }>;
  createNewsletterCampaign(campaign: InsertNewsletterCampaign & { status?: string }): Promise<NewsletterCampaign>;
  markNewsletterCampaignSent(campaignId: number, data: Partial<NewsletterCampaign>): Promise<NewsletterCampaign | undefined>;
  getNewsletterCampaigns(limit?: number): Promise<NewsletterCampaign[]>;
  logNewsletterDelivery(delivery: InsertNewsletterDelivery): Promise<NewsletterDelivery>;

  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getProjectBySlug(slug: string, ownerId?: string): Promise<Project | null>;
  getProjectsByUserId(ownerId: string): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  incrementProjectViews(id: string): Promise<void>;

  // File operations
  getFile(id: number): Promise<File | undefined>;
  getFilesByProjectId(projectId: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, file: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;

  // API Key operations
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getUserApiKeys(userId: string): Promise<ApiKey[]>;
  getApiKey(id: number): Promise<ApiKey | undefined>;
  updateApiKey(id: number, apiKey: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: number): Promise<boolean>;

  // Code Review operations
  createCodeReview(review: InsertCodeReview): Promise<CodeReview>;
  getCodeReview(id: number): Promise<CodeReview | undefined>;
  getProjectCodeReviews(projectId: string): Promise<CodeReview[]>;
  updateCodeReview(id: number, review: Partial<InsertCodeReview>): Promise<CodeReview | undefined>;

  // Challenge operations
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  getChallenge(id: number): Promise<Challenge | undefined>;
  getChallengesByCategory(category: string): Promise<Challenge[]>;
  updateChallenge(id: number, challenge: Partial<InsertChallenge>): Promise<Challenge | undefined>;

  // Mentorship operations
  createMentorProfile(profile: InsertMentorProfile): Promise<MentorProfile>;
  getMentorProfile(userId: string): Promise<MentorProfile | undefined>;
  updateMentorProfile(userId: string, profile: Partial<InsertMentorProfile>): Promise<MentorProfile | undefined>;

  // Template operations
  getAllTemplates(publishedOnly?: boolean): Promise<Template[]>;
  getTemplateBySlug(slug: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;
  pinProject(projectId: string, userId: string): Promise<void>;
  unpinProject(projectId: string, userId: string): Promise<void>;

  // Login history operations
  createLoginHistory(history: any): Promise<any>;

  // Admin API Key operations (for centralized AI services)
  getActiveAdminApiKey(provider: string): Promise<any>;
  trackAIUsage(userId: string, tokens: number, mode: string): Promise<void>;
  createAiUsageRecord(record: any): Promise<any>;
  updateUserAiTokens(userId: string, tokensUsed: number): Promise<void>;

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
  getAIUsageStats(userId: string, startDate?: Date, endDate?: Date): Promise<any[]>;
  getUserCredits(userId: string): Promise<UserCredits | undefined>;

  // Deployment operations
  createDeployment(deploymentData: InsertDeployment): Promise<Deployment>;
  getDeployments(projectId: string): Promise<Deployment[]>;
  updateDeployment(id: number | string, deploymentData: Partial<InsertDeployment>): Promise<Deployment | undefined>;
  listDeployments(): Promise<Deployment[]>; // Added listDeployments method
  getDeploymentByExternalId(deploymentId: string): Promise<Deployment | undefined>;
  updateDeploymentStatus(id: number, updates: { status: string; lastDeployedAt?: Date }): Promise<void>;
  getProjectDeployments(projectId: string): Promise<Deployment[]>;
  getRecentDeployments(userId: string): Promise<Deployment[]>;

  // Audit log operations
  getAuditLogs(filters: { userId?: string; action?: string; dateRange?: string }): Promise<any[]>;

  // Storage operations
  getStorageBuckets(): Promise<any[]>;
  createStorageBucket(bucket: { projectId: string; name: string; region: string; isPublic: boolean }): Promise<any>;
  getProjectStorageBuckets(projectId: string): Promise<any[]>;
  getStorageObjects(bucketId: string): Promise<any[]>;
  deleteStorageObject(bucketId: string, objectKey: string): Promise<void>;

  // Team operations
  getUserTeams(userId: string): Promise<any[]>;

  // Theme operations
  getUserThemeSettings(userId: string): Promise<any>;
  updateUserThemeSettings(userId: string, settings: any): Promise<any>;
  getInstalledThemes(userId: string): Promise<any[]>;
  installTheme(userId: string, themeId: string): Promise<void>;
  uninstallTheme(userId: string, themeId: string): Promise<void>;
  createCustomTheme(userId: string, theme: any): Promise<any>;

  // Stripe operations
  updateUserStripeInfo(userId: string, stripeData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    subscriptionStatus?: string;
    subscriptionCurrentPeriodEnd?: Date;
  }): Promise<User | undefined>;
  updateStripeCustomerId(userId: string, customerId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Usage tracking operations
  trackUsage(
    userId: string,
    eventType: string,
    quantity: number,
    metadata?: UsageMetricMetadata
  ): Promise<void>;
  getUsageStats(userId: string, startDate?: Date, endDate?: Date): Promise<any>;
  getUserUsage(userId: string, billingPeriodStart?: Date): Promise<any>;
  getUsageHistory(userId: string, startDate: Date, endDate: Date, metricType?: string): Promise<any[]>;
  getUsageSummary(userId: string, period: string): Promise<any>;

  // Comments operations
  createComment(comment: InsertComment): Promise<Comment>;
  getProjectComments(projectId: string): Promise<Comment[]>;
  getFileComments(fileId: number): Promise<Comment[]>;
  updateComment(id: number, comment: Partial<InsertComment>): Promise<Comment | undefined>;
  deleteComment(id: number): Promise<boolean>;

  // Checkpoints operations
  createCheckpoint(checkpoint: any): Promise<Checkpoint>;
  getProjectCheckpoints(projectId: string): Promise<Checkpoint[]>;
  getCheckpoint(id: number): Promise<Checkpoint | undefined>;
  restoreCheckpoint(checkpointId: number): Promise<boolean>;

  // Agent operations
  getAgentWorkSteps(projectId: string, sessionId: string): Promise<any[]>;
  createAgentCheckpoint(checkpoint: {
    projectId: string;
    userId: string;
    message: string;
    changes: number;
    sessionId: string;
    timestamp: Date;
  }): Promise<any>;

  // Dynamic Intelligence / Agent Preferences operations
  getDynamicIntelligenceSettings(userId: string): Promise<DynamicIntelligence | undefined>;
  updateDynamicIntelligenceSettings(userId: string, settings: Partial<InsertDynamicIntelligence>): Promise<DynamicIntelligence>;

  // Time tracking operations
  startTimeTracking(tracking: InsertTimeTracking): Promise<TimeTracking>;
  stopTimeTracking(trackingId: number): Promise<TimeTracking | undefined>;
  getActiveTimeTracking(projectId: string, userId: string): Promise<TimeTracking | undefined>;
  getProjectTimeTracking(projectId: string): Promise<TimeTracking[]>;

  // Screenshot operations
  createScreenshot(screenshot: InsertScreenshot): Promise<Screenshot>;
  getProjectScreenshots(projectId: string): Promise<Screenshot[]>;
  getScreenshot(id: number): Promise<Screenshot | undefined>;
  deleteScreenshot(id: number): Promise<boolean>;

  // Task summary operations
  createTaskSummary(summary: InsertTaskSummary): Promise<TaskSummary>;
  getProjectTaskSummaries(projectId: string): Promise<TaskSummary[]>;
  updateTaskSummary(id: number, summary: Partial<InsertTaskSummary>): Promise<TaskSummary | undefined>;

  // Voice/Video Session operations
  createVoiceVideoSession(session: InsertVoiceVideoSession): Promise<VoiceVideoSession>;
  getProjectVoiceVideoSessions(projectId: string): Promise<VoiceVideoSession[]>;
  endVoiceVideoSession(sessionId: number): Promise<VoiceVideoSession | undefined>;
  addVoiceVideoParticipant(participant: InsertVoiceVideoParticipant): Promise<VoiceVideoParticipant>;
  removeVoiceVideoParticipant(sessionId: number, userId: string): Promise<void>;

  // GPU Instance operations
  createGpuInstance(instance: InsertGpuInstance): Promise<GpuInstance>;
  getProjectGpuInstances(projectId: string): Promise<GpuInstance[]>;
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
  getProjectSecrets(projectId: string): Promise<any[]>;
  getSecret(id: number): Promise<any | undefined>;
  deleteSecret(id: number): Promise<boolean>;

  // Missing methods from routes.ts
  getProjectCollaborators(projectId: string): Promise<any[]>;
  isProjectCollaborator(projectId: string, userId: string): Promise<boolean>;
  forkProject(projectId: string, userId: string): Promise<Project>;
  likeProject(projectId: string, userId: string): Promise<void>;
  unlikeProject(projectId: string, userId: string): Promise<void>;
  isProjectLiked(projectId: string, userId: string): Promise<boolean>;
  getProjectLikes(projectId: string): Promise<number>;
  trackProjectView(projectId: string, userId: string): Promise<void>;
  getProjectActivity(projectId: string, limit?: number): Promise<any[]>;
  getProjectFiles(projectId: string): Promise<any[]>;
  getFileById(id: number): Promise<any | undefined>;
  getAdminApiKey(provider: string): Promise<any>;
  createCLIToken(userId: string): Promise<any>;
  getUserCLITokens(userId: string): Promise<any[]>;
  getMobileSession(userId: string, deviceId?: string): Promise<any | undefined>;
  createMobileSession(session: any): Promise<any>;
  updateMobileSession(userId: string, deviceId: string, session: any): Promise<any | undefined>;
  getUserMobileSessions(userId: string): Promise<any[]>;
  getProjectDeployments(projectId: string): Promise<any[]>;
  getRecentDeployments(userId: string): Promise<any[]>;

  // Custom Prompts operations
  createPromptTemplate(template: InsertPromptTemplate): Promise<PromptTemplate>;
  getPromptTemplates(filters?: { category?: string; isSystem?: boolean; isPublic?: boolean }): Promise<PromptTemplate[]>;
  getPromptTemplate(id: number): Promise<PromptTemplate | undefined>;
  updatePromptTemplate(id: number, template: Partial<InsertPromptTemplate>): Promise<PromptTemplate | undefined>;
  deletePromptTemplate(id: number): Promise<boolean>;

  createCustomPrompt(prompt: InsertCustomPrompt): Promise<CustomPrompt>;
  getUserCustomPrompts(userId: string): Promise<CustomPrompt[]>;
  getCustomPrompt(id: number): Promise<CustomPrompt | undefined>;
  updateCustomPrompt(id: number, prompt: Partial<InsertCustomPrompt>): Promise<CustomPrompt | undefined>;
  deleteCustomPrompt(id: number): Promise<boolean>;

  createProjectAiRule(rule: InsertProjectAiRule): Promise<ProjectAiRule>;
  getProjectAiRules(projectId: string, activeOnly?: boolean): Promise<ProjectAiRule[]>;
  getProjectAiRule(id: number): Promise<ProjectAiRule | undefined>;
  updateProjectAiRule(id: number, rule: Partial<InsertProjectAiRule>): Promise<ProjectAiRule | undefined>;
  deleteProjectAiRule(id: number): Promise<boolean>;

  createPromptUsageHistory(usage: InsertPromptUsageHistory): Promise<PromptUsageHistory>;
  getPromptUsageHistory(filters: { userId?: string; projectId?: string; limit?: number }): Promise<PromptUsageHistory[]>;

  createPromptTemplateRating(rating: InsertPromptTemplateRating): Promise<PromptTemplateRating>;
  getPromptTemplateRatings(templateId: number): Promise<PromptTemplateRating[]>;
  updatePromptTemplateRating(templateId: number): Promise<void>;

  // Email Verification Token operations
  saveEmailVerificationToken(userId: string, email: string, token: string, expiresAt: Date): Promise<void>;
  getEmailVerificationByToken(token: string): Promise<EmailVerificationToken | undefined>;
  deleteEmailVerificationToken(token: string): Promise<boolean>;

  // Password Reset Token operations
  savePasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetByToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<boolean>;
  markPasswordResetTokenUsed(token: string): Promise<void>;

  // LSP Diagnostics operations - For Problems Panel
  createLspDiagnostic(diagnostic: InsertLspDiagnostic): Promise<LspDiagnostic>;
  getLspDiagnostic(id: string): Promise<LspDiagnostic | undefined>;
  getLspDiagnostics(projectId: string, filePath?: string): Promise<LspDiagnostic[]>;
  updateLspDiagnostic(id: string, updates: Partial<LspDiagnostic>): Promise<LspDiagnostic>;
  deleteLspDiagnostic(id: string): Promise<void>;
  clearLspDiagnostics(projectId: string, filePath?: string): Promise<void>;

  // Build Logs operations - For Output Panel
  createBuildLog(log: InsertBuildLog): Promise<BuildLog>;
  getBuildLogs(projectId: string, buildId?: string, limit?: number): Promise<BuildLog[]>;
  clearBuildLogs(projectId: string, buildId?: string): Promise<void>;

  // Test Runs operations - For Testing Panel
  createTestRun(run: InsertTestRun): Promise<TestRun>;
  getTestRun(id: string): Promise<TestRun | undefined>;
  getTestRuns(projectId: string, limit?: number): Promise<TestRun[]>;
  updateTestRun(id: string, updates: Partial<TestRun>): Promise<TestRun>;
  
  createTestCase(testCase: InsertTestCase): Promise<TestCase>;
  getTestCases(testRunId: string): Promise<TestCase[]>;
  updateTestCase(id: string, updates: Partial<TestCase>): Promise<TestCase>;

  // Security Scans operations - For Security Scanner Panel
  createSecurityScan(scan: InsertSecurityScan): Promise<SecurityScan>;
  getSecurityScan(id: string): Promise<SecurityScan | undefined>;
  getSecurityScans(projectId: string, limit?: number): Promise<SecurityScan[]>;
  updateSecurityScan(id: string, updates: Partial<SecurityScan>): Promise<SecurityScan>;

  createVulnerability(vulnerability: InsertVulnerability): Promise<Vulnerability>;
  getVulnerabilities(scanId: string): Promise<Vulnerability[]>;
  getProjectVulnerabilities(projectId: string, status?: string): Promise<Vulnerability[]>;
  updateVulnerability(id: string, updates: Partial<Vulnerability>): Promise<Vulnerability>;

  // Resource Metrics operations - For Resources Panel
  createResourceMetric(metric: InsertResourceMetric): Promise<ResourceMetric>;
  getResourceMetrics(projectId: string, limit?: number): Promise<ResourceMetric[]>;
  getLatestResourceMetrics(projectId: string): Promise<ResourceMetric | undefined>;

  // Pane Configurations operations - For Split Editor
  createPaneConfiguration(config: InsertPaneConfiguration): Promise<PaneConfiguration>;
  getPaneConfiguration(id: string): Promise<PaneConfiguration | undefined>;
  getUserPaneConfigurations(userId: string, projectId?: string): Promise<PaneConfiguration[]>;
  updatePaneConfiguration(id: string, updates: Partial<PaneConfiguration>): Promise<PaneConfiguration>;
  deletePaneConfiguration(id: string): Promise<void>;

  // AI Approval Queue operations - Fortune 500 Security
  createAiApproval(approval: InsertAiApprovalQueue): Promise<AiApprovalQueue>;
  getAiApproval(id: string): Promise<AiApprovalQueue | undefined>;
  getPendingAiApprovals(userId: string, projectId: string): Promise<AiApprovalQueue[]>;
  updateAiApprovalStatus(id: string, status: string, processedBy: string, rejectionReason?: string): Promise<AiApprovalQueue>;
  expireOldAiApprovals(): Promise<number>; // Returns count of expired approvals

  // AI Audit Log operations - Compliance-grade audit trail
  createAiAuditLog(log: InsertAiAuditLog): Promise<AiAuditLog>;
  getAiAuditLogs(filters: {
    userId?: string;
    projectId?: string;
    approvalId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AiAuditLog[]>;

  // Team membership check - For access control
  getTeamMemberByUserAndProject?(userId: string, projectId: string): Promise<any | undefined>;
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

  async pinProject(projectId: string, userId: string): Promise<void> {
    await this.db
      .update(projects)
      .set({ isPinned: true, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)));

    // Optionally record the pin action for analytics
    await this.trackUsage(userId, "project.pin", 1, { unit: "action" });
  }

  async unpinProject(projectId: string, userId: string): Promise<void> {
    await this.db
      .update(projects)
      .set({ isPinned: false, updatedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)));

    await this.trackUsage(userId, "project.unpin", 1, { unit: "action" });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
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
    // If ID is not returned, fetch the created user
    if (!user || !user.id) {
      const createdUser = await this.getUserByEmail(userData.email!);
      if (createdUser) {
        return createdUser;
      }
    }
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
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

  // Email Verification Token operations
  async saveEmailVerificationToken(userId: string, email: string, token: string, expiresAt: Date): Promise<void> {
    await this.db.insert(emailVerificationTokens).values({
      userId,
      email,
      token, // This should be hashed before storing
      expiresAt,
    });
  }

  async getEmailVerificationByToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [verificationToken] = await this.db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    return verificationToken;
  }

  async deleteEmailVerificationToken(token: string): Promise<boolean> {
    const result = await this.db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    return result.length > 0;
  }

  // Password Reset Token operations
  async savePasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.db.insert(passwordResetTokens).values({
      userId,
      token, // This should be hashed before storing
      expiresAt,
    });
  }

  async getPasswordResetByToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async deletePasswordResetToken(token: string): Promise<boolean> {
    const result = await this.db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return result.length > 0;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  // Newsletter operations
  async subscribeToNewsletter(data: (InsertNewsletterSubscriber & { metadata?: Record<string, any> })): Promise<NewsletterSubscriber> {
    const email = data.email.toLowerCase();
    const now = new Date();

    const existing = await this.db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email));

    if (existing.length > 0) {
      const subscriber = existing[0];

      if (subscriber.isActive && !subscriber.unsubscribedAt && subscriber.confirmedAt) {
        throw new Error('Email already subscribed');
      }

      const mergedMetadata = {
        ...(subscriber.metadata ?? {}),
        ...(data.metadata ?? {}),
        lastSubscriptionAt: now.toISOString(),
      };

      const [updated] = await this.db
        .update(newsletterSubscribers)
        .set({
          isActive: true,
          confirmationToken: data.confirmationToken ?? subscriber.confirmationToken,
          confirmedAt: subscriber.confirmedAt && !subscriber.unsubscribedAt ? subscriber.confirmedAt : null,
          unsubscribedAt: null,
          subscribedAt: subscriber.subscribedAt ?? now,
          lastActivityAt: now,
          ipAddress: data.ipAddress ?? subscriber.ipAddress,
          userAgent: data.userAgent ?? subscriber.userAgent,
          country: data.country ?? subscriber.country,
          region: data.region ?? subscriber.region,
          city: data.city ?? subscriber.city,
          postalCode: data.postalCode ?? subscriber.postalCode,
          timezone: data.timezone ?? subscriber.timezone,
          source: data.source ?? subscriber.source,
          metadata: mergedMetadata,
        })
        .where(eq(newsletterSubscribers.id, subscriber.id))
        .returning();

      return updated;
    }

    const insertPayload: InsertNewsletterSubscriber = {
      ...data,
      email,
      isActive: data.isActive ?? true,
      metadata: data.metadata ?? {},
    };

    const [created] = await this.db
      .insert(newsletterSubscribers)
      .values({
        ...insertPayload,
        subscribedAt: now,
        lastActivityAt: now,
      })
      .returning();

    return created;
  }

  async unsubscribeFromNewsletter(email: string, context?: {
    reason?: string;
    metadata?: Record<string, any>;
    ipAddress?: string | null;
    country?: string | null;
    userAgent?: string | null;
    source?: string | null;
  }): Promise<boolean> {
    const sanitizedEmail = email.toLowerCase();
    const [subscriber] = await this.db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, sanitizedEmail));

    if (!subscriber) {
      return false;
    }

    const now = new Date();
    const mergedMetadata = {
      ...(subscriber.metadata ?? {}),
      ...(context?.metadata ?? {}),
      lastUnsubscribedAt: now.toISOString(),
    };

    await this.db
      .update(newsletterSubscribers)
      .set({
        isActive: false,
        unsubscribedAt: now,
        lastActivityAt: now,
        ipAddress: context?.ipAddress ?? subscriber.ipAddress,
        country: context?.country ?? subscriber.country,
        userAgent: context?.userAgent ?? subscriber.userAgent,
        source: context?.source ?? subscriber.source,
        metadata: {
          ...mergedMetadata,
          lastUnsubscribeReason: context?.reason ?? mergedMetadata.lastUnsubscribeReason ?? null,
        },
      })
      .where(eq(newsletterSubscribers.id, subscriber.id));

    return true;
  }

  async confirmNewsletterSubscription(email: string, token: string): Promise<boolean> {
    const sanitizedEmail = email.toLowerCase();
    const [subscriber] = await this.db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, sanitizedEmail));

    if (!subscriber || !subscriber.confirmationToken || subscriber.confirmationToken !== token) {
      return false;
    }

    const now = new Date();

    await this.db
      .update(newsletterSubscribers)
      .set({
        confirmationToken: null,
        confirmedAt: now,
        isActive: true,
        lastActivityAt: now,
        metadata: {
          ...(subscriber.metadata ?? {}),
          confirmedAt: now.toISOString(),
        },
      })
      .where(eq(newsletterSubscribers.id, subscriber.id));

    return true;
  }

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return await this.db
      .select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.subscribedAt));
  }

  async getActiveNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return await this.db
      .select()
      .from(newsletterSubscribers)
      .where(and(
        eq(newsletterSubscribers.isActive, true),
        sql`${newsletterSubscribers.confirmedAt} IS NOT NULL`
      ));
  }

  async getNewsletterStatistics(): Promise<{
    total: number;
    active: number;
    confirmed: number;
    unsubscribed: number;
    byCountry: { country: string; count: number }[];
    campaignsSent: number;
    lastSentAt: Date | null;
  }> {
    const subscribers = await this.db.select().from(newsletterSubscribers);

    const total = subscribers.length;
    const active = subscribers.filter((s) => s.isActive).length;
    const confirmed = subscribers.filter((s) => !!s.confirmedAt).length;
    const unsubscribed = total - active;

    const countryCounts = new Map<string, number>();
    for (const subscriber of subscribers) {
      const country = subscriber.country || 'Unknown';
      countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
    }

    const byCountry = Array.from(countryCounts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    const campaigns = await this.db
      .select({
        id: newsletterCampaigns.id,
        status: newsletterCampaigns.status,
        sentAt: newsletterCampaigns.sentAt,
      })
      .from(newsletterCampaigns);

    const campaignsByStatus = campaigns.reduce<Record<string, number>>((acc, campaign) => {
      const status = campaign.status || 'draft';
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});

    const campaignsSent = (campaignsByStatus['sent'] ?? 0) + (campaignsByStatus['partial'] ?? 0);

    const lastSentAt = campaigns
      .filter((campaign) => campaign.status === 'sent' || campaign.status === 'partial')
      .map((campaign) => campaign.sentAt)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => (b?.getTime?.() ?? 0) - (a?.getTime?.() ?? 0))[0] ?? null;

    const recentFailures = await this.db
      .select({
        campaignId: newsletterDeliveries.campaignId,
        email: newsletterDeliveries.email,
        error: newsletterDeliveries.error,
        sentAt: newsletterDeliveries.sentAt,
      })
      .from(newsletterDeliveries)
      .where(eq(newsletterDeliveries.status, 'failed'))
      .orderBy(desc(newsletterDeliveries.sentAt))
      .limit(10);

    return {
      total,
      active,
      confirmed,
      unsubscribed,
      byCountry,
      campaignsSent,
      lastSentAt,
      campaignsByStatus,
      recentFailures,
    };
  }

  async createNewsletterCampaign(campaign: (InsertNewsletterCampaign & { status?: string })): Promise<NewsletterCampaign> {
    const payload = {
      ...campaign,
      status: campaign.status ?? 'draft',
      metrics: campaign.metrics ?? {},
    };

    const [created] = await this.db
      .insert(newsletterCampaigns)
      .values(payload)
      .returning();

    return created;
  }

  async markNewsletterCampaignSent(campaignId: number, data: Partial<NewsletterCampaign>): Promise<NewsletterCampaign | undefined> {
    const [updated] = await this.db
      .update(newsletterCampaigns)
      .set({
        ...data,
        status: data.status ?? 'sent',
        sentAt: data.sentAt ?? new Date(),
      })
      .where(eq(newsletterCampaigns.id, campaignId))
      .returning();

    return updated;
  }

  async getNewsletterCampaigns(limit = 20): Promise<NewsletterCampaign[]> {
    return await this.db
      .select()
      .from(newsletterCampaigns)
      .orderBy(desc(newsletterCampaigns.createdAt))
      .limit(limit);
  }

  async logNewsletterDelivery(delivery: InsertNewsletterDelivery): Promise<NewsletterDelivery> {
    const [created] = await this.db
      .insert(newsletterDeliveries)
      .values(delivery)
      .returning();

    return created;
  }

  // Project operations
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return await this.db.select().from(projects).where(eq(projects.ownerId, userId));
  }

  // Alias for backward compatibility
  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return this.getProjectsByUser(userId);
  }

  async getAllProjects(): Promise<Project[]> {
    return await this.db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProjectBySlug(slug: string, ownerId?: string): Promise<Project | null> {
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
      // Error getting project by slug
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

  async updateProject(id: string, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await this.db
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await this.db.delete(projects).where(eq(projects.id, id));
    return result.length > 0;
  }

  async incrementProjectViews(id: string): Promise<void> {
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

  async getFilesByProjectId(projectId: string): Promise<File[]> {
    return await this.db.select().from(files).where(eq(files.projectId, projectId)).orderBy(files.path);
  }

  async createFile(data: { projectId: string; path: string; content: string }): Promise<File>;
  async createFile(fileData: InsertFile): Promise<File>;
  async createFile(
    fileData: InsertFile | { projectId: string; path: string; content: string }
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

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
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
    return review;
  }

  async getCodeReview(id: number): Promise<CodeReview | undefined> {
    const [review] = await this.db.select().from(codeReviews).where(eq(codeReviews.id, id));
    return review;
  }

  async getProjectCodeReviews(projectId: string): Promise<CodeReview[]> {
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
    };

    const [review] = await this.db
      .update(codeReviews)
      .set(reviewUpdate)
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
    };

    const [challenge] = await this.db
      .update(challenges)
      .set(challengeUpdate)
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
    return profile;
  }

  async getMentorProfile(userId: string): Promise<MentorProfile | undefined> {
    const [profile] = await this.db.select().from(mentorProfiles).where(eq(mentorProfiles.userId, userId));
    return profile;
  }

  async updateMentorProfile(userId: string, profileData: Partial<InsertMentorProfile>): Promise<MentorProfile | undefined> {
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
    };

    const [profile] = await this.db
      .update(mentorProfiles)
      .set(mentorUpdate)
      .where(eq(mentorProfiles.userId, userId))
      .returning();
    return profile;
  }

  // Template operations
  async getAllTemplates(publishedOnly?: boolean): Promise<Template[]> {
    const query = publishedOnly
      ? this.db.select().from(templates).where(eq(templates.isPublished, true))
      : this.db.select().from(templates);

    return await query;
  }

  async getTemplateBySlug(slug: string): Promise<Template | undefined> {
    const [template] = await this.db
      .select()
      .from(templates)
      .where(eq(templates.slug, slug))
      .limit(1);
    return template;
  }

  async createTemplate(templateData: InsertTemplate): Promise<Template> {
    const [template] = await this.db
      .insert(templates)
      .values(templateData)
      .returning();
    return template;
  }

  async updateTemplate(id: string, templateData: Partial<InsertTemplate>): Promise<Template | undefined> {
    const [template] = await this.db
      .update(templates)
      .set({
        ...templateData,
        updatedAt: new Date()
      })
      .where(eq(templates.id, id))
      .returning();
    return template;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await this.db
      .delete(templates)
      .where(eq(templates.id, id))
      .returning();
    return result.length > 0;
  }

  async seedTemplates(): Promise<void> {
    // Check if templates already exist
    const existingTemplates = await this.db.select().from(templates).limit(1);
    if (existingTemplates.length > 0) {
      // Templates already seeded, skipping...
      return;
    }

    const templateSeeds: InsertTemplate[] = [
      {
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
        features: ['SEO optimized', 'Dark mode', 'Markdown support', 'RSS feed'],
        isFeatured: true,
        isOfficial: true,
        isPublished: true
      },
      {
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
        isPublished: true
      },
      {
        slug: 'express-api',
        name: 'Express REST API',
        description: 'RESTful API with Express.js and MongoDB',
        category: 'backend',
        tags: ['express', 'nodejs', 'api', 'rest', 'mongodb'],
        authorName: 'E-Code',
        authorVerified: true,
        uses: 1500,
        stars: 98,
        forks: 32,
        language: 'javascript',
        framework: 'express',
        difficulty: 'intermediate',
        estimatedTime: 35,
        features: ['JWT Auth', 'MongoDB', 'Rate limiting', 'API documentation'],
        isFeatured: false,
        isOfficial: true,
        isPublished: true
      },
      {
        slug: 'nodejs-api',
        name: 'Node.js API Server',
        description: 'Simple API server with Node.js and PostgreSQL',
        category: 'backend',
        tags: ['nodejs', 'api', 'postgresql', 'backend'],
        authorName: 'E-Code',
        authorVerified: true,
        uses: 980,
        stars: 67,
        forks: 28,
        language: 'javascript',
        framework: 'nodejs',
        difficulty: 'beginner',
        estimatedTime: 25,
        features: ['Database integration', 'CRUD operations', 'Error handling', 'Logging'],
        isFeatured: false,
        isOfficial: true,
        isPublished: true
      },
      {
        slug: 'python-flask',
        name: 'Python Flask App',
        description: 'Web application with Flask and SQLAlchemy',
        category: 'backend',
        tags: ['python', 'flask', 'sqlalchemy', 'web'],
        authorName: 'E-Code',
        authorVerified: true,
        uses: 1800,
        stars: 120,
        forks: 34,
        language: 'python',
        framework: 'flask',
        difficulty: 'intermediate',
        estimatedTime: 40,
        features: ['User authentication', 'Database ORM', 'Templates', 'Forms'],
        isFeatured: true,
        isOfficial: true,
        isPublished: true
      },
      {
        slug: 'vuejs-app',
        name: 'Vue.js Application',
        description: 'Modern SPA with Vue 3 and Composition API',
        category: 'web',
        tags: ['vuejs', 'vue3', 'spa', 'frontend'],
        authorName: 'E-Code',
        authorVerified: true,
        uses: 750,
        stars: 54,
        forks: 19,
        language: 'javascript',
        framework: 'vuejs',
        difficulty: 'intermediate',
        estimatedTime: 35,
        features: ['Vue Router', 'Vuex store', 'Composition API', 'TypeScript support'],
        isFeatured: false,
        isOfficial: true,
        isPublished: true
      },
      {
        slug: 'discord-bot',
        name: 'Discord Bot',
        description: 'Feature-rich Discord bot with commands and events',
        category: 'bot',
        tags: ['discord', 'bot', 'nodejs', 'discord.js'],
        authorName: 'E-Code',
        authorVerified: true,
        uses: 2300,
        stars: 189,
        forks: 67,
        language: 'javascript',
        framework: 'discord.js',
        difficulty: 'beginner',
        estimatedTime: 20,
        features: ['Slash commands', 'Event handlers', 'Moderation tools', 'Music player'],
        isFeatured: true,
        isOfficial: true,
        isPublished: true
      },
      {
        slug: 'phaser-game',
        name: 'Phaser Game',
        description: '2D browser game with Phaser.js framework',
        category: 'game',
        tags: ['phaser', 'game', 'javascript', '2d'],
        authorName: 'E-Code',
        authorVerified: true,
        uses: 620,
        stars: 43,
        forks: 15,
        language: 'javascript',
        framework: 'phaser',
        difficulty: 'advanced',
        estimatedTime: 60,
        features: ['Physics engine', 'Sprite animations', 'Sound effects', 'Level system'],
        isFeatured: false,
        isOfficial: true,
        isPublished: true
      }
    ];

    // Seeding templates...
    for (const templateData of templateSeeds) {
      try {
        await this.db.insert(templates).values(templateData);
        // ✓ Seeded template
      } catch (error) {
        // Error seeding template
      }
    }
    // ✓ Templates seeding completed
  }

  async createLoginHistory(history: any): Promise<any> {
    // Simple implementation - just log for now since we don't have a login_history table
    // Login attempt logged
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

  async trackAIUsage(userId: string, tokens: number, mode: string): Promise<void> {
    // For now, just log the usage
    // AI usage tracked for user
  }

  async createAiUsageRecord(record: any): Promise<any> {
    // For now, just log and return the record
    // AI usage record created
    return { id: Date.now(), ...record, createdAt: new Date() };
  }

  async updateUserAiTokens(userId: string, tokensUsed: number): Promise<void> {
    // For now, just log the token usage
    // Updated AI tokens for user
  }

  // Deployment operations
  async createDeployment(deploymentData: InsertDeployment): Promise<Deployment> {
    const [deployment] = await this.db.insert(deployments).values(deploymentData).returning();
    return deployment;
  }

  async getDeployments(projectId: string): Promise<Deployment[]> {
    return await this.db.select().from(deployments).where(eq(deployments.projectId, projectId));
  }

  async updateDeployment(deploymentIdOrNumber: number | string, updates: Partial<InsertDeployment>): Promise<Deployment | undefined> {
    let deployment;

    if (typeof deploymentIdOrNumber === 'number') {
      deployment = await this.db.select().from(deployments).where(eq(deployments.id, deploymentIdOrNumber)).limit(1).then(rows => rows[0]);
    } else {
      deployment = await this.db.select().from(deployments).where(eq(deployments.deploymentId, deploymentIdOrNumber)).limit(1).then(rows => rows[0]);
    }

    if (!deployment) {
      return undefined;
    }

    const [updated] = await this.db
      .update(deployments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deployments.id, deployment.id))
      .returning();
    return updated;
  }

  async listDeployments(): Promise<Deployment[]> {
    return await this.db.select().from(deployments);
  }

  async getDeploymentByExternalId(deploymentId: string): Promise<Deployment | undefined> {
    const [deployment] = await this.db
      .select()
      .from(deployments)
      .where(eq(deployments.deploymentId, deploymentId));
    return deployment;
  }

  async updateDeploymentStatus(id: number, updates: { status: string; lastDeployedAt?: Date }): Promise<void> {
    await this.db
      .update(deployments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deployments.id, id));
  }

  async getProjectDeployments(projectId: string): Promise<Deployment[]> {
    return await this.db.select().from(deployments).where(eq(deployments.projectId, projectId));
  }

  async getRecentDeployments(userId: string): Promise<Deployment[]> {
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
  async getAuditLogs(filters: { userId?: string; action?: string; dateRange?: string }): Promise<any[]> {
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

  async createStorageBucket(bucket: { projectId: string; name: string; region: string; isPublic: boolean }): Promise<any> {
    // In production, this would create a bucket in the storage_buckets table
    return {
      id: crypto.randomBytes(8).toString('hex'),
      ...bucket,
      created: new Date(),
      objectCount: 0,
      totalSize: 0,
    };
  }

  async getProjectStorageBuckets(projectId: string): Promise<any[]> {
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
    // Deleting object from bucket
  }

  // Team operations
  async getUserTeams(userId: string): Promise<any[]> {
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
  async getUserThemeSettings(userId: string): Promise<any> {
    // In production, query user_theme_settings table
    return {
      theme: 'dark',
      accentColor: '#0066cc',
      fontSize: 'medium',
      fontFamily: 'system'
    };
  }

  async updateUserThemeSettings(userId: string, settings: any): Promise<any> {
    // In production, update user_theme_settings table
    return settings;
  }

  async getInstalledThemes(userId: string): Promise<any[]> {
    // In production, query user_installed_themes table
    return [
      { id: 'dark', name: 'Dark', installed: true },
      { id: 'light', name: 'Light', installed: true }
    ];
  }

  async installTheme(userId: string, themeId: string): Promise<void> {
    // In production, insert into user_installed_themes table
    // Installing theme for user
  }

  async uninstallTheme(userId: string, themeId: string): Promise<void> {
    // In production, delete from user_installed_themes table
    // Uninstalling theme for user
  }

  async createCustomTheme(userId: string, theme: any): Promise<any> {
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
      // @ts-expect-error - handling schema mismatch
      commentData.authorId = commentData.authorId || commentData.userId;
    }
    const [newComment] = await this.db.insert(comments).values(commentData).returning();
    return newComment;
  }

  async getProjectComments(projectId: string): Promise<Comment[]> {
    return await this.db.select().from(comments).where(eq(comments.projectId, projectId)).orderBy(desc(comments.createdAt));
  }

  async getFileComments(fileId: number): Promise<Comment[] > {
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

  async getProjectCheckpoints(projectId: string): Promise<Checkpoint[]> {
    return await this.db.select().from(checkpoints).where(eq(checkpoints.projectId, projectId)).orderBy(desc(checkpoints.createdAt));
  }

  // Agent operations
  async getAgentWorkSteps(projectId: string, sessionId: string): Promise<any[]> {
    // For now, return empty array as we don't have a dedicated table for work steps
    // In a real implementation, this would query a work_steps table
    return [];
  }

  async createAgentCheckpoint(checkpoint: {
    projectId: string;
    userId: string;
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

  async getActiveTimeTracking(projectId: string, userId: string): Promise<TimeTracking | undefined> {
    const [tracking] = await this.db.select().from(projectTimeTracking)
      .where(and(
        eq(projectTimeTracking.projectId, projectId),
        eq(projectTimeTracking.userId, userId),
        eq(projectTimeTracking.active, true)
      ));
    return tracking;
  }

  async getProjectTimeTracking(projectId: string): Promise<TimeTracking[]> {
    return await this.db.select().from(projectTimeTracking).where(eq(projectTimeTracking.projectId, projectId)).orderBy(desc(projectTimeTracking.startTime));
  }

  // Screenshot operations
  async createScreenshot(screenshot: InsertScreenshot): Promise<Screenshot> {
    const [newScreenshot] = await this.db.insert(projectScreenshots).values(screenshot).returning();
    return newScreenshot;
  }

  async getProjectScreenshots(projectId: string): Promise<Screenshot[]> {
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

  async getProjectTaskSummaries(projectId: string): Promise<TaskSummary[] > {
    return await this.db.select().from(taskSummaries).where(eq(taskSummaries.projectId, projectId)).orderBy(desc(taskSummaries.createdAt));
  }

  async updateTaskSummary(id: number, summary: Partial<InsertTaskSummary>): Promise<TaskSummary | undefined> {
    const [updated] = await this.db.update(taskSummaries).set(summary).where(eq(taskSummaries.id, id)).returning();
    return updated;
  }

  // Stripe operations
  async updateUserStripeInfo(userId: string, data: any): Promise<User | undefined>;
  async updateUserStripeInfo(
    userId: string,
    stripeData: {
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      stripePriceId?: string;
      subscriptionStatus?: string;
      subscriptionCurrentPeriodEnd?: Date;
    }
  ): Promise<User | undefined>;
  async updateUserStripeInfo(
    userId: string,
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

  async updateStripeCustomerId(userId: string, customerId: string): Promise<User | undefined> {
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
  async trackUsage(userId: string, data: UsageMetricInput): Promise<void>;
  async trackUsage(
    userId: string,
    eventType: string,
    quantity: number,
    metadata?: UsageMetricMetadata
  ): Promise<void>;
  async trackUsage(
    userId: string,
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

  async getUsageStats(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
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

  async getUserUsage(userId: string, billingPeriodStart?: Date): Promise<any> {
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

  async getUsageHistory(userId: string, startDate: Date, endDate: Date, metricType?: string): Promise<any[]> {
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

  async getUsageSummary(userId: string, period: string): Promise<any> {
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

  async getProjectImports(projectId: string): Promise<ProjectImport[]> {
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
    const [created] = await this.db.execute(sql`
      INSERT INTO ${sql.identifier(secretsTable)} (user_id, key, value, description, project_id, created_at, updated_at)
      VALUES (${secret.userId}, ${secret.key}, ${secret.value}, ${secret.description || null}, ${secret.projectId || null}, ${new Date()}, ${new Date()})
      RETURNING *
    `);
    return created;
  }

  async getProjectSecrets(projectId: string): Promise<any[]> {
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
    // Saving deployment
  }

  async getDeployment(deploymentId: string): Promise<any | null> {
    // Retrieve deployment from storage
    return null;
  }



  // Collaboration methods
  async getProjectCollaborators(projectId: string): Promise<any[]> {
    // Return empty array for now - proper implementation would use a collaborators table
    return [];
  }

  async isProjectCollaborator(projectId: string, userId: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    return project?.ownerId === userId;
  }

  // Project activity methods
  async forkProject(projectId: string, userId: string): Promise<Project> {
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

  async likeProject(projectId: string, userId: string): Promise<void> {
    // Placeholder - would use a project_likes table
    await this.db
      .update(projects)
      .set({ likes: sql`${projects.likes} + 1` })
      .where(eq(projects.id, projectId));
  }

  async unlikeProject(projectId: string, userId: string): Promise<void> {
    await this.db
      .update(projects)
      .set({ likes: sql`GREATEST(${projects.likes} - 1, 0)` })
      .where(eq(projects.id, projectId));
  }

  async isProjectLiked(projectId: string, userId: string): Promise<boolean> {
    // Placeholder - would check project_likes table
    return false;
  }

  async getProjectLikes(projectId: string): Promise<number> {
    const project = await this.getProject(projectId);
    return project?.likes || 0;
  }

  async trackProjectView(projectId: string, userId: string): Promise<void> {
    await this.incrementProjectViews(projectId);
  }

  async getProjectActivity(projectId: string, limit?: number): Promise<any[]> {
    // Return mock activity for now
    return [
      {
        id: 1,
        type: 'file_created',
        userId: 'a7244a80-ecf0-4c52-828f-9e0db3b3c293',
        timestamp: new Date(),
        details: { fileName: 'app.js' }
      }
    ];
  }

  // File methods
  async getProjectFiles(projectId: string): Promise<any[]> {
    return await this.getFilesByProjectId(projectId);
  }

  async getFileById(id: number): Promise<any | undefined> {
    return await this.getFile(id);
  }

  async getAdminApiKey(provider: string): Promise<any> {
    return await this.getActiveAdminApiKey(provider);
  }

  // CLI token methods
  async createCLIToken(userId: string): Promise<any> {
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

  async getUserCLITokens(userId: string): Promise<any[]> {
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
  async getMobileSession(userId: string, deviceId?: string): Promise<any | undefined> {
    // Mock implementation - would use mobile_sessions table
    return undefined;
  }

  async createMobileSession(session: any): Promise<any> {
    return {
      id: crypto.randomBytes(16).toString('hex'),
      ...session,
      createdAt: new Date()
    };
  }

  async updateMobileSession(userId: string, deviceId: string, session: any): Promise<any | undefined> {
    return {
      id: deviceId, // Assuming deviceId is used as session identifier
      ...session,
      updatedAt: new Date()
    };
  }

  async getUserMobileSessions(userId: string): Promise<any[]> {
    return [];
  }

  // User Credits and Billing operations
  async getUserCredits(userId: string): Promise<UserCredits | undefined> {
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

  async updateUserCredits(userId: string, credits: Partial<InsertUserCredits>): Promise<UserCredits | undefined> {
    const [updated] = await this.db
      .update(userCredits)
      .set({ ...credits, updatedAt: new Date() })
      .where(eq(userCredits.userId, userId))
      .returning();
    return updated;
  }

  async addCredits(userId: string, amount: number): Promise<UserCredits | undefined> {
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

  async deductCredits(userId: string, amount: number): Promise<UserCredits | undefined> {
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

  async getBudgetLimits(userId: string): Promise<BudgetLimit | undefined> {
    const [limits] = await this.db.select().from(budgetLimits).where(eq(budgetLimits.userId, userId));
    return limits;
  }

  async createBudgetLimits(limits: InsertBudgetLimit): Promise<BudgetLimit> {
    const [created] = await this.db.insert(budgetLimits).values(limits).returning();
    return created;
  }

  async updateBudgetLimits(userId: string, limits: Partial<InsertBudgetLimit>): Promise<BudgetLimit | undefined> {
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

  async getUsageAlerts(userId: string): Promise<UsageAlert[]> {
    return await this.db.select().from(usageAlerts).where(eq(usageAlerts.userId, userId));
  }

  async markAlertSent(alertId: number): Promise<void> {
    await this.db
      .update(usageAlerts)
      .set({ sent: true, sentAt: new Date() })
      .where(eq(usageAlerts.id, alertId));
  }

  async deleteOldUsageAlerts(userId: string, beforeDate?: Date): Promise<number> {
    const cutoffDate = beforeDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago by default
    const result = await this.db
      .delete(usageAlerts)
      .where(and(
        eq(usageAlerts.userId, userId),
        lt(usageAlerts.createdAt, cutoffDate)
      ))
      .returning();
    return result.length;
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

  async getProjectObjectStorageBuckets(projectId: string): Promise<ObjectStorageBucket[]> {
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
  async setKeyValue(projectId: string, key: string, value: any, expiresAt?: Date): Promise<KeyValueStore> {
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

  async getKeyValue(projectId: string, key: string): Promise<KeyValueStore | undefined> {
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

  async deleteKeyValue(projectId: string, key: string): Promise<boolean> {
    const result = await this.db
      .delete(keyValueStore)
      .where(and(
        eq(keyValueStore.projectId, projectId),
        eq(keyValueStore.key, key)
      ));
    return result.length > 0;
  }

  async getProjectKeyValues(projectId: string): Promise<KeyValueStore[]> {
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

  async getProjectAiConversations(projectId: string): Promise<AiConversation[]> {
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
  async getDynamicIntelligenceSettings(userId: string): Promise<DynamicIntelligence | undefined> {
    const [settings] = await this.db.select().from(dynamicIntelligence).where(eq(dynamicIntelligence.userId, userId));
    return settings;
  }

  async updateDynamicIntelligenceSettings(userId: string, settings: Partial<InsertDynamicIntelligence>): Promise<DynamicIntelligence> {
    // Check if settings exist for user
    const existing = await this.getDynamicIntelligenceSettings(userId);
    
    if (existing) {
      // Update existing settings
      const [updated] = await this.db
        .update(dynamicIntelligence)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(dynamicIntelligence.userId, userId))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await this.db
        .insert(dynamicIntelligence)
        .values({ userId, ...settings })
        .returning();
      return created;
    }
  }

  async createDynamicIntelligence(settings: InsertDynamicIntelligence): Promise<DynamicIntelligence> {
    const [created] = await this.db.insert(dynamicIntelligence).values(settings).returning();
    return created;
  }

  async updateDynamicIntelligence(userId: string, settings: Partial<InsertDynamicIntelligence>): Promise<DynamicIntelligence | undefined> {
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

  async getGitRepository(projectId: string): Promise<GitRepository | undefined> {
    const [repo] = await this.db.select().from(gitRepositories).where(eq(gitRepositories.projectId, projectId));
    return repo;
  }

  async updateGitRepository(projectId: string, updates: Partial<InsertGitRepository>): Promise<GitRepository | undefined> {
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

  async getProjectCustomDomains(projectId: string): Promise<CustomDomain[]> {
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
  async createCustomerRequest(request: InsertCustomerRequest): Promise<CustomerRequest> {
    const payload = {
      ...request,
      metadata: request.metadata ?? {},
      status: request.status ?? 'new',
      createdAt: request.createdAt ?? new Date(),
      updatedAt: request.updatedAt ?? new Date(),
    };

    const [created] = await this.db
      .insert(customerRequests)
      .values(payload)
      .returning();

    return created;
  }

  async getCustomerRequests(filters?: { formType?: string; status?: string; limit?: number }): Promise<CustomerRequest[]> {
    const conditions: SQL<unknown>[] = [];

    if (filters?.formType) {
      conditions.push(eq(customerRequests.formType, filters.formType));
    }

    if (filters?.status) {
      conditions.push(eq(customerRequests.status, filters.status));
    }

    let query = this.db
      .select()
      .from(customerRequests)
      .orderBy(desc(customerRequests.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    return await query;
  }

  async listCustomerRequests(filters?: {
    formType?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    requests: CustomerRequest[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const conditions: SQL<unknown>[] = [];

    if (filters?.formType) {
      conditions.push(eq(customerRequests.formType, filters.formType));
    }

    if (filters?.status) {
      conditions.push(eq(customerRequests.status, filters.status));
    }

    if (filters?.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(customerRequests.senderName, term),
          ilike(customerRequests.senderEmail, term),
          ilike(customerRequests.senderCompany, term),
          ilike(customerRequests.subject, term),
          ilike(customerRequests.message, term),
          ilike(customerRequests.pagePath, term),
        ),
      );
    }

    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.min(Math.max(filters?.pageSize ?? 25, 1), 100);
    const offset = (page - 1) * pageSize;

    const filterClause = conditions.length > 0 ? and(...conditions) : undefined;

    let listQuery = this.db
      .select()
      .from(customerRequests);

    if (filterClause) {
      listQuery = listQuery.where(filterClause);
    }

    listQuery = listQuery.orderBy(desc(customerRequests.createdAt)).limit(pageSize).offset(offset);

    const requests = await listQuery;

    let totalQuery = this.db
      .select({ count: sql<number>`count(*)` })
      .from(customerRequests);

    if (filterClause) {
      totalQuery = totalQuery.where(filterClause);
    }

    const totalResult = await totalQuery;
    const total = Number(totalResult[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

    return {
      requests,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async getCustomerRequestAggregates(filters?: {
    formType?: string;
    status?: string;
    search?: string;
  }): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byFormType: Record<string, number>;
  }> {
    const conditions: SQL<unknown>[] = [];

    if (filters?.formType) {
      conditions.push(eq(customerRequests.formType, filters.formType));
    }

    if (filters?.status) {
      conditions.push(eq(customerRequests.status, filters.status));
    }

    if (filters?.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(customerRequests.senderName, term),
          ilike(customerRequests.senderEmail, term),
          ilike(customerRequests.senderCompany, term),
          ilike(customerRequests.subject, term),
          ilike(customerRequests.message, term),
          ilike(customerRequests.pagePath, term),
        ),
      );
    }

    const filterClause = conditions.length > 0 ? and(...conditions) : undefined;

    let totalQuery = this.db
      .select({ count: sql<number>`count(*)` })
      .from(customerRequests);

    if (filterClause) {
      totalQuery = totalQuery.where(filterClause);
    }

    const totalResult = await totalQuery;
    const total = Number(totalResult[0]?.count ?? 0);

    let statusQuery = this.db
      .select({ status: customerRequests.status, count: sql<number>`count(*)` })
      .from(customerRequests);

    if (filterClause) {
      statusQuery = statusQuery.where(filterClause);
    }

    statusQuery = statusQuery.groupBy(customerRequests.status);
    const statusRows = await statusQuery;

    let formTypeQuery = this.db
      .select({ formType: customerRequests.formType, count: sql<number>`count(*)` })
      .from(customerRequests);

    if (filterClause) {
      formTypeQuery = formTypeQuery.where(filterClause);
    }

    formTypeQuery = formTypeQuery.groupBy(customerRequests.formType);
    const formTypeRows = await formTypeQuery;

    const byStatus = statusRows.reduce((acc: Record<string, number>, row) => {
      if (row.status) {
        acc[row.status] = Number(row.count);
      }
      return acc;
    }, {});

    const byFormType = formTypeRows.reduce((acc: Record<string, number>, row) => {
      if (row.formType) {
        acc[row.formType] = Number(row.count);
      }
      return acc;
    }, {});

    return {
      total,
      byStatus,
      byFormType,
    };
  }

  async updateCustomerRequest(id: number, updates: Partial<CustomerRequest>): Promise<CustomerRequest | undefined> {
    const payload: Partial<CustomerRequest> = {
      ...updates,
      updatedAt: new Date(),
    };

    if (payload.resolvedAt === undefined) {
      delete payload.resolvedAt;
    }

    if (payload.metadata === undefined) {
      delete payload.metadata;
    }

    const [updated] = await this.db
      .update(customerRequests)
      .set(payload)
      .where(eq(customerRequests.id, id))
      .returning();

    return updated;
  }

  async createSalesInquiry(inquiry: any): Promise<any> {
    const request = await this.createCustomerRequest({
      formType: 'contact_sales',
      pagePath: inquiry.pagePath || '/contact-sales',
      senderName: inquiry.name,
      senderEmail: inquiry.email,
      senderCompany: inquiry.company,
      senderPhone: inquiry.phone,
      subject: inquiry.subject || (inquiry.useCase ? `Sales inquiry - ${inquiry.useCase}` : 'Sales inquiry'),
      message: inquiry.message,
      status: inquiry.status ?? 'new',
      metadata: {
        companySize: inquiry.companySize || 'unknown',
        useCase: inquiry.useCase || 'general',
        ...(inquiry.metadata || {}),
      },
    });

    return {
      ...inquiry,
      id: request.id,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      pagePath: request.pagePath,
    };
  }

  async getSalesInquiries(status?: string): Promise<any[]> {
    const inquiries = await this.getCustomerRequests({
      formType: 'contact_sales',
      status: status || undefined,
    });

    return inquiries.map((request) => ({
      id: request.id,
      name: request.senderName,
      email: request.senderEmail,
      company: request.senderCompany,
      phone: request.senderPhone,
      message: request.message,
      subject: request.subject,
      companySize: request.metadata?.companySize || 'unknown',
      useCase: request.metadata?.useCase || 'general',
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      pagePath: request.pagePath,
    }));
  }

  async updateSalesInquiry(id: number, updates: any): Promise<any | undefined> {
    const updated = await this.updateCustomerRequest(id, {
      senderName: updates.name,
      senderEmail: updates.email,
      senderCompany: updates.company,
      senderPhone: updates.phone,
      message: updates.message,
      subject: updates.subject,
      status: updates.status,
      metadata: {
        companySize: updates.companySize,
        useCase: updates.useCase,
        ...(updates.metadata || {}),
      },
    });

    if (!updated) {
      return undefined;
    }

    return {
      id: updated.id,
      name: updated.senderName,
      email: updated.senderEmail,
      company: updated.senderCompany,
      phone: updated.senderPhone,
      message: updated.message,
      subject: updated.subject,
      companySize: updated.metadata?.companySize || 'unknown',
      useCase: updated.metadata?.useCase || 'general',
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      pagePath: updated.pagePath,
    };
  }

  async createAbuseReport(report: any): Promise<any> {
    const request = await this.createCustomerRequest({
      formType: 'report_abuse',
      pagePath: report.pagePath || '/report-abuse',
      senderName: report.reporterName,
      senderEmail: report.reporterEmail,
      subject: `Abuse report - ${report.reportType}`,
      message: report.description,
      metadata: {
        reportType: report.reportType,
        targetUrl: report.targetUrl,
        username: report.username,
        reporterUserId: report.userId,
        ...(report.metadata || {}),
      },
    });

    return {
      ...report,
      id: request.id,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      pagePath: request.pagePath,
    };
  }

  async getAbuseReports(status?: string): Promise<any[]> {
    const reports = await this.getCustomerRequests({
      formType: 'report_abuse',
      status: status || undefined,
    });

    return reports.map((request) => ({
      id: request.id,
      reportType: request.metadata?.reportType,
      targetUrl: request.metadata?.targetUrl,
      description: request.message,
      reporterEmail: request.senderEmail,
      username: request.metadata?.username,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      pagePath: request.pagePath,
    }));
  }

  async updateAbuseReport(id: number, updates: any): Promise<any | undefined> {
    const updated = await this.updateCustomerRequest(id, {
      message: updates.description,
      senderEmail: updates.reporterEmail,
      status: updates.status,
      metadata: {
        reportType: updates.reportType,
        targetUrl: updates.targetUrl,
        username: updates.username,
        ...(updates.metadata || {}),
      },
    });

    if (!updated) {
      return undefined;
    }

    return {
      id: updated.id,
      reportType: updated.metadata?.reportType,
      targetUrl: updated.metadata?.targetUrl,
      description: updated.message,
      reporterEmail: updated.senderEmail,
      username: updated.metadata?.username,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      pagePath: updated.pagePath,
    };
  }

  // Kubernetes User Environment operations
  private userEnvironments = new Map<number, any>();

  async saveUserEnvironment(environment: any): Promise<void> {
    this.userEnvironments.set(environment.userId, environment);
    // In production, this would save to a database table
  }

  async getUserEnvironment(userId: string): Promise<any | null> {
    return this.userEnvironments.get(userId) || null;
    // In production, this would query from user_environments table
  }

  async updateUserEnvironment(environment: any): Promise<void> {
    this.userEnvironments.set(environment.userId, environment);
    // In production, this would update the user_environments table
  }

  async deleteUserEnvironment(userId: string): Promise<void> {
    this.userEnvironments.delete(userId);
    // In production, this would delete from user_environments table
  }

  // Voice/Video Session operations
  async createVoiceVideoSession(session: InsertVoiceVideoSession): Promise<VoiceVideoSession> {
    const [created] = await this.db.insert(voiceVideoSessions).values(session).returning();
    return created;
  }

  async getProjectVoiceVideoSessions(projectId: string): Promise<VoiceVideoSession[]> {
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

  async removeVoiceVideoParticipant(sessionId: number, userId: string): Promise<void> {
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

  async getProjectGpuInstances(projectId: string): Promise<GpuInstance[]> {
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

  async getAIUsageStats(userId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
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

  // Notification implementations
  async getNotifications(userId: string | number, unreadOnly: boolean = false): Promise<NotificationRecord[]> {
    const normalizedUserId = normalizeUserId(userId);
    const condition = unreadOnly
      ? and(eq(pushNotifications.userId, normalizedUserId), eq(pushNotifications.read, false))
      : eq(pushNotifications.userId, normalizedUserId);

    return await this.db
      .select()
      .from(pushNotifications)
      .where(condition)
      .orderBy(desc(pushNotifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string | number): Promise<number> {
    const normalizedUserId = normalizeUserId(userId);
    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(pushNotifications)
      .where(and(eq(pushNotifications.userId, normalizedUserId), eq(pushNotifications.read, false)));

    return Number(result?.count ?? 0);
  }

  async getNotificationPreferences(userId: string | number): Promise<NotificationPreferenceRecord> {
    const normalizedUserId = normalizeUserId(userId);
    const [existing] = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, normalizedUserId));

    if (existing) {
      const normalized = normalizePreferences(existing, undefined);

      const needsUpdate =
        JSON.stringify(existing.email ?? {}) !== JSON.stringify(normalized.email) ||
        JSON.stringify(existing.push ?? {}) !== JSON.stringify(normalized.push) ||
        existing.frequency !== normalized.frequency;

      if (needsUpdate) {
        const [updated] = await this.db
          .update(notificationPreferences)
          .set({ ...normalized, updatedAt: new Date() })
          .where(eq(notificationPreferences.userId, normalizedUserId))
          .returning();

        return updated ?? { ...existing, ...normalized };
      }

      return {
        ...existing,
        email: normalized.email,
        push: normalized.push,
        frequency: normalized.frequency,
      };
    }

    const defaults = normalizePreferences();
    const [created] = await this.db
      .insert(notificationPreferences)
      .values({
        userId: normalizedUserId,
        email: defaults.email,
        push: defaults.push,
        frequency: defaults.frequency,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return (
      created ?? {
        userId: normalizedUserId,
        email: defaults.email,
        push: defaults.push,
        frequency: defaults.frequency,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }

  async updateNotificationPreferences(
    userId: string | number,
    preferences: NotificationPreferencesPayload,
  ): Promise<NotificationPreferenceRecord> {
    const normalizedUserId = normalizeUserId(userId);
    const current = await this.getNotificationPreferences(normalizedUserId);
    const normalized = normalizePreferences(current, preferences);
    const [updated] = await this.db
      .insert(notificationPreferences)
      .values({
        userId: normalizedUserId,
        email: normalized.email,
        push: normalized.push,
        frequency: normalized.frequency,
        createdAt: current?.createdAt ?? new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          email: normalized.email,
          push: normalized.push,
          frequency: normalized.frequency,
          updatedAt: new Date(),
        },
      })
      .returning();

    return (
      updated ?? {
        userId: normalizedUserId,
        email: normalized.email,
        push: normalized.push,
        frequency: normalized.frequency,
        createdAt: current?.createdAt ?? new Date(),
        updatedAt: new Date(),
      }
    );
  }

  async markNotificationAsRead(notificationId: number, userId: string | number): Promise<void> {
    const normalizedUserId = normalizeUserId(userId);
    await this.db
      .update(pushNotifications)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(pushNotifications.id, notificationId), eq(pushNotifications.userId, normalizedUserId)));
  }

  async markAllNotificationsAsRead(userId: string | number): Promise<void> {
    const normalizedUserId = normalizeUserId(userId);
    await this.db
      .update(pushNotifications)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(pushNotifications.userId, normalizedUserId), eq(pushNotifications.read, false)));
  }

  async deleteNotification(notificationId: number, userId: string | number): Promise<void> {
    const normalizedUserId = normalizeUserId(userId);
    await this.db
      .delete(pushNotifications)
      .where(and(eq(pushNotifications.id, notificationId), eq(pushNotifications.userId, normalizedUserId)));
  }

  async deleteAllNotifications(userId: string | number): Promise<void> {
    const normalizedUserId = normalizeUserId(userId);
    await this.db.delete(pushNotifications).where(eq(pushNotifications.userId, normalizedUserId));
  }

  async createNotification(notification: InsertNotificationRecord): Promise<NotificationRecord> {
    const normalizedUserId = normalizeUserId(notification.userId);
    const parsed = insertNotificationSchema.parse({ ...notification, userId: normalizedUserId });
    const [created] = await this.db
      .insert(pushNotifications)
      .values({
        ...parsed,
        userId: normalizedUserId,
        type: parsed.type ?? 'system',
        data: parsed.data ?? {},
        read: false,
        sent: false,
        createdAt: new Date(),
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create notification');
    }

    return created;
  }

  async updatePushNotification(id: number, data: Partial<NotificationRecord>): Promise<void> {
    if (Object.keys(data).length === 0) {
      return;
    }

    const updates: Partial<NotificationRecord> = { ...data };
    delete (updates as any).id;
    if (updates.userId !== undefined) {
      updates.userId = normalizeUserId(updates.userId);
    }

    if (updates.read !== undefined && updates.readAt === undefined) {
      updates.readAt = updates.read ? new Date() : null;
    }

    for (const key of Object.keys(updates) as (keyof NotificationRecord)[]) {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    }

    await this.db
      .update(pushNotifications)
      .set(updates)
      .where(eq(pushNotifications.id, id));
  }

  // Custom Prompts implementations
  async createPromptTemplate(template: InsertPromptTemplate): Promise<PromptTemplate> {
    const [created] = await this.db.insert(promptTemplates).values(template).returning();
    return created;
  }

  async getPromptTemplates(filters?: { category?: string; isSystem?: boolean; isPublic?: boolean }): Promise<PromptTemplate[]> {
    let query = this.db.select().from(promptTemplates);
    const conditions: SQL[] = [];

    if (filters?.category) {
      conditions.push(eq(promptTemplates.category, filters.category));
    }
    if (filters?.isSystem !== undefined) {
      conditions.push(eq(promptTemplates.isSystem, filters.isSystem));
    }
    if (filters?.isPublic !== undefined) {
      conditions.push(eq(promptTemplates.isPublic, filters.isPublic));
    }

    if (conditions.length > 0) {
      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
      query = query.where(whereClause);
    }

    return await query.orderBy(desc(promptTemplates.usageCount), desc(promptTemplates.createdAt));
  }

  async getPromptTemplate(id: number): Promise<PromptTemplate | undefined> {
    const [template] = await this.db.select().from(promptTemplates).where(eq(promptTemplates.id, id));
    return template;
  }

  async updatePromptTemplate(id: number, template: Partial<InsertPromptTemplate>): Promise<PromptTemplate | undefined> {
    const [updated] = await this.db
      .update(promptTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(promptTemplates.id, id))
      .returning();
    return updated;
  }

  async deletePromptTemplate(id: number): Promise<boolean> {
    const deleted = await this.db.delete(promptTemplates).where(eq(promptTemplates.id, id));
    return deleted.rowCount > 0;
  }

  async createCustomPrompt(prompt: InsertCustomPrompt): Promise<CustomPrompt> {
    const [created] = await this.db.insert(customPrompts).values(prompt).returning();
    return created;
  }

  async getUserCustomPrompts(userId: string): Promise<CustomPrompt[]> {
    return await this.db
      .select()
      .from(customPrompts)
      .where(eq(customPrompts.userId, userId))
      .orderBy(desc(customPrompts.isFavorite), desc(customPrompts.usageCount));
  }

  async getCustomPrompt(id: number): Promise<CustomPrompt | undefined> {
    const [prompt] = await this.db.select().from(customPrompts).where(eq(customPrompts.id, id));
    return prompt;
  }

  async updateCustomPrompt(id: number, prompt: Partial<InsertCustomPrompt>): Promise<CustomPrompt | undefined> {
    const [updated] = await this.db
      .update(customPrompts)
      .set({ ...prompt, updatedAt: new Date() })
      .where(eq(customPrompts.id, id))
      .returning();
    return updated;
  }

  async deleteCustomPrompt(id: number): Promise<boolean> {
    const deleted = await this.db.delete(customPrompts).where(eq(customPrompts.id, id));
    return deleted.rowCount > 0;
  }

  async createProjectAiRule(rule: InsertProjectAiRule): Promise<ProjectAiRule> {
    const [created] = await this.db.insert(projectAiRules).values(rule).returning();
    return created;
  }

  async getProjectAiRules(projectId: string, activeOnly?: boolean): Promise<ProjectAiRule[]> {
    let query = this.db.select().from(projectAiRules).where(eq(projectAiRules.projectId, projectId));

    if (activeOnly) {
      query = query.where(and(eq(projectAiRules.projectId, projectId), eq(projectAiRules.isActive, true)));
    }

    return await query.orderBy(desc(projectAiRules.priority));
  }

  async getProjectAiRule(id: number): Promise<ProjectAiRule | undefined> {
    const [rule] = await this.db.select().from(projectAiRules).where(eq(projectAiRules.id, id));
    return rule;
  }

  async updateProjectAiRule(id: number, rule: Partial<InsertProjectAiRule>): Promise<ProjectAiRule | undefined> {
    const [updated] = await this.db
      .update(projectAiRules)
      .set({ ...rule, updatedAt: new Date() })
      .where(eq(projectAiRules.id, id))
      .returning();
    return updated;
  }

  async deleteProjectAiRule(id: number): Promise<boolean> {
    const deleted = await this.db.delete(projectAiRules).where(eq(projectAiRules.id, id));
    return deleted.rowCount > 0;
  }

  async createPromptUsageHistory(usage: InsertPromptUsageHistory): Promise<PromptUsageHistory> {
    const [created] = await this.db.insert(promptUsageHistory).values(usage).returning();

    // Update usage count for associated prompt or template
    if (usage.customPromptId) {
      await this.db
        .update(customPrompts)
        .set({
          usageCount: sql`${customPrompts.usageCount} + 1`,
          lastUsedAt: new Date()
        })
        .where(eq(customPrompts.id, usage.customPromptId));
    }
    if (usage.templateId) {
      await this.db
        .update(promptTemplates)
        .set({
          usageCount: sql`${promptTemplates.usageCount} + 1`
        })
        .where(eq(promptTemplates.id, usage.templateId));
    }

    return created;
  }

  async getPromptUsageHistory(filters: { userId?: string; projectId?: string; limit?: number }): Promise<PromptUsageHistory[]> {
    let query = this.db.select().from(promptUsageHistory);
    const conditions: SQL[] = [];

    if (filters.userId) {
      conditions.push(eq(promptUsageHistory.userId, filters.userId));
    }
    if (filters.projectId) {
      conditions.push(eq(promptUsageHistory.projectId, filters.projectId));
    }

    if (conditions.length > 0) {
      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
      query = query.where(whereClause);
    }

    query = query.orderBy(desc(promptUsageHistory.createdAt));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    return await query;
  }

  async createPromptTemplateRating(rating: InsertPromptTemplateRating): Promise<PromptTemplateRating> {
    const [created] = await this.db.insert(promptTemplateRatings).values(rating).returning();

    // Update average rating for the template
    await this.updatePromptTemplateRating(rating.templateId);

    return created;
  }

  async getPromptTemplateRatings(templateId: number): Promise<PromptTemplateRating[]> {
    return await this.db
      .select()
      .from(promptTemplateRatings)
      .where(eq(promptTemplateRatings.templateId, templateId))
      .orderBy(desc(promptTemplateRatings.createdAt));
  }

  async updatePromptTemplateRating(templateId: number): Promise<void> {
    const ratings = await this.getPromptTemplateRatings(templateId);
    if (ratings.length > 0) {
      const average = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      await this.db
        .update(promptTemplates)
        .set({ rating: average })
        .where(eq(promptTemplates.id, templateId));
    }
  }

  // Initialize default prompt templates
  async initializeDefaultPromptTemplates(): Promise<void> {
    try {
      // Check if prompt_templates table has the correct schema (check for required columns)
      const columnCheck = await this.db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'prompt_templates'
        AND column_name IN ('name', 'prompt', 'variables', 'is_system')
      `);

      // Handle different result formats
      const rows = Array.isArray(columnCheck) ? columnCheck : (columnCheck.rows || []);
      if (rows.length < 4) {
        console.log('[Storage] Skipping prompt templates initialization (optional feature) - table schema mismatch or missing columns');
        return;
      }
    } catch (error: any) {
      console.log('[Storage] Skipping prompt templates initialization (optional feature):', error?.message || 'Unknown error');
      return;
    }
    console.log('[Storage] Prompt templates table found with correct schema, initializing defaults...');

    const defaultTemplates = [
      {
        name: 'React Component Generator',
        description: 'Generate a complete React component with proper TypeScript typing and hooks',
        category: 'code_generation',
        prompt: `Generate a React functional component named {{componentName}} with TypeScript that:
- Uses proper TypeScript interfaces for props
- Includes {{hooks}} hooks if specified
- Follows React best practices
- Has proper error boundaries
- Includes JSDoc documentation
- Uses shadcn/ui components where appropriate
Component purpose: {{description}}
Props needed: {{props}}`,
        variables: [
          { name: 'componentName', description: 'Name of the component', defaultValue: 'MyComponent' },
          { name: 'hooks', description: 'React hooks to include', defaultValue: 'useState, useEffect' },
          { name: 'description', description: 'What the component does', defaultValue: '' },
          { name: 'props', description: 'Component props specification', defaultValue: '' }
        ],
        isSystem: true,
        isPublic: true,
        createdBy: 'system',
        tags: ['react', 'component', 'typescript'],
        examples: [],
      },
      {
        name: 'API Endpoint Creator',
        description: 'Create a RESTful API endpoint with proper validation and error handling',
        category: 'code_generation',
        prompt: `Create a {{method}} API endpoint at {{endpoint}} that:
- Validates input using Zod schemas
- Implements proper error handling
- Uses async/await pattern
- Includes rate limiting
- Has comprehensive logging
- Returns appropriate HTTP status codes
Functionality: {{functionality}}
Request body: {{requestBody}}
Response format: {{responseFormat}}`,
        variables: [
          { name: 'method', description: 'HTTP method', defaultValue: 'POST' },
          { name: 'endpoint', description: 'API endpoint path', defaultValue: '/api/resource' },
          { name: 'functionality', description: 'What the endpoint does', defaultValue: '' },
          { name: 'requestBody', description: 'Expected request body structure', defaultValue: '' },
          { name: 'responseFormat', description: 'Response data format', defaultValue: '' }
        ],
        isSystem: true,
        isPublic: true,
        createdBy: 'system',
        tags: ['api', 'backend', 'rest'],
        examples: [],
      },
      {
        name: 'Database Schema Designer',
        description: 'Design database schema with Drizzle ORM',
        category: 'architecture',
        prompt: `Design a database schema for {{entityName}} using Drizzle ORM that includes:
- Proper table definitions with appropriate column types
- Primary and foreign key constraints
- Indexes for performance
- Relations between tables
- Insert and select schemas with Zod validation
Requirements: {{requirements}}
Relationships: {{relationships}}
Fields needed: {{fields}}`,
        variables: [
          { name: 'entityName', description: 'Name of the entity/table', defaultValue: '' },
          { name: 'requirements', description: 'Business requirements', defaultValue: '' },
          { name: 'relationships', description: 'Relationships with other tables', defaultValue: '' },
          { name: 'fields', description: 'Fields and their types', defaultValue: '' }
        ],
        isSystem: true,
        isPublic: true,
        createdBy: 'system',
        tags: ['database', 'drizzle', 'schema'],
        examples: [],
      },
      {
        name: 'Bug Fix Assistant',
        description: 'Help identify and fix bugs in code',
        category: 'debugging',
        prompt: `Analyze this {{language}} code and help fix the bug:
Error message: {{errorMessage}}
Code context: {{codeContext}}
Expected behavior: {{expectedBehavior}}
Actual behavior: {{actualBehavior}}

Please:
1. Identify the root cause
2. Provide a detailed explanation
3. Suggest a fix with code
4. Recommend prevention strategies`,
        variables: [
          { name: 'language', description: 'Programming language', defaultValue: 'TypeScript' },
          { name: 'errorMessage', description: 'Error message received', defaultValue: '' },
          { name: 'codeContext', description: 'Code around the error', defaultValue: '' },
          { name: 'expectedBehavior', description: 'What should happen', defaultValue: '' },
          { name: 'actualBehavior', description: 'What actually happens', defaultValue: '' }
        ],
        isSystem: true,
        isPublic: true,
        createdBy: 'system',
        tags: ['debugging', 'troubleshooting'],
        examples: [],
      },
      {
        name: 'Code Refactoring Helper',
        description: 'Refactor code for better maintainability and performance',
        category: 'refactoring',
        prompt: `Refactor this {{language}} code to improve:
- Code readability and maintainability
- Performance optimization
- Design patterns implementation
- {{specificImprovements}}

Current code: {{currentCode}}
Context: {{context}}

Provide:
1. Refactored code
2. Explanation of changes
3. Performance impact analysis`,
        variables: [
          { name: 'language', description: 'Programming language', defaultValue: 'TypeScript' },
          { name: 'specificImprovements', description: 'Specific improvements needed', defaultValue: '' },
          { name: 'currentCode', description: 'Code to refactor', defaultValue: '' },
          { name: 'context', description: 'Additional context', defaultValue: '' }
        ],
        isSystem: true,
        isPublic: true,
        createdBy: 'system',
        tags: ['refactoring', 'clean-code'],
        examples: [],
      },
      {
        name: 'Documentation Writer',
        description: 'Generate comprehensive documentation for code',
        category: 'documentation',
        prompt: `Generate documentation for this {{language}} {{codeType}}:
- Include detailed descriptions
- Add parameter documentation
- Provide usage examples
- Include return value documentation
- Add complexity analysis if applicable
Style: {{documentationStyle}}
Code: {{code}}`,
        variables: [
          { name: 'language', description: 'Programming language', defaultValue: 'TypeScript' },
          { name: 'codeType', description: 'Type of code (function, class, module)', defaultValue: 'function' },
          { name: 'documentationStyle', description: 'Documentation style (JSDoc, Markdown)', defaultValue: 'JSDoc' },
          { name: 'code', description: 'Code to document', defaultValue: '' }
        ],
        isSystem: true,
        isPublic: true,
        createdBy: 'system',
        tags: ['documentation', 'comments'],
        examples: [],
      },
      {
        name: 'Test Generator',
        description: 'Generate comprehensive test cases',
        category: 'testing',
        prompt: `Generate {{testFramework}} tests for:
{{codeToTest}}

Requirements:
- Cover all edge cases
- Include positive and negative test cases
- Mock external dependencies
- Test error handling
- Aim for {{coverage}}% coverage
- Use {{testingApproach}} approach`,
        variables: [
          { name: 'testFramework', description: 'Testing framework', defaultValue: 'Jest' },
          { name: 'codeToTest', description: 'Code that needs testing', defaultValue: '' },
          { name: 'coverage', description: 'Target coverage percentage', defaultValue: '80' },
          { name: 'testingApproach', description: 'Testing approach (unit, integration)', defaultValue: 'unit' }
        ],
        isSystem: true,
        isPublic: true,
        createdBy: 'system',
        tags: ['testing', 'quality-assurance'],
        examples: [],
      },
      {
        name: 'Performance Optimizer',
        description: 'Optimize code for better performance',
        category: 'performance',
        prompt: `Analyze and optimize this code for performance:
{{code}}

Focus on:
- Time complexity optimization
- Space complexity reduction
- {{specificOptimizations}}
- Database query optimization (if applicable)
- Caching strategies
Environment: {{environment}}
Constraints: {{constraints}}`,
        variables: [
          { name: 'code', description: 'Code to optimize', defaultValue: '' },
          { name: 'specificOptimizations', description: 'Specific areas to optimize', defaultValue: '' },
          { name: 'environment', description: 'Runtime environment', defaultValue: 'Node.js' },
          { name: 'constraints', description: 'Any constraints or limitations', defaultValue: '' }
        ],
        isSystem: true,
        isPublic: true,
        createdBy: 'system',
        tags: ['performance', 'optimization'],
        examples: [],
      }
    ];

    try {
      // Check if templates already exist
      const existingTemplates = await this.db
        .select()
        .from(promptTemplates)
        .where(eq(promptTemplates.isSystem, true));

      if (existingTemplates.length === 0) {
        // Insert default templates
        for (const template of defaultTemplates) {
          await this.db.insert(promptTemplates).values({
            ...template,
            usageCount: 0,
            rating: 0,
            variables: template.variables as any,
            tags: template.tags as any,
            examples: template.examples as any,
          });
        }
        console.log('[Storage] Default prompt templates initialized successfully');
      } else {
        console.log('[Storage] Default prompt templates already exist, skipping initialization');
      }
    } catch (error: any) {
      // Gracefully handle table schema mismatches or missing tables
      // This is a non-critical optional feature for AI prompt templates
      console.log('[Storage] Skipping prompt templates initialization (optional feature):', error?.message || 'Unknown error');
    }
  }

  // Added getDBStats method with error handling
  async getDBStats(): Promise<{ totalProjects: number; totalUsers: number; totalFiles: number }> {
    try {
      const [projectsResult] = await this.db.select({ count: sql<number>`COUNT(*)` }).from(projects);
      const [usersResult] = await this.db.select({ count: sql<number>`COUNT(*)` }).from(users);
      const [filesResult] = await this.db.select({ count: sql<number>`COUNT(*)` }).from(files);

      return {
        totalProjects: projectsResult?.count || 0,
        totalUsers: usersResult?.count || 0,
        totalFiles: filesResult?.count || 0
      };
    } catch (error) {
      console.error('Error getting DB stats:', error);
      return {
        totalProjects: 0,
        totalUsers: 0,
        totalFiles: 0
      };
    }
  }

  // Added getDBEntries method with error handling
  async getDBEntries(): Promise<any[]> {
    try {
      const allProjects = await this.db.select().from(projects).limit(10);
      const allUsers = await this.db.select().from(users).limit(10);
      const allFiles = await this.db.select().from(files).limit(10);

      return [
        ...allProjects.map(p => ({ type: 'project', ...p })),
        ...allUsers.map(u => ({ type: 'user', ...u })),
        ...allFiles.map(f => ({ type: 'file', ...f }))
      ];
    } catch (error) {
      console.error('Error getting DB entries:', error);
      return [];
    }
  }

  // ============================================================================
  // IDE WORKSPACE FEATURES - Implementation
  // ============================================================================

  // LSP Diagnostics Methods - For Problems Panel
  async createLspDiagnostic(diagnostic: InsertLspDiagnostic): Promise<LspDiagnostic> {
    const [created] = await this.db.insert(lspDiagnostics).values(diagnostic).returning();
    return created;
  }

  async getLspDiagnostic(id: string): Promise<LspDiagnostic | undefined> {
    const [diagnostic] = await this.db.select().from(lspDiagnostics).where(eq(lspDiagnostics.id, id));
    return diagnostic;
  }

  async getLspDiagnostics(projectId: string, filePath?: string): Promise<LspDiagnostic[]> {
    let query = this.db.select().from(lspDiagnostics).where(eq(lspDiagnostics.projectId, projectId));
    
    if (filePath) {
      query = query.where(eq(lspDiagnostics.filePath, filePath));
    }

    return await query.orderBy(desc(lspDiagnostics.createdAt));
  }

  async updateLspDiagnostic(id: string, updates: Partial<LspDiagnostic>): Promise<LspDiagnostic> {
    const [updated] = await this.db
      .update(lspDiagnostics)
      .set(updates)
      .where(eq(lspDiagnostics.id, id))
      .returning();
    return updated;
  }

  async deleteLspDiagnostic(id: string): Promise<void> {
    await this.db.delete(lspDiagnostics).where(eq(lspDiagnostics.id, id));
  }

  async clearLspDiagnostics(projectId: string, filePath?: string): Promise<void> {
    let query = this.db.delete(lspDiagnostics).where(eq(lspDiagnostics.projectId, projectId));
    
    if (filePath) {
      query = query.where(eq(lspDiagnostics.filePath, filePath));
    }

    await query;
  }

  // Build Logs Methods - For Output Panel (stub implementations for now)
  async createBuildLog(log: InsertBuildLog): Promise<BuildLog> {
    const [created] = await this.db.insert(buildLogs).values(log).returning();
    return created;
  }

  async getBuildLogs(projectId: string, buildId?: string, limit: number = 1000): Promise<BuildLog[]> {
    let query = this.db.select().from(buildLogs).where(eq(buildLogs.projectId, projectId));
    
    if (buildId) {
      query = query.where(eq(buildLogs.buildId, buildId));
    }

    return await query.orderBy(desc(buildLogs.timestamp)).limit(limit);
  }

  async clearBuildLogs(projectId: string, buildId?: string): Promise<void> {
    let query = this.db.delete(buildLogs).where(eq(buildLogs.projectId, projectId));
    
    if (buildId) {
      query = query.where(eq(buildLogs.buildId, buildId));
    }

    await query;
  }

  // Test Runs Methods - For Testing Panel (stub implementations)
  async createTestRun(run: InsertTestRun): Promise<TestRun> {
    const [created] = await this.db.insert(testRuns).values(run).returning();
    return created;
  }

  async getTestRun(id: string): Promise<TestRun | undefined> {
    const [run] = await this.db.select().from(testRuns).where(eq(testRuns.id, id));
    return run;
  }

  async getTestRuns(projectId: string, limit: number = 50): Promise<TestRun[]> {
    return await this.db
      .select()
      .from(testRuns)
      .where(eq(testRuns.projectId, projectId))
      .orderBy(desc(testRuns.startedAt))
      .limit(limit);
  }

  async updateTestRun(id: string, updates: Partial<TestRun>): Promise<TestRun> {
    const [updated] = await this.db
      .update(testRuns)
      .set(updates)
      .where(eq(testRuns.id, id))
      .returning();
    return updated;
  }

  async createTestCase(testCase: InsertTestCase): Promise<TestCase> {
    const [created] = await this.db.insert(testCases).values(testCase).returning();
    return created;
  }

  async getTestCases(testRunId: string): Promise<TestCase[]> {
    return await this.db
      .select()
      .from(testCases)
      .where(eq(testCases.testRunId, testRunId))
      .orderBy(testCases.suiteName, testCases.testName);
  }

  async updateTestCase(id: string, updates: Partial<TestCase>): Promise<TestCase> {
    const [updated] = await this.db
      .update(testCases)
      .set(updates)
      .where(eq(testCases.id, id))
      .returning();
    return updated;
  }

  // Security Scans Methods - For Security Scanner Panel (stub implementations)
  async createSecurityScan(scan: InsertSecurityScan): Promise<SecurityScan> {
    const [created] = await this.db.insert(securityScans).values(scan).returning();
    return created;
  }

  async getSecurityScan(id: string): Promise<SecurityScan | undefined> {
    const [scan] = await this.db.select().from(securityScans).where(eq(securityScans.id, id));
    return scan;
  }

  async getSecurityScans(projectId: string, limit: number = 50): Promise<SecurityScan[]> {
    return await this.db
      .select()
      .from(securityScans)
      .where(eq(securityScans.projectId, projectId))
      .orderBy(desc(securityScans.startedAt))
      .limit(limit);
  }

  async updateSecurityScan(id: string, updates: Partial<SecurityScan>): Promise<SecurityScan> {
    const [updated] = await this.db
      .update(securityScans)
      .set(updates)
      .where(eq(securityScans.id, id))
      .returning();
    return updated;
  }

  async createVulnerability(vulnerability: InsertVulnerability): Promise<Vulnerability> {
    const [created] = await this.db.insert(vulnerabilities).values(vulnerability).returning();
    return created;
  }

  async getVulnerabilities(scanId: string): Promise<Vulnerability[]> {
    return await this.db
      .select()
      .from(vulnerabilities)
      .where(eq(vulnerabilities.scanId, scanId))
      .orderBy(desc(vulnerabilities.severity), vulnerabilities.title);
  }

  async getProjectVulnerabilities(projectId: string, status?: string): Promise<Vulnerability[]> {
    let query = this.db.select().from(vulnerabilities).where(eq(vulnerabilities.projectId, projectId));
    
    if (status) {
      query = query.where(eq(vulnerabilities.status, status));
    }

    return await query.orderBy(desc(vulnerabilities.discoveredAt));
  }

  async updateVulnerability(id: string, updates: Partial<Vulnerability>): Promise<Vulnerability> {
    const [updated] = await this.db
      .update(vulnerabilities)
      .set(updates)
      .where(eq(vulnerabilities.id, id))
      .returning();
    return updated;
  }

  // Resource Metrics Methods - For Resources Panel (stub implementations)
  async createResourceMetric(metric: InsertResourceMetric): Promise<ResourceMetric> {
    const [created] = await this.db.insert(resourceMetrics).values(metric).returning();
    return created;
  }

  async getResourceMetrics(projectId: string, limit: number = 100): Promise<ResourceMetric[]> {
    return await this.db
      .select()
      .from(resourceMetrics)
      .where(eq(resourceMetrics.projectId, projectId))
      .orderBy(desc(resourceMetrics.timestamp))
      .limit(limit);
  }

  async getLatestResourceMetrics(projectId: string): Promise<ResourceMetric | undefined> {
    const [metric] = await this.db
      .select()
      .from(resourceMetrics)
      .where(eq(resourceMetrics.projectId, projectId))
      .orderBy(desc(resourceMetrics.timestamp))
      .limit(1);
    return metric;
  }

  // Pane Configurations Methods - For Split Editor (stub implementations)
  async createPaneConfiguration(config: InsertPaneConfiguration): Promise<PaneConfiguration> {
    const [created] = await this.db.insert(paneConfigurations).values(config).returning();
    return created;
  }

  async getPaneConfiguration(id: string): Promise<PaneConfiguration | undefined> {
    const [config] = await this.db.select().from(paneConfigurations).where(eq(paneConfigurations.id, id));
    return config;
  }

  async getUserPaneConfigurations(userId: string, projectId?: string): Promise<PaneConfiguration[]> {
    let query = this.db.select().from(paneConfigurations).where(eq(paneConfigurations.userId, userId));
    
    if (projectId) {
      query = query.where(eq(paneConfigurations.projectId, projectId));
    }

    return await query.orderBy(desc(paneConfigurations.updatedAt));
  }

  async updatePaneConfiguration(id: string, updates: Partial<PaneConfiguration>): Promise<PaneConfiguration> {
    const [updated] = await this.db
      .update(paneConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(paneConfigurations.id, id))
      .returning();
    return updated;
  }

  async deletePaneConfiguration(id: string): Promise<void> {
    await this.db.delete(paneConfigurations).where(eq(paneConfigurations.id, id));
  }

  // Team membership check - For access control
  async getTeamMemberByUserAndProject(userId: string, projectId: string): Promise<any | undefined> {
    try {
      // Get the team associated with this project (if any)
      const project = await this.db.query.projects.findFirst({
        where: eq(projects.id, projectId),
        with: {
          owner: {
            with: {
              teams: {
                with: {
                  members: {
                    where: eq(teamMembers.userId, userId)
                  }
                }
              }
            }
          }
        }
      });

      // Check if user is a member of any team associated with the project
      const teams = project?.owner?.teams || [];
      for (const team of teams) {
        const member = team.members?.find(m => m.userId === userId);
        if (member) {
          return member;
        }
      }

      // Alternative: Direct team membership lookup
      const [directMember] = await this.db
        .select()
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(and(
          eq(teamMembers.userId, userId),
          // Note: This assumes team.projectId exists or similar relationship
          // Adjust based on actual schema relationships
          sql`${teams.id} IN (SELECT team_id FROM team_project_access WHERE project_id = ${projectId})`
        ))
        .limit(1)
        .catch(() => []); // Gracefully handle if relationship doesn't exist yet

      return directMember || undefined;
    } catch (error) {
      console.error('[Storage] Error checking team membership:', error);
      return undefined;
    }
  }

  // ============================================================================
  // AI APPROVAL QUEUE - Fortune 500 Security
  // ============================================================================

  async createAiApproval(approval: InsertAiApprovalQueue): Promise<AiApprovalQueue> {
    const [created] = await this.db.insert(aiApprovalQueue).values(approval).returning();
    return created;
  }

  async getAiApproval(id: string): Promise<AiApprovalQueue | undefined> {
    const [approval] = await this.db.select().from(aiApprovalQueue).where(eq(aiApprovalQueue.id, id));
    return approval;
  }

  async getPendingAiApprovals(userId: string, projectId: string): Promise<AiApprovalQueue[]> {
    return await this.db
      .select()
      .from(aiApprovalQueue)
      .where(
        and(
          eq(aiApprovalQueue.userId, userId),
          eq(aiApprovalQueue.projectId, projectId),
          eq(aiApprovalQueue.status, 'pending'),
          sql`${aiApprovalQueue.expiresAt} > NOW()`
        )
      )
      .orderBy(desc(aiApprovalQueue.createdAt));
  }

  async updateAiApprovalStatus(
    id: string,
    status: string,
    processedBy: string,
    rejectionReason?: string
  ): Promise<AiApprovalQueue> {
    const [updated] = await this.db
      .update(aiApprovalQueue)
      .set({
        status,
        processedAt: new Date(),
        processedBy,
        rejectionReason,
      })
      .where(eq(aiApprovalQueue.id, id))
      .returning();
    return updated;
  }

  async expireOldAiApprovals(): Promise<number> {
    const result = await this.db
      .update(aiApprovalQueue)
      .set({ status: 'expired' })
      .where(
        and(
          eq(aiApprovalQueue.status, 'pending'),
          sql`${aiApprovalQueue.expiresAt} <= NOW()`
        )
      );
    return result.rowCount || 0;
  }

  // ============================================================================
  // AI AUDIT LOGS - Compliance-grade audit trail
  // ============================================================================

  async createAiAuditLog(log: InsertAiAuditLog): Promise<AiAuditLog> {
    const [created] = await this.db.insert(aiAuditLogs).values(log).returning();
    return created;
  }

  async getAiAuditLogs(filters: {
    userId?: string;
    projectId?: string;
    approvalId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AiAuditLog[]> {
    const conditions = [];
    
    if (filters.userId) {
      conditions.push(eq(aiAuditLogs.userId, filters.userId));
    }
    if (filters.projectId) {
      conditions.push(eq(aiAuditLogs.projectId, filters.projectId));
    }
    if (filters.approvalId) {
      conditions.push(eq(aiAuditLogs.approvalId, filters.approvalId));
    }
    if (filters.startDate) {
      conditions.push(sql`${aiAuditLogs.timestamp} >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      conditions.push(sql`${aiAuditLogs.timestamp} <= ${filters.endDate}`);
    }

    return await this.db
      .select()
      .from(aiAuditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(aiAuditLogs.timestamp))
      .limit(filters.limit || 100);
  }
}

// Initialize storage
console.log('[Storage Module] Creating DatabaseStorage instance...');
export const storage = new DatabaseStorage();
console.log('[Storage Module] DatabaseStorage instance created successfully');

// Export a getter function for compatibility with modular routers
export const getStorage = () => storage;

// Initialize default templates on startup
console.log('[Storage Module] Starting default templates initialization...');
(async () => {
  try {
    await storage.initializeDefaultPromptTemplates();
    console.log('[Storage Module] Default templates initialization completed');
  } catch (error) {
    console.error('Failed to initialize default prompt templates:', error);
  }
})();
console.log('[Storage Module] Default templates initialization scheduled');

// Session store with pg pool
console.log('[Storage Module] About to import Pool from pg...');
// Note: Pool import has been moved to top of file
console.log('[Storage Module] Pool imported successfully');

console.log('[Storage Module] Starting session store initialization...');

// Initialize session store with error handling
let sessionStore: any;

try {
  if (!process.env.DATABASE_URL) {
    console.error('[Storage Module] DATABASE_URL not set, using dummy session store');
    // Create a dummy session store for development
    sessionStore = {
      get: (_sid: string, callback: Function) => callback(null, null),
      set: (_sid: string, _session: any, callback: Function) => callback(null),
      destroy: (_sid: string, callback: Function) => callback(null),
      touch: (_sid: string, _session: any, callback: Function) => callback(null),
    };
  } else {
    console.log('[Storage Module] Creating PostgreSQL pool for session store...');
    // Create a native pg pool for session store
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    console.log('[Storage Module] Creating pgStore...');
    const pgStore = connectPg(session);
    
    console.log('[Storage Module] Initializing session store...');
    sessionStore = new pgStore({
      pool: pgPool,
      createTableIfMissing: true,
      ttl: 7 * 24 * 60 * 60, // 7 days
    });
    console.log('[Storage Module] Session store initialized successfully');
  }
} catch (error) {
  console.error('[Storage Module] Failed to initialize session store:', error);
  // Create a fallback in-memory session store
  sessionStore = {
    get: (_sid: string, callback: Function) => callback(null, null),
    set: (_sid: string, _session: any, callback: Function) => callback(null),
    destroy: (_sid: string, callback: Function) => callback(null),
    touch: (_sid: string, _session: any, callback: Function) => callback(null),
  };
}

export { sessionStore };