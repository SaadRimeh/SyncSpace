import { Router } from 'express';
import {
  createTask,
  getTasks,
  getSummaryStats,
  getTaskById,
  updateTask,
  deleteTask,
} from '../controllers/taskController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  createTaskSchema,
  updateTaskSchema,
  queryTaskSchema,
} from '../validations/taskValidation.js';

const router = Router();

// All Task routes require authentication
router.use(requireAuth);

router.post('/', validate(createTaskSchema), createTask);
router.get('/', validate(queryTaskSchema, 'query'), getTasks);
router.get('/stats/summary', getSummaryStats);
router.get('/:id', getTaskById);
router.patch('/:id', validate(updateTaskSchema), updateTask);
router.delete('/:id', deleteTask);

export default router;
