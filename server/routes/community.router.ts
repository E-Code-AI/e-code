import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  communityPosts, 
  communityCategories, 
  communityPostLikes, 
  communityPostBookmarks,
  communityComments,
  challenges,
  challengeLeaderboard,
  challengeSubmissions,
  users 
} from '@shared/schema';
import { eq, desc, sql, and, ilike, or } from 'drizzle-orm';

const router = Router();

router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await db.select({
      id: communityCategories.id,
      name: communityCategories.name,
      icon: communityCategories.icon,
      description: communityCategories.description,
    }).from(communityCategories)
      .orderBy(communityCategories.position);

    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const [countResult] = await db.select({
          count: sql<number>`COUNT(*)`,
        }).from(communityPosts)
          .where(eq(communityPosts.categoryId, cat.id));
        
        return {
          ...cat,
          postCount: Number(countResult?.count || 0),
        };
      })
    );

    if (categoriesWithCounts.length === 0) {
      return res.json([
        { id: 'showcase', name: 'Showcase', icon: 'Star', postCount: 0 },
        { id: 'help', name: 'Help & Questions', icon: 'MessageSquare', postCount: 0 },
        { id: 'tutorials', name: 'Tutorials', icon: 'Code', postCount: 0 },
        { id: 'challenges', name: 'Challenges', icon: 'Trophy', postCount: 0 },
        { id: 'jobs', name: 'Jobs & Hiring', icon: 'Users', postCount: 0 },
      ]);
    }

    res.json(categoriesWithCounts);
  } catch (error) {
    console.error('[Community] Failed to fetch categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/posts', async (req: Request, res: Response) => {
  try {
    const { category, search, page = '1', pageSize = '20' } = req.query;
    const pageNum = parseInt(String(page), 10);
    const pageSizeNum = parseInt(String(pageSize), 10);
    const offset = (pageNum - 1) * pageSizeNum;

    let whereConditions = [];

    if (category && category !== 'all') {
      whereConditions.push(eq(communityPosts.categoryId, String(category)));
    }

    if (search) {
      const searchTerm = `%${String(search).toLowerCase()}%`;
      whereConditions.push(
        or(
          ilike(communityPosts.title, searchTerm),
          ilike(communityPosts.content, searchTerm)
        )
      );
    }

    const whereClause = whereConditions.length > 0 
      ? and(...whereConditions) 
      : undefined;

    const posts = await db.select({
      id: communityPosts.id,
      title: communityPosts.title,
      content: communityPosts.content,
      authorId: communityPosts.authorId,
      category: communityPosts.categoryId,
      tags: communityPosts.tags,
      projectUrl: communityPosts.projectUrl,
      imageUrl: communityPosts.imageUrl,
      views: communityPosts.viewCount,
      createdAt: communityPosts.createdAt,
      authorUsername: users.username,
      authorDisplayName: users.displayName,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(communityPosts)
    .leftJoin(users, eq(communityPosts.authorId, users.id))
    .where(whereClause)
    .orderBy(desc(communityPosts.createdAt))
    .limit(pageSizeNum)
    .offset(offset);

    // OPTIMIZATION: Batch fetch like and comment counts to avoid N+1 queries
    const postIds = posts.map(p => p.id);
    
    // Single query for all like counts using GROUP BY
    const likeCounts = postIds.length > 0 ? await db.select({
      postId: communityPostLikes.postId,
      count: sql<number>`COUNT(*)`,
    }).from(communityPostLikes)
      .where(sql`${communityPostLikes.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(communityPostLikes.postId) : [];
    
    // Single query for all comment counts using GROUP BY
    const commentCounts = postIds.length > 0 ? await db.select({
      postId: communityComments.postId,
      count: sql<number>`COUNT(*)`,
    }).from(communityComments)
      .where(sql`${communityComments.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(communityComments.postId) : [];
    
    // Build lookup maps for O(1) access
    const likeMap = new Map(likeCounts.map(l => [l.postId, Number(l.count)]));
    const commentMap = new Map(commentCounts.map(c => [c.postId, Number(c.count)]));

    const postsWithCounts = posts.map((post) => ({
      id: String(post.id),
      title: post.title,
      content: post.content,
      author: {
        id: String(post.authorId),
        username: post.authorUsername || 'anonymous',
        displayName: post.authorDisplayName || post.authorUsername || 'Anonymous',
        avatarUrl: post.authorAvatarUrl,
        reputation: 0,
      },
      category: post.category,
      tags: post.tags || [],
      likes: likeMap.get(post.id) || 0,
      comments: commentMap.get(post.id) || 0,
      views: post.views || 0,
      isLiked: false,
      isBookmarked: false,
      createdAt: post.createdAt?.toISOString(),
      projectUrl: post.projectUrl,
      imageUrl: post.imageUrl,
    }));

    const [totalResult] = await db.select({
      count: sql<number>`COUNT(*)`,
    }).from(communityPosts)
      .where(whereClause);

    const total = Number(totalResult?.count || 0);

    res.json({
      posts: postsWithCounts,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
        hasMore: offset + pageSizeNum < total,
      },
    });
  } catch (error) {
    console.error('[Community] Failed to fetch posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.get('/challenges', async (_req: Request, res: Response) => {
  try {
    const activeChallenges = await db.select({
      id: challenges.id,
      title: challenges.title,
      description: challenges.description,
      difficulty: challenges.difficulty,
      category: challenges.category,
      points: challenges.points,
      status: challenges.status,
      createdAt: challenges.createdAt,
    })
    .from(challenges)
    .where(eq(challenges.status, 'published'))
    .orderBy(desc(challenges.createdAt));

    const challengesWithStats = await Promise.all(
      activeChallenges.map(async (challenge) => {
        const [participantCount] = await db.select({
          count: sql<number>`COUNT(DISTINCT user_id)`,
        }).from(challengeSubmissions)
          .where(eq(challengeSubmissions.challengeId, challenge.id));

        const [submissionCount] = await db.select({
          count: sql<number>`COUNT(*)`,
        }).from(challengeSubmissions)
          .where(eq(challengeSubmissions.challengeId, challenge.id));

        return {
          id: String(challenge.id),
          title: challenge.title,
          description: challenge.description,
          difficulty: challenge.difficulty,
          category: challenge.category,
          participants: Number(participantCount?.count || 0),
          submissions: Number(submissionCount?.count || 0),
          prize: challenge.points ? `${challenge.points} points` : 'N/A',
          deadline: null,
          status: challenge.status,
        };
      })
    );

    res.json(challengesWithStats);
  } catch (error) {
    console.error('[Community] Failed to fetch challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

router.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const leaderboard = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      totalScore: sql<number>`COALESCE(SUM(${challengeLeaderboard.bestScore}), 0)`,
      submissionCount: sql<number>`COALESCE(SUM(${challengeLeaderboard.submissionCount}), 0)`,
    })
    .from(challengeLeaderboard)
    .innerJoin(users, eq(challengeLeaderboard.userId, users.id))
    .groupBy(users.id, users.username, users.displayName, users.avatarUrl)
    .orderBy(sql`SUM(${challengeLeaderboard.bestScore}) DESC NULLS LAST`)
    .limit(50);

    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      id: String(entry.id),
      username: entry.username,
      displayName: entry.displayName || entry.username,
      avatarUrl: entry.avatarUrl,
      score: Number(entry.totalScore),
      rank: index + 1,
      badges: [],
      streakDays: 0,
    }));

    res.json(rankedLeaderboard);
  } catch (error) {
    console.error('[Community] Failed to fetch leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.post('/posts/:postId/like', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const postIdNum = parseInt(postId, 10);
    
    const [existing] = await db.select()
      .from(communityPostLikes)
      .where(and(
        eq(communityPostLikes.postId, postIdNum),
        eq(communityPostLikes.userId, userId)
      ));

    if (existing) {
      await db.delete(communityPostLikes)
        .where(and(
          eq(communityPostLikes.postId, postIdNum),
          eq(communityPostLikes.userId, userId)
        ));
      res.json({ success: true, postId, liked: false });
    } else {
      await db.insert(communityPostLikes).values({
        postId: postIdNum,
        userId,
      });
      res.json({ success: true, postId, liked: true });
    }
  } catch (error) {
    console.error('[Community] Failed to toggle like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

router.post('/posts/:postId/bookmark', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const postIdNum = parseInt(postId, 10);
    
    const [existing] = await db.select()
      .from(communityPostBookmarks)
      .where(and(
        eq(communityPostBookmarks.postId, postIdNum),
        eq(communityPostBookmarks.userId, userId)
      ));

    if (existing) {
      await db.delete(communityPostBookmarks)
        .where(and(
          eq(communityPostBookmarks.postId, postIdNum),
          eq(communityPostBookmarks.userId, userId)
        ));
      res.json({ success: true, postId, bookmarked: false });
    } else {
      await db.insert(communityPostBookmarks).values({
        postId: postIdNum,
        userId,
      });
      res.json({ success: true, postId, bookmarked: true });
    }
  } catch (error) {
    console.error('[Community] Failed to toggle bookmark:', error);
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

export default router;
