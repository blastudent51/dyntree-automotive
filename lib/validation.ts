import { z } from 'zod';
import { configurationSchema } from './configuration';
export const addressSchema = z.object({
  line1: z.string().trim().min(2).max(150),
  line2: z.string().trim().max(150),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(3).max(20),
  country: z.literal('US'),
});
export const reservationFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(60),
  lastName: z.string().trim().min(1, 'Enter your last name').max(60),
  email: z.string().email(),
  phone: z.string().trim().min(7, 'Enter a phone number').max(30),
  billingAddress: addressSchema,
  deliveryAddress: addressSchema,
  deliveryMethod: z.enum(['HOME_DELIVERY', 'DEALER_PICKUP']),
  dealerId: z.string().uuid().nullable().optional(),
  agreement: z.boolean().refine((x) => x, 'Accept the reservation agreement to continue'),
});
export const checkoutSchema = reservationFormSchema
  .extend({
    configuration: configurationSchema,
    agreementVersion: z.string().max(40),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.deliveryMethod === 'DEALER_PICKUP' && !value.dealerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dealerId'],
        message: 'Choose a dealer for pickup.',
      });
    }
  });
