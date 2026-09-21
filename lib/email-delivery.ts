import { after } from 'next/server';
import { deliverPendingEmails } from './email';
export function scheduleEmailDelivery() {
  after(async () => {
    try {
      await deliverPendingEmails();
    } catch (error) {
      console.error(
        'Email outbox delivery deferred',
        error instanceof Error ? error.name : 'Unknown error',
      );
    }
  });
}
