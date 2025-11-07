import path from 'path';
import { z } from 'zod';

/**
 * AI Security Service
 * Fortune 500-grade security controls for AI agent operations
 * 
 * Features:
 * - Path sandboxing (prevent directory traversal)
 * - Action schema validation (strict whitelist)
 * - Audit logging (track all modifications)
 * - Rate limiting integration
 */

// Strict action schema validation
const FileActionSchema = z.object({
  type: z.enum(['create_file', 'edit_file']),
  path: z.string().min(1).max(500),
  content: z.string().max(1000000), // 1MB max
});

const ActionSchema = z.discriminatedUnion('type', [
  FileActionSchema,
]);

export type ValidatedAction = z.infer<typeof ActionSchema>;

// Dangerous path patterns that must be blocked
const DANGEROUS_PATTERNS = [
  /\.\./,           // Directory traversal
  /^\//, // Absolute paths
  /^~/, // Home directory
  /node_modules/i,  // Protected directories
  /\.env/i,         // Environment files
  /\.git/i,         // Git directory
  /package\.json/i, // Package config
  /tsconfig\.json/i, // TS config
  /vite\.config/i,  // Build config
  /server\//i,      // Server directory
  /\.key/i,         // Key files
  /\.pem/i,         // Certificate files
  /\.cert/i,        // Certificate files
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx',
  '.html', '.css', '.scss', '.sass',
  '.json', '.md', '.txt',
  '.py', '.java', '.go', '.rs',
  '.sql', '.graphql',
  '.yml', '.yaml',
];

export class AISecurityService {
  /**
   * Validate and sanitize a file path
   * Prevents directory traversal and access to protected files
   */
  validatePath(filePath: string, projectRoot: string = '/workspace'): { valid: boolean; sanitized?: string; reason?: string } {
    try {
      // Normalize the path to remove any tricks
      const normalized = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
      
      // Check for dangerous patterns
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(normalized)) {
          return {
            valid: false,
            reason: `Path contains forbidden pattern: ${pattern.source}`
          };
        }
      }
      
      // Check file extension
      const ext = path.extname(normalized).toLowerCase();
      if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
        return {
          valid: false,
          reason: `File extension '${ext}' not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
        };
      }
      
      // Ensure path stays within project root
      const resolved = path.resolve(projectRoot, normalized);
      if (!resolved.startsWith(projectRoot)) {
        return {
          valid: false,
          reason: 'Path escapes project root directory'
        };
      }
      
      // Return sanitized relative path
      const sanitized = path.relative(projectRoot, resolved);
      
      return {
        valid: true,
        sanitized: sanitized || normalized
      };
    } catch (error: any) {
      return {
        valid: false,
        reason: `Path validation error: ${error.message}`
      };
    }
  }

  /**
   * Validate an AI action against strict schema
   * Rejects any action that doesn't match whitelist
   */
  validateAction(action: unknown): { valid: boolean; action?: ValidatedAction; reason?: string } {
    try {
      console.log('[AI-Security] Validating action:', JSON.stringify(action, null, 2));
      const validated = ActionSchema.parse(action);
      console.log('[AI-Security] ✅ Validation successful');
      return {
        valid: true,
        action: validated
      };
    } catch (error: any) {
      console.error('[AI-Security] ❌ Validation failed:', JSON.stringify(error.errors || error.message, null, 2));
      return {
        valid: false,
        reason: error.errors?.[0]?.message || 'Invalid action format'
      };
    }
  }

  /**
   * Extract and validate actions from AI response
   * Only returns actions that pass both schema and path validation
   * 
   * Algorithm: String-aware brace counting
   * - Tracks opening/closing braces to extract complete JSON objects
   * - Respects string boundaries (only counts braces outside quotes)
   * - Handles escape sequences (\" inside strings)
   * - Prevents false matches on content like: console.log("}")
   * 
   * Edge cases handled:
   * - Braces inside strings: "const obj = '{ }'"
   * - Escaped quotes: "He said \"Hello\""
   * - Nested JSON objects with string content
   * 
   * @param aiResponse - Raw GPT response containing text and JSON actions
   * @param projectId - Project ID for path validation context
   * @returns Object with validated actions and rejected actions with reasons
   */
  extractValidActions(
    aiResponse: string,
    projectId: string
  ): { actions: ValidatedAction[]; rejected: Array<{ action: any; reason: string }> } {
    const actions: ValidatedAction[] = [];
    const rejected: Array<{ action: any; reason: string }> = [];

    // Extract JSON objects from response using string-aware brace counting
    const jsonMatches: string[] = [];
    let braceCount = 0;
    let jsonStart = -1;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < aiResponse.length; i++) {
      const char = aiResponse[i];
      
      // Handle escape sequences inside strings
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }
      
      // Track string boundaries (only count braces outside strings)
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      // Only count braces when not inside a string
      if (!inString) {
        if (char === '{') {
          if (braceCount === 0) {
            jsonStart = i;
          }
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0 && jsonStart >= 0) {
            jsonMatches.push(aiResponse.substring(jsonStart, i + 1));
            jsonStart = -1;
          }
        }
      }
    }
    
    console.log(`[AI-Security] Found ${jsonMatches.length} JSON matches in response`);
    
    for (let i = 0; i < jsonMatches.length; i++) {
      const jsonStr = jsonMatches[i];
      console.log(`[AI-Security] Processing match ${i + 1}/${jsonMatches.length}: ${jsonStr.substring(0, 100)}...`);
      
      try {
        const parsed = JSON.parse(jsonStr);
        console.log(`[AI-Security] Parsed object:`, JSON.stringify(parsed, null, 2));
        
        // Check if it looks like an action
        console.log(`[AI-Security] Checking type: ${parsed.type}, has action: ${!!parsed.action}`);
        if (parsed.type === 'action' && parsed.action) {
          console.log('[AI-Security] ✅ Matched action pattern, validating...');
          // Validate the action schema
          const schemaResult = this.validateAction(parsed.action);
          if (!schemaResult.valid) {
            console.log('[AI-Security] ❌ Schema validation failed:', schemaResult.reason);
            rejected.push({ action: parsed.action, reason: schemaResult.reason || 'Schema validation failed' });
            continue;
          }
          
          // Validate the path if it's a file action
          if ('path' in schemaResult.action!) {
            const pathResult = this.validatePath(schemaResult.action.path);
            if (!pathResult.valid) {
              console.log('[AI-Security] ❌ Path validation failed:', pathResult.reason);
              rejected.push({ action: parsed.action, reason: pathResult.reason || 'Path validation failed' });
              continue;
            }
            
            // Use sanitized path
            schemaResult.action.path = pathResult.sanitized!;
          }
          
          // Action passed all validations
          console.log('[AI-Security] ✅ Action validated successfully, adding to queue');
          actions.push(schemaResult.action!);
        } else {
          console.log('[AI-Security] ⏭️  Not an action, skipping');
        }
      } catch (e: any) {
        console.log('[AI-Security] ❌ JSON parse error:', e.message);
        // Invalid JSON, skip
      }
    }
    
    console.log(`[AI-Security] Extraction complete: ${actions.length} valid, ${rejected.length} rejected`);
    return { actions, rejected };
  }

  /**
   * Log AI action to database-backed audit trail
   * 
   * Production-Ready Implementation:
   * - PostgreSQL persistence for compliance
   * - Tamper-proof append-only logging
   * - Queryable for security reviews and forensics
   */
  async logAction(
    userId: string,
    projectId: string,
    action: ValidatedAction,
    result: { success: boolean; error?: string; fileId?: string },
    approvalId?: string
  ): Promise<void> {
    try {
      // Import storage dynamically to avoid circular dependency
      const { storage } = await import('../storage');
      
      // Path validation info if this is a file action
      let securityValidation = undefined;
      if ('path' in action && action.path) {
        const pathResult = this.validatePath(action.path);
        securityValidation = {
          pathValid: pathResult.valid,
          reason: pathResult.reason,
          sanitized: pathResult.sanitized,
        };
      }
      
      // Store in database audit trail
      await storage.createAiAuditLog({
        userId,
        projectId,
        approvalId,
        action: action as any, // JSONB type
        result: result as any, // JSONB type
        securityValidation,
      });
      
      // Also log to console for real-time monitoring
      console.log('[AI_AUDIT]', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId,
        projectId,
        approvalId,
        actionType: action.type,
        actionPath: 'path' in action ? action.path : null,
        result: result.success ? 'success' : 'failure',
        error: result.error || null,
        fileId: result.fileId || null,
        storage: 'DATABASE_PERSISTED',
      }));
      
    } catch (error) {
      console.error('[AISecurityService] CRITICAL: Failed to log action to database:', error);
      // Still log to console as fallback
      console.log('[AI_AUDIT_FALLBACK]', JSON.stringify({
        timestamp: new Date().toISOString(),
        userId,
        projectId,
        action,
        result,
        error: 'Database logging failed',
      }));
    }
  }

  /**
   * Check if user has exceeded rate limits for AI operations
   * Returns false if limit exceeded, true if allowed
   * 
   * Uses in-memory tracking for now - production should use Redis
   */
  private rateLimitMap = new Map<string, number[]>();
  
  async checkRateLimit(
    userId: string,
    projectId: string,
    maxActionsPerMinute: number = 30
  ): Promise<{ allowed: boolean; remaining?: number; resetAt?: Date }> {
    try {
      const key = `${userId}:${projectId}`;
      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;
      
      // Get recent timestamps for this user/project
      let timestamps = this.rateLimitMap.get(key) || [];
      
      // Remove expired timestamps
      timestamps = timestamps.filter(ts => ts > oneMinuteAgo);
      
      // Update map
      this.rateLimitMap.set(key, timestamps);
      
      const count = timestamps.length;
      const remaining = Math.max(0, maxActionsPerMinute - count);
      const resetAt = new Date(now + 60 * 1000);
      
      const allowed = count < maxActionsPerMinute;
      
      // If allowed, record this action
      if (allowed) {
        timestamps.push(now);
        this.rateLimitMap.set(key, timestamps);
      }
      
      return {
        allowed,
        remaining,
        resetAt
      };
    } catch (error) {
      console.error('[AISecurityService] Rate limit check failed:', error);
      // On error, allow the action (fail open for availability)
      return { allowed: true };
    }
  }

  /**
   * Generate security report for a project
   * Shows all AI modifications for audit purposes
   * Note: Currently uses in-memory data - production should query database
   */
  async getSecurityReport(projectId: string, limit: number = 100) {
    // TODO: Implement database query when audit trail is fully integrated
    // For now, return summary from rate limit data
    return {
      message: 'Security report available in console logs - search for [AI_AUDIT]',
      rateLimitStatus: {
        trackedUsers: this.rateLimitMap.size,
        recentActivity: Array.from(this.rateLimitMap.entries()).map(([key, timestamps]) => ({
          key,
          actionCount: timestamps.length
        }))
      }
    };
  }
}

// Export singleton instance
export const aiSecurityService = new AISecurityService();
