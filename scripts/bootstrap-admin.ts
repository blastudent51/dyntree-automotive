import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
const clerkId = process.argv[2];
if (!clerkId?.startsWith('user_'))
  throw Error('Provide an existing verified Clerk user ID. Sign into the app first.');
const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});
try {
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user)
    throw Error('No app user exists for that Clerk identity. Sign in before bootstrapping.');
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    await tx.adminAuditLog.create({
      data: {
        adminId: user.id,
        action: 'administrator.bootstrapped',
        target: `user:${user.id}`,
        before: { role: user.role },
        after: { role: 'ADMIN' },
      },
    });
  });
  console.log('Administrator role assigned to the verified existing user.');
} finally {
  await db.$disconnect();
}
