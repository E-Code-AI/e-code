import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __PRISMA_CLIENT__: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const logLevels: ('query' | 'info' | 'warn' | 'error')[] =
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error', 'warn'];

  return new PrismaClient({
    log: logLevels,
    errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
  });
};

const prisma: PrismaClient =
  global.__PRISMA_CLIENT__ ??
  (() => {
    const client = createPrismaClient();

    if (process.env.NODE_ENV !== 'production') {
      global.__PRISMA_CLIENT__ = client;
    }

    return client;
  })();

export { prisma };
export default prisma;