import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { Product } from './models/Product';

async function listNonDeletedProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const prods = await Product.find({ isDeleted: false });
    console.log('--- ALL NON-DELETED PRODUCTS IN MONGODB (Count: ' + prods.length + ') ---');
    prods.forEach(p => {
      console.log({
        _id: p._id.toString(),
        name: p.name,
        sku: p.sku,
        publishStatus: p.publishStatus,
        status: p.status,
        isVisible: p.isVisible,
        isDeleted: p.isDeleted,
        category: p.category,
        sellingPrice: p.sellingPrice,
        variantsCount: p.variants ? p.variants.length : 0,
      });
    });

    const deletedProds = await Product.find({ isDeleted: true }, '_id name sku publishStatus status deletedAt').limit(15);
    console.log('\n--- SAMPLE SOFT-DELETED PRODUCTS IN MONGODB (Total: ' + await Product.countDocuments({ isDeleted: true }) + ') ---');
    deletedProds.forEach(p => {
      console.log(`- ID: ${p._id} | Name: "${p.name}" | SKU: ${p.sku} | status: ${p.status} | deletedAt: ${p.deletedAt}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

listNonDeletedProducts();
