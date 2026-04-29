import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  // Drizzle's schema entry pointed only at shared/schema.ts, so tables
  // defined in shared/admin-schema.ts, shared/teams-schema.ts, and
  // shared/schema/imports.ts were silently absent from the generated
  // migrations. The other shared/schema/*.ts files (security, checkpoints,
  // comments, project-tracking) are dead code — none are imported by
  // server/ or client/, and shared/schema/security.ts redeclares
  // audit_logs/api_keys with conflicting types vs shared/schema.ts.
  schema: [
    "./shared/schema.ts",
    "./shared/admin-schema.ts",
    "./shared/teams-schema.ts",
    "./shared/schema/imports.ts",
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
