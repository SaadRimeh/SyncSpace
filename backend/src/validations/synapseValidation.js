import { z } from 'zod';

export const createSynapseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  content: z.string().default(''),
  tags: z
    .array(z.string().trim().min(1, 'Tag cannot be empty').max(50, 'Tag name is too long'))
    .optional()
    .default([]),
  is_pinned: z.boolean().optional().default(false),
});

export const updateSynapseSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(255).optional(),
  content: z.string().optional(),
  tags: z
    .array(z.string().trim().min(1).max(50))
    .optional(),
  is_pinned: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});

export const convertSynapseSchema = z.object({
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format'),
  due_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Due time must be in HH:MM format')
    .optional()
    .nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  archive_note: z.boolean().optional().default(true),
  recurrence_rule: z.string().max(100).optional().nullable().default(null),
});

export const querySynapseSchema = z.object({
  search: z.string().optional(),
  tag: z.string().optional(),
  is_pinned: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  is_archived: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
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
