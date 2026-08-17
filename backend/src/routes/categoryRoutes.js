import { Router } from 'express';
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../controllers/ledgerController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validations/ledgerValidation.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createCategorySchema), createCategory);
router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.patch('/:id', validate(updateCategorySchema), updateCategory);
router.delete('/:id', deleteCategory);

export default router;
