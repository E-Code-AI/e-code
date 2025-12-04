import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Post } from './entities/Post';
import { Comment } from './entities/Comment';
import { InitialMigration1720000000000 } from './migrations/1720000000000-InitialMigration';

const isProduction: boolean = process.env.NODE_ENV === 'production';

const dbType = (process.env.DB_TYPE || 'postgres') as 'postgres' | 'mysql' | 'mariadb' | 'sqlite';

export const AppDataSource: DataSource = new DataSource({
  type: dbType,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'app_db',
  entities: [User, Post, Comment],
  migrations: [InitialMigration1720000000000],
  synchronize: false,
  logging: !isProduction,
  migrationsRun: true,
  ssl:
    isProduction && dbType === 'postgres'
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
});

export const initializeDataSource = async (): Promise<DataSource> => {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  try {
    const dataSource = await AppDataSource.initialize();
    return dataSource;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error during Data Source initialization:', error);
    throw error;
  }
};

export default AppDataSource;