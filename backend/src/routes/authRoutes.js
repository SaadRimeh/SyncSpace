import { Router } from 'express';
import {
  register,
  login,
  getMe,
  changePassword,
  logout,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from '../validations/authValidation.js';

const router = Router();

// Public Routes with Brute-Force Rate Limiter
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);

// Protected Routes
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, validate(changePasswordSchema), changePassword);
router.post('/logout', requireAuth, logout);

export default router;
