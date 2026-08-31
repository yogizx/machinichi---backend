/**
 * Machinichi — Fix stale localhost URLs in MongoDB
 * =================================================
 * Uploads made while the backend was pointed at a dev/localhost origin
 * (the old upload.routes.ts / banner upload route built the URL from
 * req.get('host')) saved absolute URLs like:
 *   http://localhost:5000/uploads/...
 *   http://localhost:3000/uploads/...
 * into MongoDB. Those only ever resolved on the machine that made the
 * upload, so they 404 / ERR_CONNECTION_REFUSED everywhere else
 * (production, other dev machines, etc).
 *
 * This script rewrites any such URL to point at the real backend origin
 * (Render by default), for every model/field known to store one:
 *   - products.images[].url
 *   - categories.image / categories.imageUrl
 *   - banners.imageWebp / imageFallback / image / imageUrl
 *   - users.gstCertificate.url / fssaiCertificate.url / avatar
 *
 * DRY RUN by default — pass --write to actually persist changes.
 *
 * Usage (run from the backend/ folder):
 *   npx ts-node src/scripts/fix-localhost-urls.ts               # dry run, just reports
 *   npx ts-node src/scripts/fix-localhost-urls.ts --write        # actually applies the fix
 *   NEW_ORIGIN=https://machinichi-backend.onrender.com npx ts-node src/scripts/fix-localhost-urls.ts --write
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI!;
const NEW_ORIGIN = (process.env.NEW_ORIGIN || 'https://machinichi-backend.onrender.com').replace(/\/$/, '');
const WRITE = process.argv.includes('--write');

if (!MONGO_URI) {
  console.error('MONGODB_URI missing — check backend/.env');
  process.exit(1);
}

// Matches any localhost/127.0.0.1 origin with an optional port, e.g.
// http://localhost:5000, http://localhost:3000, http://127.0.0.1:8080
const LOCALHOST_ORIGIN = /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/gi;

function fixUrl(url: unknown): { changed: boolean; value: unknown } {
  if (typeof url !== 'string' || !url) return { changed: false, value: url };
  if (!LOCALHOST_ORIGIN.test(url)) return { changed: false, value: url };
  LOCALHOST_ORIGIN.lastIndex = 0; // reset after .test()
  const next = url.replace(LOCALHOST_ORIGIN, NEW_ORIGIN);
  return { changed: next !== url, value: next };
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected. Target origin: ${NEW_ORIGIN}. Mode: ${WRITE ? 'WRITE' : 'DRY RUN (pass --write to apply)'}\n`);

  const db = mongoose.connection.db!;
  let totalDocsChanged = 0;
  let totalFieldsChanged = 0;

  // ---- Products: images[].url ----
  {
    const col = db.collection('products');
    const cursor = col.find({ 'images.url': LOCALHOST_ORIGIN });
    let docChanged = 0;
    for await (const doc of cursor) {
      const images = Array.isArray(doc.images) ? doc.images : [];
      let changedHere = 0;
      const newImages = images.map((img: any) => {
        const { changed, value } = fixUrl(img?.url);
        if (changed) { changedHere++; return { ...img, url: value }; }
        return img;
      });
      if (changedHere > 0) {
        docChanged++;
        totalFieldsChanged += changedHere;
        console.log(`[products] ${doc._id} (${doc.name || 'unnamed'}): fixing ${changedHere} image url(s)`);
        if (WRITE) {
          await col.updateOne({ _id: doc._id }, { $set: { images: newImages } });
        }
      }
    }
    totalDocsChanged += docChanged;
    console.log(`products: ${docChanged} document(s) with stale image URLs\n`);
  }

  // ---- Categories: image / imageUrl ----
  {
    const col = db.collection('categories');
    const cursor = col.find({
      $or: [{ image: LOCALHOST_ORIGIN }, { imageUrl: LOCALHOST_ORIGIN }],
    });
    let docChanged = 0;
    for await (const doc of cursor) {
      const update: Record<string, unknown> = {};
      for (const field of ['image', 'imageUrl']) {
        const { changed, value } = fixUrl((doc as any)[field]);
        if (changed) update[field] = value;
      }
      if (Object.keys(update).length > 0) {
        docChanged++;
        totalFieldsChanged += Object.keys(update).length;
        console.log(`[categories] ${doc._id} (${(doc as any).name || 'unnamed'}): fixing ${Object.keys(update).join(', ')}`);
        if (WRITE) await col.updateOne({ _id: doc._id }, { $set: update });
      }
    }
    totalDocsChanged += docChanged;
    console.log(`categories: ${docChanged} document(s) with stale image URLs\n`);
  }

  // ---- Banners: imageWebp / imageFallback / image / imageUrl ----
  {
    const col = db.collection('banners');
    const fields = ['imageWebp', 'imageFallback', 'image', 'imageUrl'];
    const cursor = col.find({ $or: fields.map((f) => ({ [f]: LOCALHOST_ORIGIN })) });
    let docChanged = 0;
    for await (const doc of cursor) {
      const update: Record<string, unknown> = {};
      for (const field of fields) {
        const { changed, value } = fixUrl((doc as any)[field]);
        if (changed) update[field] = value;
      }
      if (Object.keys(update).length > 0) {
        docChanged++;
        totalFieldsChanged += Object.keys(update).length;
        console.log(`[banners] ${doc._id}: fixing ${Object.keys(update).join(', ')}`);
        if (WRITE) await col.updateOne({ _id: doc._id }, { $set: update });
      }
    }
    totalDocsChanged += docChanged;
    console.log(`banners: ${docChanged} document(s) with stale image URLs\n`);
  }

  // ---- Users: gstCertificate.url / fssaiCertificate.url / avatar ----
  {
    const col = db.collection('users');
    const cursor = col.find({
      $or: [
        { 'gstCertificate.url': LOCALHOST_ORIGIN },
        { 'fssaiCertificate.url': LOCALHOST_ORIGIN },
        { avatar: LOCALHOST_ORIGIN },
      ],
    });
    let docChanged = 0;
    for await (const doc of cursor) {
      const update: Record<string, unknown> = {};
      const gst = fixUrl((doc as any).gstCertificate?.url);
      if (gst.changed) update['gstCertificate.url'] = gst.value;
      const fssai = fixUrl((doc as any).fssaiCertificate?.url);
      if (fssai.changed) update['fssaiCertificate.url'] = fssai.value;
      const avatar = fixUrl((doc as any).avatar);
      if (avatar.changed) update.avatar = avatar.value;

      if (Object.keys(update).length > 0) {
        docChanged++;
        totalFieldsChanged += Object.keys(update).length;
        console.log(`[users] ${doc._id} (${(doc as any).email || 'no email'}): fixing ${Object.keys(update).join(', ')}`);
        if (WRITE) await col.updateOne({ _id: doc._id }, { $set: update });
      }
    }
    totalDocsChanged += docChanged;
    console.log(`users: ${docChanged} document(s) with stale URLs\n`);
  }

  console.log('─'.repeat(60));
  console.log(`Total: ${totalDocsChanged} document(s), ${totalFieldsChanged} field(s) ${WRITE ? 'fixed' : 'would be fixed'}.`);
  if (!WRITE) {
    console.log('This was a DRY RUN — nothing was written. Re-run with --write to apply.');
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
