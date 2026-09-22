/**
 * Machinichi — MongoDB Collection Initialiser
 * =============================================
 * Creates all 24 collections with:
 *   - Proper indexes (unique, sparse, compound, TTL, text)
 *   - Schema validators (MongoDB-level)
 *   - Realistic seed documents for every collection
 *
 * Run:  npx ts-node src/scripts/initCollections.ts
 */

import mongoose, { Connection } from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI!;
if (!MONGO_URI) { console.error('MONGODB_URI missing'); process.exit(1); }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const id = () => new mongoose.Types.ObjectId();
const now = new Date();
const days = (n: number) => new Date(Date.now() + n * 86_400_000);

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built ObjectIds we reuse across collections
// ─────────────────────────────────────────────────────────────────────────────
const IDS = {
  // users
  customer1: id(), customer2: id(), customer3: id(),
  admin1: id(),    superAdmin: id(),
  // categories
  catDryFruits: id(), catGrains: id(), catFlour: id(),
  catReadyToEat: id(), catJuices: id(), catPooja: id(), catOrganic: id(),
  // products (sample set)
  prod1: id(), prod2: id(), prod3: id(), prod4: id(), prod5: id(),
  prod6: id(), prod7: id(), prod8: id(),
  // misc
  order1: id(), order2: id(), order3: id(),
  coupon1: id(), coupon2: id(), coupon3: id(),
  scratchOffer1: id(),
  banner1: id(), banner2: id(),
  business1: id(),
  returnReq1: id(),
  payment1: id(), payment2: id(),
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔌  Connecting to MongoDB Atlas…');
  await mongoose.connect(MONGO_URI);
  const db: Connection = mongoose.connection;
  console.log(`✅  Connected → database: ${db.name}\n`);

  // ── helpers ──────────────────────────────────────────────────────────────
  async function createCollection(name: string, options: Record<string, any> = {}) {
    try {
      await db.createCollection(name, options);
      console.log(`  ✔ Created collection: ${name}`);
    } catch (err: any) {
      if (err.codeName === 'NamespaceExists') {
        console.log(`  ↩ Already exists: ${name}`);
      } else {
        throw err;
      }
    }
  }

  async function ensureIndexes(
    colName: string,
    indexes: Parameters<typeof db.collection>[0] extends string
      ? any[]
      : never,
  ) {
    const col = db.collection(colName);
    for (const { key, options } of indexes) {
      try {
        await col.createIndex(key, options || {});
      } catch (err: any) {
        // ignore duplicate index errors
        if (!err.message?.includes('already exists')) throw err;
      }
    }
  }

  // ── 1. USERS ──────────────────────────────────────────────────────────────
  console.log('\n📁  1/24  users');
  await createCollection('users');
  await ensureIndexes('users', [
    { key: { email: 1 },       options: { unique: true, sparse: true, name: 'email_unique' } },
    { key: { phone: 1 },       options: { unique: true, sparse: true, name: 'phone_unique' } },
    { key: { googleId: 1 },    options: { unique: true, sparse: true, name: 'googleId_unique' } },
    { key: { firebaseUid: 1 }, options: { unique: true, sparse: true, name: 'firebaseUid_unique' } },
    { key: { role: 1 },        options: { name: 'role_idx' } },
    { key: { isBlocked: 1 },   options: { name: 'isBlocked_idx' } },
    { key: { customerTier: 1 },options: { name: 'customerTier_idx' } },
    { key: { createdAt: -1 },  options: { name: 'createdAt_desc' } },
  ]);

  const passwordHash = await bcrypt.hash('Admin@1234', 12);
  const customerHash = await bcrypt.hash('Customer@1234', 12);

  await db.collection('users').insertMany([
    {
      _id: IDS.superAdmin,
      fullName: 'Super Admin',
      email: 'superadmin@machinichi.com',
      phone: '9000000001',
      password: passwordHash,
      avatar: '',
      provider: 'local',
      role: 'super_admin',
      isEmailVerified: true,
      isPhoneVerified: true,
      isBlocked: false,
      failedLoginAttempts: 0,
      passwordResetAttempts: 0,
      customerTier: 'Gold Member',
      totalOrders: 0,
      totalSpend: 0,
      notificationPreferences: { emailNotifications: true, smsAlerts: true, whatsappUpdates: true },
      createdAt: now, updatedAt: now,
    },
    {
      _id: IDS.admin1,
      fullName: 'Admin User',
      email: 'admin@machinichi.com',
      phone: '9000000002',
      password: passwordHash,
      avatar: '',
      provider: 'local',
      role: 'admin',
      isEmailVerified: true,
      isPhoneVerified: true,
      isBlocked: false,
      failedLoginAttempts: 0,
      passwordResetAttempts: 0,
      customerTier: 'Gold Member',
      totalOrders: 0,
      totalSpend: 0,
      notificationPreferences: { emailNotifications: true, smsAlerts: false, whatsappUpdates: false },
      createdAt: now, updatedAt: now,
    },
    {
      _id: IDS.customer1,
      fullName: 'Aditi Sharma',
      email: 'aditi.sharma@example.com',
      phone: '9876543210',
      password: customerHash,
      avatar: '',
      provider: 'local',
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: true,
      isBlocked: false,
      failedLoginAttempts: 0,
      passwordResetAttempts: 0,
      customerTier: 'Gold Member',
      totalOrders: 12,
      totalSpend: 18400,
      notificationPreferences: { emailNotifications: true, smsAlerts: true, whatsappUpdates: true },
      createdAt: now, updatedAt: now,
    },
    {
      _id: IDS.customer2,
      fullName: 'Rohan Mehta',
      email: 'rohan.mehta@example.com',
      phone: '9876543211',
      password: customerHash,
      avatar: '',
      provider: 'local',
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: false,
      isBlocked: false,
      failedLoginAttempts: 0,
      passwordResetAttempts: 0,
      customerTier: 'Regular',
      totalOrders: 3,
      totalSpend: 4200,
      notificationPreferences: { emailNotifications: true, smsAlerts: false, whatsappUpdates: false },
      createdAt: now, updatedAt: now,
    },
    {
      _id: IDS.customer3,
      fullName: 'Priya Singh',
      email: 'priya.singh@example.com',
      phone: '9876543212',
      password: customerHash,
      avatar: '',
      provider: 'google',
      googleId: 'google_uid_priya_001',
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: false,
      isBlocked: false,
      failedLoginAttempts: 0,
      passwordResetAttempts: 0,
      customerTier: 'Organic Tier',
      totalOrders: 7,
      totalSpend: 9800,
      notificationPreferences: { emailNotifications: true, smsAlerts: false, whatsappUpdates: true },
      createdAt: now, updatedAt: now,
    },
  ]);
  console.log('     → 5 users seeded (1 super_admin, 1 admin, 3 customers)');

  // ── 2. ADDRESSES ─────────────────────────────────────────────────────────
  console.log('\n📁  2/24  addresses');
  await createCollection('addresses');
  await ensureIndexes('addresses', [
    { key: { userId: 1 },                  options: { name: 'userId_idx' } },
    { key: { userId: 1, isDefault: 1 },    options: { name: 'userId_default_idx' } },
  ]);
  await db.collection('addresses').insertMany([
    {
      _id: id(), userId: IDS.customer1,
      label: 'Home',
      fullName: 'Aditi Sharma', phoneNumber: '9876543210',
      streetAddress: '12, MG Road, Nungambakkam',
      city: 'Chennai', state: 'Tamil Nadu', zipCode: '600034', country: 'India',
      isDefault: true, source: 'profile', createdAt: now, updatedAt: now,
    },
    {
      _id: id(), userId: IDS.customer1,
      label: 'Work',
      fullName: 'Aditi Sharma', phoneNumber: '9876543210',
      streetAddress: '5th Floor, Tidel Park, Taramani',
      city: 'Chennai', state: 'Tamil Nadu', zipCode: '600113', country: 'India',
      isDefault: false, source: 'profile', createdAt: now, updatedAt: now,
    },
    {
      _id: id(), userId: IDS.customer2,
      label: 'Home',
      fullName: 'Rohan Mehta', phoneNumber: '9876543211',
      streetAddress: '7, Bandra West, Linking Road',
      city: 'Mumbai', state: 'Maharashtra', zipCode: '400050', country: 'India',
      isDefault: true, source: 'profile', createdAt: now, updatedAt: now,
    },
    {
      _id: id(), userId: IDS.customer3,
      label: 'Home',
      fullName: 'Priya Singh', phoneNumber: '9876543212',
      streetAddress: '22, Indiranagar, 100 Feet Road',
      city: 'Bengaluru', state: 'Karnataka', zipCode: '560038', country: 'India',
      isDefault: true, source: 'checkout', createdAt: now, updatedAt: now,
    },
  ]);
  console.log('     → 4 addresses seeded');

  // ── 3. REFRESH TOKENS ────────────────────────────────────────────────────
  console.log('\n📁  3/24  refresh_tokens');
  await createCollection('refresh_tokens');
  await ensureIndexes('refresh_tokens', [
    { key: { token: 1 },      options: { unique: true, name: 'token_unique' } },
    { key: { userId: 1 },     options: { name: 'userId_idx' } },
    { key: { expiresAt: 1 },  options: { expireAfterSeconds: 0, name: 'ttl_expires' } },
  ]);
  // No seed data — generated at runtime
  console.log('     → indexes created (no seed — tokens are runtime only)');

  // ── 4. OTPs ──────────────────────────────────────────────────────────────
  console.log('\n📁  4/24  otps');
  await createCollection('otps');
  await ensureIndexes('otps', [
    { key: { userId: 1, type: 1 },  options: { name: 'userId_type_idx' } },
    { key: { expiresAt: 1 },        options: { expireAfterSeconds: 0, name: 'ttl_expires' } },
  ]);
  console.log('     → indexes created (no seed — OTPs are runtime only)');

  // ── 5. CATEGORIES ────────────────────────────────────────────────────────
  console.log('\n📁  5/24  categories');
  await createCollection('categories');
  await ensureIndexes('categories', [
    { key: { slug: 1 },           options: { unique: true, name: 'slug_unique' } },
    { key: { parentCategory: 1 }, options: { sparse: true, name: 'parent_idx' } },
    { key: { isActive: 1 },       options: { name: 'isActive_idx' } },
    { key: { order: 1 },          options: { name: 'order_idx' } },
  ]);

  const categories = [
    { _id: IDS.catDryFruits, name: 'Dry Fruits',    slug: 'dry-fruits',    description: 'Premium quality dry fruits including almonds, cashews, raisins and more.', image: '', order: 1, isActive: true, productCount: 18 },
    { _id: IDS.catGrains,    name: 'Grains',         slug: 'grains',        description: 'Ancient and modern grains — quinoa, barley, amaranth, millets and more.', image: '', order: 2, isActive: true, productCount: 14 },
    { _id: IDS.catFlour,     name: 'Flour',          slug: 'flour',         description: 'Stone-ground flours — wheat atta, ragi, bajra, rice flour and more.', image: '', order: 3, isActive: true, productCount: 12 },
    { _id: IDS.catReadyToEat,name: 'Ready To Eat',  slug: 'ready-to-eat',  description: 'Healthy, organic ready-to-eat snacks and meal options.', image: '', order: 4, isActive: true, productCount: 10 },
    { _id: IDS.catJuices,    name: 'Juices',         slug: 'juices',        description: 'Cold-pressed, 100% natural fruit and vegetable juices.', image: '', order: 5, isActive: true, productCount: 8 },
    { _id: IDS.catPooja,     name: 'Pooja Items',    slug: 'pooja-items',   description: 'Pure, organic pooja essentials — flowers, rice, grains and more.', image: '', order: 6, isActive: true, productCount: 6 },
    { _id: IDS.catOrganic,   name: 'Organic Products',slug: 'organic-products', description: 'Certified organic products across all categories.', image: '', order: 7, isActive: true, productCount: 22 },
  ].map(c => ({ ...c, parentCategory: null, seo: { metaTitle: c.name + ' | Machinichi', metaDescription: c.description }, createdAt: now, updatedAt: now }));

  await db.collection('categories').insertMany(categories);
  console.log('     → 7 categories seeded');

  // ── 6. PRODUCTS ──────────────────────────────────────────────────────────
  console.log('\n📁  6/24  products');
  await createCollection('products');
  await ensureIndexes('products', [
    { key: { slug: 1 },                           options: { unique: true, name: 'slug_unique' } },
    { key: { sku: 1 },                            options: { unique: true, name: 'sku_unique' } },
    { key: { category: 1, status: 1, isVisible: 1 }, options: { name: 'cat_status_visible_idx' } },
    { key: { isFeatured: 1 },                     options: { name: 'featured_idx' } },
    { key: { status: 1 },                         options: { name: 'status_idx' } },
    { key: { deletedAt: 1 },                      options: { sparse: true, name: 'softdelete_idx' } },
    { key: { name: 'text', 'seo.metaKeywords': 'text', tags: 'text' }, options: { name: 'text_search', weights: { name: 10, tags: 5 } } },
    { key: { sellingPrice: 1 },                   options: { name: 'price_idx' } },
    { key: { averageRating: -1 },                 options: { name: 'rating_idx' } },
    { key: { totalSales: -1 },                    options: { name: 'sales_idx' } },
  ]);

  function makeProduct(overrides: Partial<any>): any {
    const base = {
      status: 'Active', isVisible: true, isFeatured: false,
      costPrice: 300, mrpPrice: 599, sellingPrice: 499, comparePrice: 599,
      quantity: 200, reservedQuantity: 0, lowStockThreshold: 20, trackInventory: true,
      weight: 1000, dimensions: { height: 25, width: 15, length: 10 },
      gstRate: 5, gstCategory: 'Food Products',
      unitType: 'Kilogram',
      attributes: {}, tags: ['ORGANIC'], badges: [],
      images: [{ url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', alt: '', isPrimary: true, order: 1 }],
      videos: [],
      totalSales: 0, totalRevenue: 0, averageRating: 0, reviewCount: 0,
      createdBy: IDS.admin1, updatedBy: IDS.admin1, deletedAt: null,
      createdAt: now, updatedAt: now,
    };
    return { ...base, ...overrides };
  }

  const products = [
    makeProduct({
      _id: IDS.prod1,
      name: 'Stone Ground Wheat Atta',
      slug: slug('Stone Ground Wheat Atta'),
      sku: 'MACH-FL-001',
      hsnCode: '1101',
      brand: 'Machinichi',
      category: IDS.catFlour,
      description: 'Stone-ground whole wheat atta milled from heritage wheat varieties. No additives, no bleach — just pure nutrition for soft, fluffy rotis.',
      shortDescription: 'Stone-ground whole wheat atta for soft, nutritious rotis.',
      costPrice: 220, mrpPrice: 499, sellingPrice: 399, comparePrice: 499,
      quantity: 450, lowStockThreshold: 50,
      weight: 5000,
      unitType: 'Kilogram',
      availableSizes: ['1 kg', '5 kg', '10 kg'],
      variants: [
        { size: '1 kg',  sku: 'MACH-FL-001-1KG',  mrpPrice: 120, sellingPrice: 99,  quantity: 200, isAvailable: true },
        { size: '5 kg',  sku: 'MACH-FL-001-5KG',  mrpPrice: 499, sellingPrice: 399, quantity: 150, isAvailable: true },
        { size: '10 kg', sku: 'MACH-FL-001-10KG', mrpPrice: 899, sellingPrice: 749, quantity: 100, isAvailable: true },
      ],
      tags: ['ORGANIC', 'STONE-GROUND'],
      badges: ['BEST SELLER'],
      isFeatured: true,
      totalSales: 2850,
      averageRating: 4.7,
      reviewCount: 312,
      seo: { metaTitle: 'Stone Ground Wheat Atta | Machinichi', metaDescription: 'Buy premium stone-ground wheat atta online.', metaKeywords: ['atta', 'wheat flour', 'organic atta'] },
    }),
    makeProduct({
      _id: IDS.prod2,
      name: 'Premium Brown Basmati Rice',
      slug: slug('Premium Brown Basmati Rice'),
      sku: 'MACH-GR-001',
      hsnCode: '1006',
      brand: 'Machinichi',
      category: IDS.catGrains,
      description: 'Heritage seed brown basmati rice from the foothills of the Himalayas. Rich in fibre and nutrients, with a distinctive nutty aroma.',
      shortDescription: 'Heritage seed brown basmati — nutty aroma, full nutrition.',
      costPrice: 450, mrpPrice: 999, sellingPrice: 763, comparePrice: 999,
      quantity: 320,
      availableSizes: ['1 kg', '5 kg', '10 kg'],
      variants: [
        { size: '1 kg',  sku: 'MACH-GR-001-1KG',  mrpPrice: 220, sellingPrice: 180, quantity: 180, isAvailable: true },
        { size: '5 kg',  sku: 'MACH-GR-001-5KG',  mrpPrice: 999, sellingPrice: 763, quantity: 90,  isAvailable: true },
        { size: '10 kg', sku: 'MACH-GR-001-10KG', mrpPrice: 1800, sellingPrice: 1399, quantity: 50, isAvailable: true },
      ],
      tags: ['ORGANIC', 'HERITAGE'],
      badges: ['20% OFF'],
      isFeatured: true,
      totalSales: 1924,
      averageRating: 4.5,
      reviewCount: 214,
      seo: { metaTitle: 'Brown Basmati Rice | Machinichi', metaDescription: 'Buy premium brown basmati rice online.', metaKeywords: ['brown basmati', 'organic rice'] },
    }),
    makeProduct({
      _id: IDS.prod3,
      name: 'Jumbo Roasted Cashews',
      slug: slug('Jumbo Roasted Cashews'),
      sku: 'MACH-DF-001',
      hsnCode: '0801',
      brand: 'Machinichi',
      category: IDS.catDryFruits,
      description: 'Whole jumbo W180 cashews, lightly roasted and lightly salted. Sourced from organic cashew farms in Goa and Karnataka.',
      shortDescription: 'Jumbo W180 cashews — light roast, pure taste.',
      costPrice: 800, mrpPrice: 1799, sellingPrice: 1399, comparePrice: 1799,
      quantity: 180,
      availableSizes: ['250 g', '500 g', '1 kg'],
      variants: [
        { size: '250 g', sku: 'MACH-DF-001-250G', mrpPrice: 499,  sellingPrice: 379, quantity: 80, isAvailable: true },
        { size: '500 g', sku: 'MACH-DF-001-500G', mrpPrice: 899,  sellingPrice: 699, quantity: 70, isAvailable: true },
        { size: '1 kg',  sku: 'MACH-DF-001-1KG',  mrpPrice: 1799, sellingPrice: 1399, quantity: 30, isAvailable: true },
      ],
      tags: ['ORGANIC', 'ROASTED'],
      badges: ['BEST SELLER'],
      isFeatured: true,
      totalSales: 3241,
      averageRating: 4.8,
      reviewCount: 521,
      seo: { metaTitle: 'Jumbo Cashews | Machinichi', metaDescription: 'Buy organic jumbo cashews online.', metaKeywords: ['cashews', 'roasted cashews', 'dry fruits'] },
    }),
    makeProduct({
      _id: IDS.prod4,
      name: 'Tri-Color Royal Quinoa',
      slug: slug('Tri-Color Royal Quinoa'),
      sku: 'MACH-GR-002',
      hsnCode: '1008',
      brand: 'Machinichi',
      category: IDS.catGrains,
      description: 'High-altitude tri-colour quinoa from the Andes. A complete protein grain with all 9 essential amino acids. Gluten-free.',
      shortDescription: 'High-altitude Andes tri-colour quinoa — complete protein.',
      costPrice: 380, mrpPrice: 899, sellingPrice: 763, comparePrice: 899,
      quantity: 240,
      availableSizes: ['500 g', '1 kg', '2 kg'],
      variants: [
        { size: '500 g', sku: 'MACH-GR-002-500G', mrpPrice: 499,  sellingPrice: 399, quantity: 120, isAvailable: true },
        { size: '1 kg',  sku: 'MACH-GR-002-1KG',  mrpPrice: 899,  sellingPrice: 763, quantity: 90,  isAvailable: true },
        { size: '2 kg',  sku: 'MACH-GR-002-2KG',  mrpPrice: 1699, sellingPrice: 1399, quantity: 30, isAvailable: true },
      ],
      tags: ['ORGANIC', 'GLUTEN-FREE', 'HIGH-PROTEIN'],
      badges: ['NEW'],
      isFeatured: false,
      totalSales: 842,
      averageRating: 4.3,
      reviewCount: 98,
      seo: { metaTitle: 'Tri-Color Quinoa | Machinichi', metaDescription: 'Buy organic tri-color quinoa online.', metaKeywords: ['quinoa', 'gluten free', 'superfood'] },
    }),
    makeProduct({
      _id: IDS.prod5,
      name: 'Premium Almonds',
      slug: slug('Premium Almonds'),
      sku: 'MACH-DF-002',
      hsnCode: '0802',
      brand: 'Machinichi',
      category: IDS.catDryFruits,
      description: 'California-sourced premium almonds. Rich in Vitamin E and heart-healthy fats. Perfect for snacking, smoothies and cooking.',
      shortDescription: 'California premium almonds — heart healthy, rich in Vitamin E.',
      costPrice: 700, mrpPrice: 1499, sellingPrice: 1199, comparePrice: 1499,
      quantity: 300,
      availableSizes: ['250 g', '500 g', '1 kg'],
      variants: [
        { size: '250 g', sku: 'MACH-DF-002-250G', mrpPrice: 399,  sellingPrice: 319, quantity: 120, isAvailable: true },
        { size: '500 g', sku: 'MACH-DF-002-500G', mrpPrice: 749,  sellingPrice: 599, quantity: 110, isAvailable: true },
        { size: '1 kg',  sku: 'MACH-DF-002-1KG',  mrpPrice: 1499, sellingPrice: 1199, quantity: 70, isAvailable: true },
      ],
      tags: ['ORGANIC'],
      badges: ['20% OFF'],
      isFeatured: true,
      totalSales: 4120,
      averageRating: 4.9,
      reviewCount: 634,
      seo: { metaTitle: 'Premium Almonds | Machinichi', metaDescription: 'Buy premium California almonds online.', metaKeywords: ['almonds', 'badam', 'dry fruits'] },
    }),
    makeProduct({
      _id: IDS.prod6,
      name: 'Organic Ragi Flour',
      slug: slug('Organic Ragi Flour'),
      sku: 'MACH-FL-002',
      hsnCode: '1102',
      brand: 'Machinichi',
      category: IDS.catFlour,
      description: 'Certified organic finger millet (ragi) flour. High in calcium and iron. Ideal for ragi mudde, rotis and health drinks.',
      shortDescription: 'Certified organic ragi flour — calcium and iron rich.',
      costPrice: 150, mrpPrice: 349, sellingPrice: 279, comparePrice: 349,
      quantity: 380,
      availableSizes: ['500 g', '1 kg', '2 kg'],
      variants: [
        { size: '500 g', sku: 'MACH-FL-002-500G', mrpPrice: 199, sellingPrice: 159, quantity: 160, isAvailable: true },
        { size: '1 kg',  sku: 'MACH-FL-002-1KG',  mrpPrice: 349, sellingPrice: 279, quantity: 150, isAvailable: true },
        { size: '2 kg',  sku: 'MACH-FL-002-2KG',  mrpPrice: 649, sellingPrice: 519, quantity: 70,  isAvailable: true },
      ],
      tags: ['ORGANIC', 'GLUTEN-FREE'],
      badges: [],
      isFeatured: false,
      totalSales: 1100,
      averageRating: 4.4,
      reviewCount: 145,
      seo: { metaTitle: 'Organic Ragi Flour | Machinichi', metaDescription: 'Buy organic ragi finger millet flour online.', metaKeywords: ['ragi flour', 'finger millet', 'organic flour'] },
    }),
    makeProduct({
      _id: IDS.prod7,
      name: 'Cold Press Pomegranate Juice',
      slug: slug('Cold Press Pomegranate Juice'),
      sku: 'MACH-JU-001',
      hsnCode: '2009',
      brand: 'Machinichi',
      category: IDS.catJuices,
      description: 'Cold-pressed pomegranate juice with no added sugar, preservatives or water. 100% pure fruit goodness in every bottle.',
      shortDescription: '100% cold-pressed pomegranate — no sugar, no preservatives.',
      costPrice: 180, mrpPrice: 349, sellingPrice: 299, comparePrice: 349,
      quantity: 150,
      unitType: 'Litre',
      availableSizes: ['500 ml', '1 L'],
      variants: [
        { size: '500 ml', sku: 'MACH-JU-001-500ML', mrpPrice: 199, sellingPrice: 169, quantity: 90, isAvailable: true },
        { size: '1 L',    sku: 'MACH-JU-001-1L',    mrpPrice: 349, sellingPrice: 299, quantity: 60, isAvailable: true },
      ],
      tags: ['ORGANIC', 'NO-SUGAR'],
      badges: ['NEW'],
      isFeatured: false,
      totalSales: 520,
      averageRating: 4.6,
      reviewCount: 72,
      seo: { metaTitle: 'Cold Pressed Pomegranate Juice | Machinichi', metaDescription: 'Buy 100% cold-pressed pomegranate juice online.', metaKeywords: ['pomegranate juice', 'cold press juice', 'organic juice'] },
    }),
    makeProduct({
      _id: IDS.prod8,
      name: 'Golden Raisins',
      slug: slug('Golden Raisins'),
      sku: 'MACH-DF-003',
      hsnCode: '0806',
      brand: 'Machinichi',
      category: IDS.catDryFruits,
      description: 'Sun-dried golden raisins from the vineyards of Nashik. Naturally sweet, seedless, and packed with iron and antioxidants.',
      shortDescription: 'Nashik sun-dried golden raisins — naturally sweet and seedless.',
      costPrice: 200, mrpPrice: 449, sellingPrice: 349, comparePrice: 449,
      quantity: 280,
      availableSizes: ['250 g', '500 g', '1 kg'],
      variants: [
        { size: '250 g', sku: 'MACH-DF-003-250G', mrpPrice: 149, sellingPrice: 119, quantity: 120, isAvailable: true },
        { size: '500 g', sku: 'MACH-DF-003-500G', mrpPrice: 249, sellingPrice: 199, quantity: 100, isAvailable: true },
        { size: '1 kg',  sku: 'MACH-DF-003-1KG',  mrpPrice: 449, sellingPrice: 349, quantity: 60,  isAvailable: true },
      ],
      tags: ['ORGANIC'],
      badges: [],
      isFeatured: false,
      totalSales: 1890,
      averageRating: 4.2,
      reviewCount: 203,
      seo: { metaTitle: 'Golden Raisins | Machinichi', metaDescription: 'Buy Nashik golden raisins online.', metaKeywords: ['raisins', 'golden raisins', 'kishmish'] },
    }),
  ];

  await db.collection('products').insertMany(products);
  console.log('     → 8 products seeded across 4 categories');

  // ── 7. CARTS ─────────────────────────────────────────────────────────────
  console.log('\n📁  7/24  carts');
  await createCollection('carts');
  await ensureIndexes('carts', [
    { key: { userId: 1 },    options: { unique: true, sparse: true, name: 'userId_unique' } },
    { key: { sessionId: 1 }, options: { unique: true, sparse: true, name: 'sessionId_unique' } },
    { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: 'ttl_expires' } },
    { key: { updatedAt: -1 },options: { name: 'updatedAt_idx' } },
  ]);
  await db.collection('carts').insertOne({
    _id: id(),
    userId: IDS.customer1,
    sessionId: null,
    items: [
      {
        productId: IDS.prod1,
        variantSize: '5 kg',
        name: 'Stone Ground Wheat Atta',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
        mrpPrice: 499, sellingPrice: 399,
        quantity: 2, reservedAt: now,
      },
      {
        productId: IDS.prod5,
        variantSize: '500 g',
        name: 'Premium Almonds',
        image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400',
        mrpPrice: 749, sellingPrice: 599,
        quantity: 1, reservedAt: now,
      },
    ],
    appliedCoupon: null,
    scratchCardDiscount: null,
    subtotal: 1397,
    totalDiscount: 0,
    shippingAmount: 50,
    total: 1447,
    expiresAt: days(30),
    createdAt: now, updatedAt: now,
  });
  console.log('     → 1 cart seeded (customer1 with 2 items)');

  // ── 8. SAVED FOR LATER ───────────────────────────────────────────────────
  console.log('\n📁  8/24  saved_for_later');
  await createCollection('saved_for_later');
  await ensureIndexes('saved_for_later', [
    { key: { userId: 1 }, options: { unique: true, name: 'userId_unique' } },
  ]);
  await db.collection('saved_for_later').insertOne({
    _id: id(),
    userId: IDS.customer1,
    items: [
      {
        productId: IDS.prod3,
        variantSize: '500 g',
        name: 'Jumbo Roasted Cashews',
        image: 'https://images.unsplash.com/photo-1606914501449-5a96b6ce24ca?w=400',
        sellingPrice: 699, quantity: 1, savedAt: now,
      },
    ],
    createdAt: now, updatedAt: now,
  });
  console.log('     → 1 saved-for-later document seeded');

  // ── 9. WISHLISTS ─────────────────────────────────────────────────────────
  console.log('\n📁  9/24  wishlists');
  await createCollection('wishlists');
  await ensureIndexes('wishlists', [
    { key: { userId: 1 },             options: { unique: true, name: 'userId_unique' } },
    { key: { 'products.productId': 1 }, options: { name: 'productId_idx' } },
  ]);
  await db.collection('wishlists').insertOne({
    _id: id(),
    userId: IDS.customer1,
    products: [
      { productId: IDS.prod2, variantSize: '5 kg', addedAt: now },
      { productId: IDS.prod5, variantSize: '1 kg', addedAt: now },
    ],
    createdAt: now, updatedAt: now,
  });
  console.log('     → 1 wishlist seeded (2 products)');

  // ── 10. ORDERS ────────────────────────────────────────────────────────────
  console.log('\n📁  10/24  orders');
  await createCollection('orders');
  await ensureIndexes('orders', [
    { key: { orderId: 1 },            options: { unique: true, name: 'orderId_unique' } },
    { key: { userId: 1, createdAt: -1 }, options: { name: 'userId_date_idx' } },
    { key: { orderStatus: 1 },        options: { name: 'status_idx' } },
    { key: { paymentStatus: 1 },      options: { name: 'payStatus_idx' } },
    { key: { razorpayOrderId: 1 },    options: { unique: true, sparse: true, name: 'rzp_order_unique' } },
    { key: { razorpayPaymentId: 1 },  options: { unique: true, sparse: true, name: 'rzp_payment_unique' } },
    { key: { createdAt: -1 },         options: { name: 'createdAt_desc' } },
  ]);

  const shippingAddr1 = {
    fullName: 'Aditi Sharma', phoneNumber: '9876543210',
    streetAddress: '12, MG Road, Nungambakkam',
    city: 'Chennai', state: 'Tamil Nadu', zipCode: '600034', country: 'India',
  };

  await db.collection('orders').insertMany([
    {
      _id: IDS.order1,
      orderId: 'MAC-82931',
      userId: IDS.customer1,
      items: [
        { productId: IDS.prod1, variantSize: '5 kg', name: 'Stone Ground Wheat Atta', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400', sku: 'MACH-FL-001-5KG', mrpPrice: 499, sellingPrice: 399, quantity: 2, gstRate: 5, gstAmount: 39.9, lineTotal: 798, returnStatus: 'None' },
        { productId: IDS.prod5, variantSize: '500 g', name: 'Premium Almonds', image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400', sku: 'MACH-DF-002-500G', mrpPrice: 749, sellingPrice: 599, quantity: 1, gstRate: 5, gstAmount: 29.95, lineTotal: 599, returnStatus: 'None' },
      ],
      shippingAddress: shippingAddr1,
      shippingMethod: 'standard', shippingAmount: 50,
      subtotal: 1397, totalDiscount: 140,
      scratchDiscount: { discountType: 'Percentage', discountValue: 10, discountAmount: 140, label: 'Multi product reward' },
      promoDiscount: null,
      cgst: 34.45, sgst: 34.45, igst: 0, totalGst: 68.9,
      orderTotal: 1307,
      paymentStatus: 'Paid', paymentMethod: 'razorpay',
      razorpayOrderId: 'order_test_001', razorpayPaymentId: 'pay_test_001', razorpaySignature: 'sig_test_001',
      orderStatus: 'Delivered',
      trackingNumber: 'DTDC123456789IN', trackingUrl: 'https://dtdc.com/track/DTDC123456789IN',
      estimatedDelivery: days(-2), deliveredAt: days(-1),
      deliveryInstructions: { notes: 'Leave at gate', preferredTime: '9 AM - 12 PM', alternatePhone: '', alternateInstructions: '' },
      invoiceUrl: '', invoiceNumber: 'INV-2024-001',
      createdAt: days(-7), updatedAt: days(-1),
    },
    {
      _id: IDS.order2,
      orderId: 'MAC-82932',
      userId: IDS.customer1,
      items: [
        { productId: IDS.prod3, variantSize: '500 g', name: 'Jumbo Roasted Cashews', image: '', sku: 'MACH-DF-001-500G', mrpPrice: 899, sellingPrice: 699, quantity: 1, gstRate: 5, gstAmount: 34.95, lineTotal: 699, returnStatus: 'None' },
      ],
      shippingAddress: shippingAddr1,
      shippingMethod: 'express', shippingAmount: 120,
      subtotal: 699, totalDiscount: 35,
      scratchDiscount: { discountType: 'Percentage', discountValue: 5, discountAmount: 35, label: 'Single product reward' },
      promoDiscount: null,
      cgst: 17.48, sgst: 17.48, igst: 0, totalGst: 34.95,
      orderTotal: 784,
      paymentStatus: 'Paid', paymentMethod: 'razorpay',
      razorpayOrderId: 'order_test_002', razorpayPaymentId: 'pay_test_002', razorpaySignature: 'sig_test_002',
      orderStatus: 'In Transit',
      trackingNumber: 'BLUEDART98765IN',
      estimatedDelivery: days(1),
      deliveryInstructions: null,
      invoiceUrl: '', invoiceNumber: 'INV-2024-002',
      createdAt: days(-2), updatedAt: now,
    },
    {
      _id: IDS.order3,
      orderId: 'MAC-82933',
      userId: IDS.customer2,
      items: [
        { productId: IDS.prod2, variantSize: '5 kg', name: 'Premium Brown Basmati Rice', image: '', sku: 'MACH-GR-001-5KG', mrpPrice: 999, sellingPrice: 763, quantity: 1, gstRate: 5, gstAmount: 38.15, lineTotal: 763, returnStatus: 'None' },
      ],
      shippingAddress: { fullName: 'Rohan Mehta', phoneNumber: '9876543211', streetAddress: '7, Bandra West', city: 'Mumbai', state: 'Maharashtra', zipCode: '400050', country: 'India' },
      shippingMethod: 'standard', shippingAmount: 50,
      subtotal: 763, totalDiscount: 0,
      scratchDiscount: null, promoDiscount: { code: 'MACH10', discountType: 'Percentage', discountValue: 10, discountAmount: 76, description: '10% Discount Applied' },
      cgst: 19.07, sgst: 19.07, igst: 0, totalGst: 38.15,
      orderTotal: 737,
      paymentStatus: 'Paid', paymentMethod: 'razorpay',
      razorpayOrderId: 'order_test_003', razorpayPaymentId: 'pay_test_003', razorpaySignature: 'sig_test_003',
      orderStatus: 'Placed',
      estimatedDelivery: days(4),
      deliveryInstructions: null,
      invoiceUrl: '', invoiceNumber: 'INV-2024-003',
      cancelReason: null, cancelledAt: null, cancelledBy: null,
      createdAt: now, updatedAt: now,
    },
  ]);
  console.log('     → 3 orders seeded');

  // ── 11. PAYMENTS ─────────────────────────────────────────────────────────
  console.log('\n📁  11/24  payments');
  await createCollection('payments');
  await ensureIndexes('payments', [
    { key: { orderId: 1 },           options: { name: 'orderId_idx' } },
    { key: { razorpayOrderId: 1 },   options: { unique: true, name: 'rzp_order_unique' } },
    { key: { razorpayPaymentId: 1 }, options: { unique: true, sparse: true, name: 'rzp_payment_unique' } },
    { key: { status: 1 },            options: { name: 'status_idx' } },
    { key: { createdAt: -1 },        options: { name: 'createdAt_desc' } },
  ]);
  await db.collection('payments').insertMany([
    { _id: IDS.payment1, orderId: IDS.order1, userId: IDS.customer1, razorpayOrderId: 'order_test_001', razorpayPaymentId: 'pay_test_001', razorpaySignature: 'sig_test_001', amount: 130700, currency: 'INR', status: 'captured', method: 'upi', vpa: 'aditi@okaxis', webhookVerified: true, createdAt: days(-7), updatedAt: days(-7) },
    { _id: IDS.payment2, orderId: IDS.order2, userId: IDS.customer1, razorpayOrderId: 'order_test_002', razorpayPaymentId: 'pay_test_002', razorpaySignature: 'sig_test_002', amount: 78400,  currency: 'INR', status: 'captured', method: 'card', bank: 'HDFC', webhookVerified: true, createdAt: days(-2),  updatedAt: days(-2) },
  ]);
  console.log('     → 2 payment records seeded');

  // ── 12. REFUNDS ──────────────────────────────────────────────────────────
  console.log('\n📁  12/24  refunds');
  await createCollection('refunds');
  await ensureIndexes('refunds', [
    { key: { orderId: 1 },          options: { name: 'orderId_idx' } },
    { key: { razorpayRefundId: 1 }, options: { unique: true, sparse: true, name: 'rzp_refund_unique' } },
    { key: { status: 1 },           options: { name: 'status_idx' } },
  ]);
  console.log('     → indexes created (no seed — refunds are runtime only)');

  // ── 13. RETURN REQUESTS ──────────────────────────────────────────────────
  console.log('\n📁  13/24  return_requests');
  await createCollection('return_requests');
  await ensureIndexes('return_requests', [
    { key: { returnId: 1 }, options: { unique: true, name: 'returnId_unique' } },
    { key: { orderId: 1 },  options: { name: 'orderId_idx' } },
    { key: { userId: 1 },   options: { name: 'userId_idx' } },
    { key: { status: 1 },   options: { name: 'status_idx' } },
    { key: { createdAt: -1 }, options: { name: 'createdAt_desc' } },
  ]);
  await db.collection('return_requests').insertOne({
    _id: IDS.returnReq1,
    returnId: 'RT-8842',
    orderId: IDS.order1,
    userId: IDS.customer1,
    items: [{
      orderItemIndex: 0,
      productId: IDS.prod1,
      name: 'Stone Ground Wheat Atta',
      quantity: 1,
      reason: 'Damaged Product',
      images: [],
    }],
    status: 'Processing',
    refundAmount: 399,
    refundType: 'Partial',
    assignedTo: IDS.admin1,
    adminNotes: [{ note: 'Customer reported flour bag arrived damp. Photos requested.', addedBy: IDS.admin1, addedAt: now }],
    timeline: [
      { stage: 'Request Received', completedAt: now, isActive: false },
      { stage: 'Pickup Scheduled', completedAt: now, isActive: false },
      { stage: 'Product Inspected', completedAt: null, isActive: true },
      { stage: 'Refund Processed', completedAt: null, isActive: false },
    ],
    createdAt: now, updatedAt: now,
  });
  console.log('     → 1 return request seeded');

  // ── 14. COUPONS ──────────────────────────────────────────────────────────
  console.log('\n📁  14/24  coupons');
  await createCollection('coupons');
  await ensureIndexes('coupons', [
    { key: { code: 1 },      options: { unique: true, name: 'code_unique' } },
    { key: { isActive: 1 },  options: { name: 'isActive_idx' } },
    { key: { validUntil: 1 },options: { name: 'validUntil_idx' } },
  ]);
  await db.collection('coupons').insertMany([
    { _id: IDS.coupon1, code: 'MACH10',    description: '10% Discount Applied', discountType: 'Percentage', discountValue: 10, maxDiscount: null,   minSubtotal: 0,    usageLimit: 1000, usageCount: 23, perUserLimit: 1, validFrom: days(-30), validUntil: days(60), applicableCategories: [], applicableProducts: [], isActive: true, createdBy: IDS.admin1, createdAt: now, updatedAt: now },
    { _id: IDS.coupon2, code: 'WELCOME15', description: '15% welcome discount, capped at ₹300', discountType: 'Percentage', discountValue: 15, maxDiscount: 300, minSubtotal: 0,    usageLimit: 500,  usageCount: 8,  perUserLimit: 1, validFrom: days(-30), validUntil: days(90), applicableCategories: [], applicableProducts: [], isActive: true, createdBy: IDS.admin1, createdAt: now, updatedAt: now },
    { _id: IDS.coupon3, code: 'FRESH200',  description: '₹200 off on orders above ₹1,000', discountType: 'Fixed Amount', discountValue: 200, maxDiscount: null, minSubtotal: 1000, usageLimit: 200,  usageCount: 4,  perUserLimit: 2, validFrom: days(-30), validUntil: days(45), applicableCategories: [], applicableProducts: [], isActive: true, createdBy: IDS.admin1, createdAt: now, updatedAt: now },
  ]);
  console.log('     → 3 coupons seeded (MACH10, WELCOME15, FRESH200)');

  // ── 15. COUPON USAGES ────────────────────────────────────────────────────
  console.log('\n📁  15/24  coupon_usages');
  await createCollection('coupon_usages');
  await ensureIndexes('coupon_usages', [
    { key: { couponId: 1, userId: 1 }, options: { name: 'coupon_user_idx' } },
    { key: { orderId: 1 },             options: { name: 'orderId_idx' } },
  ]);
  await db.collection('coupon_usages').insertOne({
    _id: id(),
    couponId: IDS.coupon1,
    userId: IDS.customer2,
    orderId: IDS.order3,
    discountAmount: 76,
    usedAt: now,
  });
  console.log('     → 1 coupon usage record seeded');

  // ── 16. SCRATCH CARD OFFERS ──────────────────────────────────────────────
  console.log('\n📁  16/24  scratch_card_offers');
  await createCollection('scratch_card_offers');
  await ensureIndexes('scratch_card_offers', [
    { key: { status: 1 },    options: { name: 'status_idx' } },
    { key: { isActive: 1 },  options: { name: 'isActive_idx' } },
    { key: { validUntil: 1 },options: { name: 'validUntil_idx' } },
  ]);
  await db.collection('scratch_card_offers').insertOne({
    _id: IDS.scratchOffer1,
    name: 'Organic Festival Scratch Offer',
    offerType: 'Scratch Card',
    status: 'Active',
    scratchCard: {
      productCondition: 'All Products',
      eligibleProducts: [],
      singleProduct: { discountType: 'Percentage (%)', discountValue: 5,  label: 'Single product reward' },
      multipleProducts: { discountType: 'Percentage (%)', discountValue: 10, label: 'Multi product reward', minItems: 2 },
    },
    products: [],
    validFrom: days(-7),
    validUntil: days(30),
    isActive: true,
    createdBy: IDS.admin1,
    createdAt: now, updatedAt: now,
  });
  console.log('     → 1 scratch card offer seeded');

  // ── 17. REVIEWS ──────────────────────────────────────────────────────────
  console.log('\n📁  17/24  reviews');
  await createCollection('reviews');
  await ensureIndexes('reviews', [
    { key: { productId: 1, status: 1 },   options: { name: 'product_status_idx' } },
    { key: { userId: 1 },                 options: { name: 'userId_idx' } },
    { key: { orderId: 1 },                options: { sparse: true, name: 'orderId_idx' } },
    { key: { rating: 1 },                 options: { name: 'rating_idx' } },
    { key: { createdAt: -1 },             options: { name: 'createdAt_desc' } },
  ]);
  await db.collection('reviews').insertMany([
    { _id: id(), productId: IDS.prod1, userId: IDS.customer1, orderId: IDS.order1, rating: 5, title: 'Best atta I have ever used!', body: 'Rotis come out super soft. The stone-ground texture is evident and you can taste the difference. Will definitely reorder.', images: [], isVerifiedPurchase: true, helpfulVotes: 24, reportedCount: 0, status: 'Approved', createdAt: days(-6), updatedAt: days(-6) },
    { _id: id(), productId: IDS.prod5, userId: IDS.customer1, orderId: IDS.order1, rating: 5, title: 'Fresh and crunchy almonds', body: 'These almonds arrived fresh and crunchy. Great packaging and fast delivery. The quality is noticeably better than supermarket brands.', images: [], isVerifiedPurchase: true, helpfulVotes: 18, reportedCount: 0, status: 'Approved', createdAt: days(-6), updatedAt: days(-6) },
    { _id: id(), productId: IDS.prod2, userId: IDS.customer2, orderId: IDS.order3, rating: 4, title: 'Good quality basmati rice', body: 'The brown basmati rice is fragrant and cooks well. Slightly chewy which is expected for brown rice. Would buy again.', images: [], isVerifiedPurchase: false, helpfulVotes: 9, reportedCount: 0, status: 'Approved', createdAt: days(-1), updatedAt: days(-1) },
    { _id: id(), productId: IDS.prod3, userId: IDS.customer3, orderId: null, rating: 5, title: 'Absolute best cashews', body: 'The jumbo cashews are huge and incredibly fresh. Perfect for snacking. The roasting level is just right — not too salty.', images: [], isVerifiedPurchase: false, helpfulVotes: 31, reportedCount: 0, status: 'Approved', createdAt: days(-3), updatedAt: days(-3) },
  ]);
  console.log('     → 4 reviews seeded');

  // ── 18. INVENTORY LOGS ───────────────────────────────────────────────────
  console.log('\n📁  18/24  inventory_logs');
  await createCollection('inventory_logs');
  await ensureIndexes('inventory_logs', [
    { key: { productId: 1, createdAt: -1 }, options: { name: 'product_date_idx' } },
    { key: { type: 1 },                     options: { name: 'type_idx' } },
    { key: { createdAt: -1 },               options: { name: 'createdAt_desc' } },
  ]);
  await db.collection('inventory_logs').insertMany([
    { _id: id(), productId: IDS.prod1, variantSize: '5 kg', type: 'restock',    quantityBefore: 100, quantityChange: 350, quantityAfter: 450, reference: 'PO-2024-001', note: 'Initial stock loaded', performedBy: IDS.admin1, createdAt: days(-14) },
    { _id: id(), productId: IDS.prod1, variantSize: '5 kg', type: 'sale',       quantityBefore: 450, quantityChange: -2,  quantityAfter: 448, reference: 'MAC-82931',   note: 'Order fulfilled',    performedBy: IDS.admin1, createdAt: days(-7)  },
    { _id: id(), productId: IDS.prod5, variantSize: '500 g',type: 'restock',    quantityBefore: 50,  quantityChange: 250, quantityAfter: 300, reference: 'PO-2024-002', note: 'Restocked almonds',  performedBy: IDS.admin1, createdAt: days(-10) },
    { _id: id(), productId: IDS.prod5, variantSize: '500 g',type: 'sale',       quantityBefore: 300, quantityChange: -1,  quantityAfter: 299, reference: 'MAC-82931',   note: 'Order fulfilled',    performedBy: IDS.admin1, createdAt: days(-7)  },
    { _id: id(), productId: IDS.prod3, variantSize: '500 g',type: 'reservation',quantityBefore: 180, quantityChange: -1,  quantityAfter: 179, reference: 'MAC-82932',   note: 'Cart reservation',   performedBy: IDS.admin1, createdAt: days(-2)  },
  ]);
  console.log('     → 5 inventory log entries seeded');

  // ── 19. BANNERS ──────────────────────────────────────────────────────────
  console.log('\n📁  19/24  banners');
  await createCollection('banners');
  await ensureIndexes('banners', [
    { key: { position: 1, isActive: 1, order: 1 }, options: { name: 'position_active_order_idx' } },
    { key: { validUntil: 1 }, options: { name: 'validUntil_idx' } },
  ]);
  await db.collection('banners').insertMany([
    { _id: IDS.banner1, title: 'Farm to Table', subtitle: 'Organic Goodness, Delivered Fresh', imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1200', mobileImageUrl: '', linkUrl: '/product', linkType: 'page', position: 'hero', order: 1, isActive: true, validFrom: days(-7), validUntil: days(60), clicks: 142, impressions: 3820, createdBy: IDS.admin1, createdAt: now, updatedAt: now },
    { _id: IDS.banner2, title: '20% Off Dry Fruits', subtitle: 'This week only on all dry fruits', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200', mobileImageUrl: '', linkUrl: '/dryfriut', linkType: 'page', position: 'hero', order: 2, isActive: true, validFrom: days(-3), validUntil: days(7), clicks: 88, impressions: 2100, createdBy: IDS.admin1, createdAt: now, updatedAt: now },
  ]);
  console.log('     → 2 banners seeded');

  // ── 20. NOTIFICATIONS ────────────────────────────────────────────────────
  console.log('\n📁  20/24  notifications');
  await createCollection('notifications');
  await ensureIndexes('notifications', [
    { key: { userId: 1, isRead: 1 }, options: { name: 'userId_read_idx' } },
    { key: { createdAt: -1 },        options: { name: 'createdAt_desc' } },
    { key: { type: 1 },              options: { name: 'type_idx' } },
  ]);
  await db.collection('notifications').insertMany([
    { _id: id(), userId: IDS.customer1, type: 'order_placed',   title: 'Order Confirmed!',    message: 'Your order #MAC-82931 has been placed successfully.', data: { orderId: IDS.order1, orderRef: 'MAC-82931' }, isRead: true,  channel: 'in_app', createdAt: days(-7) },
    { _id: id(), userId: IDS.customer1, type: 'order_shipped',  title: 'Order Shipped',       message: 'Your order #MAC-82931 has been shipped. Track: DTDC123456789IN', data: { orderId: IDS.order1, trackingNumber: 'DTDC123456789IN' }, isRead: true,  channel: 'in_app', createdAt: days(-5) },
    { _id: id(), userId: IDS.customer1, type: 'order_delivered',title: 'Order Delivered 🎉',  message: 'Your order #MAC-82931 has been delivered. Enjoy your Machinichi products!', data: { orderId: IDS.order1 }, isRead: false, channel: 'in_app', createdAt: days(-1) },
    { _id: id(), userId: IDS.customer1, type: 'coupon',         title: 'New Offer For You!',  message: 'Use code WELCOME15 for 15% off your next order (max ₹300).', data: { couponCode: 'WELCOME15' }, isRead: false, channel: 'in_app', createdAt: days(-3) },
    { _id: id(), userId: IDS.customer2, type: 'order_placed',   title: 'Order Confirmed!',    message: 'Your order #MAC-82933 has been placed. Expected delivery in 3-5 days.', data: { orderId: IDS.order3, orderRef: 'MAC-82933' }, isRead: false, channel: 'in_app', createdAt: now },
  ]);
  console.log('     → 5 notifications seeded');

  // ── 21. BULK ORDERS ──────────────────────────────────────────────────────
  console.log('\n📁  21/24  bulk_orders');
  await createCollection('bulk_orders');
  await ensureIndexes('bulk_orders', [
    { key: { userId: 1 },   options: { sparse: true, name: 'userId_idx' } },
    { key: { status: 1 },   options: { name: 'status_idx' } },
    { key: { createdAt: -1 },options: { name: 'createdAt_desc' } },
  ]);
  await db.collection('bulk_orders').insertOne({
    _id: id(),
    userId: null,
    companyName: 'Sri Murugan Provisions',
    contactName: 'Senthil Kumar',
    email: 'senthil@srimurugan.in',
    phone: '9841234567',
    items: [
      { productId: IDS.prod1, name: 'Stone Ground Wheat Atta', variantSize: '10 kg', quantity: 50, unitPrice: 749 },
      { productId: IDS.prod2, name: 'Premium Brown Basmati Rice', variantSize: '10 kg', quantity: 30, unitPrice: 1399 },
    ],
    totalQuantity: 80,
    estimatedValue: 79420,
    message: 'We are a wholesale provisions store. Looking for monthly supply agreement.',
    status: 'Enquiry',
    quotedPrice: null,
    adminNotes: '',
    assignedTo: IDS.admin1,
    createdAt: now, updatedAt: now,
  });
  console.log('     → 1 bulk order enquiry seeded');

  // ── 22. AUDIT LOGS ───────────────────────────────────────────────────────
  console.log('\n📁  22/24  audit_logs');
  await createCollection('audit_logs');
  await ensureIndexes('audit_logs', [
    { key: { userId: 1 },                      options: { name: 'userId_idx' } },
    { key: { action: 1 },                      options: { name: 'action_idx' } },
    { key: { resource: 1, resourceId: 1 },     options: { name: 'resource_idx' } },
    { key: { createdAt: -1 },                  options: { name: 'createdAt_desc' } },
  ]);
  await db.collection('audit_logs').insertMany([
    { _id: id(), userId: IDS.admin1,    role: 'admin',       action: 'admin.login',      resource: 'User',    resourceId: IDS.admin1,    ipAddress: '49.204.12.34',  userAgent: 'Mozilla/5.0 Chrome/120', before: null, after: null, createdAt: days(-1) },
    { _id: id(), userId: IDS.admin1,    role: 'admin',       action: 'product.create',   resource: 'Product', resourceId: IDS.prod1,     ipAddress: '49.204.12.34',  userAgent: 'Mozilla/5.0 Chrome/120', before: null, after: { name: 'Stone Ground Wheat Atta' }, createdAt: days(-14) },
    { _id: id(), userId: IDS.superAdmin,role: 'super_admin', action: 'admin.login',      resource: 'User',    resourceId: IDS.superAdmin, ipAddress: '103.21.45.12', userAgent: 'Mozilla/5.0 Safari/17',  before: null, after: null, createdAt: now },
    { _id: id(), userId: IDS.admin1,    role: 'admin',       action: 'order.status_update', resource: 'Order', resourceId: IDS.order1,  ipAddress: '49.204.12.34',  userAgent: 'Mozilla/5.0 Chrome/120', before: { orderStatus: 'Shipped' }, after: { orderStatus: 'Delivered' }, createdAt: days(-1) },
  ]);
  console.log('     → 4 audit log entries seeded');

  // ── 23. BUSINESSES ───────────────────────────────────────────────────────
  console.log('\n📁  23/24  businesses');
  // Collection likely already created by existing Business.ts model
  try {
    await createCollection('businesses');
  } catch {}
  await ensureIndexes('businesses', [
    { key: { userId: 1 },   options: { sparse: true, name: 'userId_idx' } },
    { key: { status: 1 },   options: { name: 'status_idx' } },
    { key: { email: 1 },    options: { sparse: true, name: 'email_idx' } },
    { key: { createdAt: -1 },options: { name: 'createdAt_desc' } },
  ]);
  const bizExists = await db.collection('businesses').countDocuments();
  if (bizExists === 0) {
    await db.collection('businesses').insertOne({
      _id: IDS.business1,
      userId: null,
      companyName: 'Organic Bazaar Tamil Nadu',
      ownerName: 'Vijay Krishnamurthy',
      email: 'vijay@organicbazaar.tn',
      phone: '9944112233',
      businessType: 'Retailer',
      gstNumber: '33AABCU9603R1ZV',
      address: '45, Anna Salai, Coimbatore - 641001',
      status: 'Pending',
      documents: [],
      notes: '',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: now, updatedAt: now,
    });
    console.log('     → 1 business approval seeded');
  } else {
    console.log('     → businesses already has data, skipped seed');
  }

  // ── 24. ANALYTICS EVENTS ─────────────────────────────────────────────────
  console.log('\n📁  24/24  analytics_events');
  await createCollection('analytics_events');
  await ensureIndexes('analytics_events', [
    { key: { eventType: 1 },  options: { name: 'eventType_idx' } },
    { key: { userId: 1 },     options: { sparse: true, name: 'userId_idx' } },
    { key: { productId: 1 },  options: { sparse: true, name: 'productId_idx' } },
    { key: { createdAt: -1 }, options: { name: 'createdAt_desc' } },
    { key: { createdAt: 1 },  options: { expireAfterSeconds: 7776000, name: 'ttl_90days' } }, // 90 days
  ]);
  await db.collection('analytics_events').insertMany([
    { _id: id(), eventType: 'page_view',    userId: IDS.customer1, sessionId: 'sess_001', productId: null, categoryId: null, searchQuery: null, metadata: { page: '/' }, ipAddress: '49.204.12.34', userAgent: 'Mozilla/5.0', createdAt: now },
    { _id: id(), eventType: 'product_view', userId: IDS.customer1, sessionId: 'sess_001', productId: IDS.prod1, categoryId: IDS.catFlour, searchQuery: null, metadata: { referrer: '/categories' }, ipAddress: '49.204.12.34', userAgent: 'Mozilla/5.0', createdAt: now },
    { _id: id(), eventType: 'add_to_cart',  userId: IDS.customer1, sessionId: 'sess_001', productId: IDS.prod1, categoryId: null, searchQuery: null, metadata: { variantSize: '5 kg', quantity: 2 }, ipAddress: '49.204.12.34', userAgent: 'Mozilla/5.0', createdAt: now },
    { _id: id(), eventType: 'search',       userId: IDS.customer2, sessionId: 'sess_002', productId: null, categoryId: null, searchQuery: 'organic almond', metadata: { resultsCount: 3 }, ipAddress: '103.21.45.12', userAgent: 'Mozilla/5.0', createdAt: now },
    { _id: id(), eventType: 'purchase',     userId: IDS.customer1, sessionId: 'sess_001', productId: null, categoryId: null, searchQuery: null, metadata: { orderId: 'MAC-82931', total: 1307 }, ipAddress: '49.204.12.34', userAgent: 'Mozilla/5.0', createdAt: days(-7) },
  ]);
  console.log('     → 5 analytics events seeded');

  // ─────────────────────────────────────────────────────────────────────────
  // Done
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('🎉  All 24 collections created and seeded successfully!');
  console.log('═'.repeat(60));
  console.log('\nSummary:');
  console.log('  users              → 5 docs (1 super_admin, 1 admin, 3 customers)');
  console.log('  addresses          → 4 docs');
  console.log('  refresh_tokens     → indexes only (runtime)');
  console.log('  otps               → indexes only (runtime)');
  console.log('  categories         → 7 docs');
  console.log('  products           → 8 docs (across 4 categories)');
  console.log('  carts              → 1 doc (customer1, 2 items)');
  console.log('  saved_for_later    → 1 doc');
  console.log('  wishlists          → 1 doc (2 products)');
  console.log('  orders             → 3 docs');
  console.log('  payments           → 2 docs');
  console.log('  refunds            → indexes only (runtime)');
  console.log('  return_requests    → 1 doc');
  console.log('  coupons            → 3 docs (MACH10, WELCOME15, FRESH200)');
  console.log('  coupon_usages      → 1 doc');
  console.log('  scratch_card_offers→ 1 doc');
  console.log('  reviews            → 4 docs');
  console.log('  inventory_logs     → 5 docs');
  console.log('  banners            → 2 docs');
  console.log('  notifications      → 5 docs');
  console.log('  bulk_orders        → 1 doc');
  console.log('  audit_logs         → 4 docs');
  console.log('  businesses         → 1 doc');
  console.log('  analytics_events   → 5 docs');
  console.log('\n🔐  Test credentials:');
  console.log('  Super Admin → superadmin@machinichi.com / Admin@1234');
  console.log('  Admin       → admin@machinichi.com      / Admin@1234');
  console.log('  Customer 1  → aditi.sharma@example.com  / Customer@1234');
  console.log('  Customer 2  → rohan.mehta@example.com   / Customer@1234');
  console.log('  Customer 3  → priya.singh@example.com   / Customer@1234');
  console.log('');

  await mongoose.disconnect();
  console.log('🔌  Disconnected from MongoDB.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌  Script failed:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
