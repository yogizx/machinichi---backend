import mongoose from 'mongoose';
import { ProductAnalytics } from './src/models/ProductAnalytics';
import { Product } from './src/models/Product';
import dotenv from 'dotenv';
dotenv.config();

async function resetCartAnalytics() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/machinichi');
    console.log('Connected to MongoDB');
    
    // Reset ProductAnalytics
    const result1 = await ProductAnalytics.updateMany({}, {
      $set: {
        currentCartUsers: [],
        totalCartAdds: 0,
        totalCartRemoves: 0,
        totalUniqueCartUsers: 0
      }
    });
    console.log(`Reset ${result1.modifiedCount} ProductAnalytics docs.`);

    // Reset Product totalCartCount
    const result2 = await Product.updateMany({}, {
      $set: {
        totalCartCount: 0
      }
    });
    console.log(`Reset ${result2.modifiedCount} Product docs.`);
    
    console.log('Successfully reset active cart analytics.');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting analytics:', error);
    process.exit(1);
  }
}

resetCartAnalytics();
