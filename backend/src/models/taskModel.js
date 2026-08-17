import { query } from '../config/db.js';

/**
 * Create a new task
 */
export const createTask = async ({
  user_id,
  synapse_id = null,
  title,
  description = null,
  priority = 'medium',
  due_date = null,
  due_time = null,
  recurrence_rule = null,
}) => {
  const sql = `
    INSERT INTO tasks (user_id, synapse_id, title, description, status, priority, due_date, due_time, recurrence_rule)
    VALUES ($1, $2, $3, $4, 'todo', $5, $6, $7, $8)
    RETURNING id, user_id, synapse_id, title, description, status, priority, due_date, due_time, recurrence_rule, completed_at, created_at, updated_at;
  `;
  const params = [user_id, synapse_id, title.trim(), description, priority, due_date, due_time, recurrence_rule];
  const { rows } = await query(sql, params);
  return rows[0];
};

/**
 * List & search tasks with pagination, date range, priority, and status filters
 */
export const getTasks = async (user_id, options = {}) => {
  const {
    status,
    priority,
    due_date,
    start_date,
    end_date,
    search,
    page = 1,
    limit = 20,
  } = options;

  const conditions = ['user_id = $1'];
  const params = [user_id];
  let paramIdx = 2;

  if (status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(status);
  }

  if (priority) {
    conditions.push(`priority = $${paramIdx++}`);
    params.push(priority);
  }

  if (due_date) {
    conditions.push(`due_date = $${paramIdx++}`);
    params.push(due_date);
  } else if (start_date && end_date) {
    conditions.push(`due_date BETWEEN $${paramIdx++} AND $${paramIdx++}`);
    params.push(start_date, end_date);
  } else if (start_date) {
    conditions.push(`due_date >= $${paramIdx++}`);
    params.push(start_date);
  } else if (end_date) {
    conditions.push(`due_date <= $${paramIdx++}`);
    params.push(end_date);
  }

  if (search && search.trim()) {
    conditions.push(`(title ILIKE $${paramIdx} OR description ILIKE $${paramIdx})`);
    params.push(`%${search.trim()}%`);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  // Count total matching tasks
  const countSql = `SELECT COUNT(*) AS total FROM tasks WHERE ${whereClause};`;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].total, 10);

  // Fetch paginated tasks ordered by due_date ASC, priority DESC, created_at DESC
  const listSql = `
    SELECT id, user_id, synapse_id, title, description, status, priority, due_date, due_time, recurrence_rule, completed_at, created_at, updated_at
    FROM tasks
    WHERE ${whereClause}
    ORDER BY 
      CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
      due_date ASC,
      CASE priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
      END,
      created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;
  const listParams = [...params, limit, offset];
  const { rows } = await query(listSql, listParams);

  return {
    tasks: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get single task by ID ensuring user ownership
 */
export const getTaskById = async (user_id, id) => {
  const sql = `
    SELECT id, user_id, synapse_id, title, description, status, priority, due_date, due_time, recurrence_rule, completed_at, created_at, updated_at
    FROM tasks
    WHERE id = $1 AND user_id = $2;
  `;
  const { rows } = await query(sql, [id, user_id]);
  return rows[0] || null;
};

/**
 * Update task with automated completed_at lifecycle transitions
 */
export const updateTask = async (user_id, id, updateData) => {
  const fields = [];
  const params = [id, user_id];
  let paramIdx = 3;

  if (updateData.title !== undefined) {
    fields.push(`title = $${paramIdx++}`);
    params.push(updateData.title.trim());
  }
  if (updateData.description !== undefined) {
    fields.push(`description = $${paramIdx++}`);
    params.push(updateData.description);
  }
  if (updateData.priority !== undefined) {
    fields.push(`priority = $${paramIdx++}`);
    params.push(updateData.priority);
  }
  if (updateData.due_date !== undefined) {
    fields.push(`due_date = $${paramIdx++}`);
    params.push(updateData.due_date);
  }
  if (updateData.due_time !== undefined) {
    fields.push(`due_time = $${paramIdx++}`);
    params.push(updateData.due_time);
  }
  if (updateData.recurrence_rule !== undefined) {
    fields.push(`recurrence_rule = $${paramIdx++}`);
    params.push(updateData.recurrence_rule);
  }

  // Handle status transition
  if (updateData.status !== undefined) {
    fields.push(`status = $${paramIdx++}`);
    params.push(updateData.status);

    if (updateData.status === 'completed') {
      fields.push(`completed_at = COALESCE(completed_at, NOW())`);
    } else {
      fields.push(`completed_at = NULL`);
    }
  }

  if (fields.length === 0) {
    return getTaskById(user_id, id);
  }

  const sql = `
    UPDATE tasks
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, synapse_id, title, description, status, priority, due_date, due_time, recurrence_rule, completed_at, created_at, updated_at;
  `;

  const { rows } = await query(sql, params);
  return rows[0] || null;
};

/**
 * Delete a task
 */
export const deleteTask = async (user_id, id) => {
  const sql = `DELETE FROM tasks WHERE id = $1 AND user_id = $2;`;
  const { rowCount } = await query(sql, [id, user_id]);
  return rowCount > 0;
};

/**
 * Aggregate summary counts for user's tasks
 */
export const getTaskSummaryStats = async (user_id) => {
  const sql = `
    SELECT
      COUNT(*) FILTER (WHERE status = 'todo') AS todo_count,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) AS overdue_count,
      COUNT(*) AS total_count
    FROM tasks
    WHERE user_id = $1;
  `;
  const { rows } = await query(sql, [user_id]);
  const s = rows[0];
  return {
    todo: parseInt(s.todo_count || 0, 10),
    in_progress: parseInt(s.in_progress_count || 0, 10),
    completed: parseInt(s.completed_count || 0, 10),
    cancelled: parseInt(s.cancelled_count || 0, 10),
    overdue: parseInt(s.overdue_count || 0, 10),
    total: parseInt(s.total_count || 0, 10),
  };
};
