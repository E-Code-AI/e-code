import { createLogger } from '../utils/logger';

const logger = createLogger('token-revocation');

interface RevokedToken {
  jti: string;
  expiresAt: Date;
  userId?: number;
  revokedAt: Date;
}

interface UserTokenMapping {
  userId: number;
  jtis: Set<string>;
}

class TokenRevocationManager {
  private revokedTokens: Map<string, RevokedToken> = new Map();
  private userTokens: Map<number, Set<string>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60 * 1000;

  constructor() {
    this.startAutoCleanup();
  }

  revokeToken(jti: string, expiresAt: Date, userId?: number): void {
    const revokedToken: RevokedToken = {
      jti,
      expiresAt,
      userId,
      revokedAt: new Date()
    };

    this.revokedTokens.set(jti, revokedToken);

    if (userId) {
      const userJtis = this.userTokens.get(userId) || new Set();
      userJtis.add(jti);
      this.userTokens.set(userId, userJtis);
    }

    logger.info('Token revoked', {
      jti: jti.substring(0, 8) + '...',
      userId,
      expiresAt: expiresAt.toISOString()
    });
  }

  isTokenRevoked(jti: string): boolean {
    return this.revokedTokens.has(jti);
  }

  revokeAllUserTokens(userId: number): number {
    const userJtis = this.userTokens.get(userId);
    if (!userJtis || userJtis.size === 0) {
      logger.info('No tokens found for user', { userId });
      return 0;
    }

    const futureExpiry = new Date();
    futureExpiry.setHours(futureExpiry.getHours() + 24);

    let revokedCount = 0;
    for (const jti of userJtis) {
      if (!this.revokedTokens.has(jti)) {
        this.revokedTokens.set(jti, {
          jti,
          expiresAt: futureExpiry,
          userId,
          revokedAt: new Date()
        });
        revokedCount++;
      }
    }

    logger.info('All user tokens revoked', { userId, revokedCount });
    return revokedCount;
  }

  trackUserToken(userId: number, jti: string): void {
    const userJtis = this.userTokens.get(userId) || new Set();
    userJtis.add(jti);
    this.userTokens.set(userId, userJtis);
  }

  private cleanupExpiredTokens(): void {
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

export function revokeToken(jti: string, expiresAt: Date, userId?: number): void {
  tokenRevocationManager.revokeToken(jti, expiresAt, userId);
}

export function isTokenRevoked(jti: string): boolean {
  return tokenRevocationManager.isTokenRevoked(jti);
}

export function revokeAllUserTokens(userId: number): number {
  return tokenRevocationManager.revokeAllUserTokens(userId);
}

export function trackUserToken(userId: number, jti: string): void {
  tokenRevocationManager.trackUserToken(userId, jti);
}
