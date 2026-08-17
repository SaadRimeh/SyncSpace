import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  deleteAccount,
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../validations/authValidation.js';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

router.get('/profile', getProfile);
router.patch('/profile', validate(updateProfileSchema), updateProfile);
router.delete('/profile', deleteAccount);

export default router;
