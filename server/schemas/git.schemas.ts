/**
 * server/schemas/git.schemas.ts
 *
 * Zod runtime validation schemas for every mutating Git API endpoint.
 * Each schema is explicitly typed so the Zod output matches the corresponding
 * request interface from shared/git-contract.ts — a shape mismatch causes a
 * TypeScript compile error here, not a runtime surprise in production.
 */
import { z } from 'zod';
import type {
  GitStageRequest,
  GitUnstageRequest,
  GitCommitRequest,
  GitBranchCreateRequest,
  GitCheckoutRequest,
  GitMergeRequest,
  GitAddRemoteRequest,
  GitCloneRequest,
  GitResolveConflictRequest,
  GitStashRequest,
} from '../../shared/git-contract';

// ─── Reusable primitives ──────────────────────────────────────────────────────

const safeBranchName = z
  .string()
  .min(1, 'Branch name is required')
  .max(255, 'Branch name too long')
  .refine((v) => !v.startsWith('-'), 'Branch name must not start with a dash')
  .refine((v) => !v.startsWith('.'), 'Branch name must not start with a dot')
  .refine((v) => !v.endsWith('.'), 'Branch name must not end with a dot')
  .refine((v) => !v.endsWith('.lock'), 'Branch name must not end with .lock')
  .refine((v) => !v.includes('..'), 'Branch name must not contain consecutive dots')
  .refine((v) => !v.includes('@{'), 'Branch name must not contain @{')
  .refine((v) => !/[\x00-\x1f\x7f ~^:?*\\[\]]/.test(v), 'Branch name contains invalid characters')
  .refine((v) => v !== 'HEAD', 'HEAD is a reserved name');

const safeFilePath = z
  .string()
  .refine((v) => !v.includes('\0'), 'Path contains null byte')
  .refine((v) => !v.startsWith('-'), 'Path must not start with a dash')
  .refine((v) => !v.startsWith('/'), 'Absolute paths are not allowed')
  .refine((v) => !v.includes('../'), 'Path traversal not allowed');

const safeFilePaths = z.array(safeFilePath).default([]);

const safeRemoteName = z
  .string()
  .min(1, 'Remote name is required')
  .max(100, 'Remote name too long')
  .regex(/^[a-zA-Z0-9_\-]+$/, 'Remote name must be alphanumeric (dashes and underscores allowed)');

// ─── Request schemas bound to shared contract types ───────────────────────────
// Using `z.ZodType<T>` annotations means TypeScript will error here if the
// Zod output shape diverges from the shared contract interface.

// GitStageRequest = { files?: string[] }  (paths is accepted as alias)
export const StageSchema = z.object({
  files: safeFilePaths.optional(),
  paths: safeFilePaths.optional(),
}) satisfies z.ZodType<{ files?: string[]; paths?: string[] }>;

export const UnstageSchema = z.object({
  files: safeFilePaths.optional(),
  paths: safeFilePaths.optional(),
}) satisfies z.ZodType<{ files?: string[]; paths?: string[] }>;

export const CommitSchema = z.object({
  message: z
    .string()
    .min(1, 'Commit message is required')
    .max(10_000, 'Commit message too long'),
  files: safeFilePaths.optional(),
}) satisfies z.ZodType<GitCommitRequest & { files?: string[] }>;

export const BranchCreateSchema = z.object({
  name: safeBranchName,
  startPoint: safeBranchName.optional(),
}) satisfies z.ZodType<GitBranchCreateRequest>;

export const CheckoutSchema = z.object({
  branch: safeBranchName,
}) satisfies z.ZodType<GitCheckoutRequest>;

export const MergeSchema = z.object({
  branch: safeBranchName,
  message: z.string().max(10_000).optional(),
}) satisfies z.ZodType<GitMergeRequest & { message?: string }>;

// `name` is optional in the *input* (gets defaulted to 'origin') but always
// present in the parsed *output*, which is what `GitAddRemoteRequest` expects.
// Express the asymmetry via the third ZodType param.
export const AddRemoteSchema: z.ZodType<GitAddRemoteRequest, z.ZodTypeDef, { url: string; name?: string }> = z.object({
  name: safeRemoteName.default('origin'),
  url: z.string().url('Remote URL must be a valid URL'),
});

export const CloneSchema = z.object({
  url: z.string().min(1, 'Repository URL is required'),
}) satisfies z.ZodType<GitCloneRequest>;

export const ResolveConflictSchema = z.object({
  path: safeFilePath,
  resolvedContent: z.string(),
}) satisfies z.ZodType<GitResolveConflictRequest>;

export const StashSchema = z.object({
  message: z.string().optional(),
}) satisfies z.ZodType<GitStashRequest>;

// ─── Inferred body types (used in router handlers) ────────────────────────────

export type StageBody = z.infer<typeof StageSchema>;
export type UnstageBody = z.infer<typeof UnstageSchema>;
export type CommitBody = z.infer<typeof CommitSchema>;
export type BranchCreateBody = z.infer<typeof BranchCreateSchema>;
export type CheckoutBody = z.infer<typeof CheckoutSchema>;
export type MergeBody = z.infer<typeof MergeSchema>;
export type AddRemoteBody = z.infer<typeof AddRemoteSchema>;
export type CloneBody = z.infer<typeof CloneSchema>;
export type StashBody = z.infer<typeof StashSchema>;
