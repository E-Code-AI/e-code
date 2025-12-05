import bcrypt from "bcryptjs";

const DEFAULT_SALT_ROUNDS = 12;

export interface HashPasswordOptions {
  saltRounds?: number;
}

export const hashPassword = async (
  plainPassword: string,
  options: HashPasswordOptions = {}
): Promise<string> => {
  if (typeof plainPassword !== "string" || plainPassword.length === 0) {
    throw new Error("Password must be a non-empty string");
  }

  const saltRounds = options.saltRounds ?? DEFAULT_SALT_ROUNDS;

  if (!Number.isInteger(saltRounds) || saltRounds < 10 || saltRounds > 15) {
    throw new Error("saltRounds must be an integer between 10 and 15");
  }

  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(plainPassword, salt);
  return hash;
};

export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> => {
  if (typeof plainPassword !== "string" || plainPassword.length === 0) {
    throw new Error("Password must be a non-empty string");
  }

  if (typeof hashedPassword !== "string" || hashedPassword.length === 0) {
    throw new Error("Hashed password must be a non-empty string");
  }

  return bcrypt.compare(plainPassword, hashedPassword);
};

export const isPasswordStrong = (password: string): boolean => {
  if (typeof password !== "string") return false;

  // Basic strength check: at least 8 chars, one upper, one lower, one digit, one special char
  const minLength = 8;
  if (password.length < minLength) return false;

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return hasUpper && hasLower && hasDigit && hasSpecial;
};

export const getPasswordStrengthIssues = (password: string): string[] => {
  const issues: string[] = [];

  if (typeof password !== "string" || password.length === 0) {
    issues.push("Password must be a non-empty string");
    return issues;
  }

  if (password.length < 8) {
    issues.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    issues.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    issues.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    issues.push("Password must contain at least one digit");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push("Password must contain at least one special character");
  }

  return issues;
};