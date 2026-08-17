import { Router } from 'express';
import { getTodayCanvas } from '../controllers/canvasController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/today', getTodayCanvas);

export default router;
