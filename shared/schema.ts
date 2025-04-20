import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, uniqueIndex, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Project visibility enum
export const visibilityEnum = pgEnum("visibility", ["public", "private", "unlisted"]);

// Programming language enum
export const languageEnum = pgEnum("language", [
  "javascript", "python", "html", "css", "typescript", 
  "java", "c", "cpp", "go", "ruby", "php", "rust"
]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  visibility: visibilityEnum("visibility").default("private").notNull(),
  language: languageEnum("language").default("javascript"),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
  visibility: true,
  language: true,
  ownerId: true,
});

// Project collaborators table - represents users who have access to a project
export const projectCollaborators = pgTable("project_collaborators", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").default("editor").notNull(), // owner, editor, viewer
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    projectUserIdx: uniqueIndex("project_user_idx").on(table.projectId, table.userId),
  };
});

export const insertProjectCollaboratorSchema = createInsertSchema(projectCollaborators).pick({
  projectId: true,
  userId: true,
  role: true,
});

// Files table (both files and folders)
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").default(""),
  isFolder: boolean("is_folder").default(false).notNull(),
  parentId: integer("parent_id").references(() => files.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFileSchema = createInsertSchema(files).pick({
  name: true,
  content: true,
  isFolder: true,
  parentId: true,
  projectId: true,
});

// Deployments table - for tracking website deployments
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  status: text("status").default("pending").notNull(), // pending, success, failed
  url: text("url"),
  buildLogs: text("build_logs"),
  config: json("config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDeploymentSchema = createInsertSchema(deployments).pick({
  projectId: true,
  status: true,
  url: true,
  buildLogs: true,
  config: true,
});

// Define relations after all tables are created
export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects, { relationName: "owner" }),
  collaborations: many(projectCollaborators, { relationName: "user" }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
    relationName: "owner",
  }),
  files: many(files, { relationName: "project" }),
  collaborators: many(projectCollaborators, { relationName: "project" }),
  deployments: many(deployments, { relationName: "project" }),
}));

export const projectCollaboratorsRelations = relations(projectCollaborators, ({ one }) => ({
  project: one(projects, {
    fields: [projectCollaborators.projectId],
    references: [projects.id],
    relationName: "project",
  }),
  user: one(users, {
    fields: [projectCollaborators.userId],
    references: [users.id],
    relationName: "user",
  }),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
    relationName: "project",
  }),
  parent: one(files, {
    fields: [files.parentId],
    references: [files.id],
    relationName: "parent",
  }),
  children: many(files, { relationName: "parent" }),
}));

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  project: one(projects, {
    fields: [deployments.projectId],
    references: [projects.id],
    relationName: "project",
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectCollaborator = typeof projectCollaborators.$inferSelect;
export type InsertProjectCollaborator = z.infer<typeof insertProjectCollaboratorSchema>;

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
