import { Router, Request, Response } from 'express';
import { collaborativeEditingService } from '../services/collaborative-editing';
import { db } from '../db';
import { collaborationSessions, sessionParticipants } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { ensureAuthenticated as requireAuth } from '../middleware/auth';

const router = Router();

// Generate collaboration link
router.post('/generate-link', requireAuth, async (req: Request, res: Response) => {
  try {
    const { projectId, fileId } = req.body;
    
    if (!projectId || !fileId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const link = await collaborativeEditingService.generateCollaborationLink(projectId, fileId);
    
    res.json({ link });
  } catch (error) {
    console.error('Error generating collaboration link:', error);
    res.status(500).json({ error: 'Failed to generate collaboration link' });
  }
});

// Get active sessions for a project
router.get('/sessions/:projectId', requireAuth, async (req: Request, res: Response) => {
  try {
    const projectIdNum = parseInt(req.params.projectId, 10);
    
    if (isNaN(projectIdNum)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const sessions = await db
      .select()
      .from(collaborationSessions)
      .where(
        and(
          eq(collaborationSessions.projectId, projectIdNum),
          eq(collaborationSessions.active, true)
        )
      );
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get participants for a session
router.get('/sessions/:sessionId/participants', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const participants = await db
      .select()
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.sessionId, sessionId),
          eq(sessionParticipants.active, true)
        )
      );
    
    res.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// Join a session with token (for share links)
router.post('/join', requireAuth, async (req: Request, res: Response) => {
  try {
    const { token, sessionId } = req.body;
    const userId = req.user?.id;
    const username = req.user?.username || 'Anonymous';
    
    if (!sessionId || !userId) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    // Verify session exists and is active
    const [session] = await db
      .select()
      .from(collaborationSessions)
      .where(
        and(
          eq(collaborationSessions.id, sessionId),
          eq(collaborationSessions.active, true)
        )
      );
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found or inactive' });
    }
    
    // Add user to session participants if not already present
    const existingParticipant = await db
      .select()
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.sessionId, sessionId),
          eq(sessionParticipants.userId, userId)
        )
      );
    
    // Generate a random cursor color for the participant
    const cursorColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    const cursorColor = cursorColors[Math.floor(Math.random() * cursorColors.length)];
    
    if (existingParticipant.length === 0) {
      await db.insert(sessionParticipants).values({
        sessionId,
        userId,
        username,
        cursorColor,
        active: true,
        joinedAt: new Date()
      });
    }
    
    res.json({ 
      success: true, 
      session: {
        id: session.id,
        projectId: session.projectId
      }
    });
  } catch (error) {
    console.error('Error joining session:', error);
    res.status(500).json({ error: 'Failed to join session' });
  }
});

// Get session statistics
router.get('/stats/:projectId', requireAuth, async (req: Request, res: Response) => {
  try {
    const projectIdNum = parseInt(req.params.projectId, 10);
    
    if (isNaN(projectIdNum)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    
    const activeSessions = await db
      .select()
      .from(collaborationSessions)
      .where(
        and(
          eq(collaborationSessions.projectId, projectIdNum),
          eq(collaborationSessions.active, true)
        )
      );
    
    const totalParticipants = await db
      .select()
      .from(sessionParticipants)
      .innerJoin(
        collaborationSessions,
        eq(sessionParticipants.sessionId, collaborationSessions.id)
      )
      .where(
        and(
          eq(collaborationSessions.projectId, projectIdNum),
          eq(sessionParticipants.active, true)
        )
      );
    
    res.json({
      activeSessions: activeSessions.length,
      totalParticipants: totalParticipants.length,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Send invitation to collaborate
router.post('/invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const { projectId, email, role } = req.body;
    const inviterId = req.user?.id;
    const inviterName = req.user?.username || 'Someone';
    
    if (!projectId || !email) {
      return res.status(400).json({ error: 'Missing projectId or email' });
    }
    
    // Generate invitation token
    const inviteToken = require('nanoid').nanoid(32);
    const inviteLink = `${req.protocol}://${req.get('host')}/ide/${projectId}?invite=${inviteToken}`;
    
    // TODO: Send email invitation (integrate with SendGrid/email service)
    // For now, just return success with the link
    console.log(`[Collaboration] Invite sent from ${inviterName} to ${email} for project ${projectId}`);
    
    res.json({ 
      success: true, 
      message: `Invitation sent to ${email}`,
      inviteLink
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Get active collaborators for a project (for real-time presence)
router.get('/active', requireAuth, async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Missing projectId' });
    }
    
    // Return empty array for now - real data comes from WebSocket
    res.json([]);
  } catch (error) {
    console.error('Error fetching active collaborators:', error);
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

export default router;