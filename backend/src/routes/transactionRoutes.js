import { Router } from 'express';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getMonthlySummary,
} from '../controllers/ledgerController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  createTransactionSchema,
  updateTransactionSchema,
  queryTransactionSchema,
} from '../validations/ledgerValidation.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createTransactionSchema), createTransaction);
router.get('/', validate(queryTransactionSchema, 'query'), getTransactions);
router.get('/stats/monthly', getMonthlySummary);
router.get('/:id', getTransactionById);
router.patch('/:id', validate(updateTransactionSchema), updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
