import { Router } from 'express';
import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  getTags,
  convertNoteToTask,
} from '../controllers/synapseController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import {
  createSynapseSchema,
  updateSynapseSchema,
  convertSynapseSchema,
  querySynapseSchema,
} from '../validations/synapseValidation.js';

const router = Router();

// All Synapse routes require authentication
router.use(requireAuth);

router.post('/', validate(createSynapseSchema), createNote);
router.get('/', validate(querySynapseSchema, 'query'), getNotes);
router.get('/tags', getTags);
router.get('/:id', getNoteById);
router.patch('/:id', validate(updateSynapseSchema), updateNote);
router.delete('/:id', deleteNote);
router.post('/:id/convert', validate(convertSynapseSchema), convertNoteToTask);

export default router;
