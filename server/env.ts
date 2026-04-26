import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  const envFiles = [
    process.env.DOTENV_CONFIG_PATH,
    '.env.local',
    '.env',
  ].filter(Boolean) as string[];

  for (const envFile of envFiles) {
    const envPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}
