import {
  createHabit as createNewHabit,
  getHabitsWithTodayStatus,
  getHabitById as fetchHabitById,
  updateHabit as modifyHabit,
  deleteHabit as removeHabit,
  toggleHabitLog,
  getHabitHeatmap,
} from '../models/habitModel.js';
import { invalidatePattern } from '../config/redis.js';

/**
 * Create a new habit
 * POST /api/habits
 */
export const createHabit = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      color_hex,
      target_frequency_per_week,
      reminder_time,
    } = req.body;

    const habit = await createNewHabit({
      user_id: req.user.id,
      title,
      description,
      category,
      color_hex,
      target_frequency_per_week,
      reminder_time,
    });

    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(201).json({
      status: 201,
      message: 'Habit created successfully.',
      data: {
        habit,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all habits with today's status & streaks
 * GET /api/habits
 */
export const getHabits = async (req, res, next) => {
  try {
    const habits = await getHabitsWithTodayStatus(req.user.id, req.query.date);
    res.status(200).json({
      status: 200,
      data: {
        habits,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single habit by ID with streak stats
 * GET /api/habits/:id
 */
export const getHabitById = async (req, res, next) => {
  try {
    const habit = await fetchHabitById(req.user.id, req.params.id);
    if (!habit) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Habit not found.',
      });
    }

    res.status(200).json({
      status: 200,
      data: {
        habit,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update habit
 * PATCH /api/habits/:id
 */
export const updateHabit = async (req, res, next) => {
  try {
    const updated = await modifyHabit(req.user.id, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Habit not found.',
      });
    }

    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(200).json({
      status: 200,
      message: 'Habit updated successfully.',
      data: {
        habit: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete habit
 * DELETE /api/habits/:id
 */
export const deleteHabit = async (req, res, next) => {
  try {
    const deleted = await removeHabit(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Habit not found.',
      });
    }

    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(200).json({
      status: 200,
      message: 'Habit deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle or log daily check-in for habit
 * POST /api/habits/:id/toggle
 */
export const toggleHabit = async (req, res, next) => {
  try {
    const { log_date, status, count } = req.body;
    const result = await toggleHabitLog(req.user.id, req.params.id, {
      log_date,
      status,
      count,
    });

    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(200).json({
      status: 200,
      message: 'Habit check-in recorded successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get 2D Contribution Heatmap logs for GitHub-style grid
 * GET /api/habits/:id/heatmap
 */
export const getHeatmap = async (req, res, next) => {
  try {
    const heatmap = await getHabitHeatmap(req.user.id, req.params.id, req.query);
    res.status(200).json({
      status: 200,
      data: heatmap,
    });
  } catch (err) {
    next(err);
  }
};
