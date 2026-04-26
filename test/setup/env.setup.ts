import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const candidates = [
  process.env.DOTENV_CONFIG_PATH,
  '.env.test',
  '.env.local',
  '.env',
].filter(Boolean) as string[];

for (const candidate of candidates) {
  const envPath = path.resolve(root, candidate);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
