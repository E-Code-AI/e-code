/* eslint-disable @typescript-eslint/no-explicit-any */

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

export enum TeamRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export enum TeamMembershipStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  REMOVED = 'REMOVED',
}

export interface BaseTimestamps {
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface SoftDeleteFields {
  deletedAt: string | null; // ISO date string or null
}

export interface UserProfile {
  fullName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  timezone?: string | null;
  locale?: string | null;
}

export interface UserPreferences {
  emailNotificationsEnabled: boolean;
  theme?: 'light' | 'dark' | 'system';
  // Extend with additional preference fields as needed
  [key: string]: any;
}

export interface User extends BaseTimestamps, SoftDeleteFields {
  id: string;
  email: string;
  emailVerified: boolean;
  status: UserStatus;
  role: UserRole;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  lastLoginAt: string | null; // ISO date string or null
}

export interface Team extends BaseTimestamps, SoftDeleteFields {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  isPersonal: boolean;
}

export interface TeamMembership extends BaseTimestamps {
  id: string;
  userId: string;
  teamId: string;
  role: TeamRole;
  status: TeamMembershipStatus;
  invitedByUserId: string | null;
  acceptedAt: string | null; // ISO date string or null
}

export interface UserWithTeams extends User {
  memberships: TeamMembershipWithTeam[];
}

export interface TeamWithMembers extends Team {
  memberships: TeamMembershipWithUser[];
}

export interface TeamMembershipWithUser extends TeamMembership {
  user: User;
}

export interface TeamMembershipWithTeam extends TeamMembership {
  team: Team;
}

export interface PublicUserProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface AuthenticatedUserContext {
  user: User;
  teams: TeamMembershipWithTeam[];
  activeTeamId: string | null;
}

export type UserId = string;
export type TeamId = string;
export type TeamMembershipId = string;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type UserListResult = PaginatedResult<User>;
export type TeamListResult = PaginatedResult<Team>;
export type TeamMembershipListResult = PaginatedResult<TeamMembership>;

export interface CreateUserInput {
  email: string;
  role?: UserRole;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateUserInput {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  profile?: Partial<UserProfile> | null;
  preferences?: Partial<UserPreferences> | null;
}

export interface CreateTeamInput {
  name: string;
  slug?: string;
  description?: string | null;
  isPersonal?: boolean;
}

export interface UpdateTeamInput {
  name?: string;
  slug?: string;
  description?: string | null;
}

export interface AddTeamMemberInput {
  teamId: string;
  userId: string;
  role?: TeamRole;
}

export interface UpdateTeamMemberInput {
  role?: TeamRole;
  status?: TeamMembershipStatus;
}

export interface ApiUserResponse extends User {}

export interface ApiTeamResponse extends Team {}

export interface ApiTeamMembershipResponse extends TeamMembership {}

export interface ApiUserWithTeamsResponse extends UserWithTeams {}

export interface ApiTeamWithMembersResponse extends TeamWithMembers {}