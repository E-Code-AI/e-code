/**
 * Passport authentication setup
 * Initializes passport with local strategy and session support
 */

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Application } from "express";
import session from "express-session";
import { getStorage, sessionStore } from "../storage";
import { User } from "@shared/schema";
import bcrypt from "bcrypt";

export function setupPassportAuth(app: Application) {
  const storage = getStorage();
  
  // Session configuration
  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    },
    name: 'ecode.sid'
  }));
  
  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Setup local strategy for username/password authentication (using email as username field)
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        console.log(`Authentication attempt for email: ${email}`);
        const user = await storage.getUserByEmail(email);
        if (!user) {
          console.log(`User not found: ${email}`);
          return done(null, false, { message: "Incorrect email or password" });
        }
        
        // Handle null password
        if (!user.passwordHash) {
          console.log(`User has no password set: ${email}`);
          return done(null, false, { message: "Password not set" });
        }
        
        // Use bcrypt for password comparison
        const isValid = await bcrypt.compare(password, user.passwordHash);
        
        if (!isValid) {
          console.log(`Invalid password for email: ${email}`);
          return done(null, false, { message: "Incorrect email or password" });
        }
        
        console.log(`Authentication successful for email: ${email}`);
        return done(null, user);
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      }
    })
  );
  
  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
  
  console.log('[Passport] Authentication middleware initialized');
}