import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  description: z.string().optional().nullable().default(null),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .optional()
    .nullable()
    .default(null),
  due_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Due time must be in HH:MM format')
    .optional()
    .nullable()
    .default(null),
  recurrence_rule: z.string().max(100).optional().nullable().default(null),
  synapse_id: z.string().uuid().optional().nullable().default(null),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(255).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  due_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Due time must be in HH:MM format')
    .optional()
    .nullable(),
  recurrence_rule: z.string().max(100).optional().nullable(),
});

export const queryTaskSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
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
