import { z } from 'zod';

export const registerValidator = z.object({
  fullName: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
});

export const requestOtpValidator = z.object({
  email: z.string().email(),
});

export const loginValidator = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});
