/**
 * Recompute averageRating + reviewCount for every product from approved
 * reviews. Idempotent and safe to re-run after any bulk data load or repair.
 *
 * Usage (from backend/):
 *   npm run sync:ratings            # recompute all products
 *   npm run sync:ratings -- --dry-run
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Review } from '../models/Review';
import { Product } from '../models/Product';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

async function main() {
  const MONGO_URI = process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('MONGODB_URI missing from backend/.env');
    process.exit(1);
  }

  console.log(`[RATINGS] mode=${dryRun ? 'DRY-RUN' : 'LIVE'}`);
  mongoose.set('autoIndex', false);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 } as any);

  const rows = await Review.aggregate([
    { $match: { isApproved: true } },
    {
      $group: {
        _id: '$productId',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const ops = rows.map((r) => ({
    updateOne: {
      filter: { _id: r._id },
      update: { $set: { averageRating: Math.round(r.average * 10) / 10, reviewCount: r.count } },
    },
  }));

  // Zero-out every product with no approved reviews so stale seed values
  // never misrepresent the real rating.
  const productIds = rows.map((r) => r._id);
  const zeroRes = await Product.updateMany(
    { _id: { $nin: productIds } },
    { $set: { averageRating: 0, reviewCount: 0 } }
  );

  if (!dryRun) {
    const res = await Product.bulkWrite(ops);
    console.log(`[RATINGS] updated ${res.modifiedCount} product(s) from approved reviews`);
  } else {
    console.log(`[RATINGS] would update ${ops.length} product(s)`);
  }
  console.log(`[RATINGS] zeroed ${zeroRes.modifiedCount} product(s) without approved reviews`);

  await mongoose.disconnect();
  console.log('[RATINGS] done.');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('[RATINGS] fatal error:', err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});