import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../services/apiResponse';
import { getProductAnalytics, getBulkProductAnalytics } from '../services/analytics.service';
import { Product } from '../models/Product';
import { ProductViewEvent } from '../models/ProductViewEvent';
import { ProductAnalytics } from '../models/ProductAnalytics';

export const getProductStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.productId as string;
    if (!productId) return sendError(res, 'Product ID required', 400);

    const analytics = await getProductAnalytics(productId);
    sendSuccess(res, { data: analytics });
  } catch (error) {
    next(error);
  }
};

export const getBulkStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const idsParam = req.query.ids;
    const idsStr = Array.isArray(idsParam) ? idsParam[0] : idsParam;
    if (!idsStr || typeof idsStr !== 'string') {
      return sendError(res, 'Comma-separated product IDs required', 400);
    }

    const productIds = idsStr.split(',').map((s: string) => s.trim()).filter(Boolean);
    const analytics = await getBulkProductAnalytics(productIds);
    sendSuccess(res, { data: analytics });
  } catch (error) {
    next(error);
  }
};

export const getDashboardOverview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const totalProducts = await Product.countDocuments({ isDeleted: false, publishStatus: 'published' });
    const totalAnalytics = await ProductAnalytics.find();

    const totalUniqueViews = totalAnalytics.reduce((s, a) => s + a.totalUniqueViews, 0);
    const totalPurchases = totalAnalytics.reduce((s, a) => s + a.totalPurchases, 0);
    const totalRevenue = totalAnalytics.reduce((s, a) => s + a.totalRevenue, 0);
    const totalCartAdds = totalAnalytics.reduce((s, a) => s + a.totalCartAdds, 0);
    const activeCartItems = totalAnalytics.reduce((s, a) => s + a.currentCartUsers.length, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActiveProducts = totalAnalytics.reduce((s, a) => {
      if (a.lastViewedAt && a.lastViewedAt >= today) return s + 1;
      return s;
    }, 0);

    sendSuccess(res, {
      data: {
        totalProducts,
        totalUniqueViews,
        totalPurchases,
        totalRevenue,
        totalCartAdds,
        activeCartItems,
        todayActiveProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProductViewHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.productId as string;
    if (!productId) return sendError(res, 'Product ID required', 400);

    const daysParam = req.query.days;
    const days = typeof daysParam === 'string' ? parseInt(daysParam) : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await ProductViewEvent.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId), viewedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$viewedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    sendSuccess(res, { data: events });
  } catch (error) {
    next(error);
  }
};

export const resetCartAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.productId;
    const query = productId ? { productId: new mongoose.Types.ObjectId(String(productId)) } : {};
    await ProductAnalytics.updateMany(query, {
      $set: { currentCartUsers: [], totalCartAdds: 0, totalCartRemoves: 0, totalUniqueCartUsers: 0 }
    });
    sendSuccess(res, { data: null, message: 'Cart analytics reset successfully' });
  } catch (error) {
    next(error);
  }
};
