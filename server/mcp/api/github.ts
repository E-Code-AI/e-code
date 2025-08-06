import { Router } from 'express';
import { ensureAuthenticated } from '../../middleware/auth';
import { GitHubMCP } from '../servers/github-mcp';

const router = Router();
const githubMCP = new GitHubMCP();

// Get user repositories
router.get('/repositories', ensureAuthenticated, async (req, res) => {
  try {
    const result = await githubMCP.execute({
      method: 'tools/call',
      params: {
        name: 'github_list_repos',
        arguments: {
          username: req.user?.username || 'octocat'
        }
      }
    });
    
    res.json(result.content || []);
  } catch (error: any) {
    console.error('GitHub MCP repositories error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch repositories',
      message: error.message 
    });
  }
});

// Create repository
router.post('/repositories', ensureAuthenticated, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    
    const result = await githubMCP.execute({
      method: 'tools/call',
      params: {
        name: 'github_create_repo',
        arguments: {
          name,
          description,
          private: isPrivate
        }
      }
    });
    
    res.json(result.content || { name });
  } catch (error: any) {
    console.error('GitHub MCP create repository error:', error);
    res.status(500).json({ 
      error: 'Failed to create repository',
      message: error.message 
    });
  }
});

// Create issue
router.post('/issues', ensureAuthenticated, async (req, res) => {
  try {
    const { repo, title, body, labels } = req.body;
    
    const result = await githubMCP.execute({
      method: 'tools/call',
      params: {
        name: 'github_create_issue',
        arguments: {
          repository: repo,
          title,
          body,
          labels
        }
      }
    });
    
    res.json(result.content || { number: Date.now(), title });
  } catch (error: any) {
    console.error('GitHub MCP create issue error:', error);
    res.status(500).json({ 
      error: 'Failed to create issue',
      message: error.message 
    });
  }
});

// Create pull request
router.post('/pull-requests', ensureAuthenticated, async (req, res) => {
  try {
    const { repo, title, body, head, base } = req.body;
    
    const result = await githubMCP.execute({
      method: 'tools/call',
      params: {
        name: 'github_create_pr',
        arguments: {
          repository: repo,
          title,
          body,
          head,
          base
        }
      }
    });
    
    res.json(result.content || { number: Date.now(), title });
  } catch (error: any) {
    console.error('GitHub MCP create PR error:', error);
    res.status(500).json({ 
      error: 'Failed to create pull request',
      message: error.message 
    });
  }
});

export default router;