import { relations } from "drizzle-orm/relations";
import { projects, projectCollaborators, users, files, bounties, environmentVariables, bountySubmissions, loginHistory, apiTokens, secrets, notifications, notificationPreferences, projectLikes, projectViews, activityLog, communityPosts, communityChallenges, themes, learningCourses, userLearningProgress, userCycles, cyclesTransactions, objectStorage, aiUsageTracking, comments, checkpoints, projectTimeTracking, projectScreenshots, taskSummaries, apiKeys, usageTracking, checkpointFiles, userCredits, budgetLimits, usageAlerts, objectStorageBuckets, objectStorageFiles, keyValueStore, aiConversations, webSearchHistory, gitRepositories, gitCommits, aiUsageRecords, customDomains, knowledgeGraphNodes, knowledgeGraphEdges, extendedThinkingSessions, extendedThinkingSteps, marketplaceTemplates, sequentialThinkingSessions, extensions, usageAnalytics, communityActivity, deployments, resourceStats, billingRecords, agentSessions, templates, fileOperations, autonomousActions, agentMessages, testingSessionRecordings, aiUsageMetering, maxAutonomySessions, dynamicIntelligence, buildLogs, pushNotifications } from "./schema";

export const projectCollaboratorsRelations = relations(projectCollaborators, ({one}) => ({
	project: one(projects, {
		fields: [projectCollaborators.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectCollaborators.userId],
		references: [users.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	projectCollaborators: many(projectCollaborators),
	files: many(files),
	environmentVariables: many(environmentVariables),
	user: one(users, {
		fields: [projects.ownerId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [projects.forkedFromId],
		references: [projects.id],
		relationName: "projects_forkedFromId_projects_id"
	}),
	projects: many(projects, {
		relationName: "projects_forkedFromId_projects_id"
	}),
	secrets: many(secrets),
	projectLikes: many(projectLikes),
	projectViews: many(projectViews),
	activityLogs: many(activityLog),
	communityPosts: many(communityPosts),
	objectStorages: many(objectStorage),
	comments: many(comments),
	checkpoints: many(checkpoints),
	projectTimeTrackings: many(projectTimeTracking),
	projectScreenshots: many(projectScreenshots),
	taskSummaries: many(taskSummaries),
	objectStorageBuckets: many(objectStorageBuckets),
	keyValueStores: many(keyValueStore),
	aiConversations: many(aiConversations),
	gitRepositories: many(gitRepositories),
	aiUsageRecords: many(aiUsageRecords),
	customDomains: many(customDomains),
	extendedThinkingSessions: many(extendedThinkingSessions),
	marketplaceTemplates: many(marketplaceTemplates),
	sequentialThinkingSessions: many(sequentialThinkingSessions),
	deployments: many(deployments),
	resourceStats: many(resourceStats),
	agentSessions: many(agentSessions),
	agentMessages: many(agentMessages),
	testingSessionRecordings: many(testingSessionRecordings),
	maxAutonomySessions: many(maxAutonomySessions),
	buildLogs: many(buildLogs),
}));

export const usersRelations = relations(users, ({many}) => ({
	projectCollaborators: many(projectCollaborators),
	bounties_authorId: many(bounties, {
		relationName: "bounties_authorId_users_id"
	}),
	bounties_winnerId: many(bounties, {
		relationName: "bounties_winnerId_users_id"
	}),
	projects: many(projects),
	bountySubmissions: many(bountySubmissions),
	loginHistories: many(loginHistory),
	apiTokens: many(apiTokens),
	secrets: many(secrets),
	notifications_userId: many(notifications, {
		relationName: "notifications_userId_users_id"
	}),
	notifications_fromUserId: many(notifications, {
		relationName: "notifications_fromUserId_users_id"
	}),
	notificationPreferences: many(notificationPreferences),
	projectLikes: many(projectLikes),
	projectViews: many(projectViews),
	activityLogs: many(activityLog),
	communityPosts: many(communityPosts),
	communityChallenges_judgeId: many(communityChallenges, {
		relationName: "communityChallenges_judgeId_users_id"
	}),
	communityChallenges_winnerId: many(communityChallenges, {
		relationName: "communityChallenges_winnerId_users_id"
	}),
	themes: many(themes),
	learningCourses: many(learningCourses),
	userLearningProgresses: many(userLearningProgress),
	userCycles: many(userCycles),
	cyclesTransactions: many(cyclesTransactions),
	objectStorages: many(objectStorage),
	aiUsageTrackings: many(aiUsageTracking),
	comments: many(comments),
	checkpoints: many(checkpoints),
	projectTimeTrackings: many(projectTimeTracking),
	projectScreenshots: many(projectScreenshots),
	taskSummaries: many(taskSummaries),
	apiKeys: many(apiKeys),
	usageTrackings: many(usageTracking),
	userCredits: many(userCredits),
	budgetLimits: many(budgetLimits),
	usageAlerts: many(usageAlerts),
	objectStorageFiles: many(objectStorageFiles),
	aiConversations: many(aiConversations),
	aiUsageRecords: many(aiUsageRecords),
	marketplaceTemplates: many(marketplaceTemplates),
	extensions: many(extensions),
	usageAnalytics: many(usageAnalytics),
	communityActivities: many(communityActivity),
	billingRecords: many(billingRecords),
	agentSessions: many(agentSessions),
	templates: many(templates),
	agentMessages: many(agentMessages),
	aiUsageMeterings: many(aiUsageMetering),
	maxAutonomySessions: many(maxAutonomySessions),
	dynamicIntelligences: many(dynamicIntelligence),
	pushNotifications: many(pushNotifications),
}));

export const filesRelations = relations(files, ({one, many}) => ({
	file: one(files, {
		fields: [files.parentId],
		references: [files.id],
		relationName: "files_parentId_files_id"
	}),
	files: many(files, {
		relationName: "files_parentId_files_id"
	}),
	project: one(projects, {
		fields: [files.projectId],
		references: [projects.id]
	}),
	comments: many(comments),
}));

export const bountiesRelations = relations(bounties, ({one, many}) => ({
	user_authorId: one(users, {
		fields: [bounties.authorId],
		references: [users.id],
		relationName: "bounties_authorId_users_id"
	}),
	user_winnerId: one(users, {
		fields: [bounties.winnerId],
		references: [users.id],
		relationName: "bounties_winnerId_users_id"
	}),
	bountySubmissions: many(bountySubmissions),
}));

export const environmentVariablesRelations = relations(environmentVariables, ({one}) => ({
	project: one(projects, {
		fields: [environmentVariables.projectId],
		references: [projects.id]
	}),
}));

export const bountySubmissionsRelations = relations(bountySubmissions, ({one}) => ({
	bounty: one(bounties, {
		fields: [bountySubmissions.bountyId],
		references: [bounties.id]
	}),
	user: one(users, {
		fields: [bountySubmissions.userId],
		references: [users.id]
	}),
}));

export const loginHistoryRelations = relations(loginHistory, ({one}) => ({
	user: one(users, {
		fields: [loginHistory.userId],
		references: [users.id]
	}),
}));

export const apiTokensRelations = relations(apiTokens, ({one}) => ({
	user: one(users, {
		fields: [apiTokens.userId],
		references: [users.id]
	}),
}));

export const secretsRelations = relations(secrets, ({one}) => ({
	user: one(users, {
		fields: [secrets.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [secrets.projectId],
		references: [projects.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user_userId: one(users, {
		fields: [notifications.userId],
		references: [users.id],
		relationName: "notifications_userId_users_id"
	}),
	user_fromUserId: one(users, {
		fields: [notifications.fromUserId],
		references: [users.id],
		relationName: "notifications_fromUserId_users_id"
	}),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({one}) => ({
	user: one(users, {
		fields: [notificationPreferences.userId],
		references: [users.id]
	}),
}));

export const projectLikesRelations = relations(projectLikes, ({one}) => ({
	project: one(projects, {
		fields: [projectLikes.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectLikes.userId],
		references: [users.id]
	}),
}));

export const projectViewsRelations = relations(projectViews, ({one}) => ({
	project: one(projects, {
		fields: [projectViews.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectViews.userId],
		references: [users.id]
	}),
}));

export const activityLogRelations = relations(activityLog, ({one}) => ({
	project: one(projects, {
		fields: [activityLog.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [activityLog.userId],
		references: [users.id]
	}),
}));

export const communityPostsRelations = relations(communityPosts, ({one}) => ({
	user: one(users, {
		fields: [communityPosts.authorId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [communityPosts.projectId],
		references: [projects.id]
	}),
}));

export const communityChallengesRelations = relations(communityChallenges, ({one}) => ({
	user_judgeId: one(users, {
		fields: [communityChallenges.judgeId],
		references: [users.id],
		relationName: "communityChallenges_judgeId_users_id"
	}),
	user_winnerId: one(users, {
		fields: [communityChallenges.winnerId],
		references: [users.id],
		relationName: "communityChallenges_winnerId_users_id"
	}),
}));

export const themesRelations = relations(themes, ({one}) => ({
	user: one(users, {
		fields: [themes.authorId],
		references: [users.id]
	}),
}));

export const learningCoursesRelations = relations(learningCourses, ({one, many}) => ({
	user: one(users, {
		fields: [learningCourses.authorId],
		references: [users.id]
	}),
	userLearningProgresses: many(userLearningProgress),
}));

export const userLearningProgressRelations = relations(userLearningProgress, ({one}) => ({
	user: one(users, {
		fields: [userLearningProgress.userId],
		references: [users.id]
	}),
	learningCourse: one(learningCourses, {
		fields: [userLearningProgress.courseId],
		references: [learningCourses.id]
	}),
}));

export const userCyclesRelations = relations(userCycles, ({one}) => ({
	user: one(users, {
		fields: [userCycles.userId],
		references: [users.id]
	}),
}));

export const cyclesTransactionsRelations = relations(cyclesTransactions, ({one}) => ({
	user: one(users, {
		fields: [cyclesTransactions.userId],
		references: [users.id]
	}),
}));

export const objectStorageRelations = relations(objectStorage, ({one, many}) => ({
	user: one(users, {
		fields: [objectStorage.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [objectStorage.projectId],
		references: [projects.id]
	}),
	objectStorage: one(objectStorage, {
		fields: [objectStorage.parentId],
		references: [objectStorage.id],
		relationName: "objectStorage_parentId_objectStorage_id"
	}),
	objectStorages: many(objectStorage, {
		relationName: "objectStorage_parentId_objectStorage_id"
	}),
}));

export const aiUsageTrackingRelations = relations(aiUsageTracking, ({one}) => ({
	user: one(users, {
		fields: [aiUsageTracking.userId],
		references: [users.id]
	}),
}));

export const commentsRelations = relations(comments, ({one}) => ({
	project: one(projects, {
		fields: [comments.projectId],
		references: [projects.id]
	}),
	file: one(files, {
		fields: [comments.fileId],
		references: [files.id]
	}),
	user: one(users, {
		fields: [comments.authorId],
		references: [users.id]
	}),
}));

export const checkpointsRelations = relations(checkpoints, ({one, many}) => ({
	project: one(projects, {
		fields: [checkpoints.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [checkpoints.createdBy],
		references: [users.id]
	}),
	checkpointFiles: many(checkpointFiles),
	deployments: many(deployments),
}));

export const projectTimeTrackingRelations = relations(projectTimeTracking, ({one}) => ({
	project: one(projects, {
		fields: [projectTimeTracking.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectTimeTracking.userId],
		references: [users.id]
	}),
}));

export const projectScreenshotsRelations = relations(projectScreenshots, ({one}) => ({
	project: one(projects, {
		fields: [projectScreenshots.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [projectScreenshots.createdBy],
		references: [users.id]
	}),
}));

export const taskSummariesRelations = relations(taskSummaries, ({one}) => ({
	project: one(projects, {
		fields: [taskSummaries.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [taskSummaries.createdBy],
		references: [users.id]
	}),
}));

export const apiKeysRelations = relations(apiKeys, ({one}) => ({
	user: one(users, {
		fields: [apiKeys.userId],
		references: [users.id]
	}),
}));

export const usageTrackingRelations = relations(usageTracking, ({one}) => ({
	user: one(users, {
		fields: [usageTracking.userId],
		references: [users.id]
	}),
}));

export const checkpointFilesRelations = relations(checkpointFiles, ({one}) => ({
	checkpoint: one(checkpoints, {
		fields: [checkpointFiles.checkpointId],
		references: [checkpoints.id]
	}),
}));

export const userCreditsRelations = relations(userCredits, ({one}) => ({
	user: one(users, {
		fields: [userCredits.userId],
		references: [users.id]
	}),
}));

export const budgetLimitsRelations = relations(budgetLimits, ({one}) => ({
	user: one(users, {
		fields: [budgetLimits.userId],
		references: [users.id]
	}),
}));

export const usageAlertsRelations = relations(usageAlerts, ({one}) => ({
	user: one(users, {
		fields: [usageAlerts.userId],
		references: [users.id]
	}),
}));

export const objectStorageBucketsRelations = relations(objectStorageBuckets, ({one, many}) => ({
	project: one(projects, {
		fields: [objectStorageBuckets.projectId],
		references: [projects.id]
	}),
	objectStorageFiles: many(objectStorageFiles),
}));

export const objectStorageFilesRelations = relations(objectStorageFiles, ({one}) => ({
	objectStorageBucket: one(objectStorageBuckets, {
		fields: [objectStorageFiles.bucketId],
		references: [objectStorageBuckets.id]
	}),
	user: one(users, {
		fields: [objectStorageFiles.uploadedBy],
		references: [users.id]
	}),
}));

export const keyValueStoreRelations = relations(keyValueStore, ({one}) => ({
	project: one(projects, {
		fields: [keyValueStore.projectId],
		references: [projects.id]
	}),
}));

export const aiConversationsRelations = relations(aiConversations, ({one, many}) => ({
	project: one(projects, {
		fields: [aiConversations.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [aiConversations.userId],
		references: [users.id]
	}),
	webSearchHistories: many(webSearchHistory),
	extendedThinkingSessions: many(extendedThinkingSessions),
	sequentialThinkingSessions: many(sequentialThinkingSessions),
	agentMessages: many(agentMessages),
}));

export const webSearchHistoryRelations = relations(webSearchHistory, ({one}) => ({
	aiConversation: one(aiConversations, {
		fields: [webSearchHistory.conversationId],
		references: [aiConversations.id]
	}),
}));

export const gitRepositoriesRelations = relations(gitRepositories, ({one, many}) => ({
	project: one(projects, {
		fields: [gitRepositories.projectId],
		references: [projects.id]
	}),
	gitCommits: many(gitCommits),
}));

export const gitCommitsRelations = relations(gitCommits, ({one}) => ({
	gitRepository: one(gitRepositories, {
		fields: [gitCommits.repositoryId],
		references: [gitRepositories.id]
	}),
}));

export const aiUsageRecordsRelations = relations(aiUsageRecords, ({one}) => ({
	user: one(users, {
		fields: [aiUsageRecords.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [aiUsageRecords.projectId],
		references: [projects.id]
	}),
}));

export const customDomainsRelations = relations(customDomains, ({one}) => ({
	project: one(projects, {
		fields: [customDomains.projectId],
		references: [projects.id]
	}),
}));

export const knowledgeGraphEdgesRelations = relations(knowledgeGraphEdges, ({one}) => ({
	knowledgeGraphNode_sourceId: one(knowledgeGraphNodes, {
		fields: [knowledgeGraphEdges.sourceId],
		references: [knowledgeGraphNodes.id],
		relationName: "knowledgeGraphEdges_sourceId_knowledgeGraphNodes_id"
	}),
	knowledgeGraphNode_targetId: one(knowledgeGraphNodes, {
		fields: [knowledgeGraphEdges.targetId],
		references: [knowledgeGraphNodes.id],
		relationName: "knowledgeGraphEdges_targetId_knowledgeGraphNodes_id"
	}),
}));

export const knowledgeGraphNodesRelations = relations(knowledgeGraphNodes, ({many}) => ({
	knowledgeGraphEdges_sourceId: many(knowledgeGraphEdges, {
		relationName: "knowledgeGraphEdges_sourceId_knowledgeGraphNodes_id"
	}),
	knowledgeGraphEdges_targetId: many(knowledgeGraphEdges, {
		relationName: "knowledgeGraphEdges_targetId_knowledgeGraphNodes_id"
	}),
}));

export const extendedThinkingStepsRelations = relations(extendedThinkingSteps, ({one}) => ({
	extendedThinkingSession: one(extendedThinkingSessions, {
		fields: [extendedThinkingSteps.sessionId],
		references: [extendedThinkingSessions.id]
	}),
}));

export const extendedThinkingSessionsRelations = relations(extendedThinkingSessions, ({one, many}) => ({
	extendedThinkingSteps: many(extendedThinkingSteps),
	project: one(projects, {
		fields: [extendedThinkingSessions.projectId],
		references: [projects.id]
	}),
	aiConversation: one(aiConversations, {
		fields: [extendedThinkingSessions.conversationId],
		references: [aiConversations.id]
	}),
}));

export const marketplaceTemplatesRelations = relations(marketplaceTemplates, ({one}) => ({
	user: one(users, {
		fields: [marketplaceTemplates.authorId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [marketplaceTemplates.projectId],
		references: [projects.id]
	}),
}));

export const sequentialThinkingSessionsRelations = relations(sequentialThinkingSessions, ({one}) => ({
	project: one(projects, {
		fields: [sequentialThinkingSessions.projectId],
		references: [projects.id]
	}),
	aiConversation: one(aiConversations, {
		fields: [sequentialThinkingSessions.conversationId],
		references: [aiConversations.id]
	}),
}));

export const extensionsRelations = relations(extensions, ({one}) => ({
	user: one(users, {
		fields: [extensions.authorId],
		references: [users.id]
	}),
}));

export const usageAnalyticsRelations = relations(usageAnalytics, ({one}) => ({
	user: one(users, {
		fields: [usageAnalytics.userId],
		references: [users.id]
	}),
}));

export const communityActivityRelations = relations(communityActivity, ({one}) => ({
	user: one(users, {
		fields: [communityActivity.userId],
		references: [users.id]
	}),
}));

export const deploymentsRelations = relations(deployments, ({one}) => ({
	project: one(projects, {
		fields: [deployments.projectId],
		references: [projects.id]
	}),
	checkpoint: one(checkpoints, {
		fields: [deployments.checkpointId],
		references: [checkpoints.id]
	}),
}));

export const resourceStatsRelations = relations(resourceStats, ({one}) => ({
	project: one(projects, {
		fields: [resourceStats.projectId],
		references: [projects.id]
	}),
}));

export const billingRecordsRelations = relations(billingRecords, ({one}) => ({
	user: one(users, {
		fields: [billingRecords.userId],
		references: [users.id]
	}),
}));

export const agentSessionsRelations = relations(agentSessions, ({one, many}) => ({
	user: one(users, {
		fields: [agentSessions.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [agentSessions.projectId],
		references: [projects.id]
	}),
	fileOperations: many(fileOperations),
	autonomousActions: many(autonomousActions),
	agentMessages: many(agentMessages),
}));

export const templatesRelations = relations(templates, ({one}) => ({
	user: one(users, {
		fields: [templates.authorId],
		references: [users.id]
	}),
}));

export const fileOperationsRelations = relations(fileOperations, ({one}) => ({
	agentSession: one(agentSessions, {
		fields: [fileOperations.sessionId],
		references: [agentSessions.id]
	}),
}));

export const autonomousActionsRelations = relations(autonomousActions, ({one}) => ({
	agentSession: one(agentSessions, {
		fields: [autonomousActions.sessionId],
		references: [agentSessions.id]
	}),
}));

export const agentMessagesRelations = relations(agentMessages, ({one}) => ({
	agentSession: one(agentSessions, {
		fields: [agentMessages.sessionId],
		references: [agentSessions.id]
	}),
	aiConversation: one(aiConversations, {
		fields: [agentMessages.conversationId],
		references: [aiConversations.id]
	}),
	project: one(projects, {
		fields: [agentMessages.projectId],
		references: [projects.id]
	}),
	user: one(users, {
		fields: [agentMessages.userId],
		references: [users.id]
	}),
}));

export const testingSessionRecordingsRelations = relations(testingSessionRecordings, ({one}) => ({
	project: one(projects, {
		fields: [testingSessionRecordings.projectId],
		references: [projects.id]
	}),
}));

export const aiUsageMeteringRelations = relations(aiUsageMetering, ({one}) => ({
	user: one(users, {
		fields: [aiUsageMetering.userId],
		references: [users.id]
	}),
}));

export const maxAutonomySessionsRelations = relations(maxAutonomySessions, ({one}) => ({
	user: one(users, {
		fields: [maxAutonomySessions.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [maxAutonomySessions.projectId],
		references: [projects.id]
	}),
}));

export const dynamicIntelligenceRelations = relations(dynamicIntelligence, ({one}) => ({
	user: one(users, {
		fields: [dynamicIntelligence.userId],
		references: [users.id]
	}),
}));

export const buildLogsRelations = relations(buildLogs, ({one}) => ({
	project: one(projects, {
		fields: [buildLogs.projectId],
		references: [projects.id]
	}),
}));

export const pushNotificationsRelations = relations(pushNotifications, ({one}) => ({
	user: one(users, {
		fields: [pushNotifications.userId],
		references: [users.id]
	}),
}));