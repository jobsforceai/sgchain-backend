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
  otp: z.string().length(6).optional(),
  password: z.string().optional(),
}).refine(data => data.password || data.otp, {
  message: "Either password or otp must be provided",
  path: ["password"],
});
