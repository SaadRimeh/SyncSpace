import {
  createTask as createNewTask,
  getTasks as listTasks,
  getTaskById as fetchTaskById,
  updateTask as modifyTask,
  deleteTask as removeTask,
  getTaskSummaryStats,
} from '../models/taskModel.js';
import { invalidatePattern } from '../config/redis.js';

/**
 * Create a new task
 * POST /api/tasks
 */
export const createTask = async (req, res, next) => {
  try {
    const { title, description, priority, due_date, due_time, recurrence_rule, synapse_id } = req.body;
    const task = await createNewTask({
      user_id: req.user.id,
      title,
      description,
      priority,
      due_date,
      due_time,
      recurrence_rule,
      synapse_id,
    });

    // Invalidate Daily Canvas cache
    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(201).json({
      status: 201,
      message: 'Task created successfully.',
      data: {
        task,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all tasks with filtering and pagination
 * GET /api/tasks
 */
export const getTasks = async (req, res, next) => {
  try {
    const result = await listTasks(req.user.id, req.query);
    res.status(200).json({
      status: 200,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get task summary counts (todo, in_progress, completed, overdue)
 * GET /api/tasks/stats/summary
 */
export const getSummaryStats = async (req, res, next) => {
  try {
    const stats = await getTaskSummaryStats(req.user.id);
    res.status(200).json({
      status: 200,
      data: {
        stats,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single task by ID
 * GET /api/tasks/:id
 */
export const getTaskById = async (req, res, next) => {
  try {
    const task = await fetchTaskById(req.user.id, req.params.id);
    if (!task) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Task not found.',
      });
    }

    res.status(200).json({
      status: 200,
      data: {
        task,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update task
 * PATCH /api/tasks/:id
 */
export const updateTask = async (req, res, next) => {
  try {
    const updated = await modifyTask(req.user.id, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Task not found.',
      });
    }

    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(200).json({
      status: 200,
      message: 'Task updated successfully.',
      data: {
        task: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete task
 * DELETE /api/tasks/:id
 */
export const deleteTask = async (req, res, next) => {
  try {
    const deleted = await removeTask(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Task not found.',
      });
    }

    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(200).json({
      status: 200,
      message: 'Task deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
