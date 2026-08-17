import { query } from '../config/db.js';

// ================= CATEGORIES =================

/**
 * Create a new financial category
 */
export const createCategory = async ({
  user_id,
  name,
  type,
  color_hex = '#6366F1',
  icon_name = 'wallet',
  monthly_budget_limit = 0,
}) => {
  const sql = `
    INSERT INTO categories (user_id, name, type, color_hex, icon_name, monthly_budget_limit)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id, name, type, color_hex, icon_name, monthly_budget_limit, created_at;
  `;
  const params = [user_id, name.trim(), type, color_hex, icon_name, monthly_budget_limit];
  const { rows } = await query(sql, params);
  return rows[0];
};

/**
 * Get categories with current monthly spent vs budget limit comparison
 */
export const getCategoriesWithBudgetProgress = async (user_id, targetMonth) => {
  // targetMonth format: 'YYYY-MM'
  const month = targetMonth || new Date().toISOString().slice(0, 7);
  const startOfMonth = `${month}-01`;

  const sql = `
    SELECT 
      c.id, c.user_id, c.name, c.type, c.color_hex, c.icon_name, 
      c.monthly_budget_limit, c.created_at,
      COALESCE(SUM(t.amount), 0) AS monthly_spent
    FROM categories c
    LEFT JOIN transactions t 
      ON c.id = t.category_id 
      AND t.user_id = c.user_id 
      AND TO_CHAR(t.transaction_date, 'YYYY-MM') = $2
    WHERE c.user_id = $1
    GROUP BY c.id
    ORDER BY c.type DESC, c.name ASC;
  `;
  const { rows } = await query(sql, [user_id, month]);

  return rows.map((r) => {
    const budgetLimit = parseFloat(r.monthly_budget_limit) || 0;
    const spent = parseFloat(r.monthly_spent) || 0;
    const percentage = budgetLimit > 0 ? Math.min(Math.round((spent / budgetLimit) * 100), 100) : 0;

    return {
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      type: r.type,
      color_hex: r.color_hex,
      icon_name: r.icon_name,
      monthly_budget_limit: budgetLimit,
      monthly_spent: spent,
      budget_percentage: percentage,
      is_over_budget: budgetLimit > 0 && spent > budgetLimit,
      created_at: r.created_at,
    };
  });
};

/**
 * Get single category by ID
 */
export const getCategoryById = async (user_id, id) => {
  const sql = `
    SELECT id, user_id, name, type, color_hex, icon_name, monthly_budget_limit, created_at
    FROM categories
    WHERE id = $1 AND user_id = $2;
  `;
  const { rows } = await query(sql, [id, user_id]);
  return rows[0] || null;
};

/**
 * Update category
 */
export const updateCategory = async (user_id, id, updateData) => {
  const fields = [];
  const params = [id, user_id];
  let paramIdx = 3;

  if (updateData.name !== undefined) {
    fields.push(`name = $${paramIdx++}`);
    params.push(updateData.name.trim());
  }
  if (updateData.color_hex !== undefined) {
    fields.push(`color_hex = $${paramIdx++}`);
    params.push(updateData.color_hex);
  }
  if (updateData.icon_name !== undefined) {
    fields.push(`icon_name = $${paramIdx++}`);
    params.push(updateData.icon_name);
  }
  if (updateData.monthly_budget_limit !== undefined) {
    fields.push(`monthly_budget_limit = $${paramIdx++}`);
    params.push(updateData.monthly_budget_limit);
  }

  if (fields.length === 0) {
    return getCategoryById(user_id, id);
  }

  const sql = `
    UPDATE categories
    SET ${fields.join(', ')}
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, name, type, color_hex, icon_name, monthly_budget_limit, created_at;
  `;
  const { rows } = await query(sql, params);
  return rows[0] || null;
};

/**
 * Delete category
 */
export const deleteCategory = async (user_id, id) => {
  const sql = `DELETE FROM categories WHERE id = $1 AND user_id = $2;`;
  const { rowCount } = await query(sql, [id, user_id]);
  return rowCount > 0;
};

// ================= TRANSACTIONS =================

/**
 * Create a financial transaction
 */
export const createTransaction = async ({
  user_id,
  category_id = null,
  amount,
  type,
  transaction_date,
  note = null,
}) => {
  const date = transaction_date || new Date().toISOString().split('T')[0];
  const sql = `
    INSERT INTO transactions (user_id, category_id, amount, type, transaction_date, note)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id, category_id, amount, type, transaction_date, note, created_at, updated_at;
  `;
  const params = [user_id, category_id, amount, type, date, note];
  const { rows } = await query(sql, params);
  return rows[0];
};

/**
 * List transactions with category joins, filtering, and pagination
 */
export const getTransactions = async (user_id, options = {}) => {
  const {
    type,
    category_id,
    start_date,
    end_date,
    page = 1,
    limit = 20,
  } = options;

  const conditions = ['t.user_id = $1'];
  const params = [user_id];
  let paramIdx = 2;

  if (type) {
    conditions.push(`t.type = $${paramIdx++}`);
    params.push(type);
  }

  if (category_id) {
    conditions.push(`t.category_id = $${paramIdx++}`);
    params.push(category_id);
  }

  if (start_date && end_date) {
    conditions.push(`t.transaction_date BETWEEN $${paramIdx++} AND $${paramIdx++}`);
    params.push(start_date, end_date);
  } else if (start_date) {
    conditions.push(`t.transaction_date >= $${paramIdx++}`);
    params.push(start_date);
  } else if (end_date) {
    conditions.push(`t.transaction_date <= $${paramIdx++}`);
    params.push(end_date);
  }

  const whereClause = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  // Count total
  const countSql = `SELECT COUNT(*) AS total FROM transactions t WHERE ${whereClause};`;
  const countRes = await query(countSql, params);
  const total = parseInt(countRes.rows[0].total, 10);

  // Fetch paginated transactions with category data
  const listSql = `
    SELECT 
      t.id, t.user_id, t.category_id, t.amount, t.type, t.transaction_date, t.note, t.created_at, t.updated_at,
      c.name AS category_name,
      c.color_hex AS category_color,
      c.icon_name AS category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE ${whereClause}
    ORDER BY t.transaction_date DESC, t.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++};
  `;
  const listParams = [...params, limit, offset];
  const { rows } = await query(listSql, listParams);

  return {
    transactions: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get single transaction by ID
 */
export const getTransactionById = async (user_id, id) => {
  const sql = `
    SELECT 
      t.id, t.user_id, t.category_id, t.amount, t.type, t.transaction_date, t.note, t.created_at, t.updated_at,
      c.name AS category_name,
      c.color_hex AS category_color,
      c.icon_name AS category_icon
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = $1 AND t.user_id = $2;
  `;
  const { rows } = await query(sql, [id, user_id]);
  return rows[0] || null;
};

/**
 * Update transaction
 */
export const updateTransaction = async (user_id, id, updateData) => {
  const fields = [];
  const params = [id, user_id];
  let paramIdx = 3;

  if (updateData.amount !== undefined) {
    fields.push(`amount = $${paramIdx++}`);
    params.push(updateData.amount);
  }
  if (updateData.type !== undefined) {
    fields.push(`type = $${paramIdx++}`);
    params.push(updateData.type);
  }
  if (updateData.category_id !== undefined) {
    fields.push(`category_id = $${paramIdx++}`);
    params.push(updateData.category_id);
  }
  if (updateData.transaction_date !== undefined) {
    fields.push(`transaction_date = $${paramIdx++}`);
    params.push(updateData.transaction_date);
  }
  if (updateData.note !== undefined) {
    fields.push(`note = $${paramIdx++}`);
    params.push(updateData.note);
  }

  if (fields.length === 0) {
    return getTransactionById(user_id, id);
  }

  const sql = `
    UPDATE transactions
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, category_id, amount, type, transaction_date, note, created_at, updated_at;
  `;
  const { rows } = await query(sql, params);
  return rows[0] || null;
};

/**
 * Delete transaction
 */
export const deleteTransaction = async (user_id, id) => {
  const sql = `DELETE FROM transactions WHERE id = $1 AND user_id = $2;`;
  const { rowCount } = await query(sql, [id, user_id]);
  return rowCount > 0;
};

/**
 * Get monthly financial breakdown & metrics
 */
export const getMonthlyFinancialSummary = async (user_id, targetMonth) => {
  const month = targetMonth || new Date().toISOString().slice(0, 7);

  // Overall totals
  const totalsSql = `
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
      COUNT(*) AS total_transactions
    FROM transactions
    WHERE user_id = $1 AND TO_CHAR(transaction_date, 'YYYY-MM') = $2;
  `;
  const totalsRes = await query(totalsSql, [user_id, month]);
  const totalIncome = parseFloat(totalsRes.rows[0].total_income);
  const totalExpense = parseFloat(totalsRes.rows[0].total_expense);
  const netSavings = totalIncome - totalExpense;

  // Category breakdown for expenses
  const categoryBreakdownSql = `
    SELECT 
      COALESCE(c.id::text, 'uncategorized') AS category_id,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      COALESCE(c.color_hex, '#94A3B8') AS category_color,
      COALESCE(c.icon_name, 'help-circle') AS category_icon,
      SUM(t.amount) AS total_amount,
      COUNT(t.id) AS transaction_count
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1 AND t.type = 'expense' AND TO_CHAR(t.transaction_date, 'YYYY-MM') = $2
    GROUP BY c.id, c.name, c.color_hex, c.icon_name
    ORDER BY total_amount DESC;
  `;
  const breakdownRes = await query(categoryBreakdownSql, [user_id, month]);

  const categories = breakdownRes.rows.map((r) => {
    const amount = parseFloat(r.total_amount);
    const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
    return {
      category_id: r.category_id,
      category_name: r.category_name,
      category_color: r.category_color,
      category_icon: r.category_icon,
      total_amount: amount,
      percentage,
      transaction_count: parseInt(r.transaction_count, 10),
    };
  });

  return {
    month,
    total_income: totalIncome,
    total_expense: totalExpense,
    net_savings: netSavings,
    savings_rate: totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0,
    total_transactions: parseInt(totalsRes.rows[0].total_transactions, 10),
    category_breakdown: categories,
  };
};
