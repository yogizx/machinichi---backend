import { Response, NextFunction } from 'express';
import { Order } from '../../models/Order';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import { Review } from '../../models/Review';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../../services/apiResponse';
import { analyticsQuerySchema } from '../../validators';
import { Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { Category } from '../../models/Category';
import { ReportConfig } from '../../models/ReportConfig';
import { AnalyticsSettings } from '../../models/AnalyticsSettings';
import { sendAnalyticsReportEmail } from '../../services/email.service';
import { APPROVED_ORDER_STATUSES, REGIONAL_ORDER_STATUSES } from '../../services/regionalAnalytics.service';

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalOrders,
      totalRevenue,
      totalUsers,
      totalProducts,
      pendingOrders,
      todayOrders,
      monthOrders,
      lowStockProducts,
      pendingReviews,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } } } },
      ]),
      // Count unique customers who placed at least one order (matches Customers.jsx)
      Order.aggregate([
        { $group: { _id: '$userId' } },
        { $count: 'total' },
      ]).then((r) => r[0]?.total || 0),
      Product.countDocuments({ isDeleted: false }),
      Order.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ createdAt: { $gte: thisMonth } }),
      Product.countDocuments({
        isDeleted: false,
        $or: [
          { quantity: { $lte: 10, $gt: 0 } },
          { 'variants.quantity': { $lte: 10 } },
        ],
      }),
      Review.countDocuments({ isApproved: false }),
    ]);

    sendSuccess(res, {
      data: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalUsers,
        totalProducts,
        pendingOrders,
        todayOrders,
        monthOrders,
        lowStockProducts,
        pendingReviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRevenueAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = analyticsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { startDate, endDate, groupBy } = validation.data;

    const start = startDate ? new Date(startDate) : new Date('2024-01-01T00:00:00.000Z');
    const end = endDate ? new Date(endDate) : new Date('2026-12-31T23:59:59.999Z');

    const groupFormat: Record<string, any> = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week: { $dateToString: { format: '%Y-W%V', date: '$createdAt' } },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
    };

    const revenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: { $in: ['Paid', 'Refunded'] },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: groupFormat[groupBy],
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'Refunded'] },
                { $multiply: [{ $ifNull: ['$totalAmount', '$orderTotal'] }, -1] },
                { $ifNull: ['$totalAmount', '$orderTotal'] }
              ]
            },
          },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: { $ifNull: ['$totalAmount', '$orderTotal'] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    sendSuccess(res, { data: revenue });
  } catch (error) {
    next(error);
  }
};

export const getTopProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            $cond: {
              if: { $ne: ['$items.productId', null] },
              then: '$items.productId',
              else: '$items.name'
            }
          },
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          sellingPrice: { $first: '$items.sellingPrice' },
          totalSales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.lineTotal' },
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: limitNum },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productData'
        }
      },
      { $unwind: { path: '$productData', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'productData.category',
          foreignField: '_id',
          as: 'categoryData'
        }
      },
      { $unwind: { path: '$categoryData', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ['$productData.name', '$name'] },
          image: { $ifNull: ['$productData.images', ['$image']] },
          sellingPrice: { $ifNull: ['$productData.sellingPrice', '$sellingPrice'] },
          categoryName: '$categoryData.name',
          categorySlug: '$categoryData.slug',
          totalSales: 1,
          totalRevenue: 1,
        }
      }
    ]);

    sendSuccess(res, { data: topProducts });
  } catch (error) {
    next(error);
  }
};

export const getOrderStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = analyticsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { startDate, endDate, groupBy } = validation.data;

    const start = startDate ? new Date(startDate) : new Date('2024-01-01T00:00:00.000Z');
    const end = endDate ? new Date(endDate) : new Date('2026-12-31T23:59:59.999Z');

    const groupFormat: Record<string, any> = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week: { $dateToString: { format: '%Y-W%V', date: '$createdAt' } },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
    };

    const stats = await Order.aggregate([
      {
        $match: { createdAt: { $gte: start, $lte: end } },
      },
      {
        $group: {
          _id: groupFormat[groupBy],
          total: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          returned: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } },
          cod: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cod'] }, 1, 0] } },
          online: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'razorpay'] }, 1, 0] } },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'Paid'] },
                { $ifNull: ['$totalAmount', '$orderTotal'] },
                0
              ]
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    sendSuccess(res, { data: stats });
  } catch (error) {
    next(error);
  }
};

export const getUserAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = analyticsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { startDate, endDate, groupBy } = validation.data;

    const start = startDate ? new Date(startDate) : new Date('2024-01-01T00:00:00.000Z');
    const end = endDate ? new Date(endDate) : new Date('2026-12-31T23:59:59.999Z');

    const groupFormat: Record<string, any> = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week: { $dateToString: { format: '%Y-W%V', date: '$createdAt' } },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
    };

    const users = await User.aggregate([
      {
        $match: { createdAt: { $gte: start, $lte: end }, isDeleted: false },
      },
      {
        $group: {
          _id: groupFormat[groupBy],
          newUsers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const total = await User.countDocuments({ isDeleted: false });

    sendSuccess(res, { data: { registrations: users, totalUsers: total } });
  } catch (error) {
    next(error);
  }
};

export const getCategoryDistribution = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const distribution = await Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          let: { pid: '$items.productId', pname: '$items.name' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$pid'] },
                    { $eq: [{ $toLower: '$name' }, { $toLower: '$$pname' }] }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: 'matchedProduct'
        }
      },
      { $unwind: { path: '$matchedProduct', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'matchedProduct.category',
          foreignField: '_id',
          as: 'cat'
        }
      },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$cat._id',
          categoryName: { $first: '$cat.name' },
          categorySlug: { $first: '$cat.slug' },
          totalSales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.lineTotal' },
        }
      },
      { $sort: { totalSales: -1 } },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: 1,
          categorySlug: 1,
          totalSales: 1,
          totalRevenue: 1,
        }
      }
    ]);

    sendSuccess(res, { data: distribution });
  } catch (error) {
    next(error);
  }
};

export const getProductUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const productId = String(req.params.id);
    // Get unique users from Order for this product
    const users = await Order.aggregate([
      { $match: { 'items.productId': new Types.ObjectId(productId) } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: '$userId',
        name: { $first: '$shippingAddress.fullName' },
        phone: { $first: '$shippingAddress.phoneNumber' },
        latestOrderDate: { $first: '$createdAt' },
        latestOrderStatus: { $first: '$status' },
      }},
      {
        $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
    ]);
    
    const formatted = users.map(u => ({
      id: u._id,
      name: u.user?.name || u.name || 'Guest User',
      email: u.user?.email || 'N/A',
      phone: u.user?.phone || u.phone || 'N/A',
      isGuest: !u.user,
      avatar: u.user?.avatar || null,
      views: 0,
      cart: 0,
      favorite: 0,
      cartConversion: '100%',
      purchaseStatus: u.latestOrderStatus || 'Unknown',
      purchaseDate: u.latestOrderDate
    }));
    
    sendSuccess(res, { data: formatted });
  } catch (error) {
    next(error);
  }
};

// Helper to parse date ranges
export const parseDateRange = (rangeStr: string, queryStart?: string, queryEnd?: string) => {
  if (queryStart && queryEnd) {
    const startDate = new Date(queryStart);
    const endDate = new Date(queryEnd);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  let startDate = new Date('2024-01-01T00:00:00.000Z');
  let endDate = new Date('2026-12-31T23:59:59.999Z');

  const today = new Date();
  if (rangeStr === 'Last 30 Days') {
    startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    endDate = today;
  } else if (rangeStr === 'This Month') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (rangeStr === 'This Year') {
    startDate = new Date(today.getFullYear(), 0, 1);
    endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (rangeStr === 'All Time') {
    startDate = new Date('2020-01-01T00:00:00.000Z');
    endDate = new Date('2030-12-31T23:59:59.999Z');
  } else if (rangeStr === 'Q4 2024') {
    startDate = new Date('2024-10-01T00:00:00.000Z');
    endDate = new Date('2024-12-31T23:59:59.999Z');
  } else if (rangeStr === 'Sep 01, 2024 - Sep 30, 2024') {
    startDate = new Date('2024-09-01T00:00:00.000Z');
    endDate = new Date('2024-09-30T23:59:59.999Z');
  } else if (rangeStr === 'Oct 01, 2024 - Oct 31, 2024') {
    startDate = new Date('2024-10-01T00:00:00.000Z');
    endDate = new Date('2024-10-31T23:59:59.999Z');
  } else if (rangeStr.includes(' - ')) {
    const [startPart, endPart] = rangeStr.split(' - ');
    const s = new Date(startPart);
    const e = new Date(endPart);
    if (!isNaN(s.getTime())) startDate = s;
    if (!isNaN(e.getTime())) {
      endDate = e;
      endDate.setHours(23, 59, 59, 999);
    }
  }

  return { startDate, endDate };
};

// Helper for Report Data aggregation
const getReportData = async (reportType: string, startDate: Date, endDate: Date): Promise<any[]> => {
  if (reportType === 'Inventory Turnover Ratio') {
    const products = await Product.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          sku: 1,
          category: '$categoryInfo.name',
          sales: '$totalSales',
          stock: '$quantity'
        }
      }
    ]);
    return products.map(p => {
      const sales = p.sales || 0;
      const stock = p.stock || 0;
      const turnover = (sales + stock) > 0 ? (sales / (sales + stock)).toFixed(2) : '0.00';
      return {
        name: p.name,
        sku: p.sku || 'N/A',
        category: p.category || 'Uncategorized',
        sales,
        stock,
        turnover
      };
    });
  } else if (reportType === 'Revenue by Region' || reportType === 'Revenue by Region') {
    const regionStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: APPROVED_ORDER_STATUSES }
        }
      },
      {
        $group: {
          _id: '$shippingAddress.city',
          orders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } }
        }
      },
      { $sort: { revenue: -1 } }
    ]);
    return regionStats.map(r => ({
      region: r._id || 'Other',
      orders: r.orders,
      revenue: r.revenue,
      aov: r.orders > 0 ? Math.round(r.revenue / r.orders) : 0
    }));
  } else if (reportType === 'Customer Retention Summary') {
    const customers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: APPROVED_ORDER_STATUSES }
        }
      },
      {
        $group: {
          _id: '$userId',
          orders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } },
          latestOrder: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } }
    ]);
    return customers.map(c => ({
      name: c.userInfo?.fullName || 'Guest Customer',
      email: c.userInfo?.email || 'N/A',
      orders: c.orders,
      revenue: c.revenue,
      latestOrder: c.latestOrder
    }));
  } else if (reportType === 'Category Performance') {
    const categorySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: APPROVED_ORDER_STATUSES }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$category._id',
          name: { $first: '$category.name' },
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' }
        }
      }
    ]);
    
    const result: any[] = [];
    for (const cat of categorySales) {
      if (!cat._id) continue;
      const productCount = await Product.countDocuments({ category: cat._id, isDeleted: false });
      result.push({
        name: cat.name || 'Uncategorized',
        productCount,
        unitsSold: cat.unitsSold,
        revenue: cat.revenue
      });
    }
    
    return result.sort((a: any, b: any) => b.unitsSold - a.unitsSold);
  }

  return [
    { label: 'Total Products', value: await Product.countDocuments({ isDeleted: false }) },
    { label: 'Total Orders', value: await Order.countDocuments() },
    { label: 'Total Users', value: await User.countDocuments({ isDeleted: false }) }
  ];
};

const getCategoryIconAndTone = (categoryName: string, index: number) => {
  const name = categoryName.toLowerCase();
  let iconName = "Package";
  let tone = "bg-[#ffd9c6] text-[#9b3513]";

  if (name.includes("dry fruit") || name.includes("nut")) {
    iconName = "Leaf";
    tone = "bg-[#c7f3d5] text-[#167042]";
  } else if (name.includes("flour") || name.includes("grain") || name.includes("atta") || name.includes("millet")) {
    iconName = "Wheat";
    tone = "bg-[#ffe2a9] text-[#9b4b09]";
  } else if (name.includes("juice") || name.includes("beverage")) {
    iconName = "Leaf";
    tone = "bg-[#c7f3d5] text-[#167042]";
  }

  if (iconName === "Package") {
    const tones = [
      "bg-[#ffd9c6] text-[#9b3513]",
      "bg-[#c7f3d5] text-[#167042]",
      "bg-[#ffe2a9] text-[#9b4b09]"
    ];
    tone = tones[index % 3];
    const icons = ["Package", "Leaf", "Wheat"];
    iconName = icons[index % 3];
  }

  return { iconName, tone };
};

// Main controller for Analytics page data
export const getAnalyticsPageData = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dateRangeStr = (req.query.dateRange as string) || "";
    const { startDate: qStart, endDate: qEnd, trendView = 'Week' } = req.query as Record<string, string>;
    
    // Parse From/To range
    const { startDate, endDate } = parseDateRange(dateRangeStr, qStart, qEnd);

    const duration = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - duration);
    const prevEndDate = new Date(endDate.getTime() - duration);

    // 1. KPI - Revenue (approved orders only — see APPROVED_ORDER_STATUSES)
    const currentRevenueResult = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: APPROVED_ORDER_STATUSES }
        }
      },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } } } }
    ]);
    const currentRevenue = currentRevenueResult[0]?.total || 0;

    const prevRevenueResult = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: prevStartDate, $lte: prevEndDate },
          status: { $in: APPROVED_ORDER_STATUSES }
        }
      },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } } } }
    ]);
    const prevRevenue = prevRevenueResult[0]?.total || 0;

    let revenueGrowth = 0;
    if (prevRevenue > 0) {
      revenueGrowth = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
    } else if (currentRevenue > 0) {
      revenueGrowth = 100;
    }
    const revenueGrowthStr = `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}% vs last period`;
    const revenueTone = revenueGrowth >= 0 ? "text-[#62a80f]" : "text-[#df3b18]";

    // 2. KPI - Retention (Percentage of repeat buyers, approved orders only)
    const currentActiveCustomers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: APPROVED_ORDER_STATUSES }
        }
      },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    const currentTotalActive = currentActiveCustomers.length;
    const currentRepeatActive = currentActiveCustomers.filter(c => c.count > 1).length;
    const currentRetention = currentTotalActive > 0 ? (currentRepeatActive / currentTotalActive) * 100 : 94.2;

    const prevActiveCustomers = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: prevStartDate, $lte: prevEndDate },
          status: { $in: APPROVED_ORDER_STATUSES }
        }
      },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    const prevTotalActive = prevActiveCustomers.length;
    const prevRepeatActive = prevActiveCustomers.filter(c => c.count > 1).length;
    const prevRetention = prevTotalActive > 0 ? (prevRepeatActive / prevTotalActive) * 100 : 92.1;

    const retentionGrowth = currentRetention - prevRetention;
    const retentionNote = `${retentionGrowth >= 0 ? '+' : ''}${retentionGrowth.toFixed(1)}% growth`;
    const retentionTone = retentionGrowth >= 0 ? "text-[#62a80f]" : "text-[#df3b18]";

    // 3. KPI - New Organic Signups
    const currentSignups = await User.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      isDeleted: false,
      role: 'customer'
    });
    const prevSignups = await User.countDocuments({
      createdAt: { $gte: prevStartDate, $lte: prevEndDate },
      isDeleted: false,
      role: 'customer'
    });
    const signupGrowth = currentSignups - prevSignups;
    const signupNote = currentSignups >= 10 ? "Target achieved" : `${signupGrowth >= 0 ? '+' : ''}${signupGrowth} vs last period`;
    const signupTone = "text-[#62a80f]";

    const kpisData = [
      { label: "Total Gross Revenue", value: currentRevenue.toLocaleString('en-IN'), prefix: "₹", note: revenueGrowthStr, tone: revenueTone },
      { label: "Subscription Retention", value: `${currentRetention.toFixed(1)}%`, note: retentionNote, tone: retentionTone },
      { label: "New Organic Signups", value: currentSignups.toLocaleString('en-IN'), note: signupNote, tone: signupTone }
    ];

    // 5. Sales Trend Analysis Graph (Week and Month views)
    const [orderStats, repeatUserIds, signupStats] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: APPROVED_ORDER_STATUSES }
          }
        },
        {
          $project: {
            dayOfWeek: { $dayOfWeek: '$createdAt' },
            dayOfMonth: { $dayOfMonth: '$createdAt' },
            totalAmount: { $ifNull: ['$totalAmount', '$orderTotal'] },
            userId: 1
          }
        }
      ]),
      Order.aggregate([
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ]),
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            isDeleted: false,
            role: 'customer'
          }
        },
        {
          $project: {
            dayOfWeek: { $dayOfWeek: '$createdAt' },
            dayOfMonth: { $dayOfMonth: '$createdAt' }
          }
        }
      ])
    ]);

    const repeatUserSet = new Set(repeatUserIds.map(u => u._id.toString()));

    let trendLabels: string[] = [];
    let revenueData: number[] = [];
    let retentionData: number[] = [];
    let signupsData: number[] = [];

    if (trendView === 'Month') {
      const monthlyData = {
        revenue: Array(31).fill(0),
        retention: Array(31).fill(0),
        signups: Array(31).fill(0)
      };

      const monthlyTemp = Array.from({ length: 31 }, () => ({
        totalRevenue: 0,
        activeUsers: new Set<string>(),
        repeatActiveUsers: new Set<string>()
      }));

      for (const order of orderStats) {
        const idx = order.dayOfMonth - 1;
        if (idx >= 0 && idx < 31) {
          monthlyTemp[idx].totalRevenue += order.totalAmount || 0;
          if (order.userId) {
            const uId = order.userId.toString();
            monthlyTemp[idx].activeUsers.add(uId);
            if (repeatUserSet.has(uId)) {
              monthlyTemp[idx].repeatActiveUsers.add(uId);
            }
          }
        }
      }

      for (const user of signupStats) {
        const idx = user.dayOfMonth - 1;
        if (idx >= 0 && idx < 31) {
          monthlyData.signups[idx] += 1;
        }
      }

      for (let idx = 0; idx < 31; idx++) {
        monthlyData.revenue[idx] = monthlyTemp[idx].totalRevenue;
        monthlyData.retention[idx] = monthlyTemp[idx].activeUsers.size > 0 ? Math.round((monthlyTemp[idx].repeatActiveUsers.size / monthlyTemp[idx].activeUsers.size) * 100) : 0;
      }

      trendLabels = Array.from({ length: 31 }, (_, i) => String(i + 1));
      revenueData = monthlyData.revenue;
      retentionData = monthlyData.retention;
      signupsData = monthlyData.signups;

    } else {
      // Default: 'Week'
      const weeklyData = {
        revenue: Array(7).fill(0),
        retention: Array(7).fill(0),
        signups: Array(7).fill(0)
      };

      const weeklyTemp = Array.from({ length: 7 }, () => ({
        totalRevenue: 0,
        activeUsers: new Set<string>(),
        repeatActiveUsers: new Set<string>()
      }));

      for (const order of orderStats) {
        let idx = 0;
        if (order.dayOfWeek === 1) idx = 6; // Sunday
        else idx = order.dayOfWeek - 2; // Monday to Saturday

        if (idx >= 0 && idx < 7) {
          weeklyTemp[idx].totalRevenue += order.totalAmount || 0;
          if (order.userId) {
            const uId = order.userId.toString();
            weeklyTemp[idx].activeUsers.add(uId);
            if (repeatUserSet.has(uId)) {
              weeklyTemp[idx].repeatActiveUsers.add(uId);
            }
          }
        }
      }

      for (const user of signupStats) {
        let idx = 0;
        if (user.dayOfWeek === 1) idx = 6; // Sunday
        else idx = user.dayOfWeek - 2; // Monday to Saturday

        if (idx >= 0 && idx < 7) {
          weeklyData.signups[idx] += 1;
        }
      }

      for (let idx = 0; idx < 7; idx++) {
        weeklyData.revenue[idx] = weeklyTemp[idx].totalRevenue;
        weeklyData.retention[idx] = weeklyTemp[idx].activeUsers.size > 0 ? Math.round((weeklyTemp[idx].repeatActiveUsers.size / weeklyTemp[idx].activeUsers.size) * 100) : 0;
      }

      trendLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      revenueData = weeklyData.revenue;
      retentionData = weeklyData.retention;
      signupsData = weeklyData.signups;
    }

    // 6. Orders by Region (State-wise Focus)
    const statesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: REGIONAL_ORDER_STATUSES }
        }
      },
      {
        $group: {
          _id: { $trim: { input: { $ifNull: ['$shippingAddress.state', 'Unknown'] } } },
          totalOrders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } },
          uniqueCustomers: { $addToSet: '$userId' }
        }
      }
    ]);

    const prevStatesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: prevStartDate, $lte: prevEndDate },
          status: { $in: REGIONAL_ORDER_STATUSES }
        }
      },
      {
        $group: {
          _id: { $trim: { input: { $ifNull: ['$shippingAddress.state', 'Unknown'] } } },
          revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } }
        }
      }
    ]);

    const prevRevenueMap = new Map<string, number>();
    for (const prev of prevStatesData) {
      if (prev._id) {
        prevRevenueMap.set(prev._id.toLowerCase(), prev.revenue);
      }
    }

    const totalCustomersAcrossAllStates = new Set(
      statesData.flatMap((s) => s.uniqueCustomers.map((id: any) => id.toString()))
    ).size;

    const priorityStates = statesData.map((state) => {
      const stateName = state._id || 'Unknown';
      const totalCustomers = state.uniqueCustomers ? state.uniqueCustomers.length : 0;
      const totalOrders = state.totalOrders || 0;
      const revenue = state.revenue || 0;
      
      const share = totalCustomersAcrossAllStates > 0
        ? parseFloat(((totalCustomers / totalCustomersAcrossAllStates) * 100).toFixed(1))
        : 0;
      
      const prevRevenue = prevRevenueMap.get(stateName.toLowerCase()) || 0;
      let growthPct = 0;
      if (prevRevenue > 0) {
        growthPct = ((revenue - prevRevenue) / prevRevenue) * 100;
      }
      const growth = `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`;

      return {
        name: stateName,
        totalCustomers,
        totalOrders,
        revenue,
        share,
        growth
      };
    });

    priorityStates.sort((a, b) => b.share - a.share);

    const totalRevenueAllStates = statesData.reduce((sum, s) => sum + s.revenue, 0);
    const totalOrdersAllStates = statesData.reduce((sum, s) => sum + s.totalOrders, 0);
    const prevRevenueAllStates = prevStatesData.reduce((sum, s) => sum + s.revenue, 0);
    let nationalGrowthPct = 0;
    if (prevRevenueAllStates > 0) {
      nationalGrowthPct = ((totalRevenueAllStates - prevRevenueAllStates) / prevRevenueAllStates) * 100;
    }
    const nationalGrowth = `${nationalGrowthPct >= 0 ? '+' : ''}${nationalGrowthPct.toFixed(1)}%`;

    priorityStates.unshift({
      name: 'All States',
      totalCustomers: totalCustomersAcrossAllStates,
      totalOrders: totalOrdersAllStates,
      revenue: totalRevenueAllStates,
      share: 100,
      growth: nationalGrowth,
    });

    // 7. Top Selling Categories (approved orders only)
    const categorySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: APPROVED_ORDER_STATUSES }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$category._id',
          name: { $first: '$category.name' },
          sales: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' }
        }
      }
    ]);

    const salesMap = new Map();
    for (const item of categorySales) {
      if (item._id) {
        salesMap.set(item._id.toString(), item);
      }
    }

    const allCats = await Category.find({ isActive: true });
    const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const formattedCategories = allCats.map((cat, idx) => {
      const salesItem = salesMap.get(cat._id.toString());
      const salesCount = salesItem ? salesItem.sales : 0;
      const revenueVal = salesItem ? salesItem.revenue : 0;

      const { iconName, tone } = getCategoryIconAndTone(cat.name, idx);

      const salesText = durationDays <= 7
        ? `${salesCount} Sales This Week`
        : `${salesCount} Sales This Period`;

      return {
        name: cat.name,
        sales: salesText,
        value: revenueVal.toLocaleString('en-IN'),
        rawSales: salesCount,
        iconName,
        tone
      };
    });

    formattedCategories.sort((a, b) => b.rawSales - a.rawSales);

    // 8. Custom dataset row counts
    const ordersCountForPeriod = await Order.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } });
    const usersCountForPeriod = await User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } });
    const approxRows = ordersCountForPeriod + usersCountForPeriod;

    // 9. Additional enterprise KPIs
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dailyOrders, weeklyOrders, monthlyOrders] = await Promise.all([
      Order.countDocuments({ status: { $in: APPROVED_ORDER_STATUSES }, createdAt: { $gte: oneDayAgo } }),
      Order.countDocuments({ status: { $in: APPROVED_ORDER_STATUSES }, createdAt: { $gte: oneWeekAgo } }),
      Order.countDocuments({ status: { $in: APPROVED_ORDER_STATUSES }, createdAt: { $gte: oneMonthAgo } }),
    ]);

    let customerGrowth = 0;
    if (prevTotalActive > 0) {
      customerGrowth = ((currentTotalActive - prevTotalActive) / prevTotalActive) * 100;
    } else if (currentTotalActive > 0) {
      customerGrowth = 100;
    }

    const cancelledCount = await Order.countDocuments({ status: 'cancelled', createdAt: { $gte: startDate, $lte: endDate } });
    const cancellationRate = ordersCountForPeriod > 0 ? parseFloat(((cancelledCount / ordersCountForPeriod) * 100).toFixed(1)) : 0;

    const refundedCount = await Order.countDocuments({ status: 'refunded', createdAt: { $gte: startDate, $lte: endDate } });
    const refundRate = ordersCountForPeriod > 0 ? parseFloat(((refundedCount / ordersCountForPeriod) * 100).toFixed(1)) : 0;

    return sendSuccess(res, {
      data: {
        kpis: kpisData,
        trend: {
          view: trendView,
          labels: trendLabels,
          revenue: revenueData,
          retention: retentionData,
          signups: signupsData
        },
        regions: priorityStates,
        categories: formattedCategories,
        approxRows,
        additional: {
          dailyOrders,
          weeklyOrders,
          monthlyOrders,
          customerGrowth,
          cancellationRate,
          refundRate,
          repeatCustomerPct: currentTotalActive > 0 ? parseFloat(((currentRepeatActive / currentTotalActive) * 100).toFixed(1)) : 0,
          revenueGrowth,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export CSV / PDF custom report controller
export const exportAnalyticsReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reportType, dateRange, format } = req.body;
    const { startDate, endDate } = parseDateRange(dateRange);

    if (format === 'CSV') {
      const csvContent = await buildCSVReportContent(startDate, endDate, reportType);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${reportType.toLowerCase().replace(/ /g, '-')}.csv"`);
      return res.status(200).send(csvContent);
    } else {
      const summary = await getSummaryStats(startDate, endDate);
      const regionStats = await getRegionStatsData(startDate, endDate);
      const trendStats = await getTrendStatsData(startDate, endDate);
      const categoryMetrics = await getCategoryMetrics(startDate, endDate);
      const detailedPerformance = await getDetailedCategoryPerformance(startDate, endDate);

      const dateRangeStr = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
      const buffer = await buildPDFReportBuffer(
        reportType,
        dateRangeStr,
        summary,
        regionStats,
        trendStats,
        categoryMetrics,
        detailedPerformance
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${reportType.toLowerCase().replace(/ /g, '-')}.pdf"`);
      return res.status(200).send(buffer);
    }
  } catch (error) {
    next(error);
  }
};

// Live feed poll status controller
export const getLiveFeedStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [ordersToday, usersToday] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: today }, isDeleted: false, role: 'customer' })
    ]);

    let text = 'Live Feed';
    if (ordersToday > 0 && usersToday > 0) {
      text = `${ordersToday} Order${ordersToday > 1 ? 's' : ''} & ${usersToday} Signup${usersToday > 1 ? 's' : ''}`;
    } else if (ordersToday > 0) {
      text = `${ordersToday} Order${ordersToday > 1 ? 's' : ''}`;
    } else if (usersToday > 0) {
      text = `${usersToday} Signup${usersToday > 1 ? 's' : ''}`;
    } else {
      text = 'Active';
    }

    return sendSuccess(res, { data: { text } });
  } catch (error) {
    next(error);
  }
};

// Helper to get Category Metrics for all categories
const getCategoryMetrics = async (startDate: Date, endDate: Date) => {
  const allCategories = await Category.find({});
  const allProducts = await Product.find({ isDeleted: false }, { _id: 1, category: 1 });
  const productToCategoryMap = new Map<string, string>();
  allProducts.forEach(p => {
    if (p.category) {
      productToCategoryMap.set(p._id.toString(), p.category.toString());
    }
  });

  const orders = await Order.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $in: APPROVED_ORDER_STATUSES }
  });

  const metricsMap: Record<string, { totalOrders: number; totalSales: number; totalRevenue: number }> = {};
  
  allCategories.forEach(cat => {
    metricsMap[cat._id.toString()] = {
      totalOrders: 0,
      totalSales: 0,
      totalRevenue: 0
    };
  });

  let totalAllCategoryRevenue = 0;

  orders.forEach(order => {
    const categoriesInOrder = new Set<string>();
    
    order.items.forEach((item: any) => {
      if (item.productId) {
        const catId = productToCategoryMap.get(item.productId.toString());
        if (catId) {
          categoriesInOrder.add(catId);
          if (metricsMap[catId]) {
            metricsMap[catId].totalSales += item.quantity || 0;
            metricsMap[catId].totalRevenue += item.lineTotal || 0;
            totalAllCategoryRevenue += item.lineTotal || 0;
          }
        }
      }
    });

    categoriesInOrder.forEach(catId => {
      if (metricsMap[catId]) {
        metricsMap[catId].totalOrders += 1;
      }
    });
  });

  return allCategories.map(cat => {
    const catIdStr = cat._id.toString();
    const stats = metricsMap[catIdStr] || { totalOrders: 0, totalSales: 0, totalRevenue: 0 };
    const salesPercentage = totalAllCategoryRevenue > 0
      ? ((stats.totalRevenue / totalAllCategoryRevenue) * 100).toFixed(2)
      : '0.00';
    return {
      name: cat.name,
      totalOrders: stats.totalOrders,
      totalSales: stats.totalSales,
      totalRevenue: stats.totalRevenue,
      salesPercentage
    };
  });
};

// Helper to get Summary Stats
const getSummaryStats = async (startDate: Date, endDate: Date) => {
  const currentRevenueResult = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: APPROVED_ORDER_STATUSES }
      }
    },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } } } }
  ]);
  const currentRevenue = currentRevenueResult[0]?.total || 0;

  const currentActiveCustomers = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: APPROVED_ORDER_STATUSES }
      }
    },
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);
  const currentTotalActive = currentActiveCustomers.length;
  const currentRepeatActive = currentActiveCustomers.filter(c => c.count > 1).length;
  const currentRetention = currentTotalActive > 0 ? (currentRepeatActive / currentTotalActive) * 100 : 94.2;

  const currentOrdersCount = await Order.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $in: APPROVED_ORDER_STATUSES }
  });
  const currentAvgBasket = currentOrdersCount > 0 ? Math.round(currentRevenue / currentOrdersCount) : 1240;

  const currentSignups = await User.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
    isDeleted: false,
    role: 'customer'
  });

  return {
    revenue: currentRevenue,
    retention: currentRetention,
    avgBasket: currentAvgBasket,
    signups: currentSignups,
    ordersCount: currentOrdersCount
  };
};

const getRegionStatsData = async (startDate: Date, endDate: Date) => {
  const regionStats = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: APPROVED_ORDER_STATUSES }
      }
    },
    {
      $group: {
        _id: '$shippingAddress.city',
        orders: { $sum: 1 },
        revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } }
      }
    },
    { $sort: { revenue: -1 } }
  ]);
  return regionStats.map(r => ({
    region: r._id || 'Other',
    orders: r.orders,
    revenue: r.revenue,
    aov: r.orders > 0 ? Math.round(r.revenue / r.orders) : 0
  }));
};

const getTrendStatsData = async (startDate: Date, endDate: Date) => {
  const trendStats = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: APPROVED_ORDER_STATUSES }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  return trendStats.map(t => ({
    date: t._id,
    revenue: t.revenue,
    orders: t.orders
  }));
};

const getDetailedCategoryPerformance = async (startDate: Date, endDate: Date) => {
  const categoriesList = await Category.find({});
  const categoryMap = new Map<string, string>();
  categoriesList.forEach(c => {
    categoryMap.set(c._id.toString(), c.name);
  });

  const allProducts = await Product.find({ isDeleted: false });
  const productMetrics: Record<string, {
    productName: string;
    categoryId: string;
    orderIds: Set<string>;
    unitsSold: number;
    revenue: number;
  }> = {};

  allProducts.forEach(p => {
    productMetrics[p._id.toString()] = {
      productName: p.name,
      categoryId: p.category ? p.category.toString() : '',
      orderIds: new Set<string>(),
      unitsSold: 0,
      revenue: 0
    };
  });

  const orders = await Order.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $in: APPROVED_ORDER_STATUSES }
  });

  orders.forEach(order => {
    const orderIdStr = order._id.toString();
    order.items.forEach(item => {
      if (item.productId) {
        const pIdStr = item.productId.toString();
        if (productMetrics[pIdStr]) {
          productMetrics[pIdStr].orderIds.add(orderIdStr);
          productMetrics[pIdStr].unitsSold += item.quantity || 0;
          productMetrics[pIdStr].revenue += item.lineTotal || 0;
        }
      }
    });
  });

  const rows: any[] = [];
  Object.keys(productMetrics).forEach(pId => {
    const m = productMetrics[pId];
    const categoryName = categoryMap.get(m.categoryId) || 'Uncategorized';
    rows.push({
      categoryName,
      productName: m.productName,
      productCount: m.orderIds.size,
      unitsSold: m.unitsSold,
      revenue: m.revenue
    });
  });

  rows.sort((a, b) => {
    if (a.categoryName !== b.categoryName) {
      return a.categoryName.localeCompare(b.categoryName);
    }
    return b.unitsSold - a.unitsSold;
  });

  return rows;
};

const buildCSVReportContent = async (startDate: Date, endDate: Date, reportType: string) => {
  const summary = await getSummaryStats(startDate, endDate);
  const regionStats = await getRegionStatsData(startDate, endDate);
  const trendStats = await getTrendStatsData(startDate, endDate);
  const categoryMetrics = await getCategoryMetrics(startDate, endDate);
  const detailedPerformance = await getDetailedCategoryPerformance(startDate, endDate);

  const dateRangeStr = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

  let csv = 'MACHINICHI ANALYTICS REPORT\n';
  csv += `Report Type,"${reportType}"\n`;
  csv += `Date Range,"${dateRangeStr}"\n`;
  csv += `Generated Date,"${new Date().toLocaleString()}"\n\n`;

  csv += 'ANALYTICS SUMMARY\n';
  csv += 'Metric,Value\n';
  csv += `Total Gross Revenue,"₹${summary.revenue.toLocaleString('en-IN')}"\n`;
  csv += `Subscription Retention,"${summary.retention.toFixed(1)}%"\n`;
  csv += `Average Basket Value,"₹${summary.avgBasket.toLocaleString('en-IN')}"\n`;
  csv += `New Organic Signups,"${summary.signups}"\n`;
  csv += `Order Count,"${summary.ordersCount}"\n\n`;

  csv += 'ORDERS BY REGION\n';
  csv += 'Region,Total Orders,Total Revenue,Average Order Value\n';
  for (const r of regionStats) {
    csv += `"${r.region}","${r.orders}","₹${r.revenue.toLocaleString('en-IN')}","₹${r.aov.toLocaleString('en-IN')}"\n`;
  }
  csv += '\n';

  csv += 'SALES TREND ANALYSIS\n';
  csv += 'Date,Orders Count,Revenue\n';
  for (const t of trendStats) {
    csv += `"${t.date}","${t.orders}","₹${t.revenue.toLocaleString('en-IN')}"\n`;
  }
  csv += '\n';

  csv += 'TOP SELLING CATEGORIES\n';
  csv += 'Category Name,Total Orders,Total Sales,Total Revenue,Sales Percentage\n';
  for (const cat of categoryMetrics) {
    csv += `"${cat.name}","${cat.totalOrders}","${cat.totalSales}","₹${cat.totalRevenue.toLocaleString('en-IN')}","${cat.salesPercentage}%"\n`;
  }
  csv += '\n';

  csv += 'DETAILED CATEGORY PERFORMANCE\n';
  csv += 'Category Name,Product Name,Product Count,Units Sold,Total Revenue\n';
  for (const row of detailedPerformance) {
    csv += `"${row.categoryName}","${row.productName}","${row.productCount}","${row.unitsSold}","₹${row.revenue.toLocaleString('en-IN')}"\n`;
  }

  return csv;
};

const buildPDFReportBuffer = async (
  reportType: string,
  dateRangeStr: string,
  summary: any,
  regionStats: any[],
  trendStats: any[],
  categoryMetrics: any[],
  detailedPerformance: any[]
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: any[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Brand Header
    doc.fillColor('#3a1100').fontSize(22).font('Helvetica-Bold').text('MACHINICHI', { align: 'center' });
    doc.fillColor('#ad4d00').fontSize(10).font('Helvetica-Bold').text('THE MODERN GENERAL STORE', { align: 'center' });
    doc.moveDown(0.5);

    // Title & Meta Info
    doc.fillColor('#17120f').fontSize(14).font('Helvetica-Bold').text(`ANALYTICS REPORT: ${reportType.toUpperCase()}`, { align: 'left' });
    doc.fontSize(9).font('Helvetica').text(`Date Range: ${dateRangeStr}`);
    doc.text(`Generated At: ${new Date().toLocaleString()}`);
    doc.moveDown(0.8);
    
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke('#e8ddd0');
    doc.moveDown(1);

    // 1. Analytics Summary
    doc.fillColor('#3a1100').fontSize(12).font('Helvetica-Bold').text('1. ANALYTICS SUMMARY', 40, doc.y);
    doc.moveDown(0.5);
    
    const startY = doc.y;
    doc.rect(40, startY, 240, 50).fillAndStroke('#fbf5ef', '#e8ddd0');
    doc.fillColor('#6f7b91').fontSize(8).font('Helvetica').text('TOTAL GROSS REVENUE', 50, startY + 10);
    doc.fillColor('#ad4d00').fontSize(14).font('Helvetica-Bold').text(`₹${summary.revenue.toLocaleString('en-IN')}`, 50, startY + 24);

    doc.rect(300, startY, 240, 50).fillAndStroke('#fbf5ef', '#e8ddd0');
    doc.fillColor('#6f7b91').fontSize(8).font('Helvetica').text('SUBSCRIPTION RETENTION', 310, startY + 10);
    doc.fillColor('#ad4d00').fontSize(14).font('Helvetica-Bold').text(`${summary.retention.toFixed(1)}%`, 310, startY + 24);

    const nextY = startY + 60;
    doc.rect(40, nextY, 240, 50).fillAndStroke('#fbf5ef', '#e8ddd0');
    doc.fillColor('#6f7b91').fontSize(8).font('Helvetica').text('AVERAGE BASKET VALUE', 50, nextY + 10);
    doc.fillColor('#ad4d00').fontSize(14).font('Helvetica-Bold').text(`₹${summary.avgBasket.toLocaleString('en-IN')}`, 50, nextY + 24);

    doc.rect(300, nextY, 240, 50).fillAndStroke('#fbf5ef', '#e8ddd0');
    doc.fillColor('#6f7b91').fontSize(8).font('Helvetica').text('NEW ORGANIC SIGNUPS', 310, nextY + 10);
    doc.fillColor('#ad4d00').fontSize(14).font('Helvetica-Bold').text(String(summary.signups), 310, nextY + 24);

    doc.y = nextY + 75;
    
    // 2. Orders by Region
    if (doc.y > 650) doc.addPage();
    doc.fillColor('#3a1100').fontSize(12).font('Helvetica-Bold').text('2. ORDERS BY REGION', 40, doc.y);
    doc.moveDown(0.5);

    let regionHeaderY = doc.y;
    doc.fillColor('#17120f').fontSize(9).font('Helvetica-Bold');
    doc.text('Region', 40, regionHeaderY, { width: 180 });
    doc.text('Total Orders', 230, regionHeaderY, { width: 100 });
    doc.text('Total Revenue', 340, regionHeaderY, { width: 100 });
    doc.text('Avg Order Value', 450, regionHeaderY, { width: 100 });
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke('#e8ddd0');
    doc.moveDown(0.5);

    doc.font('Helvetica');
    for (const r of regionStats) {
      if (doc.y > 750) doc.addPage();
      const currentY = doc.y;
      doc.text(r.region, 40, currentY, { width: 180 });
      doc.text(String(r.orders), 230, currentY, { width: 100 });
      doc.text(`₹${r.revenue.toLocaleString('en-IN')}`, 340, currentY, { width: 100 });
      doc.text(`₹${r.aov.toLocaleString('en-IN')}`, 450, currentY, { width: 100 });
      doc.y = currentY + 16;
    }

    doc.moveDown(1.5);

    // 3. Sales Trend
    if (doc.y > 650) doc.addPage();
    doc.fillColor('#3a1100').fontSize(12).font('Helvetica-Bold').text('3. SALES TREND ANALYSIS', 40, doc.y);
    doc.moveDown(0.5);

    let trendHeaderY = doc.y;
    doc.fillColor('#17120f').fontSize(9).font('Helvetica-Bold');
    doc.text('Date', 40, trendHeaderY, { width: 200 });
    doc.text('Orders Count', 250, trendHeaderY, { width: 120 });
    doc.text('Revenue', 380, trendHeaderY, { width: 170 });
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke('#e8ddd0');
    doc.moveDown(0.5);

    doc.font('Helvetica');
    for (const t of trendStats) {
      if (doc.y > 750) doc.addPage();
      const currentY = doc.y;
      doc.text(t.date, 40, currentY, { width: 200 });
      doc.text(String(t.orders), 250, currentY, { width: 120 });
      doc.text(`₹${t.revenue.toLocaleString('en-IN')}`, 380, currentY, { width: 170 });
      doc.y = currentY + 16;
    }

    doc.moveDown(1.5);

    // 4. Top Selling Categories
    if (doc.y > 650) doc.addPage();
    doc.fillColor('#3a1100').fontSize(12).font('Helvetica-Bold').text('4. TOP SELLING CATEGORIES', 40, doc.y);
    doc.moveDown(0.5);

    const catHeaderY = doc.y;
    doc.fillColor('#17120f').fontSize(9).font('Helvetica-Bold');
    doc.text('Category Name', 40, catHeaderY, { width: 150 });
    doc.text('Total Orders', 200, catHeaderY, { width: 80 });
    doc.text('Total Sales', 280, catHeaderY, { width: 80 });
    doc.text('Total Revenue', 360, catHeaderY, { width: 90 });
    doc.text('Sales %', 460, catHeaderY, { width: 80 });
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke('#e8ddd0');
    doc.moveDown(0.5);

    doc.font('Helvetica');
    for (const cat of categoryMetrics) {
      if (doc.y > 750) doc.addPage();
      const currentY = doc.y;
      doc.text(cat.name, 40, currentY, { width: 150 });
      doc.text(String(cat.totalOrders), 200, currentY, { width: 80 });
      doc.text(String(cat.totalSales), 280, currentY, { width: 80 });
      doc.text(`₹${cat.totalRevenue.toLocaleString('en-IN')}`, 360, currentY, { width: 90 });
      doc.text(`${cat.salesPercentage}%`, 460, currentY, { width: 80 });
      doc.y = currentY + 16;
    }

    doc.moveDown(1.5);

    // 5. Detailed Category Performance
    if (doc.y > 650) doc.addPage();
    doc.fillColor('#3a1100').fontSize(12).font('Helvetica-Bold').text('5. DETAILED CATEGORY PERFORMANCE', 40, doc.y);
    doc.moveDown(0.5);

    const detailedHeaderY = doc.y;
    doc.fillColor('#17120f').fontSize(9).font('Helvetica-Bold');
    doc.text('Category Name', 40, detailedHeaderY, { width: 130 });
    doc.text('Product Name', 170, detailedHeaderY, { width: 160 });
    doc.text('Product Count', 330, detailedHeaderY, { width: 70 });
    doc.text('Units Sold', 410, detailedHeaderY, { width: 60 });
    doc.text('Total Revenue', 480, detailedHeaderY, { width: 70 });
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke('#e8ddd0');
    doc.moveDown(0.5);

    doc.font('Helvetica');
    for (const row of detailedPerformance) {
      if (doc.y > 750) doc.addPage();
      const currentY = doc.y;
      doc.text(row.categoryName, 40, currentY, { width: 130 });
      doc.text(row.productName, 170, currentY, { width: 160 });
      doc.text(String(row.productCount), 330, currentY, { width: 70 });
      doc.text(String(row.unitsSold), 410, currentY, { width: 60 });
      doc.text(`₹${row.revenue.toLocaleString('en-IN')}`, 480, currentY, { width: 70 });
      doc.y = currentY + 16;
    }

    doc.end();
  });
};

const generateAndEmailReport = async (
  reportType: string,
  startDateStr: string,
  endDateStr: string,
  format: string,
  recipientEmail: string
) => {
  const { startDate, endDate } = parseDateRange('', startDateStr, endDateStr);
  
  const summary = await getSummaryStats(startDate, endDate);
  const regionStats = await getRegionStatsData(startDate, endDate);
  const trendStats = await getTrendStatsData(startDate, endDate);
  const categoryMetrics = await getCategoryMetrics(startDate, endDate);
  const detailedPerformance = await getDetailedCategoryPerformance(startDate, endDate);

  const dateRangeStr = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  let attachmentBuffer: Buffer;
  let fileName: string;

  if (format === 'CSV') {
    const csvContent = await buildCSVReportContent(startDate, endDate, reportType);
    attachmentBuffer = Buffer.from(csvContent, 'utf-8');
    fileName = `analytics-report-${reportType.toLowerCase().replace(/ /g, '-')}.csv`;
  } else {
    attachmentBuffer = await buildPDFReportBuffer(
      reportType,
      dateRangeStr,
      summary,
      regionStats,
      trendStats,
      categoryMetrics,
      detailedPerformance
    );
    fileName = `analytics-report-${reportType.toLowerCase().replace(/ /g, '-')}.pdf`;
  }

  // Send Email
  await sendAnalyticsReportEmail(recipientEmail, reportType, format, attachmentBuffer, fileName);
};

// Save report config controller
export const saveReportConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reportType, format, frequency, recipientEmail, startDate, endDate } = req.body;

    if (!reportType || !format || !frequency || !recipientEmail) {
      return res.status(400).json({ success: false, message: 'Report Type, Format, Frequency, and Email Address are all required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid recipient email address format.' });
    }

    // Save as a new configuration record to support multiple entries (history)
    const config = new ReportConfig({
      userId: req.user?.userId,
      reportType,
      startDate,
      endDate,
      format,
      frequency,
      recipientEmail,
      status: 'Active'
    });
    await config.save();

    // Automatically generate and deliver the report by email
    let emailSent = false;
    let emailErrorMsg = '';
    try {
      await generateAndEmailReport(reportType, startDate, endDate, format, recipientEmail);
      emailSent = true;
    } catch (emailError: any) {
      console.error('SMTP report email delivery error details:', emailError.message);
      emailErrorMsg = emailError.message || 'SMTP sending failed';
    }

    if (!emailSent) {
      return sendSuccess(res, { 
        data: config, 
        message: `Report configuration saved successfully, but automatic email delivery failed: ${emailErrorMsg}. Please check SMTP logs.`
      });
    }

    return sendSuccess(res, { data: config, message: 'Report configuration saved successfully and report sent to ' + recipientEmail + '.' });
  } catch (error) {
    next(error);
  }
};

// Get report config controller
export const getReportConfig = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Return all configurations for the user sorted by creation date descending
    const configs = await ReportConfig.find({ userId: req.user?.userId }).sort({ createdAt: -1 });
    return sendSuccess(res, { data: configs });
  } catch (error) {
    next(error);
  }
};

// Save analytics page settings
export const saveAnalyticsSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fromDate, toDate } = req.body;
    const settings = await AnalyticsSettings.findOneAndUpdate(
      { userId: req.user?.userId },
      { fromDate, toDate },
      { upsert: true, new: true }
    );
    return sendSuccess(res, { data: settings, message: 'Analytics settings saved successfully.' });
  } catch (error) {
    next(error);
  }
};

// Get analytics page settings
export const getAnalyticsSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await AnalyticsSettings.findOne({ userId: req.user?.userId });
    return sendSuccess(res, { data: settings });
  } catch (error) {
    next(error);
  }
};
