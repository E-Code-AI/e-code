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
import bcrypt from "../utils/bcrypt-compat";
import { sessionSecretRotation } from "../auth/session-rotation";

export function setupPassportAuth(app: Application) {
  const storage = getStorage();
  
  // Session configuration - Uses rotating secrets for enhanced security
  // The sessionSecretRotation class manages multiple secrets for graceful rotation
  // Express-session will use the first secret to sign new sessions and all secrets to verify
  const secrets = sessionSecretRotation.getSecrets();
  if (secrets.length === 0 || !secrets[0]) {
    throw new Error('[SECURITY] Session secrets not properly initialized');
  }
  
  // Start auto-rotation of session secrets (rotates every 24 hours by default)
  sessionSecretRotation.startAutoRotation();
  
  app.use(session({
    store: sessionStore,
    secret: secrets,
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
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: "Incorrect email or password" });
        }
        
        // Handle null password
        if (!user.password) {
          return done(null, false, { message: "Password not set" });
        }
        
        // Use bcrypt for password comparison
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
          return done(null, false, { message: "Incorrect email or password" });
        }
        
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
}