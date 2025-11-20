import { z } from 'zod';

export const pricingValidator = z.object({
  priceUsd: z.number().positive(),
  reason: z.string().min(1),
});
