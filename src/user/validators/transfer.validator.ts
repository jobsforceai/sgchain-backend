import { z } from 'zod';

export const transferValidator = z.object({
  amountSgc: z.number().positive(),
});
