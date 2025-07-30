import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { storage } from '../storage.js';
import { hashPassword, comparePasswords } from '../auth.js';
import { generateEmailVerificationToken, generatePasswordResetToken } from '../utils/auth-utils.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email-utils.js';
import { OAuth2Client } from 'google-auth-library';
import { Octokit } from '@octokit/rest';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(50)
});

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8).max(100)
});

const verifyEmailSchema = z.object({
  token: z.string()
});

// Initialize OAuth clients
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/google/callback`
) : null;

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    
    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      displayName,
      avatarUrl: null,
      bio: null
    });
    
    // Generate verification token
    const verificationToken = generateEmailVerificationToken();
    await storage.saveEmailVerificationToken(user.id, verificationToken);
    
    // Send verification email
    await sendVerificationEmail(email, verificationToken);
    
    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      userId: user.id
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Email Verification
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    
    const verification = await storage.getEmailVerificationByToken(token);
    if (!verification || verification.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    
    // Mark email as verified
    await storage.updateUser(verification.userId, { emailVerified: true });
    await storage.deleteEmailVerificationToken(token);
    
    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

// Request Password Reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If an account exists, a password reset link has been sent.' });
    }
    
    // Generate reset token
    const resetToken = generatePasswordResetToken();
    await storage.savePasswordResetToken(user.id, resetToken);
    
    // Send reset email
    await sendPasswordResetEmail(email, resetToken);
    
    res.json({ message: 'If an account exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    
    const reset = await storage.getPasswordResetByToken(token);
    if (!reset || reset.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Hash new password and update
    const hashedPassword = await hashPassword(newPassword);
    await storage.updateUser(reset.userId, { password: hashedPassword });
    await storage.deletePasswordResetToken(token);
    
    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Google OAuth
router.get('/google', (req, res) => {
  if (!googleClient) {
    return res.status(501).json({ error: 'Google OAuth not configured' });
  }
  
  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email']
  });
  
  res.redirect(authUrl);
});

router.get('/google/callback', async (req, res) => {
  try {
    if (!googleClient) {
      throw new Error('Google OAuth not configured');
    }
    
    const { code } = req.query;
    const { tokens } = await googleClient.getToken(code as string);
    googleClient.setCredentials(tokens);
    
    // Get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID!
    });
    
    const payload = ticket.getPayload()!;
    const googleId = payload.sub;
    const email = payload.email!;
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture;
    
    // Find or create user
    let user = await storage.getUserByEmail(email);
    if (!user) {
      user = await storage.createUser({
        username: `google_${googleId}`,
        email,
        password: randomBytes(32).toString('hex'), // Random password for OAuth users
        displayName: name,
        avatarUrl: picture || null,
        bio: null
      });
    }
    
    // Log the user in
    req.login(user, (err) => {
      if (err) {
        return res.redirect('/login?error=oauth_failed');
      }
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect('/login?error=oauth_failed');
  }
});

// GitHub OAuth
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(501).json({ error: 'GitHub OAuth not configured' });
  }
  
  const redirectUri = `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/github/callback`;
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
  
  res.redirect(authUrl);
});

router.get('/github/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth not configured');
    }
    
    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });
    
    const { access_token } = await tokenResponse.json();
    
    // Get user info
    const octokit = new Octokit({ auth: access_token });
    const { data: githubUser } = await octokit.users.getAuthenticated();
    const { data: emails } = await octokit.users.listEmailsForAuthenticatedUser();
    
    const primaryEmail = emails.find(e => e.primary)?.email || githubUser.email;
    if (!primaryEmail) {
      throw new Error('No email found in GitHub account');
    }
    
    // Find or create user
    let user = await storage.getUserByEmail(primaryEmail);
    if (!user) {
      user = await storage.createUser({
        username: githubUser.login,
        email: primaryEmail,
        password: randomBytes(32).toString('hex'), // Random password for OAuth users
        displayName: githubUser.name || githubUser.login,
        avatarUrl: githubUser.avatar_url,
        bio: githubUser.bio || null
      });
    }
    
    // Store GitHub token for the user
    const st = storage as any; // Temporarily cast to bypass TypeScript error
    await st.storeGitHubToken(user.id, {
      accessToken: access_token,
      githubId: githubUser.id,
      githubUsername: githubUser.login,
      githubEmail: primaryEmail,
      githubAvatarUrl: githubUser.avatar_url,
      connectedAt: new Date()
    });

    // Log the user in
    req.login(user, (err) => {
      if (err) {
        return res.redirect('/login?error=oauth_failed');
      }
      res.redirect('/github-import?connected=true');
    });
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect('/login?error=oauth_failed');
  }
});

export const authCompleteRouter = router;