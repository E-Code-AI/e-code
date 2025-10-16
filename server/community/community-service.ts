// @ts-nocheck
import { Request, Response } from 'express';
import { createLogger } from '../utils/logger';
import { storage } from '../storage';

const logger = createLogger('community-service');

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  authorId: number;
  authorUsername: string;
  category: string;
  tags: string[];
  likes: number;
  replies: number;
  views: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  projectId?: number;
  codeSnippet?: string;
}

interface CommunityReply {
  id: string;
  postId: string;
  content: string;
  authorId: number;
  authorUsername: string;
  likes: number;
  isAccepted: boolean;
  parentReplyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserProfile {
  userId: number;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  website: string;
  githubUsername: string;
  twitterUsername: string;
  profileImage: string;
  badges: string[];
  reputation: number;
  totalPosts: number;
  totalReplies: number;
  totalLikes: number;
  joinedAt: Date;
  isVerified: boolean;
  isExpert: boolean;
  specialties: string[];
}

interface CodeShowcase {
  id: string;
  title: string;
  description: string;
  authorId: number;
  authorUsername: string;
  projectId: number;
  language: string;
  tags: string[];
  likes: number;
  views: number;
  forks: number;
  featured: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
  updatedAt: Date;
  thumbnailUrl?: string;
}

export class CommunityService {
  private posts: Map<string, CommunityPost> = new Map();
  private replies: Map<string, CommunityReply> = new Map();
  private userProfiles: Map<number, UserProfile> = new Map();
  private showcases: Map<string, CodeShowcase> = new Map();
  private userLikes: Map<string, Set<number>> = new Map(); // postId/replyId -> Set of userIds
  private userFollows: Map<number, Set<number>> = new Map(); // userId -> Set of followedUserIds

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Create sample community posts
    const samplePosts: Partial<CommunityPost>[] = [
      {
        id: 'post-1',
        title: 'How to optimize React performance?',
        content: 'I\'m working on a large React application and noticing some performance issues. What are the best practices for optimization?',
        authorId: 1,
        authorUsername: 'reactdev',
        category: 'help',
        tags: ['react', 'performance', 'optimization'],
        likes: 15,
        replies: 8,
        views: 234,
        isPinned: false,
        isLocked: false
      },
      {
        id: 'post-2',
        title: 'Building a REST API with Python Flask',
        content: 'Here\'s a comprehensive guide on building a REST API using Python Flask with authentication and database integration.',
        authorId: 2,
        authorUsername: 'pythonista',
        category: 'tutorial',
        tags: ['python', 'flask', 'api', 'backend'],
        likes: 42,
        replies: 12,
        views: 567,
        isPinned: true,
        isLocked: false,
        codeSnippet: `from flask import Flask, jsonify, request
app = Flask(__name__)

@app.route('/api/users', methods=['GET'])
def get_users():
    return jsonify({'users': []})

if __name__ == '__main__':
    app.run(debug=True)`
      },
      {
        id: 'post-3',
        title: 'Machine Learning with JavaScript',
        content: 'Exploring TensorFlow.js for machine learning in the browser. Share your experiences!',
        authorId: 3,
        authorUsername: 'mlexpert',
        category: 'discussion',
        tags: ['javascript', 'ml', 'tensorflow', 'ai'],
        likes: 28,
        replies: 6,
        views: 345,
        isPinned: false,
        isLocked: false
      }
    ];

    samplePosts.forEach(post => {
      const communityPost: CommunityPost = {
        ...post,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      } as CommunityPost;
      
      this.posts.set(communityPost.id, communityPost);
    });

    // Create sample user profiles
    const sampleProfiles: Partial<UserProfile>[] = [
      {
        userId: 1,
        username: 'reactdev',
        displayName: 'React Developer',
        bio: 'Full-stack developer specializing in React and Node.js',
        location: 'San Francisco, CA',
        website: 'https://reactdev.com',
        githubUsername: 'reactdev',
        badges: ['Early Adopter', 'Top Contributor'],
        reputation: 1250,
        specialties: ['React', 'JavaScript', 'TypeScript']
      },
      {
        userId: 2,
        username: 'pythonista',
        displayName: 'Python Expert',
        bio: 'Backend engineer with 8+ years of Python experience',
        location: 'New York, NY',
        githubUsername: 'pythonista',
        badges: ['Expert', 'Mentor', 'Tutorial Writer'],
        reputation: 2340,
        specialties: ['Python', 'Django', 'Flask', 'Machine Learning']
      }
    ];

    sampleProfiles.forEach(profile => {
      const userProfile: UserProfile = {
        ...profile,
        profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`,
        totalPosts: Math.floor(Math.random() * 50) + 5,
        totalReplies: Math.floor(Math.random() * 200) + 20,
        totalLikes: Math.floor(Math.random() * 500) + 50,
        joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        isVerified: true,
        isExpert: profile.reputation! > 1000
      } as UserProfile;
      
      this.userProfiles.set(userProfile.userId, userProfile);
    });

    // Create sample code showcases
    const sampleShowcases: Partial<CodeShowcase>[] = [
      {
        id: 'showcase-1',
        title: 'Interactive Data Visualization',
        description: 'Beautiful charts and graphs using D3.js and React',
        authorId: 1,
        authorUsername: 'reactdev',
        projectId: 1,
        language: 'javascript',
        tags: ['d3js', 'react', 'visualization', 'charts'],
        likes: 89,
        views: 1234,
        forks: 23,
        featured: true,
        difficulty: 'intermediate'
      },
      {
        id: 'showcase-2',
        title: 'AI-Powered Chat Bot',
        description: 'Intelligent chatbot using OpenAI API and Python',
        authorId: 2,
        authorUsername: 'pythonista',
        projectId: 2,
        language: 'python',
        tags: ['ai', 'chatbot', 'openai', 'nlp'],
        likes: 156,
        views: 2456,
        forks: 45,
        featured: true,
        difficulty: 'advanced'
      }
    ];

    sampleShowcases.forEach(showcase => {
      const codeShowcase: CodeShowcase = {
        ...showcase,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        thumbnailUrl: `https://picsum.photos/400/300?random=${showcase.id}`
      } as CodeShowcase;
      
      this.showcases.set(codeShowcase.id, codeShowcase);
    });
  }

  // Community Posts
  async getCommunityPosts(req: Request, res: Response) {
    try {
      const { 
        category, 
        tag, 
        sort = 'recent', 
        page = 1, 
        limit = 20,
        search 
      } = req.query;

      let posts = Array.from(this.posts.values());

      // Apply filters
      if (category && category !== 'all') {
        posts = posts.filter(p => p.category === category);
      }

      if (tag) {
        posts = posts.filter(p => p.tags.includes(tag as string));
      }

      if (search) {
        const searchTerm = (search as string).toLowerCase();
        posts = posts.filter(p => 
          p.title.toLowerCase().includes(searchTerm) ||
          p.content.toLowerCase().includes(searchTerm) ||
          p.tags.some(t => t.toLowerCase().includes(searchTerm))
        );
      }

      // Sort posts
      switch (sort) {
        case 'popular':
          posts.sort((a, b) => b.likes - a.likes);
          break;
        case 'discussed':
          posts.sort((a, b) => b.replies - a.replies);
          break;
        case 'recent':
        default:
          posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          break;
      }

      // Apply pagination
      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
      const paginatedPosts = posts.slice(startIndex, startIndex + parseInt(limit as string));

      // Move pinned posts to top
      const pinnedPosts = paginatedPosts.filter(p => p.isPinned);
      const regularPosts = paginatedPosts.filter(p => !p.isPinned);
      const finalPosts = [...pinnedPosts, ...regularPosts];

      res.json({
        posts: finalPosts,
        totalCount: posts.length,
        page: parseInt(page as string),
        totalPages: Math.ceil(posts.length / parseInt(limit as string)),
        categories: ['help', 'tutorial', 'discussion', 'showcase', 'feedback']
      });
    } catch (error) {
      logger.error('Error fetching community posts:', error);
      res.status(500).json({ error: 'Failed to fetch community posts' });
    }
  }

  async createCommunityPost(req: Request, res: Response) {
    try {
      const { title, content, category, tags, projectId, codeSnippet } = req.body;
      const userId = (req as any).user?.id;
      const username = (req as any).user?.username;

      if (!title || !content || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const post: CommunityPost = {
        id: postId,
        title,
        content,
        authorId: userId,
        authorUsername: username,
        category,
        tags: tags || [],
        likes: 0,
        replies: 0,
        views: 0,
        isPinned: false,
        isLocked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId,
        codeSnippet
      };

      this.posts.set(postId, post);

      // Update user profile stats
      const userProfile = this.userProfiles.get(userId);
      if (userProfile) {
        userProfile.totalPosts += 1;
        userProfile.reputation += 5; // Award points for posting
      }

      logger.info(`Community post created: ${title} by ${username}`);

      res.status(201).json({
        success: true,
        post: {
          id: post.id,
          title: post.title,
          category: post.category,
          tags: post.tags,
          createdAt: post.createdAt
        }
      });
    } catch (error) {
      logger.error('Error creating community post:', error);
      res.status(500).json({ error: 'Failed to create post' });
    }
  }

  async getCommunityPost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const post = this.posts.get(id);

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Increment view count
      post.views += 1;

      // Get replies for this post
      const postReplies = Array.from(this.replies.values())
        .filter(r => r.postId === id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      res.json({
        post,
        replies: postReplies,
        author: this.userProfiles.get(post.authorId)
      });
    } catch (error) {
      logger.error('Error fetching community post:', error);
      res.status(500).json({ error: 'Failed to fetch post' });
    }
  }

  async likeCommunityPost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const post = this.posts.get(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      let userLikes = this.userLikes.get(id);
      if (!userLikes) {
        userLikes = new Set();
        this.userLikes.set(id, userLikes);
      }

      if (userLikes.has(userId)) {
        // Unlike
        userLikes.delete(userId);
        post.likes = Math.max(0, post.likes - 1);
      } else {
        // Like
        userLikes.add(userId);
        post.likes += 1;

        // Award reputation to post author
        const authorProfile = this.userProfiles.get(post.authorId);
        if (authorProfile) {
          authorProfile.reputation += 2;
          authorProfile.totalLikes += 1;
        }
      }

      res.json({
        success: true,
        liked: userLikes.has(userId),
        totalLikes: post.likes
      });
    } catch (error) {
      logger.error('Error liking community post:', error);
      res.status(500).json({ error: 'Failed to like post' });
    }
  }

  // Community Replies
  async createCommunityReply(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const { content, parentReplyId } = req.body;
      const userId = (req as any).user?.id;
      const username = (req as any).user?.username;

      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const post = this.posts.get(postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const replyId = `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const reply: CommunityReply = {
        id: replyId,
        postId,
        content,
        authorId: userId,
        authorUsername: username,
        likes: 0,
        isAccepted: false,
        parentReplyId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.replies.set(replyId, reply);

      // Update post reply count
      post.replies += 1;

      // Update user profile stats
      const userProfile = this.userProfiles.get(userId);
      if (userProfile) {
        userProfile.totalReplies += 1;
        userProfile.reputation += 3; // Award points for replying
      }

      logger.info(`Reply created for post ${postId} by ${username}`);

      res.status(201).json({
        success: true,
        reply: {
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt
        }
      });
    } catch (error) {
      logger.error('Error creating reply:', error);
      res.status(500).json({ error: 'Failed to create reply' });
    }
  }

  // User Profiles
  async getUserProfile(req: Request, res: Response) {
    try {
      const { username } = req.params;
      
      // Find user by username
      const userProfile = Array.from(this.userProfiles.values())
        .find(p => p.username === username);

      if (!userProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's recent posts
      const userPosts = Array.from(this.posts.values())
        .filter(p => p.authorId === userProfile.userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10);

      // Get user's showcases
      const userShowcases = Array.from(this.showcases.values())
        .filter(s => s.authorId === userProfile.userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 6);

      res.json({
        profile: userProfile,
        recentPosts: userPosts,
        showcases: userShowcases,
        stats: {
          totalPosts: userProfile.totalPosts,
          totalReplies: userProfile.totalReplies,
          totalLikes: userProfile.totalLikes,
          reputation: userProfile.reputation
        }
      });
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  async updateUserProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const updates = req.body;

      let userProfile = this.userProfiles.get(userId);
      if (!userProfile) {
        // Create new profile
        userProfile = {
          userId,
          username: (req as any).user?.username,
          displayName: updates.displayName || (req as any).user?.username,
          bio: '',
          location: '',
          website: '',
          githubUsername: '',
          twitterUsername: '',
          profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${(req as any).user?.username}`,
          badges: [],
          reputation: 0,
          totalPosts: 0,
          totalReplies: 0,
          totalLikes: 0,
          joinedAt: new Date(),
          isVerified: false,
          isExpert: false,
          specialties: []
        };
      }

      // Update profile
      Object.assign(userProfile, updates);
      this.userProfiles.set(userId, userProfile);

      logger.info(`User profile updated for ${userProfile.username}`);

      res.json({
        success: true,
        profile: userProfile
      });
    } catch (error) {
      logger.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  // Code Showcases
  async getCodeShowcases(req: Request, res: Response) {
    try {
      const { 
        language, 
        tag, 
        difficulty, 
        sort = 'recent', 
        page = 1, 
        limit = 12 
      } = req.query;

      let showcases = Array.from(this.showcases.values());

      // Apply filters
      if (language && language !== 'all') {
        showcases = showcases.filter(s => s.language === language);
      }

      if (tag) {
        showcases = showcases.filter(s => s.tags.includes(tag as string));
      }

      if (difficulty && difficulty !== 'all') {
        showcases = showcases.filter(s => s.difficulty === difficulty);
      }

      // Sort showcases
      switch (sort) {
        case 'popular':
          showcases.sort((a, b) => b.likes - a.likes);
          break;
        case 'mostForked':
          showcases.sort((a, b) => b.forks - a.forks);
          break;
        case 'recent':
        default:
          showcases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          break;
      }

      // Apply pagination
      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
      const paginatedShowcases = showcases.slice(startIndex, startIndex + parseInt(limit as string));

      // Move featured showcases to top
      const featuredShowcases = paginatedShowcases.filter(s => s.featured);
      const regularShowcases = paginatedShowcases.filter(s => !s.featured);
      const finalShowcases = [...featuredShowcases, ...regularShowcases];

      res.json({
        showcases: finalShowcases,
        totalCount: showcases.length,
        page: parseInt(page as string),
        totalPages: Math.ceil(showcases.length / parseInt(limit as string)),
        languages: ['javascript', 'python', 'java', 'cpp', 'html', 'css'],
        difficulties: ['beginner', 'intermediate', 'advanced']
      });
    } catch (error) {
      logger.error('Error fetching code showcases:', error);
      res.status(500).json({ error: 'Failed to fetch showcases' });
    }
  }

  async createCodeShowcase(req: Request, res: Response) {
    try {
      const { title, description, projectId, language, tags, difficulty } = req.body;
      const userId = (req as any).user?.id;
      const username = (req as any).user?.username;

      if (!title || !description || !projectId || !language) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify user owns the project
      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const showcaseId = `showcase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const showcase: CodeShowcase = {
        id: showcaseId,
        title,
        description,
        authorId: userId,
        authorUsername: username,
        projectId,
        language,
        tags: tags || [],
        likes: 0,
        views: 0,
        forks: 0,
        featured: false,
        difficulty: difficulty || 'intermediate',
        createdAt: new Date(),
        updatedAt: new Date(),
        thumbnailUrl: `https://picsum.photos/400/300?random=${showcaseId}`
      };

      this.showcases.set(showcaseId, showcase);

      // Update user profile stats
      const userProfile = this.userProfiles.get(userId);
      if (userProfile) {
        userProfile.reputation += 10; // Award points for creating showcase
      }

      logger.info(`Code showcase created: ${title} by ${username}`);

      res.status(201).json({
        success: true,
        showcase: {
          id: showcase.id,
          title: showcase.title,
          language: showcase.language,
          createdAt: showcase.createdAt
        }
      });
    } catch (error) {
      logger.error('Error creating code showcase:', error);
      res.status(500).json({ error: 'Failed to create showcase' });
    }
  }

  // Community Stats
  async getCommunityStats(req: Request, res: Response) {
    try {
      const totalPosts = this.posts.size;
      const totalReplies = this.replies.size;
      const totalUsers = this.userProfiles.size;
      const totalShowcases = this.showcases.size;

      const topCategories = Array.from(this.posts.values())
        .reduce((acc, post) => {
          acc[post.category] = (acc[post.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const topTags = Array.from(this.posts.values())
        .flatMap(post => post.tags)
        .reduce((acc, tag) => {
          acc[tag] = (acc[tag] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const activeUsers = Array.from(this.userProfiles.values())
        .sort((a, b) => b.reputation - a.reputation)
        .slice(0, 10);

      res.json({
        stats: {
          totalPosts,
          totalReplies,
          totalUsers,
          totalShowcases,
          totalInteractions: totalPosts + totalReplies
        },
        topCategories: Object.entries(topCategories)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5),
        topTags: Object.entries(topTags)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        activeUsers: activeUsers.map(user => ({
          username: user.username,
          displayName: user.displayName,
          reputation: user.reputation,
          badges: user.badges
        }))
      });
    } catch (error) {
      logger.error('Error fetching community stats:', error);
      res.status(500).json({ error: 'Failed to fetch community stats' });
    }
  }

  // Follow/Unfollow users
  async followUser(req: Request, res: Response) {
    try {
      const { targetUserId } = req.params;
      const userId = (req as any).user?.id;
      const targetId = parseInt(targetUserId);

      if (userId === targetId) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
      }

      let userFollows = this.userFollows.get(userId);
      if (!userFollows) {
        userFollows = new Set();
        this.userFollows.set(userId, userFollows);
      }

      if (userFollows.has(targetId)) {
        // Unfollow
        userFollows.delete(targetId);
      } else {
        // Follow
        userFollows.add(targetId);
      }

      res.json({
        success: true,
        following: userFollows.has(targetId),
        totalFollowing: userFollows.size
      });
    } catch (error) {
      logger.error('Error following user:', error);
      res.status(500).json({ error: 'Failed to follow user' });
    }
  }
}

export const communityService = new CommunityService();