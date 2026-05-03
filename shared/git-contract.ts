/**
 * shared/git-contract.ts
 *
 * Single source of truth for every request body and response shape used by the
 * Git API (POST /api/git/:projectId/*).  Both the frontend and the backend
 * import from here so a field rename or type change is caught by the TypeScript
 * compiler in both layers simultaneously.
 *
 * Design constraints
 * - No runtime dependency (pure TypeScript types + zod schemas).
 * - Backend re-exports Zod schemas from server/schemas/git.schemas.ts which
 *   are derived from these types.
 * - Frontend imports response types for useQuery / useMutation generics.
 */

// ─── File entry ───────────────────────────────────────────────────────────────

export interface GitFileEntry {
  path: string;
  status: 'staged' | 'modified' | 'untracked';
}

// ─── GET /status ──────────────────────────────────────────────────────────────

export interface GitStatusResponse {
  branch: string;
  ahead: number;
  behind: number;
  /** Shorthand arrays — same paths as `changes` but separated by category */
  staged: string[];
  unstaged: string[];
  untracked: string[];
  /** Unified flat list with status discriminator — used by ReplitGitPanel */
  changes: GitFileEntry[];
}

// ─── GET /branches ────────────────────────────────────────────────────────────

export interface GitBranchLastCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitBranchInfo {
  name: string;
  current: boolean;
  isRemote: boolean;
  ahead: number;
  behind: number;
  lastCommit: GitBranchLastCommit;
  trackingBranch?: string;
}

export interface GitBranchesResponse {
  branches: GitBranchInfo[];
}

// ─── GET /commits ─────────────────────────────────────────────────────────────

/**
 * Shape produced by `git log --format=%H|%an|%ae|%aI|%s --max-count=50`.
 * No `refs` field — the format string does not include %D.
 */
export interface GitCommitEntry {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  date: string;
}

export interface GitCommitsResponse {
  commits: GitCommitEntry[];
}

// ─── GET /remotes ─────────────────────────────────────────────────────────────

export interface GitRemoteEntry {
  name: string;
  url: string;
  type: 'fetch' | 'push';
}

export interface GitRemotesResponse {
  remotes: GitRemoteEntry[];
}

// ─── GET /diff/:filePath ──────────────────────────────────────────────────────

export interface GitDiffResponse {
  diff: string;
  filePath: string;
}

// ─── GET /blame/:filePath ─────────────────────────────────────────────────────

/**
 * Shape produced by parsing `git blame --porcelain`.
 * Each entry is { line: <1-based line number>, commit: { ... } }.
 * This is NOT a flat hunk — the commit metadata is nested under `commit`.
 */
export interface GitBlameCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitBlameEntry {
  line: number;
  commit: GitBlameCommit;
}

export interface GitBlameResponse {
  blame: GitBlameEntry[];
}

// ─── Mutation success base ────────────────────────────────────────────────────

export interface GitSuccessResponse {
  success: true;
  message?: string;
}

// ─── POST /init ───────────────────────────────────────────────────────────────

export interface GitInitResponse extends GitSuccessResponse {
  message: string;
}

// ─── POST /stage ─────────────────────────────────────────────────────────────

export interface GitStageRequest {
  /** Optional list of relative file paths to stage; omit to stage all */
  files?: string[];
}

export interface GitStageResponse extends GitSuccessResponse {}

// ─── POST /unstage ───────────────────────────────────────────────────────────

export interface GitUnstageRequest {
  files?: string[];
}

export interface GitUnstageResponse extends GitSuccessResponse {}

// ─── POST /commit ─────────────────────────────────────────────────────────────

export interface GitCommitRequest {
  message: string;
}

export interface GitCommitResponse extends GitSuccessResponse {
  /** Short 7-char hash of the new commit, omitted when nothing was committed */
  hash?: string;
}

// ─── POST /push ───────────────────────────────────────────────────────────────

export interface GitPushResponse extends GitSuccessResponse {
  output?: string;
  /** Informational message when the push needed a rebase-retry */
  info?: string;
}

// ─── POST /pull ───────────────────────────────────────────────────────────────

export interface GitPullResponse extends GitSuccessResponse {
  output?: string;
  info?: string;
}

// ─── POST /fetch ─────────────────────────────────────────────────────────────

export interface GitFetchResponse extends GitSuccessResponse {
  output?: string;
}

// ─── POST /clone ─────────────────────────────────────────────────────────────

export interface GitCloneRequest {
  url: string;
}

export interface GitCloneResponse extends GitSuccessResponse {
  message: string;
}

// ─── POST /branch (create) ────────────────────────────────────────────────────

export interface GitBranchCreateRequest {
  name: string;
  startPoint?: string;
}

export interface GitBranchCreateResponse extends GitSuccessResponse {
  /** The name of the newly created branch */
  branch: string;
}

// ─── DELETE /branch/:name ────────────────────────────────────────────────────

export interface GitBranchDeleteResponse extends GitSuccessResponse {
  /** The name of the branch that was deleted */
  deleted: string;
}

// ─── POST /checkout ───────────────────────────────────────────────────────────

export interface GitCheckoutRequest {
  branch: string;
}

export interface GitCheckoutResponse extends GitSuccessResponse {
  /** The name of the branch that is now checked out */
  branch: string;
}

// ─── POST /merge ──────────────────────────────────────────────────────────────

export interface GitMergeRequest {
  branch: string;
}

export interface GitMergeResponse extends GitSuccessResponse {
  output?: string;
}

// ─── POST /merge-abort ────────────────────────────────────────────────────────

export interface GitMergeAbortResponse extends GitSuccessResponse {}

// ─── POST /remotes (add remote) ───────────────────────────────────────────────

export interface GitAddRemoteRequest {
  name: string;
  url: string;
}

export interface GitAddRemoteResponse extends GitSuccessResponse {
  message: string;
}

// ─── POST /resolve-conflict ───────────────────────────────────────────────────
// Backend Zod schema (ResolveConflictSchema): { path: string, resolvedContent: string }
// Uses `path` (not `filePath`) and `resolvedContent` (not `content`).

export interface GitResolveConflictRequest {
  path: string;
  resolvedContent: string;
}

export interface GitResolveConflictResponse extends GitSuccessResponse {}

// ─── POST /stash ─────────────────────────────────────────────────────────────

export interface GitStashRequest {
  message?: string;
}

export interface GitStashResponse extends GitSuccessResponse {
  output?: string;
}

// ─── POST /stash/pop ─────────────────────────────────────────────────────────

export interface GitStashPopResponse extends GitSuccessResponse {
  output?: string;
}
