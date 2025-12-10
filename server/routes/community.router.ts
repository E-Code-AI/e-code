import { Router, Request, Response } from 'express';

const router = Router();

const defaultCategories = [
  { id: 'showcase', name: 'Showcase', icon: 'Star', postCount: 156 },
  { id: 'help', name: 'Help & Questions', icon: 'MessageSquare', postCount: 423 },
  { id: 'tutorials', name: 'Tutorials', icon: 'Code', postCount: 89 },
  { id: 'challenges', name: 'Challenges', icon: 'Trophy', postCount: 34 },
  { id: 'jobs', name: 'Jobs & Hiring', icon: 'Users', postCount: 67 },
];

const mockPosts = [
  {
    id: '1',
    title: 'Building a Real-time AI Chat Application with E-Code',
    content: 'Learn how to create a production-ready AI chat app using our platform. This tutorial covers WebSocket integration, streaming responses, and best practices.',
    author: {
      id: '101',
      username: 'devmaster',
      displayName: 'Dev Master',
      avatarUrl: undefined,
      reputation: 4520,
    },
    category: 'tutorials',
    tags: ['ai', 'websocket', 'tutorial'],
    likes: 234,
    comments: 45,
    views: 1892,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2025-01-08T10:30:00Z',
    projectUrl: '/ide/123',
    imageUrl: undefined,
  },
  {
    id: '2',
    title: 'Showcase: Full-Stack E-Commerce Platform',
    content: 'Check out my latest project - a complete e-commerce solution with Stripe integration, real-time inventory, and admin dashboard.',
    author: {
      id: '102',
      username: 'codequeen',
      displayName: 'Code Queen',
      avatarUrl: undefined,
      reputation: 3890,
    },
    category: 'showcase',
    tags: ['ecommerce', 'stripe', 'fullstack'],
    likes: 456,
    comments: 78,
    views: 3421,
    isLiked: true,
    isBookmarked: false,
    createdAt: '2025-01-07T15:45:00Z',
    projectUrl: '/ide/456',
    imageUrl: undefined,
  },
  {
    id: '3',
    title: 'How to optimize your Node.js API for production?',
    content: 'Looking for best practices on caching, rate limiting, and database connection pooling. Any recommendations from the community?',
    author: {
      id: '103',
      username: 'startupdev',
      displayName: 'Startup Dev',
      avatarUrl: undefined,
      reputation: 1250,
    },
    category: 'help',
    tags: ['nodejs', 'optimization', 'production'],
    likes: 89,
    comments: 34,
    views: 567,
    isLiked: false,
    isBookmarked: true,
    createdAt: '2025-01-06T09:20:00Z',
    projectUrl: undefined,
    imageUrl: undefined,
  },
  {
    id: '4',
    title: 'Weekly Challenge: Build a CLI Tool in Under 100 Lines',
    content: 'This week challenge: Create a useful CLI tool using Node.js or Python in under 100 lines of code. Winner gets 1000 Cycles!',
    author: {
      id: '100',
      username: 'ecode_team',
      displayName: 'E-Code Team',
      avatarUrl: undefined,
      reputation: 99999,
    },
    category: 'challenges',
    tags: ['challenge', 'cli', 'weekly'],
    likes: 178,
    comments: 92,
    views: 2103,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2025-01-05T12:00:00Z',
    projectUrl: undefined,
    imageUrl: undefined,
  },
  {
    id: '5',
    title: 'Hiring: Senior Full-Stack Developer - Remote',
    content: 'We are looking for a senior developer to join our remote team. Experience with React, Node.js, and PostgreSQL required. Competitive salary and equity.',
    author: {
      id: '104',
      username: 'techstartup',
      displayName: 'Tech Startup',
      avatarUrl: undefined,
      reputation: 2340,
    },
    category: 'jobs',
    tags: ['hiring', 'remote', 'senior'],
    likes: 45,
    comments: 12,
    views: 890,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2025-01-04T14:30:00Z',
    projectUrl: undefined,
    imageUrl: undefined,
  },
];

const mockChallenges = [
  {
    id: '1',
    title: 'AI-Powered Code Review Bot',
    description: 'Build an AI assistant that reviews code and provides actionable suggestions',
    difficulty: 'hard',
    category: 'ai',
    participants: 234,
    submissions: 89,
    prize: '$5,000',
    deadline: '2025-02-15',
    status: 'active',
  },
  {
    id: '2',
    title: 'Real-time Collaboration Widget',
    description: 'Create a drop-in widget for real-time document collaboration',
    difficulty: 'medium',
    category: 'frontend',
    participants: 156,
    submissions: 45,
    prize: '$2,500',
    deadline: '2025-01-30',
    status: 'active',
  },
  {
    id: '3',
    title: 'CLI Productivity Tool',
    description: 'Build a command-line tool that improves developer productivity',
    difficulty: 'easy',
    category: 'tools',
    participants: 312,
    submissions: 178,
    prize: '$1,000',
    deadline: '2025-01-20',
    status: 'active',
  },
];

const mockLeaderboard = [
  { id: '1', username: 'devmaster', displayName: 'Dev Master', score: 45200, rank: 1, badges: ['top-contributor', 'mentor'], streakDays: 120 },
  { id: '2', username: 'codequeen', displayName: 'Code Queen', score: 38900, rank: 2, badges: ['challenge-winner', 'helpful'], streakDays: 85 },
  { id: '3', username: 'aibuilder', displayName: 'AI Builder', score: 32100, rank: 3, badges: ['top-contributor'], streakDays: 67 },
  { id: '4', username: 'fullstackpro', displayName: 'Full Stack Pro', score: 28700, rank: 4, badges: ['mentor', 'helpful'], streakDays: 45 },
  { id: '5', username: 'opensourcefan', displayName: 'Open Source Fan', score: 24500, rank: 5, badges: ['helpful'], streakDays: 34 },
];

router.get('/categories', (_req: Request, res: Response) => {
  res.json(defaultCategories);
});

router.get('/posts', (req: Request, res: Response) => {
  const { category, search, page = '1', pageSize = '20' } = req.query;
  
  let filteredPosts = [...mockPosts];
  
  if (category && category !== 'all') {
    filteredPosts = filteredPosts.filter(p => p.category === category);
  }
  
  if (search) {
    const searchLower = String(search).toLowerCase();
    filteredPosts = filteredPosts.filter(p => 
      p.title.toLowerCase().includes(searchLower) || 
      p.content.toLowerCase().includes(searchLower) ||
      p.tags.some(t => t.toLowerCase().includes(searchLower))
    );
  }
  
  const pageNum = parseInt(String(page), 10);
  const pageSizeNum = parseInt(String(pageSize), 10);
  const startIndex = (pageNum - 1) * pageSizeNum;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + pageSizeNum);
  
  res.json({
    posts: paginatedPosts,
    pagination: {
      page: pageNum,
      pageSize: pageSizeNum,
      total: filteredPosts.length,
      totalPages: Math.ceil(filteredPosts.length / pageSizeNum),
      hasMore: startIndex + pageSizeNum < filteredPosts.length,
    },
  });
});

router.get('/challenges', (_req: Request, res: Response) => {
  res.json(mockChallenges);
});

router.get('/leaderboard', (_req: Request, res: Response) => {
  res.json(mockLeaderboard);
});

router.post('/posts/:postId/like', (req: Request, res: Response) => {
  const { postId } = req.params;
  res.json({ success: true, postId, liked: true });
});

router.post('/posts/:postId/bookmark', (req: Request, res: Response) => {
  const { postId } = req.params;
  res.json({ success: true, postId, bookmarked: true });
});

export default router;
