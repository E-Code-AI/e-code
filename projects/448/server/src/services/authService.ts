import bcrypt from "bcryptjs";
import jwt, { JwtPayload, SignOptions, VerifyErrors } from "jsonwebtoken";
import { promisify } from "util";

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  isActive?: boolean;
  roles?: string[];
}

export interface TokenPayload {
  sub: string;
  email: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthConfig {
  accessTokenSecret: string;
  refreshTokenSecret?: string;
  accessTokenExpiresIn?: string | number;
  refreshTokenExpiresIn?: string | number;
  saltRounds?: number;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface AuthServiceDependencies {
  findUserByEmail: (email: string) => Promise<AuthUser | null>;
  isUserActive?: (user: AuthUser) => boolean | Promise<boolean>;
}

export class AuthError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code = "AUTH_ERROR", status = 401) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret?: string;
  private readonly accessTokenExpiresIn: string | number;
  private readonly refreshTokenExpiresIn?: string | number;
  private readonly saltRounds: number;
  private readonly findUserByEmail: (email: string) => Promise<AuthUser | null>;
  private readonly isUserActive?: (user: AuthUser) => boolean | Promise<boolean>;
  private readonly jwtSignAsync: (
    payload: string | Buffer | object,
    secretOrPrivateKey: jwt.Secret,
    options?: SignOptions
  ) => Promise<string>;
  private readonly jwtVerifyAsync: (
    token: string,
    secretOrPublicKey: jwt.Secret
  ) => Promise<JwtPayload | string>;

  constructor(config: AuthConfig, deps: AuthServiceDependencies) {
    if (!config.accessTokenSecret) {
      throw new Error("AuthService requires accessTokenSecret");
    }

    this.accessTokenSecret = config.accessTokenSecret;
    this.refreshTokenSecret = config.refreshTokenSecret;
    this.accessTokenExpiresIn = config.accessTokenExpiresIn ?? "15m";
    this.refreshTokenExpiresIn = config.refreshTokenExpiresIn ?? "7d";
    this.saltRounds = config.saltRounds ?? 12;

    this.findUserByEmail = deps.findUserByEmail;
    this.isUserActive = deps.isUserActive;

    this.jwtSignAsync = promisify(jwt.sign) as unknown as (
      payload: string | Buffer | object,
      secretOrPrivateKey: jwt.Secret,
      options?: SignOptions
    ) => Promise<string>;

    this.jwtVerifyAsync = promisify(jwt.verify) as unknown as (
      token: string,
      secretOrPublicKey: jwt.Secret
    ) => Promise<JwtPayload | string>;
  }

  async hashPassword(plainPassword: string): Promise<string> {
    if (!plainPassword) {
      throw new AuthError("Password is required", "PASSWORD_REQUIRED", 400);
    }
    const salt = await bcrypt.genSalt(this.saltRounds);
    return bcrypt.hash(plainPassword, salt);
  }

  async comparePassword(plainPassword: string, passwordHash: string): Promise<boolean> {
    if (!plainPassword || !passwordHash) {
      return false;
    }
    return bcrypt.compare(plainPassword, passwordHash);
  }

  async validateCredentials(credentials: Credentials): Promise<AuthUser> {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new AuthError("Email and password are required", "CREDENTIALS_REQUIRED", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.findUserByEmail(normalizedEmail);

    if (!user) {
      throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS", 401);
    }

    const isMatch = await this.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS", 401);
    }

    if (this.isUserActive) {
      const active = await this.isUserActive(user);
      if (!active) {
        throw new AuthError("User account is inactive", "USER_INACTIVE", 403);
      }
    } else if (user.isActive === false) {
      throw new AuthError("User account is inactive", "USER_INACTIVE", 403);
    }

    return user;
  }

  private buildTokenPayload(user: AuthUser, extra?: Record<string, unknown>): TokenPayload {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
    };

    if (user.roles && user.roles.length > 0) {
      payload.roles = user.roles;
    }

    if (extra) {
      Object.assign(payload, extra);
    }

    return payload;
  }

  async generateAccessToken(user: AuthUser, extraPayload?: Record<string, unknown>): Promise<string> {
    const payload = this.buildTokenPayload(user, extraPayload);
    return this.jwtSignAsync(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn,
    });
  }

  async generateRefreshToken(user: AuthUser, extraPayload?: Record<string, unknown>): Promise<string> {
    if (!this.refreshTokenSecret) {
      throw new AuthError("Refresh token secret not configured", "REFRESH_NOT_CONFIGURED", 500);
    }
    const payload = this.buildTokenPayload(user, extraPayload);
    return this.jwtSignAsync(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    });
  }

  async generateAuthTokens(user: AuthUser, includeRefresh = true): Promise<AuthTokens> {
    const accessToken = await this.generateAccessToken(user);
    let refreshToken: string | undefined;

    if (includeRefresh && this.refreshTokenSecret) {
      refreshToken = await this.generateRefreshToken(user);
    }

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    if (!token) {
      throw new AuthError("Access token is required", "TOKEN_REQUIRED", 401);
    }

    try {
      const decoded = await this.jwtVerifyAsync(token, this.accessTokenSecret);
      if (typeof decoded === "string") {
        throw new AuthError("Invalid token payload", "INVALID_TOKEN", 401);
      }
      return decoded as TokenPayload;
    } catch (err) {
      const error = err as VerifyErrors;
      if (error.name === "TokenExpiredError") {
        throw new AuthError("Access token expired", "TOKEN_EXPIRED", 401);
      }
      throw new AuthError("Invalid access token", "INVALID_TOKEN", 401);
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    if (!this.refreshTokenSecret) {
      throw new AuthError("Refresh token secret not configured", "REFRESH_NOT_CONFIGURED", 500);
    }

    if (!token) {
      throw new AuthError("Refresh token is required", "TOKEN_REQUIRED", 401);
    }

    try {
      const decoded = await this.jwtVerifyAsync(token, this.refreshTokenSecret);
      if (typeof decoded === "string") {
        throw new AuthError("Invalid token payload", "INVALID_TOKEN", 401);
      }
      return decoded as TokenPayload;
    } catch (err) {
      const error = err as VerifyErrors;
      if (error.name === "TokenExpiredError") {
        throw new AuthError("Refresh token expired", "TOKEN_EXPIRED", 401);
      }
      throw new AuthError("Invalid refresh token", "INVALID_TOKEN", 401);
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      passwordHash: "",
      roles: payload.roles,
      isActive: true,
    };
    return this.generateAccessToken(user);
  }

  async login(credentials: Credentials): Promise<AuthTokens & { userId: string; email: string }> {
    const user = await this.validateCredentials(credentials);
    const tokens = await this.generateAuthTokens(user, true);
    return {
      ...tokens,
      userId: user.id,
      email: user.email,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    getUserById: (id: string) => Promise<AuthUser | null>,
    updatePasswordHash: (id: string, passwordHash: string) => Promise<void>
  ): Promise<void> {
    if (!userId || !currentPassword || !newPassword) {
      throw new AuthError("Missing required parameters", "MISSING_PARAMETERS", 400);
    }

    const user = await getUserById(userId);
    if (!user) {
      throw new AuthError("User not found", "USER_NOT_FOUND", 404);