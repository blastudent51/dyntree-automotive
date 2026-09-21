import { scheduleEmailDelivery } from './email-delivery';
import { cookies } from 'next/headers';
import { currentUser } from '@clerk/nextjs/server';
import { jwtVerify, SignJWT } from 'jose';
import { getDb } from './db';
import { HttpError } from './security';
export const devAuthEnabled = () =>
  process.env.NODE_ENV === 'development' &&
  process.env.DEV_AUTH_ENABLED === 'true' &&
  !process.env.CLERK_SECRET_KEY;
function devKey() {
  const secret = process.env.DEV_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new HttpError(503, 'A development session secret is required.');
  return new TextEncoder().encode(secret);
}
export async function getUser() {
  const db = getDb();
  if (process.env.CLERK_SECRET_KEY) {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;
    const email = clerkUser.emailAddresses.find(
      (x) => x.id === clerkUser.primaryEmailAddressId && x.verification?.status === 'verified',
    )?.emailAddress;
    if (!email) throw new HttpError(403, 'Please verify your primary email address.');
    let user = await db.user.findUnique({ where: { clerkId: clerkUser.id } });
    if (!user) {
      const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existing)
        throw new HttpError(
          403,
          'This email belongs to an existing account. Ask an administrator to link the verified identity.',
        );
      user = await db.user.create({
        data: {
          clerkId: clerkUser.id,
          email: email.toLowerCase(),
          firstName: clerkUser.firstName || '',
          lastName: clerkUser.lastName || '',
        },
      });
      await db.emailOutbox.create({
        data: {
          dedupeKey: `welcome:${user.id}`,
          recipient: user.email,
          template: 'welcome',
          payload: { name: user.firstName },
        },
      });
      scheduleEmailDelivery();
    }
    return user;
  }
  if (devAuthEnabled()) {
    const token = (await cookies()).get('dyntree-dev-session')?.value;
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, devKey(), {
        issuer: 'dyntree-development',
        audience: 'dyntree-local',
      });
      if (typeof payload.sub !== 'string') return null;
      return db.user.findUnique({ where: { id: payload.sub } });
    } catch {
      return null;
    }
  }
  return null;
}
export async function requireUser() {
  const user = await getUser();
  if (!user) throw new HttpError(401, 'Please sign in to your Dyntree account.');
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw new HttpError(403, 'Administrator access required.');
  return user;
}
export async function createDevSession(id: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(id)
    .setIssuer('dyntree-development')
    .setAudience('dyntree-local')
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(devKey());
}
