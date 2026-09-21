import { mkdir, writeFile } from 'node:fs/promises';
import { renderEmail } from '../lib/email';
await mkdir('docs/email-previews', { recursive: true });
for (const name of [
  'welcome',
  'reservation-confirmation',
  'refund-confirmation',
  'reservation-cancellation',
  'order-status-update',
  'production-update',
  'shipping-notification',
]) {
  const result = renderEmail(name, {
    name: 'Jordan',
    number: 'DYN-M1E-000001',
    amountCents: 25000,
    status: 'Awaiting production',
    simulated: true,
    message: 'A development update is available in your account.',
  });
  await writeFile(`docs/email-previews/${name}.html`, result.html);
}
console.log('Seven rendered email previews created. No emails sent.');
