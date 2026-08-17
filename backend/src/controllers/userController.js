import { updateProfile as updateUserProfile, deleteUser, findById } from '../models/userModel.js';
import { cacheUserSession, invalidateUserSession } from '../middleware/authMiddleware.js';

/**
 * Get profile for authenticated user
 * GET /api/users/profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'User profile not found.',
      });
    }

    res.status(200).json({
      status: 200,
      data: {
        user,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update user preferences and profile
 * PATCH /api/users/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { full_name, avatar_url, timezone, currency } = req.body;
    const userId = req.user.id;

    const updatedUser = await updateUserProfile(userId, {
      full_name,
      avatar_url,
      timezone,
      currency,
    });

    if (!updatedUser) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'User profile not found.',
      });
    }

    // Refresh Redis session cache
    await cacheUserSession(updatedUser);

    res.status(200).json({
      status: 200,
      message: 'Profile updated successfully.',
      data: {
        user: updatedUser,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete current user account
 * DELETE /api/users/profile
 */
export const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await deleteUser(userId);
    await invalidateUserSession(userId);

    res.status(200).json({
      status: 200,
      message: 'Account deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
