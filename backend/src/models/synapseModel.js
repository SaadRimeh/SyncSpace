import { query, getClient } from '../config/db.js';

/**
 * Create a new synapse note
 */
export const createSynapse = async ({
  user_id,
  title,
  content = '',
  tags = [],
  is_pinned = false,
}) => {
  const sql = `
    INSERT INTO synapses (user_id, title, content, tags, is_pinned)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, title, content, tags, is_pinned, is_archived, converted_to_task_id, created_at, updated_at;
  `;
  const params = [user_id, title.trim(), content, tags, is_pinned];
  const { rows } = await query(sql, params);
  return rows[0];
};

/**
 * List & search synapse notes with pagination & filters
 */
export const getSynapses = async (user_id, options = {}) => {
  const {
    search,
    tag,
    is_pinned,
    is_archived = false,
    page = 1,
    limit = 20,
  } = options;

  const conditions = ['user_id = $1'];
  const params = [user_id];
  let paramIdx = 2;

  if (is_archived !== undefined) {
    conditions.push(`is_archived = $${paramIdx++}`);
    params.push(is_archived);
  }

  if (is_pinned !== undefined) {
    conditions.push(`is_pinned = $${paramIdx++}`);
    params.push(is_pinned);
  }

  if (tag) {
    conditions.push(`$${paramIdx++} = ANY(tags)`);
    params.push(tag.trim());
  }

  if (search && search.trim()) {
    conditions.push(`(title ILIKE $${paramIdx} OR content ILIKE $${paramIdx})`);
    params.push(`%${search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  // Count total matching items
  const countSql = `SELECT COUNT(*) AS total FROM synapses WHERE ${whereClause};`;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].total, 10);

  // Fetch paginated results
  const listSql = `
    SELECT id, user_id, title, content, tags, is_pinned, is_archived, converted_to_task_id, created_at, updated_at
    FROM synapses
    WHERE ${whereClause}
    ORDER BY is_pinned DESC, updated_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;
  const listParams = [...params, limit, offset];
  const { rows } = await query(listSql, listParams);

  return {
    notes: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get single synapse note by ID ensuring user ownership
 */
export const getSynapseById = async (user_id, id) => {
  const sql = `
    SELECT id, user_id, title, content, tags, is_pinned, is_archived, converted_to_task_id, created_at, updated_at
    FROM synapses
    WHERE id = $1 AND user_id = $2;
  `;
  const { rows } = await query(sql, [id, user_id]);
  return rows[0] || null;
};

/**
 * Partial update for synapse note
 */
export const updateSynapse = async (user_id, id, updateData) => {
  const fields = [];
  const params = [id, user_id];
  let paramIdx = 3;

  if (updateData.title !== undefined) {
    fields.push(`title = $${paramIdx++}`);
    params.push(updateData.title.trim());
  }
  if (updateData.content !== undefined) {
    fields.push(`content = $${paramIdx++}`);
    params.push(updateData.content);
  }
  if (updateData.tags !== undefined) {
    fields.push(`tags = $${paramIdx++}`);
    params.push(updateData.tags);
  }
  if (updateData.is_pinned !== undefined) {
    fields.push(`is_pinned = $${paramIdx++}`);
    params.push(updateData.is_pinned);
  }
  if (updateData.is_archived !== undefined) {
    fields.push(`is_archived = $${paramIdx++}`);
    params.push(updateData.is_archived);
  }

  if (fields.length === 0) {
    return getSynapseById(user_id, id);
  }

  const sql = `
    UPDATE synapses
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, title, content, tags, is_pinned, is_archived, converted_to_task_id, created_at, updated_at;
  `;

  const { rows } = await query(sql, params);
  return rows[0] || null;
};

/**
 * Delete a synapse note
 */
export const deleteSynapse = async (user_id, id) => {
  const sql = `DELETE FROM synapses WHERE id = $1 AND user_id = $2;`;
  const { rowCount } = await query(sql, [id, user_id]);
  return rowCount > 0;
};

/**
 * Get distinct tags used across user's notes
 */
export const getUserTags = async (user_id) => {
  const sql = `
    SELECT DISTINCT unnest(tags) AS tag
    FROM synapses
    WHERE user_id = $1
    ORDER BY tag ASC;
  `;
  const { rows } = await query(sql, [user_id]);
  return rows.map((r) => r.tag);
};

/**
 * Atomic Binary Conversion: Converts synapse note into a scheduled task
 */
export const convertSynapseToTask = async ({
  user_id,
  synapse_id,
  taskData,
  archive_note = true,
}) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Verify note existence and ownership
    const noteRes = await client.query(
      `SELECT * FROM synapses WHERE id = $1 AND user_id = $2 FOR UPDATE;`,
      [synapse_id, user_id]
    );

    if (noteRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { error: 'Note not found or unauthorized' };
    }

    const note = noteRes.rows[0];

    // 2. Insert into tasks table
    const taskTitle = taskData.title || note.title;
    const taskDesc = taskData.description !== undefined ? taskData.description : note.content;
    const priority = taskData.priority || 'medium';
    const dueDate = taskData.due_date;
    const dueTime = taskData.due_time || null;
    const recurrence = taskData.recurrence_rule || null;

    const insertTaskSql = `
      INSERT INTO tasks (user_id, synapse_id, title, description, status, priority, due_date, due_time, recurrence_rule)
      VALUES ($1, $2, $3, $4, 'todo', $5, $6, $7, $8)
      RETURNING id, user_id, synapse_id, title, description, status, priority, due_date, due_time, recurrence_rule, completed_at, created_at, updated_at;
    `;
    const taskParams = [user_id, synapse_id, taskTitle, taskDesc, priority, dueDate, dueTime, recurrence];
    const taskRes = await client.query(insertTaskSql, taskParams);
    const newTask = taskRes.rows[0];

    // 3. Update Synapse note with converted_to_task_id and optional archive
    const updateSynapseSql = `
      UPDATE synapses
      SET converted_to_task_id = $1,
          is_archived = CASE WHEN $2 = TRUE THEN TRUE ELSE is_archived END,
          updated_at = NOW()
      WHERE id = $3 AND user_id = $4
      RETURNING id, user_id, title, content, tags, is_pinned, is_archived, converted_to_task_id, created_at, updated_at;
    `;
    const updateSynapseRes = await client.query(updateSynapseSql, [
      newTask.id,
      archive_note,
      synapse_id,
      user_id,
    ]);
    const updatedNote = updateSynapseRes.rows[0];

    await client.query('COMMIT');

    return {
      synapse: updatedNote,
      task: newTask,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    if (client.release) {
      client.release();
    }
  }
};
