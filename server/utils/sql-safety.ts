/**
 * Shared SQL Safety Policy
 *
 * Single source of truth for SQL query validation, used by BOTH:
 *   1. The HTTP SQL-execute route (POST /api/database/project/:id/sql/execute)
 *   2. The agent run_sql tool (agent-tool-framework.service.ts)
 *
 * This guarantees that the agent cannot bypass restrictions that the UI enforces,
 * and that any future changes to the policy apply uniformly.
 */

import { createLogger } from './logger';

const logger = createLogger('sql-safety');

export interface SqlValidationResult {
  allowed: boolean;
  reason?: string;
  blockedKeyword?: string;
}

/**
 * Tier-1 — always blocked regardless of context.
 * These operations are catastrophic, privilege-escalating, or system-scoped.
 * They must NEVER run through the project-scoped executor.
 *
 * Pattern format: uppercase string that will be matched as a whole word/phrase
 * in the normalised (upper-case, collapsed-whitespace) query.
 */
const ALWAYS_BLOCKED: ReadonlyArray<{ keyword: string; reason: string }> = [
  { keyword: 'DROP DATABASE',  reason: 'Dropping the entire database is not allowed' },
  { keyword: 'DROP SCHEMA',    reason: 'Dropping schemas is not allowed' },
  { keyword: 'ALTER SYSTEM',   reason: 'System-level ALTER is not allowed' },
  { keyword: 'CREATE ROLE',    reason: 'Role management is not allowed' },
  { keyword: 'DROP ROLE',      reason: 'Role management is not allowed' },
  { keyword: 'ALTER ROLE',     reason: 'Role management is not allowed' },
  { keyword: 'GRANT ',         reason: 'Privilege GRANT is not allowed' },
  { keyword: 'REVOKE ',        reason: 'Privilege REVOKE is not allowed' },
  { keyword: 'TRUNCATE ',      reason: 'TRUNCATE is blocked — use DELETE instead, or contact support' },
  { keyword: 'CREATE DATABASE', reason: 'Creating databases is not allowed' },
  // Prevent search_path injection that could escape the project schema
  { keyword: 'SET SEARCH_PATH', reason: 'Modifying search_path is not allowed' },
  { keyword: 'SET LOCAL SEARCH_PATH', reason: 'Modifying search_path is not allowed' },
];

/**
 * Tier-2 — schema-destructive operations.
 * Dropping or altering tables/indexes/columns is allowed for project owners
 * (they own their schema), but we log it for audit purposes.
 */
const AUDIT_LOGGED: ReadonlyArray<string> = [
  'DROP TABLE',
  'DROP INDEX',
  'DROP VIEW',
  'DROP FUNCTION',
  'DROP TRIGGER',
  'ALTER TABLE',
];

/**
 * Strip SQL comments from a query string before normalisation.
 * This prevents comment-injection bypasses like:
 *   DROP [block comment] DATABASE
 *   DROP [line comment] DATABASE  (line-continuation attack)
 *
 * We strip:
 *   - Block comments: slash-star ... star-slash
 *   - Line comments:  -- until end-of-line
 */
function stripSqlComments(query: string): string {
  // Strip block comments (non-greedy, handles -- inside blocks)
  let stripped = query.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Strip line comments
  stripped = stripped.replace(/--[^\n]*/g, ' ');
  return stripped;
}

/**
 * Normalise a query for matching: strip comments, uppercase, collapse whitespace.
 */
function normalise(query: string): string {
  return stripSqlComments(query).toUpperCase().replace(/\s+/g, ' ').trim();
}

/**
 * Validate a SQL query string against the shared policy.
 *
 * @param query     Raw SQL string submitted by the user or agent
 * @param context   Optional label for log messages (e.g. 'agent:run_sql', 'ui:sql-execute')
 */
export function validateSqlQuery(
  query: string,
  context: string = 'unknown'
): SqlValidationResult {
  const trimmed = query.trim();

  if (!trimmed) {
    return { allowed: false, reason: 'Empty query' };
  }

  if (trimmed.length > 10_000) {
    return { allowed: false, reason: 'Query too long (max 10 000 characters)' };
  }

  const normalised = normalise(trimmed);

  // Tier-1: always blocked
  for (const { keyword, reason } of ALWAYS_BLOCKED) {
    if (normalised.includes(keyword)) {
      logger.warn(`[SQL Safety] Blocked by policy (${context}): ${keyword}`, {
        context,
        blockedKeyword: keyword,
        queryPrefix: trimmed.substring(0, 120),
      });
      return { allowed: false, reason, blockedKeyword: keyword };
    }
  }

  // Tier-2: audit-log but allow
  for (const keyword of AUDIT_LOGGED) {
    if (normalised.includes(keyword)) {
      logger.info(`[SQL Safety] Audit-logged destructive DDL (${context}): ${keyword}`, {
        context,
        keyword,
        queryPrefix: trimmed.substring(0, 120),
      });
      break; // only log once per query
    }
  }

  return { allowed: true };
}
