import bcrypt from "bcrypt";
import { storage } from "./storage";

// Password hashing function - uses bcrypt to match auth.router.ts
async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

// Seed database with test user
export async function seedDatabase() {
  try {
    // Check if test user already exists
    const existingUser = await storage.getUserByUsername("testuser");
    if (existingUser) {
      return;
    }

    // Create test user with deterministic password for E2E testing
    const testPassword = process.env.TEST_USER_PASSWORD || "testpass123";
    const hashedPassword = await hashPassword(testPassword);
    const testUser = await storage.createUser({
      username: "testuser",
      passwordHash: hashedPassword,
      email: "testuser@test.com",
      displayName: "Test User",
    });

    // Update user to mark as email verified for testing
    await storage.updateUser(testUser.id, {
      emailVerified: true
    });

    // Also update admin user if exists to have email verified for development
    const adminUser = await storage.getUserByUsername("admin");
    if (adminUser && !adminUser.emailVerified) {
      await storage.updateUser(adminUser.id, {
        emailVerified: true
      });
    }
    
    return testUser;
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}