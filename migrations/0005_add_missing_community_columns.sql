
-- Add missing tags column to community_posts
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]';

-- Add missing category column to challenges
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS category varchar(50);
