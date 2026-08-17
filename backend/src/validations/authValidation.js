import { z } from 'zod';

const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: passwordValidation,
  full_name: z.string().min(2, 'Full name must be at least 2 characters long').max(150),
  timezone: z.string().max(64).optional().default('UTC'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code (e.g., USD, EUR)').optional().default('USD'),
  avatar_url: z.string().url('Avatar must be a valid URL').optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordValidation,
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password cannot be the same as current password',
  path: ['newPassword'],
});

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters long').max(150).optional(),
  timezone: z.string().max(64).optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code (e.g., USD, EUR)').optional(),
  avatar_url: z.string().url('Avatar must be a valid URL').optional().nullable(),
});
