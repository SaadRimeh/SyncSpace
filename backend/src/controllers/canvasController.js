import { getDailyCanvasData } from '../models/canvasModel.js';

/**
 * High-speed aggregated Daily Canvas for CURRENT_DATE
 * GET /api/canvas/today
 */
export const getTodayCanvas = async (req, res, next) => {
  try {
    const forceRefresh = req.query.force_refresh === 'true';
    const canvas = await getDailyCanvasData(req.user, req.query.date, forceRefresh);

    res.status(200).json({
      status: 200,
      data: {
        canvas,
      },
    });
  } catch (err) {
    next(err);
  }
};
