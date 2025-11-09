import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

// Password hashing function
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Seed database with test user
export async function seedDatabase() {
  try {
    // Check if test user already exists
    const existingUser = await storage.getUserByUsername("testuser");
    if (existingUser) {
      console.log("Test user already exists");
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

    console.log("✅ Test user created successfully for E2E testing:");
    console.log("   Username: testuser");
    console.log("   Email: testuser@test.com");
    console.log("   Password: testpass123");
    console.log("   Note: This is a test account for automated testing only");
    
    // Also update admin user if exists to have email verified for development
    const adminUser = await storage.getUserByUsername("admin");
    if (adminUser && !adminUser.emailVerified) {
      await storage.updateUser(adminUser.id, {
        emailVerified: true
      });
      console.log("✅ Admin user email verification status updated");
    }
    
    return testUser;
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}