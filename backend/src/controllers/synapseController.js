import {
  createSynapse,
  getSynapses,
  getSynapseById,
  updateSynapse,
  deleteSynapse,
  getUserTags,
  convertSynapseToTask,
} from '../models/synapseModel.js';
import { invalidatePattern } from '../config/redis.js';

/**
 * Create a new rapid-capture Synapse note
 * POST /api/synapses
 */
export const createNote = async (req, res, next) => {
  try {
    const { title, content, tags, is_pinned } = req.body;
    const note = await createSynapse({
      user_id: req.user.id,
      title,
      content,
      tags,
      is_pinned,
    });

    res.status(201).json({
      status: 201,
      message: 'Note created successfully.',
      data: {
        note,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all synapse notes with filtering, search, and pagination
 * GET /api/synapses
 */
export const getNotes = async (req, res, next) => {
  try {
    const result = await getSynapses(req.user.id, req.query);
    res.status(200).json({
      status: 200,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single synapse note by ID
 * GET /api/synapses/:id
 */
export const getNoteById = async (req, res, next) => {
  try {
    const note = await getSynapseById(req.user.id, req.params.id);
    if (!note) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Note not found.',
      });
    }

    res.status(200).json({
      status: 200,
      data: {
        note,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update synapse note
 * PATCH /api/synapses/:id
 */
export const updateNote = async (req, res, next) => {
  try {
    const updated = await updateSynapse(req.user.id, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Note not found.',
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Note updated successfully.',
      data: {
        note: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete synapse note
 * DELETE /api/synapses/:id
 */
export const deleteNote = async (req, res, next) => {
  try {
    const deleted = await deleteSynapse(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Note not found.',
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Note deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all unique tags for current user
 * GET /api/synapses/tags
 */
export const getTags = async (req, res, next) => {
  try {
    const tags = await getUserTags(req.user.id);
    res.status(200).json({
      status: 200,
      data: {
        tags,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Atomic Binary Conversion: Transform a note into a scheduled task
 * POST /api/synapses/:id/convert
 */
export const convertNoteToTask = async (req, res, next) => {
  try {
    const { due_date, due_time, priority, title, description, archive_note, recurrence_rule } = req.body;
    const userId = req.user.id;
    const synapseId = req.params.id;

    const result = await convertSynapseToTask({
      user_id: userId,
      synapse_id: synapseId,
      taskData: {
        due_date,
        due_time,
        priority,
        title,
        description,
        recurrence_rule,
      },
      archive_note,
    });

    if (result.error) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: result.error,
      });
    }

    // Invalidate Daily Canvas cache so newly converted task immediately displays on calendar/canvas
    await invalidatePattern(`canvas:user:${userId}:*`);

    res.status(201).json({
      status: 201,
      message: 'Note successfully converted into a scheduled task.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
