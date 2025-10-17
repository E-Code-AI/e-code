export interface User {
  id: number;
  username: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface ProjectStats {
  views?: number;
  likes?: number;
  forks?: number;
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  language?: string | null;
  visibility?: string | null;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
  stats?: ProjectStats;
}

export interface ProjectFile {
  id: number;
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface RunResult {
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
}
