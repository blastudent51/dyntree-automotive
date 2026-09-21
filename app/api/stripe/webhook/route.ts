import { handleSubscriptionEvent } from '@/lib/subscriptions';
import { scheduleEmailDelivery } from '@/lib/email-delivery';
import { handleStripeEvent, stripeClient } from '@/lib/payments';
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET)
    return Response.json({ error: 'Webhook not configured.' }, { status: 400 });
  let event;
  try {
    const body = await request.text();
    event = await stripeClient().webhooks.constructEventAsync(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return Response.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }
  try {
    const result = await handleSubscriptionEvent(event) ?? await handleStripeEvent(event);
    scheduleEmailDelivery();
    return Response.json(result);
  } catch (error) {
    console.error(
      'Stripe event processing failed',
      event.id,
      error instanceof Error ? error.name : 'Error',
    );
    return Response.json({ error: 'Event processing failed.' }, { status: 500 });
  }
}
