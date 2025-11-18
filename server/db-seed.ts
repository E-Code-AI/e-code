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

    // Create admin user for E2E testing if it doesn't exist
    const existingAdmin = await storage.getUserByUsername("admin");
    if (!existingAdmin) {
      const adminPassword = process.env.ADMIN_USER_PASSWORD || "adminpass123";
      const adminHashedPassword = await hashPassword(adminPassword);
      const adminUser = await storage.createUser({
        username: "admin",
        passwordHash: adminHashedPassword,
        email: "admin@test.com",
        displayName: "Admin User",
      });
      
      // Update to mark as admin and email verified
      await storage.updateUser(adminUser.id, {
        isAdmin: true,
        emailVerified: true
      });
      
      console.log('✅ Admin user seeded (admin@test.com / adminpass123)');
    } else if (!existingAdmin.emailVerified) {
      // Update existing admin to have email verified for development
      await storage.updateUser(existingAdmin.id, {
        emailVerified: true,
        isAdmin: true // Ensure admin flag is set
      });
    }
    
    return testUser;
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}