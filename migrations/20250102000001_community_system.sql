-- Create community tables
CREATE TABLE IF NOT EXISTS community_categories (
    id varchar PRIMARY KEY,
    name varchar NOT NULL,
    description text,
    icon varchar NOT NULL DEFAULT 'TrendingUp',
    position integer DEFAULT 0,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_posts (
    id serial PRIMARY KEY,
    title varchar NOT NULL,
    content text NOT NULL,
    author_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id varchar NOT NULL REFERENCES community_categories(id),
    tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    project_url text,
    image_url text,
    view_count integer DEFAULT 0,
    is_pinned boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_post_likes (
    post_id integer NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_post_bookmarks (
    post_id integer NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_comments (
    id serial PRIMARY KEY,
    post_id integer NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    author_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content text NOT NULL,
    parent_comment_id integer REFERENCES community_comments(id) ON DELETE SET NULL,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_follows (
    follower_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT now(),
    PRIMARY KEY (follower_id, followee_id)
);

-- Seed default categories
INSERT INTO community_categories (id, name, description, icon, position)
VALUES
    ('announcements', 'Executive Announcements', 'Insights from the platform team on what is launching next.', 'TrendingUp', 1),
    ('showcase', 'Flagship Showcases', 'Customer victories and high-impact product spotlights.', 'Star', 2),
    ('help', 'Solution Desk', 'Enterprise builders swapping playbooks and getting unstuck.', 'MessageSquare', 3),
    ('tutorials', 'Operational Playbooks', 'Step-by-step guides from our architect network.', 'Code', 4),
    ('challenges', 'Innovation Challenges', 'Competitive programs with executive-level visibility.', 'Trophy', 5),
    ('discussions', 'Leadership Roundtables', 'Deep dives from strategy, platform, and product leaders.', 'Users', 6)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    position = EXCLUDED.position,
    updated_at = now();

-- Ensure we have a system user to own seeded content
INSERT INTO users (id, username, display_name, email, created_at, updated_at)
VALUES ('community-system', 'community-team', 'Community Team', 'community@example.com', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Seed sample enterprise-grade posts
INSERT INTO community_posts (title, content, author_id, category_id, tags, project_url, image_url, created_at)
SELECT data.title, data.content, data.author_id, data.category_id, data.tags::jsonb, data.project_url, data.image_url, data.created_at
FROM (
    VALUES
        (
            'Global Innovation Briefing: AI-Powered Delivery',
            'Our platform engineering group partnered with three Fortune 100 retailers to automate incident response across 4200+ stores. See how the playbook scaled from prototype to production in six weeks.',
            'community-system',
            'announcements',
            ' ["ai", "platform", "operations"] ',
            '/project/enterprise-delivery-grid',
            'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
            now() - interval '3 day'
        ),
        (
            'Customer Spotlight: Northwind Logistics Launches Digital Control Tower',
            'Northwind''s transformation office orchestrated 18 internal teams and launched a unified operations command center. Discover the architecture, partner ecosystem, and KPIs that unlocked a 28% reduction in downtime.',
            'community-system',
            'showcase',
            ' ["supply-chain", "observability", "automation"] ',
            '/project/northwind-control-tower',
            'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80',
            now() - interval '7 day'
        ),
        (
            'Playbook: Standing Up a Secure Internal Dev Platform in 45 Days',
            'A repeatable implementation plan for exec sponsors rolling out secure golden paths. Includes governance checkpoints, change management guides, and compliance-ready templates.',
            'community-system',
            'tutorials',
            ' ["idp", "compliance", "playbook"] ',
            '/project/platform-playbook',
            'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
            now() - interval '10 day'
        )
) AS data(title, content, author_id, category_id, tags, project_url, image_url, created_at)
ON CONFLICT DO NOTHING;

-- Seed executive challenges for the homepage
INSERT INTO challenges (title, description, difficulty, category, points, status, tags, created_by, created_at)
SELECT data.title, data.description, data.difficulty, data.category, data.points, 'published', data.tags::jsonb, data.created_by, data.created_at
FROM (
    VALUES
        (
            'Executive Automation Sprint',
            'Re-architect a legacy operations workflow into a compliant, automated platform experience ready for enterprise rollout.',
            'hard',
            'automation',
            500,
            '["workflow", "governance", "scale"]',
            'community-system',
            now() - interval '14 day'
        ),
        (
            'Data Resilience Blueprint',
            'Design an end-to-end data resiliency plan with active-active failover for a multinational footprint.',
            'medium',
            'resilience',
            350,
            '["data", "failover", "playbook"]',
            'community-system',
            now() - interval '21 day'
        ),
        (
            'Launch Week Storytelling Challenge',
            'Package a strategic launch announcement with exec-ready messaging, hero metrics, and stakeholder enablement materials.',
            'easy',
            'communication',
            200,
            '["launch", "marketing", "enablement"]',
            'community-system',
            now() - interval '5 day'
        )
) AS data(title, description, difficulty, category, points, tags, created_by, created_at)
ON CONFLICT DO NOTHING;
