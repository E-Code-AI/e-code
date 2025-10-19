// @ts-nocheck
import { Router } from 'express';
import { ensureAuthenticated } from '../../middleware/auth';
import { memoryMCP } from '../servers/memory-mcp';

const router = Router();

// Search memory
router.post('/search', ensureAuthenticated, async (req, res) => {
  try {
    const { query, type, limit } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const results = await memoryMCP.searchNodes(query, type, Math.min(limit || 10, 50));
    res.json(results);
  } catch (error: any) {
    console.error('Memory MCP search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

// Get conversation history
router.get('/conversations', ensureAuthenticated, async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const conversations = await memoryMCP.getConversationHistory(userId, sessionId, Math.min(limit, 200));

    res.json(conversations.map(conv => ({
      id: conv.id,
      title: conv.metadata?.title || conv.sessionId,
      messages: conv.metadata?.messageCount || 0,
      lastMessage: conv.metadata?.lastMessage || conv.content?.slice(0, 120),
      createdAt: conv.timestamp,
      metadata: conv.metadata || {}
    })));
  } catch (error: any) {
    console.error('Memory MCP conversations error:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      message: error.message
    });
  }
});

// Create memory node
router.post('/nodes', ensureAuthenticated, async (req, res) => {
  try {
    const { type, content, metadata, embedding } = req.body;

    if (!type || !content) {
      return res.status(400).json({ error: 'Node type and content are required' });
    }

    const userId = req.user?.id;
    const username = req.user?.username || 'system';
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const node = await memoryMCP.createNode({
      type,
      content,
      metadata: {
        ...metadata,
        userId,
        createdBy: username,
      },
      embedding
    });

    res.status(201).json(node);
  } catch (error: any) {
    console.error('Memory MCP create node error:', error);
    res.status(500).json({
      error: 'Failed to create memory node',
      message: error.message
    });
  }
});

// Create edge between nodes
router.post('/edges', ensureAuthenticated, async (req, res) => {
  try {
    const { fromId, toId, relationship, weight, metadata } = req.body;

    if (!fromId || !toId || !relationship) {
      return res.status(400).json({ error: 'fromId, toId, and relationship are required' });
    }

    const username = req.user?.username || 'system';
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const edge = await memoryMCP.createEdge(fromId, toId, relationship, weight, {
      ...metadata,
      createdBy: username,
      createdAt: new Date().toISOString(),
      userId,
    });

    res.status(201).json(edge);
  } catch (error: any) {
    console.error('Memory MCP create edge error:', error);
    res.status(500).json({
      error: 'Failed to create connection',
      message: error.message
    });
  }
});

// Save conversation
router.post('/conversations', ensureAuthenticated, async (req, res) => {
  try {
    const { title, messages, sessionId } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'At least one message is required to persist a conversation' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const normalizedSessionId = sessionId || `session-${Date.now()}`;
    const savedMessages = [];

    for (const message of messages) {
      const saved = await memoryMCP.saveConversation(
        userId,
        normalizedSessionId,
        message.role,
        message.content,
        {
          ...message.metadata,
          title,
          messageCount: messages.length,
          lastMessage: message.content,
        }
      );
      savedMessages.push(saved);
    }

    res.status(201).json({
      id: normalizedSessionId,
      title,
      messages: savedMessages.length,
      userId,
      createdAt: savedMessages[0]?.timestamp,
    });
  } catch (error: any) {
    console.error('Memory MCP save conversation error:', error);
    res.status(500).json({
      error: 'Failed to save conversation',
      message: error.message
    });
  }
});

export default router;