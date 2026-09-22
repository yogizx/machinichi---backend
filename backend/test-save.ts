import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ReportConfig } from './src/models/ReportConfig';
import { Category } from './src/models/Category';
import { Product } from './src/models/Product';
import { Order } from './src/models/Order';
import { User } from './src/models/User';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('MONGODB_URI is not defined');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    // Fetch categories count
    console.log('Fetching category metrics...');
    const allCategories = await Category.find({});
    console.log(`Categories count: ${allCategories.length}`);
    
    // Check products count
    const productsCount = await Product.countDocuments({ isDeleted: false });
    console.log(`Products count: ${productsCount}`);

    // Try detailed category performance
    const startDate = new Date('2024-10-01');
    const endDate = new Date('2024-10-31');

    console.log('Detailed category performance query:');
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
      status: { $nin: ['Cancelled', 'cancelled', 'Returned', 'returned'] }
    });
    console.log(`Orders count: ${orders.length}`);

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

    console.log(`Detailed categories performance rows: ${rows.length}`);
    console.log('Sample rows:', rows.slice(0, 3));

    // Try saving configuration
    const user = await User.findOne({});
    if (!user) {
      console.error('No user found for test!');
    } else {
      console.log(`Using user: ${user.email} (${user._id}) role: ${user.role}`);
      
      // Explicitly drop unique index for testing
      try {
        const db = mongoose.connection.db;
        if (db) {
          console.log('Attempting to drop unique index userId_1...');
          await db.collection('reportconfigs').dropIndex('userId_1');
          console.log('Successfully dropped unique index userId_1!');
        }
      } catch (err: any) {
        console.log('dropIndex note (might not exist or already dropped):', err.message);
      }

      const config = new ReportConfig({
        userId: user._id,
        reportType: 'Inventory Turnover Ratio',
        format: 'PDF',
        frequency: 'Weekly',
        recipientEmail: 'test@example.com',
        status: 'Active'
      });
      await config.save();
      console.log('Successfully saved report config to database!');
    }
  } catch (err: any) {
    console.error('Error during test-save run:', err.message, err.stack);
  } finally {
    await mongoose.disconnect();
  }
};

run();
