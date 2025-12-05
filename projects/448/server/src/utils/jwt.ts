import jwt, { JwtPayload, SignOptions, VerifyErrors } from "jsonwebtoken";

export interface DecodedToken extends JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiresIn: string | number;
  refreshTokenExpiresIn: string | number;
  issuer?: string;
  audience?: string;
}

let jwtConfig: JwtConfig | null = null;

export const configureJwt = (config: JwtConfig): void => {
  if (!config.accessTokenSecret || !config.refreshTokenSecret) {
    throw new Error("JWT configuration requires both accessTokenSecret and refreshTokenSecret");
  }
  jwtConfig = { ...config };
};

const ensureConfigured = (): asserts jwtConfig is JwtConfig => {
  if (!jwtConfig) {
    throw new Error("JWT is not configured. Call configureJwt() during server initialization.");
  }
};

const signToken = (
  payload: Record<string, unknown>,
  secret: string,
  options: SignOptions
): string => {
  return jwt.sign(payload, secret, options);
};

export const signAccessToken = (payload: Record<string, unknown>): string => {
  ensureConfigured();
  const { accessTokenSecret, accessTokenExpiresIn, issuer, audience } = jwtConfig;
  const options: SignOptions = {
    expiresIn: accessTokenExpiresIn,
    issuer,
    audience
  };
  return signToken(payload, accessTokenSecret, options);
};

export const signRefreshToken = (payload: Record<string, unknown>): string => {
  ensureConfigured();
  const { refreshTokenSecret, refreshTokenExpiresIn, issuer, audience } = jwtConfig;
  const options: SignOptions = {
    expiresIn: refreshTokenExpiresIn,
    issuer,
    audience
  };
  return signToken(payload, refreshTokenSecret, options);
};

export const signTokenPair = (payload: Record<string, unknown>): TokenPair => {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload)
  };
};

export const verifyAccessToken = (token: string): DecodedToken => {
  ensureConfigured();
  const { accessTokenSecret, issuer, audience } = jwtConfig;
  try {
    const decoded = jwt.verify(token, accessTokenSecret, {
      issuer,
      audience
    }) as DecodedToken;
    return decoded;
  } catch (error) {
    const err = error as VerifyErrors;
    throw new Error(`Invalid access token: undefined`);
  }
};

export const verifyRefreshToken = (token: string): DecodedToken => {
  ensureConfigured();
  const { refreshTokenSecret, issuer, audience } = jwtConfig;
  try {
    const decoded = jwt.verify(token, refreshTokenSecret, {
      issuer,
      audience
    }) as DecodedToken;
    return decoded;
  } catch (error) {
    const err = error as VerifyErrors;
    throw new Error(`Invalid refresh token: undefined`);
  }
};

export const decodeToken = (token: string): DecodedToken | null => {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === "string") {
    return null;
  }
  return decoded as DecodedToken;
};

export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return decoded.exp < nowInSeconds;
};

export const getBearerTokenFromHeader = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token;
};

export const rotateTokens = (refreshToken: string): TokenPair => {
  const decoded = verifyRefreshToken(refreshToken);
  const { iat, exp, nbf, jti, ...rest } = decoded;
  return signTokenPair(rest);
};