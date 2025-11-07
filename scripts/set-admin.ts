/**
 * Script to set a user as admin
 * Usage: tsx scripts/set-admin.ts <username>
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function setUserAsAdmin(username: string) {
  try {
    // Find user by username
    const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (!user || user.length === 0) {
      console.error(`User with username "${username}" not found`);
      process.exit(1);
    }

    // Update user to be admin
    await db.update(users)
      .set({ isAdmin: true })
      .where(eq(users.username, username));

    console.log(`✅ User "${username}" has been set as admin`);
    console.log(`User ID: ${user[0].id}`);
    console.log(`Email: ${user[0].email}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting user as admin:', error);
    process.exit(1);
  }
}

// Get username from command line arguments
const username = process.argv[2];

if (!username) {
  console.error('Please provide a username as argument');
  console.error('Usage: tsx scripts/set-admin.ts <username>');
  process.exit(1);
}

setUserAsAdmin(username);