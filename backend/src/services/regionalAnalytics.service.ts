import { Order } from '../models/Order';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { AnalyticsAuditLog } from '../models/AnalyticsAuditLog';

export const APPROVED_ORDER_STATUSES = ['accepted', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'];
// Regional Analytics must ONLY use approved/confirmed orders (never pending,
// cancelled, or returned/refunded) — this is the same rule as revenue KPIs,
// so REGIONAL_ORDER_STATUSES is intentionally an alias, not a separate list,
// to guarantee both stay in sync (single source of truth).
export const REGIONAL_ORDER_STATUSES = APPROVED_ORDER_STATUSES;

export const logAnalyticsEvent = async (
  orderId: mongoose.Types.ObjectId | string,
  orderCode: string,
  state: string,
  action: 'order_approved' | 'order_cancelled' | 'order_refunded' | 'order_delivered',
  previousStatus: string,
  newStatus: string,
  revenueImpact: number,
  changedBy?: mongoose.Types.ObjectId | string
) => {
  try {
    await AnalyticsAuditLog.create({
      orderId: new mongoose.Types.ObjectId(orderId),
      orderCode,
      state,
      action,
      previousStatus,
      newStatus,
      revenueImpact,
      changedBy: changedBy ? new mongoose.Types.ObjectId(changedBy) : undefined,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to log analytics audit event:', error);
  }
};

export const getStateCityDetail = async (stateName: string, startDate?: Date, endDate?: Date) => {
  const match: any = {
    status: { $in: REGIONAL_ORDER_STATUSES },
    'shippingAddress.state': { $regex: new RegExp(`^${stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = toDate(startDate);
    if (endDate) match.createdAt.$lte = toDate(endDate);
  }

  const citiesData = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $trim: { input: { $ifNull: ['$shippingAddress.city', 'Unknown'] } } },
        totalOrders: { $sum: 1 },
        revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } },
        uniqueCustomers: { $addToSet: '$userId' },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  return citiesData.map((c) => ({
    name: c._id,
    totalOrders: c.totalOrders,
    revenue: c.revenue,
    totalCustomers: c.uniqueCustomers.length,
  }));
};

function toDate(d: Date | string): Date {
  return typeof d === 'string' ? new Date(d) : d;
}

export const getAllStatesWithData = async (startDate?: Date, endDate?: Date) => {
  const match: any = { status: { $in: REGIONAL_ORDER_STATUSES } };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = toDate(startDate);
    if (endDate) match.createdAt.$lte = toDate(endDate);
  }

  const agg = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $trim: { input: { $ifNull: ['$shippingAddress.state', 'Unknown'] } } },
        totalOrders: { $sum: 1 },
        revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } },
        uniqueCustomers: { $addToSet: '$userId' },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  const totalCustomersAcrossAllStates = new Set(
    agg.flatMap((s) => s.uniqueCustomers.map((id: any) => id.toString()))
  ).size;

  return agg.map((s) => ({
    name: s._id,
    totalCustomers: s.uniqueCustomers.length,
    totalOrders: s.totalOrders,
    revenue: s.revenue,
    marketShare: totalCustomersAcrossAllStates > 0
      ? parseFloat(((s.uniqueCustomers.length / totalCustomersAcrossAllStates) * 100).toFixed(1))
      : 0,
  }));
};

export const getTopStates = async (limit: number = 10, startDate?: Date, endDate?: Date) => {
  const states = await getAllStatesWithData(startDate, endDate);
  return states.slice(0, limit);
};

export const getBottomStates = async (limit: number = 10, startDate?: Date, endDate?: Date) => {
  const states = await getAllStatesWithData(startDate, endDate);
  return states.slice(-limit).reverse();
};

export const getStateDetail = async (stateName: string, startDate?: Date, endDate?: Date) => {
  const isAllStates = stateName.trim().toLowerCase() === 'all states';

  // "All States" is a virtual aggregate row (India-wide totals), not a real
  // shippingAddress.state value — reuse the overview aggregation instead of
  // duplicating the revenue/customer logic here.
  if (isAllStates) {
    const overview = await getRegionalOverview(startDate, endDate);
    let growth = '0%';
    if (startDate && endDate) {
      const duration = endDate.getTime() - startDate.getTime();
      const prevStart = new Date(startDate.getTime() - duration);
      const prevEnd = new Date(endDate.getTime() - duration);
      const prevOverview = await getRegionalOverview(prevStart, prevEnd);
      const g = prevOverview.totalRevenue > 0
        ? ((overview.totalRevenue - prevOverview.totalRevenue) / prevOverview.totalRevenue) * 100
        : 0; // If historical comparison is not available, return 0%
      growth = `${g >= 0 ? '+' : ''}${g.toFixed(1)}%`;
    }
    return {
      name: 'All States',
      totalCustomers: overview.totalCustomers,
      totalOrders: overview.totalOrders,
      revenue: overview.totalRevenue,
      marketShare: 100,
      growth,
      aov: overview.aov,
      repeatCustomerPct: overview.repeatCustomerPct,
      newCustomers: undefined,
      returningCustomers: undefined,
      monthlyTrends: await getMonthlyTrendsByState('', startDate, endDate, true),
      cities: [],
    };
  }

  const match: any = {
    status: { $in: REGIONAL_ORDER_STATUSES },
    'shippingAddress.state': { $regex: new RegExp(`^${stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = toDate(startDate);
    if (endDate) match.createdAt.$lte = toDate(endDate);
  }

  // Keep the five values shown in the selected-state card in one MongoDB
  // round trip. The denominator is calculated over the same date range and
  // approved-order set as the selected-state totals.
  const duration = startDate && endDate ? endDate.getTime() - startDate.getTime() : 0;
  const previousStartDate = startDate && endDate
    ? new Date(startDate.getTime() - duration)
    : undefined;
  const previousEndDate = startDate && endDate
    ? new Date(endDate.getTime() - duration)
    : undefined;
  const previousMatch = previousStartDate && previousEndDate
    ? { ...match, createdAt: { $gte: previousStartDate, $lte: previousEndDate } }
    : null;

  const [metrics] = await Order.aggregate([
    {
      $facet: {
        selected: [
          { $match: match },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } },
              uniqueCustomers: { $addToSet: '$userId' },
            },
          },
        ],
        allStatesCustomers: [
          { $match: { status: { $in: REGIONAL_ORDER_STATUSES }, ...(match.createdAt ? { createdAt: match.createdAt } : {}) } },
          { $group: { _id: '$userId' } },
          { $count: 'total' },
        ],
        previous: previousMatch
          ? [
              { $match: previousMatch },
              { $group: { _id: null, revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } } } },
            ]
          : [],
      },
    },
  ]);

  const stateData = metrics?.selected?.[0] || { totalOrders: 0, revenue: 0, uniqueCustomers: [] };
  const totalCustomersAcrossAllStates = metrics?.allStatesCustomers?.[0]?.total || 0;
  const totalOrders = stateData.totalOrders;
  const revenue = stateData.revenue;
  const uniqueCustomers = stateData.uniqueCustomers || [];

  const aov = totalOrders > 0 ? Math.round(revenue / totalOrders) : 0;
  const marketShare = totalCustomersAcrossAllStates > 0
    ? parseFloat(((uniqueCustomers.length / totalCustomersAcrossAllStates) * 100).toFixed(1))
    : 0;

  const repeatCustomerData = await Order.aggregate([
    { $match: { ...match, userId: { $in: uniqueCustomers } } },
    { $group: { _id: '$userId', orderCount: { $sum: 1 } } },
  ]);

  const repeatCustomers = repeatCustomerData.filter((c) => c.orderCount > 1).length;
  const totalActiveCustomers = repeatCustomerData.length;
  const repeatCustomerPct = totalActiveCustomers > 0
    ? parseFloat(((repeatCustomers / totalActiveCustomers) * 100).toFixed(1))
    : 0;

  const newVsReturning = await getNewVsReturningByState(stateName, startDate, endDate);
  const monthlyTrends = await getMonthlyTrendsByState(stateName, startDate, endDate);
  const cities = await getStateCityDetail(stateName, startDate, endDate);

  const previousRevenue = metrics?.previous?.[0]?.revenue || 0;
  const growthValue = previousRevenue > 0
    ? ((revenue - previousRevenue) / previousRevenue) * 100
    : revenue > 0 ? 100 : 0;
  const growth = `${growthValue >= 0 ? '+' : ''}${growthValue.toFixed(1)}%`;

  return {
    name: stateName,
    totalCustomers: uniqueCustomers.length,
    totalOrders,
    revenue,
    marketShare,
    growth,
    aov,
    repeatCustomerPct,
    newCustomers: newVsReturning.new,
    returningCustomers: newVsReturning.returning,
    monthlyTrends,
    cities,
  };
};

export const getMonthlyTrendsByState = async (stateName: string, startDate?: Date, endDate?: Date, allStates: boolean = false) => {
  const match: any = {
    status: { $in: REGIONAL_ORDER_STATUSES },
  };
  if (!allStates) {
    match['shippingAddress.state'] = { $regex: new RegExp(`^${stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
  }
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = toDate(startDate);
    if (endDate) match.createdAt.$lte = toDate(endDate);
  }

  const trends = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return trends.map((t) => ({
    month: t._id,
    revenue: t.revenue,
    orders: t.orders,
  }));
};

export const getNewVsReturningByState = async (stateName: string, startDate?: Date, endDate?: Date) => {
  const match: any = {
    status: { $in: REGIONAL_ORDER_STATUSES },
    'shippingAddress.state': { $regex: new RegExp(`^${stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = toDate(startDate);
    if (endDate) match.createdAt.$lte = toDate(endDate);
  }

  const customerOrders = await Order.aggregate([
    { $match: match },
    { $group: { _id: '$userId', orderCount: { $sum: 1 } } },
  ]);

  let newCount = 0;
  let returningCount = 0;

  for (const c of customerOrders) {
    if (c.orderCount > 1) {
      returningCount++;
    } else {
      newCount++;
    }
  }

  return { new: newCount, returning: returningCount };
};

export const getStateGrowthData = async (stateName: string, startDate: Date, endDate: Date) => {
  const duration = endDate.getTime() - startDate.getTime();
  const prevStartDate = new Date(startDate.getTime() - duration);
  const prevEndDate = new Date(endDate.getTime() - duration);

  const [current, previous] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          status: { $in: REGIONAL_ORDER_STATUSES },
          'shippingAddress.state': { $regex: new RegExp(`^${stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: null, revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      {
        $match: {
          status: { $in: REGIONAL_ORDER_STATUSES },
          'shippingAddress.state': { $regex: new RegExp(`^${stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          createdAt: { $gte: prevStartDate, $lte: prevEndDate },
        },
      },
      { $group: { _id: null, revenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } }, orders: { $sum: 1 } } },
    ]),
  ]);

  const currRevenue = current[0]?.revenue || 0;
  const prevRevenue = previous[0]?.revenue || 0;
  const currOrders = current[0]?.orders || 0;
  const prevOrders = previous[0]?.orders || 0;

  const revenueGrowth = prevRevenue > 0 ? parseFloat((((currRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1)) : 0;
  const orderGrowth = prevOrders > 0 ? parseFloat((((currOrders - prevOrders) / prevOrders) * 100).toFixed(1)) : 0;

  return { revenueGrowth, orderGrowth, currentRevenue: currRevenue, previousRevenue: prevRevenue, currentOrders: currOrders, previousOrders: prevOrders };
};

export const getRegionalOverview = async (startDate?: Date, endDate?: Date) => {
  const match: any = { status: { $in: REGIONAL_ORDER_STATUSES } };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = toDate(startDate);
    if (endDate) match.createdAt.$lte = toDate(endDate);
  }

  // All orders placed in the period, regardless of status — needed as the
  // denominator for cancellation rate (an enterprise health metric, distinct
  // from revenue/regional analytics which stay approved-only).
  const placedMatch: any = {};
  if (startDate || endDate) {
    placedMatch.createdAt = {};
    if (startDate) placedMatch.createdAt.$gte = toDate(startDate);
    if (endDate) placedMatch.createdAt.$lte = toDate(endDate);
  }

  const [stats, stateCount, allOrdersAgg, totalPlaced, cancelledCount, paymentStatusAgg] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } },
          totalOrders: { $sum: 1 },
          uniqueCustomers: { $addToSet: '$userId' },
        },
      },
    ]),
    Order.aggregate([
      { $match: match },
      { $group: { _id: { $trim: { input: { $ifNull: ['$shippingAddress.state', 'Unknown'] } } } } },
      { $count: 'count' },
    ]),
    Order.aggregate([
      { $match: match },
      { $group: { _id: '$userId', orderCount: { $sum: 1 } } },
    ]),
    Order.countDocuments(placedMatch),
    Order.countDocuments({ ...placedMatch, status: 'cancelled' }),
    Order.aggregate([
      { $match: { ...placedMatch, paymentStatus: { $in: ['Paid', 'Refunded'] } } },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
    ]),
  ]);

  const data = stats[0] || { totalRevenue: 0, totalOrders: 0, uniqueCustomers: [] };
  const activeStates = stateCount[0]?.count || 0;
  const repeatCustomers = allOrdersAgg.filter((c) => c.orderCount > 1).length;
  const totalCustomers = allOrdersAgg.length;
  const aov = data.totalOrders > 0 ? Math.round(data.totalRevenue / data.totalOrders) : 0;
  const repeatPct = totalCustomers > 0 ? parseFloat(((repeatCustomers / totalCustomers) * 100).toFixed(1)) : 0;

  const cancellationRate = totalPlaced > 0 ? parseFloat(((cancelledCount / totalPlaced) * 100).toFixed(1)) : 0;
  const paidCount = paymentStatusAgg.find((p) => p._id === 'Paid')?.count || 0;
  const refundedCount = paymentStatusAgg.find((p) => p._id === 'Refunded')?.count || 0;
  const refundDenominator = paidCount + refundedCount;
  const refundRate = refundDenominator > 0 ? parseFloat(((refundedCount / refundDenominator) * 100).toFixed(1)) : 0;

  return {
    totalRevenue: data.totalRevenue,
    totalOrders: data.totalOrders,
    totalCustomers: data.uniqueCustomers.length,
    activeStates,
    aov,
    repeatCustomerPct: repeatPct,
    cancellationRate,
    refundRate,
  };
};

export const getStateAOV = async (startDate?: Date, endDate?: Date) => {
  const states = await getAllStatesWithData(startDate, endDate);
  return states.map((s) => ({
    name: s.name,
    aov: s.totalOrders > 0 ? Math.round(s.revenue / s.totalOrders) : 0,
    totalOrders: s.totalOrders,
    revenue: s.revenue,
  })).sort((a, b) => b.aov - a.aov);
};

export const getStateRepeatRate = async (startDate?: Date, endDate?: Date) => {
  const match: any = { status: { $in: REGIONAL_ORDER_STATUSES } };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = toDate(startDate);
    if (endDate) match.createdAt.$lte = toDate(endDate);
  }

  const data = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: { state: { $trim: { input: { $ifNull: ['$shippingAddress.state', 'Unknown'] } } }, userId: '$userId' },
        orderCount: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.state',
        totalCustomers: { $sum: 1 },
        repeatCustomers: { $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] } },
      },
    },
  ]);

  return data.map((s) => ({
    name: s._id,
    totalCustomers: s.totalCustomers,
    repeatCustomers: s.repeatCustomers,
    repeatRate: s.totalCustomers > 0 ? parseFloat(((s.repeatCustomers / s.totalCustomers) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.repeatRate - a.repeatRate);
};
