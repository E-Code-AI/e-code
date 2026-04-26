import { Router } from 'express';
import { z } from 'zod';
import { createLogger } from '../utils/logger';
import { storage } from '../storage';
import { ensureAuthenticated } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';

const router = Router();
const logger = createLogger('global-search');

/**
 * ✅ 40-YEAR SENIOR SECURITY FIX
 * Global search/replace is a CRITICAL operation - requires authentication
 * Replace operation can modify ALL files in a project
 */
router.use(ensureAuthenticated);

/**
 * CSRF protection for replace operations (mutating)
 */
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  return next();
});

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  projectId: z.coerce.string(),
  type: z.enum(['all', 'files', 'content', 'symbols']).optional().default('content'),
  searchType: z.enum(['all', 'files', 'content', 'symbols']).optional(),
  caseSensitive: z.boolean().optional().default(false),
  wholeWord: z.boolean().optional().default(false),
  useRegex: z.boolean().optional().default(false),
  filePattern: z.string().optional(), // e.g., "*.ts,*.tsx"
  excludePattern: z.string().optional() // e.g., "node_modules,dist"
});

const replaceSchema = z.object({
  query: z.string().min(1).max(500),
  replacement: z.string().max(500),
  projectId: z.string(),
  caseSensitive: z.boolean().optional().default(false),
  wholeWord: z.boolean().optional().default(false),
  useRegex: z.boolean().optional().default(false),
  filePattern: z.string().optional(),
  excludePattern: z.string().optional(),
  filePaths: z.array(z.string()).optional() // Specific files to replace in
});

const advancedSearchSchema = z.object({
  q: z.string().min(1).max(500),
  type: z.enum(['all', 'projects', 'files', 'code', 'users', 'templates']).optional().default('all'),
  language: z.string().optional(),
  visibility: z.string().optional(),
  dateRange: z.enum(['all', 'today', 'week', 'month', 'year']).optional().default('all'),
  sortBy: z.enum(['relevance', 'recent', 'stars', 'name']).optional().default('relevance'),
});

interface SearchResult {
  id: number;
  name: string;
  filePath: string;
  path: string;
  type: 'file' | 'folder';
  matches: {
    line: number;
    column: number;
    text: string;
    matchText: string;
    context: string;
  }[];
  totalMatches: number;
  size?: number;
  lastModified?: string;
  language?: string;
}

interface ReplaceResult {
  filePath: string;
  replacements: number;
  success: boolean;
  error?: string;
}

interface AdvancedSearchResult {
  id: string;
  type: 'project' | 'file' | 'user' | 'code' | 'template';
  title: string;
  description?: string;
  metadata?: {
    language?: string;
    owner?: string;
    stars?: number;
    lastModified?: string;
    visibility?: string;
    matches?: number;
    lineNumber?: number;
    preview?: string;
  };
  url: string;
}

function getFileLanguage(filePath: string): string | undefined {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (!ext) return undefined;
  const map: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    php: 'php',
    json: 'json',
    html: 'html',
    css: 'css',
    scss: 'scss',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    sql: 'sql',
    sh: 'shell',
  };
  return map[ext] || ext;
}

function matchesPatterns(filePath: string, includePatterns: string[], excludePatterns: string[]): boolean {
  if (excludePatterns.some(pattern => filePath.includes(pattern))) {
    return false;
  }

  if (includePatterns.length === 0) {
    return true;
  }

  return includePatterns.some(pattern => {
    const regex = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i');
    return regex.test(filePath) || regex.test(filePath.split('/').pop() || '');
  });
}

function fileNameMatches(filePath: string, query: string, caseSensitive: boolean, useRegex: boolean): boolean {
  const target = filePath;
  if (useRegex) {
    const flags = caseSensitive ? '' : 'i';
    return new RegExp(query, flags).test(target);
  }
  return caseSensitive
    ? target.includes(query)
    : target.toLowerCase().includes(query.toLowerCase());
}

function searchSymbolsInContent(
  content: string,
  query: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean; useRegex?: boolean }
): Array<{ line: number; column: number; text: string; matchText: string; context: string }> {
  const symbolRegex = /\b(function|class|interface|type|const|let|var|enum|export)\s+([A-Za-z_$][\w$]*)/g;
  const lines = content.split('\n');
  const matches: Array<{ line: number; column: number; text: string; matchText: string; context: string }> = [];

  const queryMatcher = options.useRegex
    ? new RegExp(query, options.caseSensitive ? '' : 'i')
    : null;
  const normalizedQuery = options.caseSensitive ? query : query.toLowerCase();

  lines.forEach((lineText, lineIndex) => {
    let symbolMatch: RegExpExecArray | null;
    symbolRegex.lastIndex = 0;
    while ((symbolMatch = symbolRegex.exec(lineText)) !== null) {
      const symbolName = symbolMatch[2];
      const haystack = options.caseSensitive ? symbolName : symbolName.toLowerCase();
      const matched = queryMatcher ? queryMatcher.test(symbolName) : haystack.includes(normalizedQuery);
      if (!matched) continue;

      matches.push({
        line: lineIndex + 1,
        column: symbolMatch.index + 1,
        text: lineText,
        matchText: symbolName,
        context: lineText,
      });
    }
  });

  return matches;
}

function matchesDateRange(date: Date | string | null | undefined, dateRange: 'all' | 'today' | 'week' | 'month' | 'year'): boolean {
  if (!date || dateRange === 'all') {
    return true;
  }

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    return true;
  }

  const now = new Date();
  const diffMs = now.getTime() - value.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  switch (dateRange) {
    case 'today':
      return diffMs <= oneDay;
    case 'week':
      return diffMs <= 7 * oneDay;
    case 'month':
      return diffMs <= 31 * oneDay;
    case 'year':
      return diffMs <= 366 * oneDay;
    default:
      return true;
  }
}

function formatRelativeDate(date: Date | string | null | undefined): string | undefined {
  if (!date) return undefined;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return undefined;

  const diffMs = Date.now() - value.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return value.toLocaleDateString();
}

function normalizedIncludes(value: string | null | undefined, query: string): boolean {
  return (value || '').toLowerCase().includes(query.toLowerCase());
}

/**
 * Advanced search across user-accessible resources
 * GET /api/search?q=...
 */
router.get('/', async (req, res) => {
  try {
    const {
      q,
      type,
      language,
      visibility,
      dateRange,
      sortBy,
    } = advancedSearchSchema.parse(req.query);

    const numericUserId = typeof req.user!.id === 'string' ? parseInt(req.user!.id, 10) : req.user!.id;
    const languageFilters = (language || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    const visibilityFilters = (visibility || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const results: AdvancedSearchResult[] = [];
    const ownerLabel = req.user?.displayName || req.user?.username || req.user?.email || 'You';

    if (type === 'all' || type === 'projects' || type === 'files' || type === 'code') {
      const projects = await storage.getProjectsByUser(numericUserId);

      for (const project of projects) {
        if (!matchesDateRange(project.updatedAt, dateRange)) continue;
        if (visibilityFilters.length > 0 && !visibilityFilters.includes(String(project.visibility || 'private').toLowerCase())) {
          continue;
        }

        if ((type === 'all' || type === 'projects') && (
          normalizedIncludes(project.name, q) ||
          normalizedIncludes(project.description, q) ||
          normalizedIncludes(project.slug, q)
        )) {
          results.push({
            id: `project-${project.id}`,
            type: 'project',
            title: project.name || `Project ${project.id}`,
            description: project.description || project.slug || 'Project workspace',
            metadata: {
              owner: ownerLabel,
              visibility: String(project.visibility || 'private'),
              lastModified: formatRelativeDate(project.updatedAt),
            },
            url: `/projects/${project.id}`,
          });
        }

        if (type === 'all' || type === 'files' || type === 'code') {
          const files = await storage.getProjectFiles(project.id);

          for (const file of files) {
            if (file.isDirectory) continue;
            const filePath = file.path || file.name || '';
            if (!filePath || !matchesPatterns(filePath, [], ['node_modules', 'dist', '.git', '.next', 'build', 'coverage'])) {
              continue;
            }

            const fileLanguage = getFileLanguage(filePath);
            if (languageFilters.length > 0 && (!fileLanguage || !languageFilters.includes(fileLanguage.toLowerCase()))) {
              continue;
            }

            if ((type === 'all' || type === 'files') && (
              normalizedIncludes(filePath, q) ||
              normalizedIncludes(file.name, q)
            )) {
              results.push({
                id: `file-${file.id}`,
                type: 'file',
                title: file.name || filePath.split('/').pop() || filePath,
                description: filePath,
                metadata: {
                  language: fileLanguage,
                  owner: project.name,
                  lastModified: formatRelativeDate(file.updatedAt),
                },
                url: `/projects/${project.id}?file=${file.id}`,
              });
            }

            if (type === 'all' || type === 'code') {
              const contentMatches = searchInContent(file.content || '', q, { caseSensitive: false, wholeWord: false, useRegex: false }).slice(0, 3);
              if (contentMatches.length > 0) {
                const first = contentMatches[0];
                results.push({
                  id: `code-${file.id}-${first.line}-${first.column}`,
                  type: 'code',
                  title: file.name || filePath.split('/').pop() || filePath,
                  description: filePath,
                  metadata: {
                    language: fileLanguage,
                    owner: project.name,
                    matches: contentMatches.length,
                    lineNumber: first.line,
                    preview: first.context,
                    lastModified: formatRelativeDate(file.updatedAt),
                  },
                  url: `/projects/${project.id}?file=${file.id}&line=${first.line}`,
                });
              }
            }
          }
        }
      }
    }

    if (type === 'all' || type === 'users') {
      const users = await storage.searchUsers(q);
      for (const user of users.slice(0, 20)) {
        results.push({
          id: `user-${user.id}`,
          type: 'user',
          title: user.displayName || user.username || user.email || `User ${user.id}`,
          description: user.bio || user.email || user.username || undefined,
          metadata: {
            owner: user.username || user.email || undefined,
            lastModified: formatRelativeDate(user.updatedAt || user.createdAt),
          },
          url: user.username ? `/community/${user.username}` : `/profile/${user.id}`,
        });
      }
    }

    if (type === 'all' || type === 'templates') {
      const templates = await storage.getAllTemplates(true);
      for (const template of templates) {
        if (!matchesDateRange(template.updatedAt || template.createdAt, dateRange)) continue;
        if (
          !normalizedIncludes(template.name, q) &&
          !normalizedIncludes(template.description, q) &&
          !normalizedIncludes(template.slug, q)
        ) {
          continue;
        }

        results.push({
          id: `template-${template.id}`,
          type: 'template',
          title: template.name,
          description: template.description || template.slug,
          metadata: {
            visibility: 'public',
            lastModified: formatRelativeDate(template.updatedAt || template.createdAt),
          },
          url: template.slug ? `/templates/${template.slug}` : `/templates`,
        });
      }
    }

    const deduped = Array.from(new Map(results.map((result) => [result.id, result])).values());

    deduped.sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'recent') {
        return (b.metadata?.lastModified || '').localeCompare(a.metadata?.lastModified || '');
      }
      if (sortBy === 'stars') {
        return (b.metadata?.stars || 0) - (a.metadata?.stars || 0);
      }
      const aMatches = a.metadata?.matches || 0;
      const bMatches = b.metadata?.matches || 0;
      if (bMatches !== aMatches) return bMatches - aMatches;
      return a.title.localeCompare(b.title);
    });

    res.json({
      results: deduped.slice(0, 100),
      totalResults: deduped.length,
      query: q,
    });
  } catch (error: any) {
    logger.error('Advanced search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search across all files in a project
 * POST /api/search/global
 */
router.post('/global', async (req, res) => {
  try {
    const {
      query,
      projectId,
      type,
      searchType,
      caseSensitive,
      wholeWord,
      useRegex,
      filePattern,
      excludePattern
    } = searchSchema.parse(req.body);
    const effectiveType = searchType ?? type;

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const numericUserId = typeof req.user!.id === 'string' ? parseInt(req.user!.id, 10) : req.user!.id;
    if (project.ownerId !== numericUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all files in project
    const files = await storage.getProjectFiles(projectId);
    
    const results: SearchResult[] = [];
    const excludePatterns = excludePattern?.split(',').map(p => p.trim()) || ['node_modules', 'dist', '.git'];
    const includePatterns = filePattern?.split(',').map(p => p.trim()) || [];

    for (const file of files) {
      const filePath = file.path || file.name || '';
      if (!filePath) {
        continue;
      }

      if (!matchesPatterns(filePath, includePatterns, excludePatterns)) {
        continue;
      }

      if (file.isDirectory) continue;

      const content = file.content || '';
      let matches: SearchResult['matches'] = [];

      if (effectiveType === 'files') {
        if (fileNameMatches(filePath, query, caseSensitive, useRegex)) {
          matches = [{
            line: 1,
            column: 1,
            text: filePath,
            matchText: query,
            context: filePath,
          }];
        }
      } else if (effectiveType === 'symbols') {
        matches = searchSymbolsInContent(content, query, { caseSensitive, wholeWord, useRegex });
      } else {
        matches = searchInContent(content, query, { caseSensitive, wholeWord, useRegex });
      }

      if (matches.length === 0) {
        continue;
      }

      results.push({
        id: file.id,
        name: file.name || filePath.split('/').pop() || filePath,
        filePath,
        path: filePath,
        type: file.isDirectory ? 'folder' : 'file',
        matches,
        totalMatches: matches.length,
        size: content.length,
        lastModified: file.updatedAt ? new Date(file.updatedAt).toISOString() : undefined,
        language: getFileLanguage(filePath),
      });
    }

    results.sort((a, b) => {
      if (b.totalMatches !== a.totalMatches) {
        return b.totalMatches - a.totalMatches;
      }
      return a.path.localeCompare(b.path);
    });

    res.json({
      results,
      totalFiles: results.length,
      totalMatches: results.reduce((sum, r) => sum + r.totalMatches, 0),
      query
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid search request', details: error.errors });
    }
    logger.error('Global search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Legacy search alias
 * POST /api/search
 */
router.post('/', async (req, res) => {
  req.url = '/global';
  return res.redirect(307, '/api/search/global');
});

/**
 * Replace text across multiple files
 * POST /api/search/replace
 */
router.post('/replace', async (req, res) => {
  try {
    const {
      query,
      replacement,
      projectId,
      caseSensitive,
      wholeWord,
      useRegex,
      filePattern,
      excludePattern,
      filePaths
    } = replaceSchema.parse(req.body);

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const numericUserId = typeof req.user!.id === 'string' ? parseInt(req.user!.id, 10) : req.user!.id;
    if (project.ownerId !== numericUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get files to replace in
    let files = await storage.getProjectFiles(projectId);
    
    // Filter to specific files if provided
    if (filePaths && filePaths.length > 0) {
      files = files.filter(f => filePaths.includes(f.path));
    }

    const excludePatterns = excludePattern?.split(',').map(p => p.trim()) || ['node_modules', 'dist', '.git'];
    const includePatterns = filePattern?.split(',').map(p => p.trim()) || [];

    const results: ReplaceResult[] = [];

    for (const file of files) {
      try {
        // Skip directories and excluded files
        if (file.isDirectory) continue;
        
        const filePath = file.path || file.name || '';
        if (!matchesPatterns(filePath, includePatterns, excludePatterns)) {
          continue;
        }

        // Perform replacement
        const content = file.content || '';
        const { newContent, count } = replaceInContent(content, query, replacement, {
          caseSensitive,
          wholeWord,
          useRegex
        });

        if (count > 0) {
          // Update file through storage interface (not direct fs)
          await storage.updateFile(file.id, { content: newContent });
          
          results.push({
            filePath,
            replacements: count,
            success: true
          });
        }
      } catch (error: any) {
        logger.error(`Replace failed for ${file.path}:`, error);
        results.push({
          filePath: file.path,
          replacements: 0,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      results,
      totalFiles: results.length,
      totalReplacements: results.reduce((sum, r) => sum + r.replacements, 0)
    });
  } catch (error: any) {
    logger.error('Global replace error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Search in content
 */
function searchInContent(
  content: string,
  query: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean; useRegex?: boolean }
): Array<{ line: number; column: number; text: string; matchText: string; context: string }> {
  const matches: Array<{ line: number; column: number; text: string; matchText: string; context: string }> = [];
  const lines = content.split('\n');

  let searchRegex: RegExp;
  
  if (options.useRegex) {
    searchRegex = new RegExp(query, options.caseSensitive ? 'g' : 'gi');
  } else {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = options.wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
    searchRegex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
  }

  lines.forEach((lineText, lineIndex) => {
    let match;
    while ((match = searchRegex.exec(lineText)) !== null) {
      matches.push({
        line: lineIndex + 1,
        column: match.index + 1,
        text: lineText,
        matchText: match[0],
        context: lineText,
      });
    }
  });

  return matches;
}

/**
 * Helper: Replace in content
 */
function replaceInContent(
  content: string,
  query: string,
  replacement: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean; useRegex?: boolean }
): { newContent: string; count: number } {
  let count = 0;
  
  let searchRegex: RegExp;
  
  if (options.useRegex) {
    searchRegex = new RegExp(query, options.caseSensitive ? 'g' : 'gi');
  } else {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = options.wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
    searchRegex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
  }

  const newContent = content.replace(searchRegex, (match) => {
    count++;
    return replacement;
  });

  return { newContent, count };
}

export default router;
