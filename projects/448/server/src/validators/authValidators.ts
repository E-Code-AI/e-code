import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password must be at most 128 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

export const emailSchema = z
  .string()
  .min(5, "Email is too short")
  .max(254, "Email is too long")
  .email("Invalid email address")
  .transform((val) => val.toLowerCase().trim());

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters long")
  .max(32, "Username must be at most 32 characters long")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username may only contain letters, numbers, and underscores"
  );

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be at most 100 characters long")
  .transform((val) => val.trim());

export const optionalNameSchema = nameSchema.optional();

export const registrationSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    username: usernameSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  });

export const updateProfileSchema = z.object({
  email: emailSchema.optional(),
  username: usernameSchema.optional(),
  firstName: optionalNameSchema,
  lastName: optionalNameSchema,
  bio: z
    .string()
    .max(500, "Bio must be at most 500 characters long")
    .optional(),
  avatarUrl: z
    .string()
    .url("Invalid avatar URL")
    .max(2048, "Avatar URL is too long")
    .optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const resendVerificationEmailSchema = z.object({
  email: emailSchema,
});

export const twoFactorSetupSchema = z.object({
  method: z.enum(["authenticator", "sms"]),
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number in E.164 format")
    .optional(),
});

export const twoFactorVerifySchema = z.object({
  code: z
    .string()
    .min(6, "Code must be 6 digits")
    .max(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must contain only digits"),
});

export const twoFactorDisableSchema = z.object({
  code: z
    .string()
    .min(6, "Code must be 6 digits")
    .max(6, "Code must be 6 digits")
    .regex(/^\d{6}$/, "Code must contain only digits"),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationEmailInput = z.infer<
  typeof resendVerificationEmailSchema
>;
export type TwoFactorSetupInput = z.infer<typeof twoFactorSetupSchema>;
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;
export type TwoFactorDisableInput = z.infer<typeof twoFactorDisableSchema>;