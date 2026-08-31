import mongoose, { Schema } from 'mongoose';

export interface IProductAnalytics extends mongoose.Document {
  productId: mongoose.Types.ObjectId;
  totalUniqueViews: number;
  currentCartUsers: string[];
  totalCartAdds: number;
  totalCartRemoves: number;
  totalUniqueCartUsers: number;
  totalPurchases: number;
  totalRevenue: number;
  totalUnitsSold: number;
  totalWishlistAdds: number;
  totalWishlistRemoves: number;
  currentWishlistUsers: string[];
  totalUniqueWishlistUsers: number;
  lastViewedAt: Date | null;
  lastPurchasedAt: Date | null;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  dailyGrowth: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  previousDayViews: number;
  previousWeekViews: number;
  previousMonthViews: number;
  salesToday: number;
  salesThisWeek: number;
  salesThisMonth: number;
  previousDaySales: number;
  previousWeekSales: number;
  previousMonthSales: number;
  dailySalesGrowth: number | null;
  weeklySalesGrowth: number | null;
  monthlySalesGrowth: number | null;
  snapshotDate: Date;
}

const productAnalyticsSchema = new Schema<IProductAnalytics>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  totalUniqueViews: { type: Number, default: 0 },
  currentCartUsers: [{ type: String }],
  totalCartAdds: { type: Number, default: 0 },
  totalCartRemoves: { type: Number, default: 0 },
  totalUniqueCartUsers: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalUnitsSold: { type: Number, default: 0 },
  totalWishlistAdds: { type: Number, default: 0 },
  totalWishlistRemoves: { type: Number, default: 0 },
  currentWishlistUsers: [{ type: String }],
  totalUniqueWishlistUsers: { type: Number, default: 0 },
  lastViewedAt: { type: Date, default: null },
  lastPurchasedAt: { type: Date, default: null },
  viewsToday: { type: Number, default: 0 },
  viewsThisWeek: { type: Number, default: 0 },
  viewsThisMonth: { type: Number, default: 0 },
  dailyGrowth: { type: Number, default: 0 },
  weeklyGrowth: { type: Number, default: 0 },
  monthlyGrowth: { type: Number, default: 0 },
  previousDayViews: { type: Number, default: 0 },
  previousWeekViews: { type: Number, default: 0 },
  previousMonthViews: { type: Number, default: 0 },
  salesToday: { type: Number, default: 0 },
  salesThisWeek: { type: Number, default: 0 },
  salesThisMonth: { type: Number, default: 0 },
  previousDaySales: { type: Number, default: 0 },
  previousWeekSales: { type: Number, default: 0 },
  previousMonthSales: { type: Number, default: 0 },
  dailySalesGrowth: { type: Number, default: null },
  weeklySalesGrowth: { type: Number, default: null },
  monthlySalesGrowth: { type: Number, default: null },
  snapshotDate: { type: Date, default: Date.now },
});

productAnalyticsSchema.index({ totalUniqueViews: -1 });
productAnalyticsSchema.index({ totalPurchases: -1 });
productAnalyticsSchema.index({ totalRevenue: -1 });

export const ProductAnalytics = mongoose.model<IProductAnalytics>('ProductAnalytics', productAnalyticsSchema);
