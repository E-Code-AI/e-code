// @ts-nocheck
import { randomBytes, createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

// Generate random tokens
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

// Generate email verification token
export function generateEmailVerificationToken(): string {
  return generateToken(32);
}

// Generate password reset token
export function generatePasswordResetToken(): string {
  return generateToken(32);
}

// Hash token for storage
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Validate password strength
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// JWT token generation and verification
export function generateAccessToken(userId: number, username: string): string {
  return jwt.sign(
    { userId, username, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

export function generateRefreshToken(userId: number): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAccessToken(token: string): { userId: number; username: string } {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return { userId: payload.userId, username: payload.username };
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): { userId: number } {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as any;
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return { userId: payload.userId };
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

// Session token generation
export function generateSessionToken(): string {
  return generateToken(64);
}

// API key generation
export function generateApiKey(): string {
  const prefix = 'ek_'; // E-Code key prefix
  const key = generateToken(32);
  return `${prefix}${key}`;
}

// Two-factor authentication
export function generateTwoFactorSecret(): string {
  // This would integrate with an authenticator app
  return generateToken(16);
}

export function generateTwoFactorBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(generateToken(8));
  }
  return codes;
}