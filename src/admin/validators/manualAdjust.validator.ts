import { z } from 'zod';

export const manualAdjustValidator = z.object({
  currency: z.enum(['SGC', 'USD']),
  direction: z.enum(['CREDIT', 'DEBIT']),
  amount: z.number().positive(),
  reason: z.string().min(1),
});
