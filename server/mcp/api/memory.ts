import { Router } from 'express';
import { ensureAuthenticated } from '../../middleware/auth';
import { MemoryMCP } from '../servers/memory-mcp';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const memoryMCP = new MemoryMCP();

// Search memory
router.post('/search', ensureAuthenticated, async (req, res) => {
  try {
    const { query } = req.body;
    
    const result = await memoryMCP.execute({
      method: 'tools/call',
      params: {
        name: 'memory_search',
        arguments: {
          query,
          limit: 20
        }
      }
    });
    
    // Format results
    const nodes = (result.content || []).map((node: any) => ({
      id: node.id || uuidv4(),
      type: node.type || 'concept',
      content: node.content || node.text || '',
      metadata: node.metadata || {},
      connections: node.edges?.length || 0,
      createdAt: node.createdAt || new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    }));
    
    res.json(nodes);
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
    const result = await memoryMCP.execute({
      method: 'tools/call',
      params: {
        name: 'memory_get_history',
        arguments: {
          userId: req.user?.id || 0,
          limit: 50
        }
      }
    });
    
    // Format conversations
    const conversations = (result.content || []).map((conv: any) => ({
      id: conv.id || uuidv4(),
      title: conv.title || 'Untitled Conversation',
      messages: conv.messages?.length || 0,
      lastMessage: conv.messages?.[conv.messages.length - 1]?.content || '',
      createdAt: conv.createdAt || new Date().toISOString()
    }));
    
    res.json(conversations);
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
    const { type, content, metadata } = req.body;
    const nodeId = uuidv4();
    
    const result = await memoryMCP.execute({
      method: 'tools/call',
      params: {
        name: 'memory_create_node',
        arguments: {
          id: nodeId,
          type,
          content,
          metadata: {
            ...metadata,
            userId: req.user?.id,
            createdBy: req.user?.username
          }
        }
      }
    });
    
    res.json({
      id: nodeId,
      type,
      content,
      metadata,
      createdAt: new Date().toISOString()
    });
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
    const { fromId, toId, relationship } = req.body;
    
    const result = await memoryMCP.execute({
      method: 'tools/call',
      params: {
        name: 'memory_create_edge',
        arguments: {
          fromId,
          toId,
          relationship,
          metadata: {
            createdBy: req.user?.username,
            createdAt: new Date().toISOString()
          }
        }
      }
    });
    
    res.json({
      success: true,
      fromId,
      toId,
      relationship
    });
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
    const { title, messages } = req.body;
    const conversationId = uuidv4();
    
    const result = await memoryMCP.execute({
      method: 'tools/call',
      params: {
        name: 'memory_save_conversation',
        arguments: {
          conversationId,
          userId: req.user?.id || 0,
          title,
          messages
        }
      }
    });
    
    res.json({
      id: conversationId,
      title,
      messages: messages.length,
      createdAt: new Date().toISOString()
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