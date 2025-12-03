import { z } from "zod";

export const PaginationSchema = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .or(
      z
        .string()
        .regex(/^\d+$/)
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().min(1))
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .or(
      z
        .string()
        .regex(/^\d+$/)
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().min(1).max(100))
    ),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export const IdParamSchema = z.object({
  id: z
    .string()
    .min(1, "ID is required")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid ID format"),
});

export type IdParamInput = z.infer<typeof IdParamSchema>;

export const OptionalStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const EmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email address")
  .max(255, "Email is too long");

export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

export const UsernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters long")
  .max(32, "Username must be at most 32 characters long")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only contain letters, numbers, and underscores"
  );

export const UserRoleSchema = z.enum(["user", "admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const CreateUserSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long"),
  username: UsernameSchema,
  role: UserRoleSchema.optional().default("user"),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z
  .object({
    email: EmailSchema.optional(),
    name: OptionalStringSchema,
    username: UsernameSchema.optional(),
    role: UserRoleSchema.optional(),
  })
  .refine(
    (data) =>
      data.email !== undefined ||
      data.name !== undefined ||
      data.username !== undefined ||
      data.role !== undefined,
    {
      message: "At least one field must be provided for update",
      path: [],
    }
  );

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export const DateRangeSchema = z
  .object({
    from: z
      .string()
      .datetime()
      .or(z.date())
      .transform((val) => (val instanceof Date ? val : new Date(val))),
    to: z
      .string()
      .datetime()
      .or(z.date())
      .transform((val) => (val instanceof Date ? val : new Date(val))),
  })
  .refine((data) => data.to >= data.from, {
    message: "End date must be greater than or equal to start date",
    path: ["to"],
  });

export type DateRangeInput = z.infer<typeof DateRangeSchema>;

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(255),
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;

export const BooleanFromStringSchema = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === "boolean") return val;
    const normalized = val.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
    throw new Error("Invalid boolean value");
  });

export const OptionalBooleanFromStringSchema = BooleanFromStringSchema.optional();

export const BaseQuerySchema = PaginationSchema.extend({
  sortBy: z.string().trim().optional(),
  sortDirection: SortDirectionSchema.optional().default("asc"),
  search: z.string().trim().optional(),
});

export type BaseQueryInput = z.infer<typeof BaseQuerySchema>;

export const CreateItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title is too long"),
  description: z
    .string()
    .trim()
    .max(2000, "Description is too long")
    .optional(),
  isActive: OptionalBooleanFromStringSchema.default(true),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;

export const UpdateItemSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(255, "Title is too long")
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, "Description is too long")
      .optional(),
    isActive: OptionalBooleanFromStringSchema,
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.isActive !== undefined,
    {
      message: "At least one field must be provided for update",
      path: [],
    }
  );

export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;

export const BulkIdsSchema = z.object({
  ids: z
    .array(
      z
        .string()
        .min(1, "ID is required")
        .regex(/^[a-zA-Z0-9_-]+$/, "Invalid ID format")
    )
    .min(1, "At least one ID is required"),
});

export type BulkIdsInput = z.infer<typeof BulkIdsSchema>;

export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535))
    .optional(),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

export const validateEnv = (env: NodeJS.ProcessEnv): Environment => {
  const parsed = EnvironmentSchema.safeParse(env);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    throw new Error(
      `Invalid environment variables: undefined`
    );
  }
  return parsed.data;
};

export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  statusCode: z.number().int().optional(),
  details: z.unknown().optional(),
});

export type ApiErrorShape = z.infer<typeof ApiErrorSchema>;

export const parseQuery = <T extends z.ZodTypeAny>(
  schema: T,
  query: unknown
): z.infer<T> => {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
};

export const parseBody = <T extends z.ZodTypeAny>(
  schema: T,
  body: unknown
): z.infer<T> => {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
};

export const parseParams = <T extends