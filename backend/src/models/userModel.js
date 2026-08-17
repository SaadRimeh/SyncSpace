import { query } from '../config/db.js';

/**
 * Create a new user record
 * @param {Object} userData
 * @returns {Promise<Object>} Sanitized user record
 */
export const createUser = async ({
  email,
  password_hash,
  full_name,
  avatar_url = null,
  timezone = 'UTC',
  currency = 'USD',
}) => {
  const sql = `
    INSERT INTO users (email, password_hash, full_name, avatar_url, timezone, currency)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, email, full_name, avatar_url, timezone, currency, created_at, updated_at;
  `;
  const params = [email.toLowerCase().trim(), password_hash, full_name.trim(), avatar_url, timezone, currency];
  const { rows } = await query(sql, params);
  return rows[0];
};

/**
 * Find user by email (includes password_hash for authentication)
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export const findByEmail = async (email) => {
  const sql = `
    SELECT id, email, password_hash, full_name, avatar_url, timezone, currency, created_at, updated_at
    FROM users
    WHERE LOWER(email) = LOWER($1);
  `;
  const { rows } = await query(sql, [email.trim()]);
  return rows[0] || null;
};

/**
 * Find user by ID (sanitized, excludes password_hash)
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export const findById = async (id) => {
  const sql = `
    SELECT id, email, full_name, avatar_url, timezone, currency, created_at, updated_at
    FROM users
    WHERE id = $1;
  `;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
};

/**
 * Find user by ID including password_hash (for password change verification)
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export const findByIdWithPassword = async (id) => {
  const sql = `
    SELECT id, email, password_hash, full_name, avatar_url, timezone, currency, created_at, updated_at
    FROM users
    WHERE id = $1;
  `;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
};

/**
 * Update user profile preferences
 * @param {string} id
 * @param {Object} updateData
 * @returns {Promise<Object|null>}
 */
export const updateProfile = async (id, { full_name, avatar_url, timezone, currency }) => {
  const fields = [];
  const params = [id];
  let paramIdx = 2;

  if (full_name !== undefined) {
    fields.push(`full_name = $${paramIdx++}`);
    params.push(full_name.trim());
  }
  if (avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIdx++}`);
    params.push(avatar_url);
  }
  if (timezone !== undefined) {
    fields.push(`timezone = $${paramIdx++}`);
    params.push(timezone);
  }
  if (currency !== undefined) {
    fields.push(`currency = $${paramIdx++}`);
    params.push(currency.toUpperCase());
  }

  if (fields.length === 0) {
    return findById(id);
  }

  const sql = `
    UPDATE users
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, full_name, avatar_url, timezone, currency, created_at, updated_at;
  `;

  const { rows } = await query(sql, params);
  return rows[0] || null;
};

/**
 * Update user password hash
 * @param {string} id
 * @param {string} newPasswordHash
 * @returns {Promise<boolean>}
 */
export const updatePassword = async (id, newPasswordHash) => {
  const sql = `
    UPDATE users
    SET password_hash = $2, updated_at = NOW()
    WHERE id = $1;
  `;
  const { rowCount } = await query(sql, [id, newPasswordHash]);
  return rowCount > 0;
};

/**
 * Delete user account
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export const deleteUser = async (id) => {
  const sql = `DELETE FROM users WHERE id = $1;`;
  const { rowCount } = await query(sql, [id]);
  return rowCount > 0;
};
