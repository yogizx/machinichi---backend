import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Product } from './models/Product';
import { Category } from './models/Category';
import { User } from './models/User';
import { generateAuthTokens } from './services/token.service';

async function runDiagnostics() {
  const uri = process.env.MONGODB_URI!;
  console.log('Connecting to MongoDB Atlas...');
  const t0 = Date.now();
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 10000,
    family: 4,
  } as any);
  console.log(`Connected in ${Date.now() - t0}ms`);

  console.log('\n--- DIAGNOSTIC RESULT ---');
  
  // 1. Total products
  const totalCount = await Product.countDocuments();
  const nonDeletedCount = await Product.countDocuments({ isDeleted: false });
  const publishedCount = await Product.countDocuments({ isDeleted: false, publishStatus: 'published' });
  const unlistedCount = await Product.countDocuments({ isDeleted: false, publishStatus: 'unlisted' });
  const archivedCount = await Product.countDocuments({ isDeleted: false, publishStatus: 'archived' });

  console.log(`Total Product Documents: ${totalCount}`);
  console.log(`Non-deleted Products: ${nonDeletedCount}`);
  console.log(`Published Products: ${publishedCount}`);
  console.log(`Unlisted/Draft Products: ${unlistedCount}`);
  console.log(`Archived Products: ${archivedCount}`);

  // 2. Inspect individual products
  const products = await Product.find({ isDeleted: false })
    .select('name sku price sellingPrice mrpPrice quantity publishStatus variants category')
    .populate('category', 'name')
    .lean();

  console.log('\nProduct Details:');
  products.forEach((p: any, i) => {
    console.log(`${i + 1}. [${p._id}] ${p.name}`);
    console.log(`   Status: ${p.publishStatus} | SKU: ${p.sku} | Price: ₹${p.sellingPrice} | Stock: ${p.quantity}`);
    console.log(`   Category: ${p.category?.name || p.category}`);
    console.log(`   Variants Count: ${p.variants?.length || 0}`);
  });

  // 3. Test specific product ID 6a7573235f9140e065f40b03
  const targetId = '6a7573235f9140e065f40b03';
  const targetProd = await Product.findById(targetId);
  console.log(`\nTarget Product ID '${targetId}' exists:`, !!targetProd);
  if (targetProd) {
    console.log(`   Name: ${targetProd.name}`);
  }

  // 4. Admin User check
  const admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } });
  console.log(`\nAdmin User exists:`, !!admin, admin ? `(${admin.email})` : '');

  await mongoose.disconnect();
  console.log('\nDiagnostic completed successfully!');
}

runDiagnostics();
