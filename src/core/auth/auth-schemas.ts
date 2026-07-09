import { z } from 'zod';
import { sanitizeInput } from '@/core/auth/auth-lib';

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .transform(sanitizeInput),
  email: z
    .string()
    .email()
    .max(254)
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must have uppercase, lowercase and number',
    ),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;