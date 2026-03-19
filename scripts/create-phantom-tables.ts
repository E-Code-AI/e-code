import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS visitor_feedback (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      deployment_id INTEGER REFERENCES deployments(id),
      visitor_name VARCHAR(255),
      visitor_email VARCHAR(255),
      content TEXT NOT NULL,
      attachments JSONB DEFAULT '[]'::jsonb,
      page_url TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_skills (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS project_slides_collection (
      project_id INTEGER PRIMARY KEY REFERENCES projects(id),
      slides JSONB NOT NULL DEFAULT '[]'::jsonb,
      theme JSONB,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      command TEXT,
      args JSONB,
      env JSONB,
      url TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'disconnected',
      error_message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("Tables created successfully");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
