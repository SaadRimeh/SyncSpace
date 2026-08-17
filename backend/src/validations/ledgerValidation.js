import { z } from 'zod';

const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Name must be 100 characters or less'),
  type: z.enum(['income', 'expense']),
  color_hex: z
    .string()
    .regex(hexColorRegex, 'Color must be a valid hex code (e.g., #6366F1)')
    .optional()
    .default('#6366F1'),
  icon_name: z.string().max(50).optional().default('wallet'),
  monthly_budget_limit: z
    .number()
    .min(0, 'Monthly budget limit cannot be negative')
    .optional()
    .default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color_hex: z.string().regex(hexColorRegex, 'Color must be a valid hex code').optional(),
  icon_name: z.string().max(50).optional(),
  monthly_budget_limit: z.number().min(0).optional(),
});

export const createTransactionSchema = z.object({
  amount: z.number().positive('Transaction amount must be greater than 0'),
  type: z.enum(['income', 'expense']),
  category_id: z.string().uuid().optional().nullable().default(null),
  transaction_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Transaction date must be in YYYY-MM-DD format')
    .optional()
    .default(() => new Date().toISOString().split('T')[0]),
  note: z.string().max(255).optional().nullable().default(null),
});

export const updateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  type: z.enum(['income', 'expense']).optional(),
  category_id: z.string().uuid().optional().nullable(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().max(255).optional().nullable(),
});

export const queryTransactionSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category_id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .refine((n) => n >= 1, 'Page must be at least 1'),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'Limit must be between 1 and 100'),
});
