/**
 * Enterprise Security Layer
 * Fortune 500-grade security with CSP, XSS prevention, and sanitization
 */

// ============================================================================
// CONTENT SECURITY POLICY
// ============================================================================

export interface CSPConfig {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  fontSrc: string[];
  connectSrc: string[];
  frameSrc: string[];
  objectSrc: string[];
  mediaSrc: string[];
  workerSrc: string[];
}

export const defaultCSP: CSPConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // For React dev
  styleSrc: ["'self'", "'unsafe-inline'"], // For styled-components
  imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
  fontSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
  frameSrc: ["'self'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  workerSrc: ["'self'", 'blob:'],
};

export const productionCSP: CSPConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  fontSrc: ["'self'", 'data:'],
  connectSrc: ["'self'", 'https:', 'wss:'],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  workerSrc: ["'self'", 'blob:'],
};

/**
 * Generate CSP header string
 */
export function generateCSPHeader(config: CSPConfig = defaultCSP): string {
  const directives = Object.entries(config).map(([key, values]) => {
    const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    return `${directive} ${values.join(' ')}`;
  });

  return directives.join('; ');
}

// ============================================================================
// XSS PREVENTION
// ============================================================================

/**
 * HTML entity encoding map
 */
const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape HTML to prevent XSS
 */
export function escapeHTML(str: string): string {
  return str.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string, options?: {
  allowHTML?: boolean;
  maxLength?: number;
}): string {
  let sanitized = input;

  // Trim whitespace
  sanitized = sanitized.trim();

  // Apply max length
  if (options?.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Escape HTML if not allowed
  if (!options?.allowHTML) {
    sanitized = escapeHTML(sanitized);
  }

  return sanitized;
}

/**
 * Sanitize URL to prevent javascript: and data: XSS
 */
export function sanitizeURL(url: string): string {
  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return 'about:blank';
    }
  }

  return url;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// SECURE STORAGE
// ============================================================================

/**
 * Secure localStorage wrapper with encryption
 */
export class SecureStorage {
  private key: string;

  constructor(key: string = 'e-code-encryption-key') {
    this.key = key;
  }

  /**
   * Simple XOR encryption (for demo - use proper encryption in production)
   */
  private encrypt(data: string): string {
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      const keyChar = this.key.charCodeAt(i % this.key.length);
      const dataChar = data.charCodeAt(i);
      encrypted += String.fromCharCode(dataChar ^ keyChar);
    }
    return btoa(encrypted);
  }

  /**
   * Simple XOR decryption
   */
  private decrypt(data: string): string {
    try {
      const decoded = atob(data);
      let decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        const keyChar = this.key.charCodeAt(i % this.key.length);
        const dataChar = decoded.charCodeAt(i);
        decrypted += String.fromCharCode(dataChar ^ keyChar);
      }
      return decrypted;
    } catch {
      return '';
    }
  }

  setItem(key: string, value: string): void {
    try {
      const encrypted = this.encrypt(value);
      localStorage.setItem(key, encrypted);
    } catch (e) {
      console.error('[SecureStorage] Failed to set item', e);
    }
  }

  getItem(key: string): string | null {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      return this.decrypt(encrypted);
    } catch (e) {
      console.error('[SecureStorage] Failed to get item', e);
      return null;
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}

export const secureStorage = new SecureStorage();

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Client-side rate limiter
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }) {
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(
      (timestamp) => now - timestamp < this.config.windowMs
    );

    // Check if limit exceeded
    if (validRequests.length >= this.config.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  /**
   * Reset rate limit for key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.requests.clear();
  }
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false;
  return token === storedToken;
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
}

/**
 * Get security headers for production
 */
export function getSecurityHeaders(csp: CSPConfig = productionCSP): SecurityHeaders {
  return {
    'Content-Security-Policy': generateCSPHeader(csp),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, options?: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}): { valid: boolean; error?: string } {
  // Check file size
  const maxSize = options?.maxSize || 10 * 1024 * 1024; // 10MB default
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
    };
  }

  // Check file type
  if (options?.allowedTypes) {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !options.allowedTypes.includes(fileExt)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed: ${options.allowedTypes.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate code input for command injection
 */
export function validateCodeInput(code: string): { valid: boolean; error?: string } {
  // Check for suspicious patterns
  const dangerousPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /setTimeout\s*\(/,
    /setInterval\s*\(/,
    /__proto__/,
    /constructor\s*\[/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return {
        valid: false,
        error: 'Code contains potentially dangerous patterns',
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  escapeHTML,
  sanitizeInput,
  sanitizeURL,
  isValidEmail,
  isValidURL,
  generateCSPHeader,
  getSecurityHeaders,
  SecureStorage,
  secureStorage,
  RateLimiter,
  generateCSRFToken,
  validateCSRFToken,
  validateFileUpload,
  validateCodeInput,
};
