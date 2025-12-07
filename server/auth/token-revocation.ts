import { createLogger } from '../utils/logger';
import { eq, lt } from 'drizzle-orm';
import { revokedTokens } from '../../shared/schema';

const logger = createLogger('token-revocation');

interface RevokedToken {
  jti: string;
  expiresAt: Date;
  userId?: string;
  revokedAt: Date;
}

function normalizeUserIdToString(userId: number | string | undefined): string | undefined {
  if (userId === undefined || userId === null) return undefined;
  return String(userId);
}

class TokenRevocationManager {
  private revokedTokens: Map<string, RevokedToken> = new Map();
  private userTokens: Map<string, Set<string>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60 * 1000;
  private db: any = null;
  private initialized: boolean = false;

  constructor() {
    this.startAutoCleanup();
  }

  async initializeFromDatabase(db: any): Promise<void> {
    if (this.initialized) return;
    
    this.db = db;
    
    try {
      const now = new Date();
      const tokens = await db
        .select()
        .from(revokedTokens)
        .where(lt(now, revokedTokens.expiresAt));
      
      for (const token of tokens) {
        const revokedToken: RevokedToken = {
          jti: token.jti,
          expiresAt: token.expiresAt,
          userId: token.userId || undefined,
          revokedAt: token.revokedAt
        };
        
        this.revokedTokens.set(token.jti, revokedToken);
        
        if (token.userId) {
          const userJtis = this.userTokens.get(token.userId) || new Set();
          userJtis.add(token.jti);
          this.userTokens.set(token.userId, userJtis);
        }
      }
      
      this.initialized = true;
      logger.info('Token revocation loaded from database', {
        loadedCount: tokens.length
      });
    } catch (error) {
      logger.error('Failed to load revoked tokens from database', { error });
    }
  }

  async revokeToken(jti: string, expiresAt: Date, userId?: number | string): Promise<void> {
    const normalizedUserId = normalizeUserIdToString(userId);
    
    const revokedToken: RevokedToken = {
      jti,
      expiresAt,
      userId: normalizedUserId,
      revokedAt: new Date()
    };

    this.revokedTokens.set(jti, revokedToken);

    if (normalizedUserId) {
      const userJtis = this.userTokens.get(normalizedUserId) || new Set();
      userJtis.add(jti);
      this.userTokens.set(normalizedUserId, userJtis);
    }

    if (this.db) {
      try {
        await this.db.insert(revokedTokens).values({
          jti,
          userId: normalizedUserId,
          expiresAt,
          revokedAt: new Date()
        }).onConflictDoNothing();
      } catch (error) {
        logger.error('Failed to persist revoked token to database', { error, jti });
      }
    }

    logger.info('Token revoked', {
      jti: jti.substring(0, 8) + '...',
      userId: normalizedUserId,
      expiresAt: expiresAt.toISOString()
    });
  }

  isTokenRevoked(jti: string): boolean {
    return this.revokedTokens.has(jti);
  }

  async revokeAllUserTokens(userId: number | string): Promise<number> {
    const normalizedUserId = normalizeUserIdToString(userId);
    if (!normalizedUserId) return 0;
    
    const userJtis = this.userTokens.get(normalizedUserId);
    if (!userJtis || userJtis.size === 0) {
      logger.info('No tokens found for user', { userId: normalizedUserId });
      return 0;
    }

    const futureExpiry = new Date();
    futureExpiry.setHours(futureExpiry.getHours() + 24);

    let revokedCount = 0;
    for (const jti of userJtis) {
      if (!this.revokedTokens.has(jti)) {
        const revokedToken: RevokedToken = {
          jti,
          expiresAt: futureExpiry,
          userId: normalizedUserId,
          revokedAt: new Date()
        };
        
        this.revokedTokens.set(jti, revokedToken);
        
        if (this.db) {
          try {
            await this.db.insert(revokedTokens).values({
              jti,
              userId: normalizedUserId,
              expiresAt: futureExpiry,
              revokedAt: new Date()
            }).onConflictDoNothing();
          } catch (error) {
            logger.error('Failed to persist bulk revoked token', { error, jti });
          }
        }
        
        revokedCount++;
      }
    }

    logger.info('All user tokens revoked', { userId: normalizedUserId, revokedCount });
    return revokedCount;
  }

  trackUserToken(userId: number | string, jti: string): void {
    const normalizedUserId = normalizeUserIdToString(userId);
    if (!normalizedUserId) return;
    
    const userJtis = this.userTokens.get(normalizedUserId) || new Set();
    userJtis.add(jti);
    this.userTokens.set(normalizedUserId, userJtis);
  }

  private async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [jti, token] of this.revokedTokens.entries()) {
      if (token.expiresAt < now) {
        this.revokedTokens.delete(jti);
        
        if (token.userId) {
          const userJtis = this.userTokens.get(token.userId);
          if (userJtis) {
            userJtis.delete(jti);
            if (userJtis.size === 0) {
              this.userTokens.delete(token.userId);
            }
          }
        }
        
        cleanedCount++;
      }
    }

    if (this.db) {
      try {
        await this.db.delete(revokedTokens).where(lt(revokedTokens.expiresAt, now));
      } catch (error) {
        logger.error('Failed to cleanup expired tokens from database', { error });
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired revoked tokens', { 
        cleanedCount, 
        remainingCount: this.revokedTokens.size 
      });
    }
  }

  private startAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, this.CLEANUP_INTERVAL_MS);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }

    logger.info('Token revocation auto-cleanup started', {
      intervalMs: this.CLEANUP_INTERVAL_MS
    });
  }

  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Token revocation auto-cleanup stopped');
    }
  }

  getStats(): { revokedCount: number; trackedUsers: number } {
    return {
      revokedCount: this.revokedTokens.size,
      trackedUsers: this.userTokens.size
    };
  }

  clear(): void {
    this.revokedTokens.clear();
    this.userTokens.clear();
    logger.info('Token revocation store cleared');
  }
}

export const tokenRevocationManager = new TokenRevocationManager();

export async function initializeTokenRevocation(db: any): Promise<void> {
  await tokenRevocationManager.initializeFromDatabase(db);
}

export function revokeToken(jti: string, expiresAt: Date, userId?: number | string): void {
  tokenRevocationManager.revokeToken(jti, expiresAt, userId);
}

export function isTokenRevoked(jti: string): boolean {
  return tokenRevocationManager.isTokenRevoked(jti);
}

export function revokeAllUserTokens(userId: number | string): number {
  return tokenRevocationManager.revokeAllUserTokens(userId) as unknown as number;
}

export function trackUserToken(userId: number | string, jti: string): void {
  tokenRevocationManager.trackUserToken(userId, jti);
}
