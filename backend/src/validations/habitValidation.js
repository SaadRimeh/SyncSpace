import { z } from 'zod';

const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export const createHabitSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150, 'Title must be 150 characters or less'),
  description: z.string().max(255).optional().nullable().default(null),
  category: z.string().max(50).optional().default('general'),
  color_hex: z
    .string()
    .regex(hexColorRegex, 'Color must be a valid hex code (e.g., #10B981)')
    .optional()
    .default('#10B981'),
  target_frequency_per_week: z
    .number()
    .int()
    .min(1, 'Frequency must be at least 1 day per week')
    .max(7, 'Frequency cannot exceed 7 days per week')
    .optional()
    .default(7),
  reminder_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Reminder time must be in HH:MM format')
    .optional()
    .nullable()
    .default(null),
});

export const updateHabitSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  description: z.string().max(255).optional().nullable(),
  category: z.string().max(50).optional(),
  color_hex: z.string().regex(hexColorRegex, 'Color must be a valid hex code').optional(),
  target_frequency_per_week: z.number().int().min(1).max(7).optional(),
  reminder_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Reminder time must be in HH:MM format')
    .optional()
    .nullable(),
  is_archived: z.boolean().optional(),
});

export const toggleHabitLogSchema = z.object({
  log_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Log date must be in YYYY-MM-DD format')
    .optional(),
  status: z.enum(['completed', 'skipped', 'missed']).optional().default('completed'),
  count: z.number().int().min(1).optional().default(1),
});

export const heatmapQuerySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
