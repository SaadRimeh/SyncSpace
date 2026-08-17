import { hashPassword, comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import {
  createUser,
  findByEmail,
  findByIdWithPassword,
  updatePassword,
} from '../models/userModel.js';
import { cacheUserSession, invalidateUserSession } from '../middleware/authMiddleware.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, full_name, timezone, currency, avatar_url } = req.body;

    // Check if email is already in use
    const existing = await findByEmail(email);
    if (existing) {
      return res.status(409).json({
        status: 409,
        error: 'Conflict',
        message: 'An account with this email address already exists.',
      });
    }

    // Hash password & create user
    const password_hash = await hashPassword(password);
    const user = await createUser({
      email,
      password_hash,
      full_name,
      timezone,
      currency,
      avatar_url,
    });

    // Generate JWT token & cache session
    const token = signToken({ userId: user.id, email: user.email });
    await cacheUserSession(user);

    res.status(201).json({
      status: 201,
      message: 'Account created successfully.',
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Log in an existing user
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const userWithPw = await findByEmail(email);
    if (!userWithPw) {
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await comparePassword(password, userWithPw.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    // Sanitize user object (omit password_hash)
    const { password_hash, ...user } = userWithPw;

    // Sign JWT & warm cache
    const token = signToken({ userId: user.id, email: user.email });
    await cacheUserSession(user);

    res.status(200).json({
      status: 200,
      message: 'Login successful.',
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
  res.status(200).json({
    status: 200,
    data: {
      user: req.user,
    },
  });
};

/**
 * Change current user password
 * POST /api/auth/change-password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await findByIdWithPassword(userId);
    if (!user) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'User not found.',
      });
    }

    const isMatch = await comparePassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        status: 400,
        error: 'Bad Request',
        message: 'Current password does not match.',
      });
    }

    const newHash = await hashPassword(newPassword);
    await updatePassword(userId, newHash);
    await invalidateUserSession(userId);

    const freshToken = signToken({ userId: user.id, email: user.email });

    res.status(200).json({
      status: 200,
      message: 'Password updated successfully.',
      data: {
        token: freshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Log out user (invalidates session cache)
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      await invalidateUserSession(req.user.id);
    }
    res.status(200).json({
      status: 200,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    next(err);
  }
};
