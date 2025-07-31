export class ECodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ECodeError';
    Object.setPrototypeOf(this, ECodeError.prototype);
  }
}

export class APIError extends ECodeError {
  public readonly status: number;
  public readonly data?: any;

  constructor(message: string, status: number = 500, data?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

export class AuthenticationError extends ECodeError {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class ValidationError extends ECodeError {
  public readonly field?: string;
  public readonly violations: string[];

  constructor(message: string, field?: string, violations: string[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.violations = violations;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends ECodeError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class RateLimitError extends ECodeError {
  public readonly resetTime?: Date;
  public readonly limit?: number;

  constructor(message: string = 'Rate limit exceeded', resetTime?: Date, limit?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.resetTime = resetTime;
    this.limit = limit;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class NetworkError extends ECodeError {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class TimeoutError extends ECodeError {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class ConfigurationError extends ECodeError {
  constructor(message: string = 'Invalid configuration') {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}