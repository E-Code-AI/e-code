/**
 * Session Security Manager
 * Enhanced session management with fingerprinting and rotation
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { createLogger } from '../utils/logger';
import { redisCache } from '../services/redis-cache.service';

const logger = createLogger('session-manager');
const SESSION_TTL_SECONDS = 30 * 60;

export class SessionManager {
  private sessionStore = new Map<string, any>();

  private getSessionKey(sessionId: string): string {
    return `auth:session-manager:session:${sessionId}`;
  }

  private getUserSessionsKey(userId: number | string): string {
    return `auth:session-manager:user:${userId}:sessions`;
  }

  private isProductionRuntime(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private deserializeSession(session: any): any {
    if (!session) return null;
    return {
      ...session,
      createdAt: session.createdAt ? new Date(session.createdAt) : session.createdAt,
      lastActivity: session.lastActivity ? new Date(session.lastActivity) : session.lastActivity,
      rotatedAt: session.rotatedAt ? new Date(session.rotatedAt) : session.rotatedAt,
    };
  }

  private async persistSession(sessionId: string, session: any): Promise<void> {
    const stored = await redisCache.set(this.getSessionKey(sessionId), session, SESSION_TTL_SECONDS);
    if (session?.userId) {
      await redisCache.sadd(this.getUserSessionsKey(session.userId), sessionId);
      await redisCache.expire(this.getUserSessionsKey(session.userId), SESSION_TTL_SECONDS);
    }

    if (!stored && this.isProductionRuntime()) {
      throw new Error('Redis unavailable in production; refusing process-local session-manager state');
    }

    if (!this.isProductionRuntime()) {
      this.sessionStore.set(sessionId, session);
    }
  }

  /**
   * Get session by session ID
   * Used for WebSocket authentication validation
   */
  async getSession(sessionId: string): Promise<any | null> {
    // For signed sessions (connect.sid format), extract the actual session ID
    // Format is typically: s:sessionId.signature
    let actualSessionId = sessionId;
    if (sessionId.startsWith('s:')) {
      const dotIndex = sessionId.indexOf('.');
      actualSessionId = dotIndex > 0 ? sessionId.substring(2, dotIndex) : sessionId.substring(2);
    }
    
    const redisSession = await redisCache.get(this.getSessionKey(actualSessionId));
    if (redisSession) {
      return this.deserializeSession(redisSession);
    }

    if (!this.isProductionRuntime() && this.sessionStore.has(actualSessionId)) {
      return this.sessionStore.get(actualSessionId);
    }
    
    return null;
  }
  
  /**
   * Store session for WebSocket access
   */
  storeSession(sessionId: string, session: any): void {
    this.persistSession(sessionId, session).catch((error) => {
      logger.error('Failed to persist session-manager state', { error: error.message });
    });
  }

  /**
   * Generate session fingerprint based on client characteristics
   * Enhanced with IP hash and additional headers for better security
   */
  generateFingerprint(req: Request): string {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const accept = req.headers['accept'] || '';
    
    // Hash the IP address for privacy while still using it for fingerprinting
    const clientIp = req.ip || req.socket?.remoteAddress || '';
    const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex').substring(0, 16);
    
    // Combine all fingerprint components
    const fingerprintData = [
      userAgent,
      acceptLanguage,
      acceptEncoding,
      accept,
      ipHash
    ].join('|');
    
    return crypto
      .createHash('sha256')
      .update(fingerprintData)
      .digest('hex');
  }
  
  /**
   * Validate session against fingerprint
   */
  validateSession(req: Request): boolean {
    const session = req.session as any;
    if (!session || !session.fingerprint) {
      logger.warn('Session validation failed: No session or fingerprint', {
        ip: req.ip,
        path: req.path
      });
      return false;
    }
    
    const currentFingerprint = this.generateFingerprint(req);
    const isValid = session.fingerprint === currentFingerprint;
    
    if (!isValid) {
      logger.warn('Session fingerprint mismatch detected', {
        ip: req.ip,
        sessionId: session.id,
        expected: session.fingerprint.substring(0, 8),
        actual: currentFingerprint.substring(0, 8)
      });
    }
    
    return isValid;
  }
  
  /**
   * Rotate session ID while preserving session data
   */
  rotateSession(req: Request, callback?: (err?: any) => void): void {
    const oldSession = { ...req.session };
    const oldId = req.sessionID;
    
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Session rotation failed', { error: err });
        if (callback) callback(err);
        return;
      }
      
      // Restore session data
      Object.assign(req.session, oldSession);
      
      // Update fingerprint
      (req.session as any).fingerprint = this.generateFingerprint(req);
      (req.session as any).rotatedAt = new Date();
      (req.session as any).previousId = oldId;
      
      logger.info('Session rotated successfully', {
        oldId: oldId.substring(0, 8),
        newId: req.sessionID.substring(0, 8),
        ip: req.ip
      });
      
      if (callback) callback();
    });
  }
  
  /**
   * Create new secure session
   */
  createSession(req: Request, userId: number | string, data?: any): void {
    const session = req.session as any;
    
    session.userId = userId;
    session.fingerprint = this.generateFingerprint(req);
    session.createdAt = new Date();
    session.lastActivity = new Date();
    session.ipAddress = req.ip;
    
    if (data) {
      Object.assign(session, data);
    }
    
    // Set session timeout (30 minutes of inactivity)
    session.cookie.maxAge = 30 * 60 * 1000;
    session.cookie.httpOnly = true;
    session.cookie.secure = process.env.NODE_ENV === 'production';
    session.cookie.sameSite = 'strict';
    
    logger.info('Session created', {
      userId,
      sessionId: req.sessionID.substring(0, 8),
      ip: req.ip
    });
  }
  
  /**
   * Update session activity timestamp
   */
  touchSession(req: Request): void {
    const session = req.session as any;
    if (session) {
      session.lastActivity = new Date();
      
      // Auto-rotate session after 15 minutes
      const rotatedAt = session.rotatedAt ? new Date(session.rotatedAt) : session.createdAt;
      const timeSinceRotation = Date.now() - new Date(rotatedAt).getTime();
      
      if (timeSinceRotation > 15 * 60 * 1000) {
        this.rotateSession(req);
      }
    }
  }
  
  /**
   * Destroy session securely
   */
  destroySession(req: Request, res: Response, callback?: (err?: any) => void): void {
    const sessionId = req.sessionID;
    const userId = (req.session as any)?.userId;
    
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction failed', { error: err });
        if (callback) callback(err);
        return;
      }
      
      // Clear session cookie
      res.clearCookie('ecode.sid');
      res.clearCookie('csrf-token');
      
      logger.info('Session destroyed', {
        sessionId: sessionId?.substring(0, 8),
        userId
      });
      
      if (callback) callback();
    });
  }
  
  /**
   * Check for session hijacking attempts
   */
  checkSessionSecurity(req: Request): { secure: boolean; reason?: string } {
    const session = req.session as any;
    
    if (!session) {
      return { secure: false, reason: 'No session found' };
    }
    
    // Check fingerprint
    if (!this.validateSession(req)) {
      return { secure: false, reason: 'Fingerprint mismatch' };
    }
    
    // Check IP address change (optional, can be strict)
    if (session.ipAddress && session.ipAddress !== req.ip) {
      logger.warn('IP address change detected', {
        sessionId: req.sessionID.substring(0, 8),
        originalIp: session.ipAddress,
        currentIp: req.ip
      });
      // Can choose to invalidate or just warn
      // return { secure: false, reason: 'IP address changed' };
    }
    
    // Check session age
    const sessionAge = Date.now() - new Date(session.createdAt).getTime();
    if (sessionAge > 24 * 60 * 60 * 1000) { // 24 hours
      return { secure: false, reason: 'Session too old' };
    }
    
    // Check inactivity
    const inactiveTime = Date.now() - new Date(session.lastActivity).getTime();
    if (inactiveTime > 30 * 60 * 1000) { // 30 minutes
      return { secure: false, reason: 'Session inactive' };
    }
    
    return { secure: true };
  }
  
  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: number | string): Promise<any[]> {
    const sessions: any[] = [];

    const redisSessionIds = await redisCache.smembers(this.getUserSessionsKey(userId));
    for (const id of redisSessionIds) {
      const session = await this.getSession(id);
      if (session?.userId === userId) {
        sessions.push({
          id: id.substring(0, 8),
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          ipAddress: session.ipAddress
        });
      }
    }

    if (!this.isProductionRuntime()) {
      for (const [id, session] of this.sessionStore.entries()) {
        if (session.userId === userId && !sessions.some(existing => existing.id === id.substring(0, 8))) {
          sessions.push({
            id: id.substring(0, 8),
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            ipAddress: session.ipAddress
          });
        }
      }
    }
    
    return sessions;
  }
  
  /**
   * Revoke all sessions for a user (except current)
   */
  async revokeUserSessions(userId: number | string, exceptSessionId?: string): Promise<void> {
    const revoked: string[] = [];

    const redisSessionIds = await redisCache.smembers(this.getUserSessionsKey(userId));
    for (const id of redisSessionIds) {
      if (id !== exceptSessionId) {
        await redisCache.del(this.getSessionKey(id));
        await redisCache.srem(this.getUserSessionsKey(userId), id);
        this.sessionStore.delete(id);
        revoked.push(id);
      }
    }

    if (!this.isProductionRuntime()) {
      for (const [id, session] of this.sessionStore.entries()) {
        if (session.userId === userId && id !== exceptSessionId && !revoked.includes(id)) {
          this.sessionStore.delete(id);
          revoked.push(id);
        }
      }
    }
    
    if (revoked.length > 0) {
      logger.info('User sessions revoked', {
        userId,
        count: revoked.length,
        exceptId: exceptSessionId?.substring(0, 8)
      });
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
