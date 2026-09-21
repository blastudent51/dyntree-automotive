import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
const globalDb = globalThis as unknown as { dyntreeDb?: PrismaClient };
export function getDb() {
  if (!process.env.DATABASE_URL) throw Error('The database is not configured.');
  if (!globalDb.dyntreeDb)
    globalDb.dyntreeDb = new PrismaClient({
      adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
      transactionOptions: { maxWait: 15000, timeout: 20000 },
    });
  return globalDb.dyntreeDb;
}
