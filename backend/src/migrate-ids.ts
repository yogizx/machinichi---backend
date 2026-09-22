import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/machinichi';

async function migrateIds() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error('DB is null');
  const collection = db.collection('products');

  const allDocs = await collection.find({}).toArray();
  console.log(`Checking ${allDocs.length} products for string _ids...`);

  let convertedCount = 0;
  for (const doc of allDocs) {
    if (typeof doc._id === 'string' && /^[0-9a-fA-F]{24}$/.test(doc._id)) {
      console.log(`Converting product "${doc.name}" _id from string "${doc._id}" to ObjectId...`);
      const objectId = new mongoose.Types.ObjectId(doc._id);
      
      // Re-insert as ObjectId and remove string _id
      const docCopy = { ...doc, _id: objectId };
      await collection.deleteOne({ _id: doc._id });
      await collection.insertOne(docCopy);
      convertedCount++;
    }
  }

  console.log(`Successfully converted ${convertedCount} string _id products to ObjectId.`);
  await mongoose.disconnect();
}

migrateIds().catch(console.error);
