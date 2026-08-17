import {
  createCategory as createNewCategory,
  getCategoriesWithBudgetProgress,
  getCategoryById as fetchCategoryById,
  updateCategory as modifyCategory,
  deleteCategory as removeCategory,
  createTransaction as createNewTransaction,
  getTransactions as listTransactions,
  getTransactionById as fetchTransactionById,
  updateTransaction as modifyTransaction,
  deleteTransaction as removeTransaction,
  getMonthlyFinancialSummary,
} from '../models/ledgerModel.js';
import { invalidatePattern } from '../config/redis.js';

// ================= CATEGORIES =================

export const createCategory = async (req, res, next) => {
  try {
    const { name, type, color_hex, icon_name, monthly_budget_limit } = req.body;
    const category = await createNewCategory({
      user_id: req.user.id,
      name,
      type,
      color_hex,
      icon_name,
      monthly_budget_limit,
    });

    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(201).json({
      status: 201,
      message: 'Category created successfully.',
      data: {
        category,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        status: 409,
        error: 'Conflict',
        message: 'A category with this name and type already exists.',
      });
    }
    next(err);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const categories = await getCategoriesWithBudgetProgress(req.user.id, req.query.month);
    res.status(200).json({
      status: 200,
      data: {
        categories,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await fetchCategoryById(req.user.id, req.params.id);
    if (!category) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Category not found.',
      });
    }

    res.status(200).json({
      status: 200,
      data: {
        category,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const updated = await modifyCategory(req.user.id, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Category not found.',
      });
    }

    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(200).json({
      status: 200,
      message: 'Category updated successfully.',
      data: {
        category: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const deleted = await removeCategory(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Category not found.',
      });
    }

    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(200).json({
      status: 200,
      message: 'Category deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// ================= TRANSACTIONS =================

export const createTransaction = async (req, res, next) => {
  try {
    const { amount, type, category_id, transaction_date, note } = req.body;
    const transaction = await createNewTransaction({
      user_id: req.user.id,
      amount,
      type,
      category_id,
      transaction_date,
      note,
    });

    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(201).json({
      status: 201,
      message: 'Transaction recorded successfully.',
      data: {
        transaction,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const result = await listTransactions(req.user.id, req.query);
    res.status(200).json({
      status: 200,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await fetchTransactionById(req.user.id, req.params.id);
    if (!transaction) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Transaction not found.',
      });
    }

    res.status(200).json({
      status: 200,
      data: {
        transaction,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateTransaction = async (req, res, next) => {
  try {
    const updated = await modifyTransaction(req.user.id, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Transaction not found.',
      });
    }

    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(200).json({
      status: 200,
      message: 'Transaction updated successfully.',
      data: {
        transaction: updated,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTransaction = async (req, res, next) => {
  try {
    const deleted = await removeTransaction(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({
        status: 404,
        error: 'Not Found',
        message: 'Transaction not found.',
      });
    }

    await invalidatePattern(`canvas:user:${req.user.id}:*`);

    res.status(200).json({
      status: 200,
      message: 'Transaction deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

export const getMonthlySummary = async (req, res, next) => {
  try {
    const summary = await getMonthlyFinancialSummary(req.user.id, req.query.month);
    res.status(200).json({
      status: 200,
      data: {
        summary,
      },
    });
  } catch (err) {
    next(err);
  }
};
