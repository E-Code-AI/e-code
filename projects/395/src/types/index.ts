/* eslint-disable @typescript-eslint/no-explicit-any */

export type ID = string;

export type ISODateString = string;

export type Nullable<T> = T | null;

export type Maybe<T> = T | null | undefined;

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface JsonArray extends Array<JsonValue> {}

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export type TeamRole = 'owner' | 'admin' | 'member';

export type UserStatus = 'active' | 'invited' | 'suspended' | 'deleted';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';

export type BillingInterval = 'month' | 'year';

export type PlanTier = 'free' | 'pro' | 'business' | 'enterprise';

export interface BaseEntity {
  id: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface UserProfile {
  fullName: string;
  avatarUrl?: string | null;
  timeZone?: string | null;
  locale?: string | null;
}

export interface User extends BaseEntity {
  email: string;
  emailVerified: boolean;
  status: UserStatus;
  profile: UserProfile;
  defaultTeamId?: ID | null;
}

export interface TeamMember extends BaseEntity {
  userId: ID;
  teamId: ID;
  role: TeamRole;
  invitedByUserId?: ID | null;
  invitedAt?: ISODateString | null;
  joinedAt?: ISODateString | null;
}

export interface Team extends BaseEntity {
  name: string;
  slug: string;
  ownerId: ID;
  membersCount: number;
  currentUserRole?: TeamRole | null;
}

export interface PlanLimits {
  maxUsers?: number | null;
  maxTeams?: number | null;
  maxProjects?: number | null;
  maxStorageMb?: number | null;
  [key: string]: number | string | boolean | null | undefined;
}

export interface Plan extends BaseEntity {
  name: string;
  tier: PlanTier;
  interval: BillingInterval;
  priceCents: number;
  currency: string;
  isDefault: boolean;
  isPublic: boolean;
  limits: PlanLimits;
  description?: string | null;
}

export interface SubscriptionPeriod {
  startDate: ISODateString;
  endDate: ISODateString;
}

export interface Subscription extends BaseEntity {
  userId?: ID | null;
  teamId?: ID | null;
  planId: ID;
  status: SubscriptionStatus;
  currentPeriod: SubscriptionPeriod;
  cancelAtPeriodEnd: boolean;
  canceledAt?: ISODateString | null;
  trialEnd?: ISODateString | null;
  externalCustomerId?: string | null;
  externalSubscriptionId?: string | null;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ApiErrorDetail {
  field?: string;
  code?: string;
  message: string;
  meta?: Record<string, any>;
}

export interface ApiErrorPayload {
  message: string;
  code?: string;
  details?: ApiErrorDetail[];
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginatedMeta | Record<string, any>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
}

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, string | number | boolean | null | undefined>;
}

export interface WithTimestamps {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface WithOwner {
  ownerId: ID;
}

export interface AuditLogEntry extends BaseEntity {
  actorId: ID;
  teamId?: ID | null;
  action: string;
  targetType: string;
  targetId?: ID | null;
  metadata?: JsonObject;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U2>
    ? ReadonlyArray<DeepPartial<U2>>
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};