import { Resend } from 'resend';
import { getDb } from './db';
import { money } from './configuration';
const escape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const subjects: Record<string, string> = {
  welcome: 'Welcome to Dyntree',
  'reservation-confirmation': 'Your M1E reservation',
  'refund-confirmation': 'Your Dyntree refund',
  'reservation-cancellation': 'Reservation cancellation',
  'order-status-update': 'Your M1E status update',
  'production-update': 'M1E production update',
  'shipping-notification': 'Your M1E shipping update',
};
export function renderEmail(template: string, payload: Record<string, unknown>) {
  const subject = subjects[template] || 'An update from Dyntree';
  const amount = typeof payload.amountCents === 'number' ? money(payload.amountCents) : '';
  let text = `Hello ${String(payload.name || 'there')},\n\n`;
  if (template === 'welcome')
    text +=
      'Welcome to Dyntree. Explore the M1E, save a configuration and follow your reservation in My Garage.';
  if (template === 'reservation-confirmation')
    text += `Your reservation ${payload.number} is confirmed. Reservation payment: ${amount}.${payload.simulated ? ' Development payment simulation — no money was collected.' : ''} This is not a final vehicle purchase agreement. Specifications, pricing, availability and production timing may change.`;
  if (template === 'refund-confirmation')
    text += `A refund of ${amount} has been processed for reservation ${payload.number}. Your payment provider determines when the funds appear.`;
  if (template === 'reservation-cancellation')
    text += `Reservation ${payload.number} has been cancelled. Any applicable refund is tracked separately in your account.`;
  if (template === 'order-status-update')
    text += `Reservation ${payload.number} is now ${payload.status}. ${payload.note || ''}`;
  if (template === 'production-update')
    text += String(payload.message || 'A new development update is available in your account.');
  if (template === 'shipping-notification')
    text += `Your reservation ${payload.number} has a shipping update. ${payload.message || 'Review the latest delivery information in your account.'}`;
  text += '\n\nDyntree Automotive\nTechnology that grows.';
  const html = `<!doctype html><html><body style="margin:0;background:#0d1317;color:#e1eaeb;font:16px Arial,sans-serif;padding:40px"><div style="max-width:580px;margin:auto"><p style="letter-spacing:5px;color:#b5e0dc">DYNTREE</p><h1 style="font-size:32px;font-weight:400">${escape(subject)}</h1>${text
    .split('\n\n')
    .map((p) => `<p style="line-height:1.7;color:#acbec6">${escape(p).replace(/\n/g, '<br>')}</p>`)
    .join('')}</div></body></html>`;
  return { subject, text, html };
}
export async function deliverPendingEmails() {
  const db = getDb();
  const pending = await db.emailOutbox.findMany({
    where: { status: 'PENDING', attempts: { lt: 5 } },
    take: 20,
    orderBy: { createdAt: 'asc' },
  });
  let sent = 0;
  for (const item of pending) {
    try {
      const rendered = renderEmail(item.template, item.payload as Record<string, unknown>);
      if (process.env.RESEND_API_KEY) {
        const result = await new Resend(process.env.RESEND_API_KEY).emails.send(
          {
            from: process.env.EMAIL_FROM || 'Dyntree <no-reply@example.com>',
            to: item.recipient,
            ...rendered,
          },
          { idempotencyKey: item.dedupeKey },
        );
        if (result.error) throw Error(result.error.message);
      } else if (process.env.NODE_ENV !== 'production') {
        console.info(
          'Development email preview',
          JSON.stringify({ to: item.recipient, ...rendered }),
        );
      } else continue;
      await db.emailOutbox.update({
        where: { id: item.id },
        data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } },
      });
      sent++;
    } catch (error) {
      await db.emailOutbox.update({
        where: { id: item.id },
        data: {
          attempts: { increment: 1 },
          lastError: error instanceof Error ? error.message.slice(0, 300) : 'Delivery failed',
        },
      });
    }
  }
  return { sent };
}
