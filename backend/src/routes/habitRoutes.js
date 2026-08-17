import { Router } from 'express';
import {
  createHabit,
  getHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  toggleHabit,
  getHeatmap,
} from '../controllers/habitController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  createHabitSchema,
  updateHabitSchema,
  toggleHabitLogSchema,
  heatmapQuerySchema,
} from '../validations/habitValidation.js';

const router = Router();

// All Habit routes require authentication
router.use(requireAuth);

router.post('/', validate(createHabitSchema), createHabit);
router.get('/', getHabits);
router.get('/:id', getHabitById);
router.patch('/:id', validate(updateHabitSchema), updateHabit);
router.delete('/:id', deleteHabit);
router.post('/:id/toggle', validate(toggleHabitLogSchema), toggleHabit);
router.get('/:id/heatmap', validate(heatmapQuerySchema, 'query'), getHeatmap);

export default router;
