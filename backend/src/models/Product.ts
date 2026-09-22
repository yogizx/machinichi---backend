import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';
import './Category';

// ─── Helpers ─────────────────────────────────────────────────────────
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 250);
}

// ─── Variant (recursive) ───────────────────────────────────────────
export interface IProductVariant {
  name?: string;
  description?: string;
  size?: string;
  color?: string;
  colorName?: string;
  unit?: string;
  unitQuantity?: string;
  material?: string;
  attributes?: Record<string, string>;
  sku: string;
  barcode?: string;
  batchNumber?: string;
  gstRate?: number;
  costPrice: number;
  mrpPrice: number;
  sellingPrice: number;
  quantity: number;
  warehouseStock?: number;
  reservedQuantity?: number;
  isAvailable: boolean;
  status?: 'Active' | 'Draft' | 'Out of Stock' | 'Discontinued';
  weight?: number;
  dimensions?: { height?: number; width?: number; length?: number };
  images?: { url: string; alt?: string }[];
  // recursive nesting for unlimited variants
  subVariants?: IProductVariant[];
}

export interface IProductSupplierEntry {
  supplierId?: mongoose.Types.ObjectId;
  name?: string;
  code?: string;
  contact?: string;
  supplierSKU?: string;
  purchaseCost?: number;
  leadTime?: number;
  isPreferred?: boolean;
}

export interface IPurchaseHistoryEntry {
  date: Date;
  quantity: number;
  cost: number;
  supplierId?: mongoose.Types.ObjectId;
  vendor?: string;
  invoiceNumber?: string;
  reference?: string;
  note?: string;
}

export interface IProduct extends mongoose.Document {
  // ─ DB standards ─
  uuid: string;
  version: number;
  // ─ Basic ─
  name: string;
  slug: string;
  sku: string;
  hsnCode: string;
  brand: string;
  category: mongoose.Types.ObjectId;
  subCategory?: mongoose.Types.ObjectId;
  description: string;
  shortDescription: string;
  manufacturer?: mongoose.Types.ObjectId;
  manufacturerName?: string;
  modelNumber?: string;
  manufacturerPartNumber?: string;
  countryOfOrigin?: string;
  material?: string;
  color?: string;
  size?: string;
  // ─ Pricing ─
  costPrice: number;
  mrpPrice: number;
  sellingPrice: number;
  comparePrice?: number;
  discountPercent?: number;
  purchasePrice?: number;
  wholesalePrice?: number;
  distributorPrice?: number;
  dealerPrice?: number;
  offerPrice?: number;
  currency: string;
  priceEffectiveFrom?: Date;
  priceEffectiveTo?: Date;
  // virtual: profitMargin
  // ─ Inventory ─
  quantity: number;
  reservedQuantity: number;
  warehouseStock: number;
  openingStock?: number;
  minStock: number;
  maxStock?: number;
  lowStockThreshold: number;
  reorderLevel?: number;
  warehouse?: string;
  rackLocation?: string;
  barcode?: string;
  batchNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  expiryDate?: Date;
  manufacturingDate?: Date;
  inventoryType: 'Normal' | 'Serialized' | 'Batch Managed' | 'Lot Managed' | 'Digital';
  trackInventory: boolean;
  weight?: number;
  dimensions?: { height?: number; width?: number; length?: number };
  // ─ Unit & taxonomy ─
  gstRate: number;
  gstCategory?: string;
  unitType?: string;
  availableSizes?: string[];
  variantType?: string;
  variants?: IProductVariant[];
  attributes?: Record<string, string>;
  // ─ Warranty / Return ─
  warranty?: {
    period?: string;
    description?: string;
    type?: 'Manufacturer' | 'Seller' | 'Extended' | 'None';
    terms?: string;
    documentUrl?: string;
  };
  returnPolicy?: {
    isReturnable: boolean;
    returnPeriodDays?: number;
    returnCondition?: string;
    replacementAvailable?: boolean;
    installationRequired?: boolean;
    serviceCenter?: string;
  };
  marketplaceLinks?: {
    amazon?: string; flipkart?: string; meesho?: string; myntra?: string;
    ajio?: string; snapdeal?: string; jiomart?: string; ownWebsite?: string;
  };
  // ─ Media ─
  images: { url: string; alt?: string; isPrimary: boolean; order: number }[];
  images360?: { url: string; alt?: string }[];
  variantTypeImages?: {
    material?: { url: string; alt?: string }[] | null;
    color?: { url: string; alt?: string }[] | null;
    size?: { url: string; alt?: string }[] | null;
    unit?: { url: string; alt?: string }[] | null;
  };
  videos: { url: string; title?: string }[];
  pdfDocuments?: { url: string; title?: string }[];
  certificates?: { url: string; title?: string }[];
  installationGuide?: string;
  datasheet?: string;
  thumbnail?: string;
  // ─ Product Highlights / About / Additional Features / Measurement (for /product/maggi reference)
  productHighlights?: {
    brand?: string;
    type?: string;
    quantity?: string;
    maximumShelfLife?: string;
    organic?: boolean;
    seller?: string;
    dietType?: string;
    countryOfOrigin?: string;
    items?: { title: string; description: string; icon?: string }[];
  };
  additionalFeatures?: { key: string; label: string; value: string; icon?: string }[];
  aboutThisProduct?: string[];
  productDescriptionDetailed?: string;
  measurement?: {
    packageWeight?: string;
    height?: string;
    width?: string;
    length?: string;
    numberOfItems?: number;
    sizes?: string[];
    dimensionsText?: string;
  };
  // ─ SEO ─
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
    focusKeyword?: string;
    ogTitle?: string;
    ogDescription?: string;
    twitterCard?: string;
    structuredData?: string;
    imageAlt?: string;
    imageTitle?: string;
    breadcrumb?: string;
  };
  // ─ Shipping ─
  packageWeight?: number;
  packageDimensions?: { height?: number; width?: number; length?: number };
  shippingClass?: string;
  shippingCost?: number;
  deliveryTime?: string;
  pickupAvailable?: boolean;
  freeShipping?: boolean;
  codAvailable?: boolean;
  isFragile?: boolean;
  isHazardous?: boolean;
  // ─ Supplier / purchase ─
  suppliers?: IProductSupplierEntry[];
  purchaseHistory?: IPurchaseHistoryEntry[];
  // ─ Sales ─
  salesCount?: number;
  lastSoldDate?: Date;
  averageSellingPrice?: number;
  // ─ Product Relationships ─
  frequentlyBoughtTogether?: mongoose.Types.ObjectId[];
  crossSell?: mongoose.Types.ObjectId[];
  upSell?: mongoose.Types.ObjectId[];
  bundle?: mongoose.Types.ObjectId[];
  relatedProductsCategory?: mongoose.Types.ObjectId;
  // ─ Compliance ─
  compliance?: {
    fssai?: string;
    bis?: string;
    ce?: string;
    iso?: string;
    fda?: string;
    rohs?: string;
    msds?: string;
    msdsUrl?: string;
    productCertifications?: string[];
    certificateUrls?: string[];
  };
  // ─ Visibility ─
  isTrending?: boolean;
  isBestSeller?: boolean;
  isRecommended?: boolean;
  isNewArrival?: boolean;
  isLimitedOffer?: boolean;
  isFlashSale?: boolean;
  isHidden?: boolean;
  isMarketplaceEnabled?: boolean;
  // legacy visibility
  publishStatus: 'unlisted' | 'published' | 'archived';
  listedAt?: Date;
  listedBy?: mongoose.Types.ObjectId;
  tags: string[];
  badges: string[];
  isFeatured: boolean;
  isVisible: boolean;
  isActive: boolean;
  isDeleted: boolean;
  status: 'Active' | 'Draft' | 'Out of Stock' | 'Discontinued';
  // ─ Lifecycle / approval ─
  lifecycleStatus: 'Draft' | 'Under Review' | 'Approved' | 'Published' | 'Out of Stock' | 'Discontinued' | 'Archived';
  submittedForReviewAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  approvalNotes?: string;
  rejectionReason?: string;
  // ─ Analytics ─
  totalViews: number;
  totalSales: number;
  totalRevenue: number;
  totalCartCount: number;
  averageRating: number;
  reviewCount: number;
  // ─ Audit ─
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // ─ Virtuals ─
  availableStock?: number;
  currentStock?: number;
  reservedStock?: number;
  profitMargin?: number;
}

// ─── Variant Schema (recursive via add) ───────────────────────────
const variantSchema: Schema = new Schema({
  name: { type: String, trim: true },
  description: { type: String, trim: true },
  size: String,
  color: String,
  colorName: { type: String, trim: true },
  unit: { type: String, trim: true },
  unitQuantity: { type: String, trim: true },
  material: { type: String, trim: true },
  attributes: { type: Map, of: String },
  sku: { type: String, required: true, trim: true, uppercase: true },
  barcode: { type: String, trim: true, sparse: true },
  batchNumber: { type: String, trim: true },
  gstRate: { type: Number, min: 0, max: 100 },
  costPrice: { type: Number, required: true, min: 0 },
  mrpPrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, default: 0, min: 0 },
  warehouseStock: { type: Number, default: 0, min: 0 },
  reservedQuantity: { type: Number, default: 0, min: 0 },
  isAvailable: { type: Boolean, default: true },
  status: { type: String, enum: ['Active', 'Draft', 'Out of Stock', 'Discontinued'], default: 'Active' },
  weight: { type: Number, min: 0 },
  dimensions: {
    height: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    length: { type: Number, min: 0 },
  },
  images: [{ url: { type: String, required: true }, alt: String }],
}, { _id: false });

// unlimited nesting – recursive
variantSchema.add({
  subVariants: { type: [variantSchema], default: [] },
});

// ─── Sub-schemas for nested enterprise objects ───────────────────────
const productHighlightsSubSchema = new Schema({
  brand: { type: String },
  type: { type: String },
  quantity: { type: String },
  maximumShelfLife: { type: String },
  organic: { type: String },
  seller: { type: String },
  dietType: { type: String },
  countryOfOrigin: { type: String },
  items: [{ title: { type: String }, description: { type: String }, icon: { type: String }, _id: false }],
}, { _id: false });

const measurementSubSchema = new Schema({
  packageWeight: { type: String },
  height: { type: String },
  width: { type: String },
  length: { type: String },
  numberOfItems: { type: Number, min: 0 },
  sizes: [{ type: String }],
  dimensionsText: { type: String },
}, { _id: false });

// ─── Main Product Schema ───────────────────────────────────────────
const productSchema = new Schema<IProduct>({
  // DB standards
  uuid: { type: String, default: () => randomUUID(), unique: true, index: true },
  version: { type: Number, default: 0 },

  // Basic
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  hsnCode: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  subCategory: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
  description: { type: String, required: true },
  shortDescription: { type: String, maxlength: 300 },
  manufacturer: { type: Schema.Types.ObjectId, ref: 'User' },
  manufacturerName: { type: String, trim: true },
  modelNumber: { type: String, trim: true },
  manufacturerPartNumber: { type: String, trim: true },
  countryOfOrigin: { type: String, trim: true },
  material: { type: String, trim: true },
  color: { type: String, trim: true },
  size: { type: String, trim: true },

  // Pricing
  costPrice: { type: Number, required: true, min: 0 },
  mrpPrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  comparePrice: { type: Number, min: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  purchasePrice: { type: Number, min: 0 },
  wholesalePrice: { type: Number, min: 0 },
  distributorPrice: { type: Number, min: 0 },
  dealerPrice: { type: Number, min: 0 },
  offerPrice: { type: Number, min: 0 },
  currency: { type: String, enum: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY'], default: 'INR', uppercase: true },
  priceEffectiveFrom: { type: Date },
  priceEffectiveTo: { type: Date },

  // Inventory
  quantity: { type: Number, default: 0, min: 0 },
  reservedQuantity: { type: Number, default: 0, min: 0 },
  warehouseStock: { type: Number, default: 0, min: 0 },
  openingStock: { type: Number, default: 0, min: 0 },
  minStock: { type: Number, default: 5, min: 0 },
  maxStock: { type: Number, min: 0 },
  lowStockThreshold: { type: Number, default: 10, min: 0 },
  reorderLevel: { type: Number, min: 0 },
  warehouse: { type: String, trim: true },
  rackLocation: { type: String, trim: true },
  barcode: { type: String, trim: true, sparse: true },
  batchNumber: { type: String, trim: true },
  lotNumber: { type: String, trim: true },
  serialNumber: { type: String, trim: true, sparse: true },
  expiryDate: { type: Date },
  manufacturingDate: { type: Date },
  inventoryType: { type: String, enum: ['Normal', 'Serialized', 'Batch Managed', 'Lot Managed', 'Digital'], default: 'Normal', index: true },
  trackInventory: { type: Boolean, default: true },
  weight: { type: Number, min: 0 },
  dimensions: {
    height: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    length: { type: Number, min: 0 },
  },

  gstRate: { type: Number, default: 5, min: 0, max: 100 },
  gstCategory: { type: String, trim: true },
  unitType: { type: String, default: 'Kilogram', required: true },
  availableSizes: [{ type: String, trim: true }],
  variantType: { type: String, trim: true },
  variants: { type: [variantSchema], default: [] },
  attributes: { type: Map, of: String },

  // Warranty / Return
  warranty: {
    period: String,
    description: String,
    type: { type: String, enum: ['Manufacturer', 'Seller', 'Extended', 'None'] },
    terms: String,
    documentUrl: String,
  },
  returnPolicy: {
    isReturnable: { type: Boolean, default: true },
    returnPeriodDays: { type: Number, default: 7, min: 0 },
    returnCondition: String,
    replacementAvailable: { type: Boolean, default: false },
    installationRequired: { type: Boolean, default: false },
    serviceCenter: String,
  },
  marketplaceLinks: {
    amazon: String,
    flipkart: String,
    meesho: String,
    myntra: String,
    ajio: String,
    snapdeal: String,
    jiomart: String,
    ownWebsite: String,
  },

  // Media
  images: [{
    url: { type: String, required: true },
    alt: String,
    isPrimary: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  }],
  images360: [{ url: { type: String, required: true }, alt: String }],
  variantTypeImages: {
    material: [{ url: { type: String }, alt: String, _id: false }],
    color: [{ url: { type: String }, alt: String, _id: false }],
    size: [{ url: { type: String }, alt: String, _id: false }],
    unit: [{ url: { type: String }, alt: String, _id: false }],
  },
  videos: [{ url: String, title: String }],
  pdfDocuments: [{ url: String, title: String }],
  certificates: [{ url: String, title: String }],
  installationGuide: { type: String },
  datasheet: { type: String },
  thumbnail: { type: String },

  // Product Highlights / Additional Features / About / Measurement (maggi reference)
  productHighlights: { type: productHighlightsSubSchema },
  additionalFeatures: [{
    key: { type: String, trim: true },
    label: { type: String },
    value: { type: String },
    icon: String,
    _id: false,
  }],
  aboutThisProduct: [{ type: String }],
  productDescriptionDetailed: { type: String },
  measurement: { type: measurementSubSchema },

  // SEO
  seo: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
    canonicalUrl: String,
    focusKeyword: String,
    ogTitle: String,
    ogDescription: String,
    twitterCard: { type: String, enum: ['summary', 'summary_large_image', 'app', 'player'] },
    structuredData: String,
    imageAlt: String,
    imageTitle: String,
    breadcrumb: String,
  },

  // Shipping
  packageWeight: { type: Number, min: 0 },
  packageDimensions: {
    height: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    length: { type: Number, min: 0 },
  },
  shippingClass: { type: String, trim: true },
  shippingCost: { type: Number, min: 0 },
  deliveryTime: { type: String, trim: true },
  pickupAvailable: { type: Boolean, default: false },
  freeShipping: { type: Boolean, default: false },
  codAvailable: { type: Boolean, default: true },
  isFragile: { type: Boolean, default: false },
  isHazardous: { type: Boolean, default: false },

  // Supplier / purchase
  suppliers: [{
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    name: { type: String, trim: true },
    code: { type: String, trim: true },
    contact: { type: String, trim: true },
    supplierSKU: { type: String, trim: true },
    purchaseCost: { type: Number, min: 0 },
    leadTime: { type: Number, min: 0 },
    isPreferred: { type: Boolean, default: false },
    _id: false,
  }],
  purchaseHistory: [{
    date: { type: Date, default: Date.now },
    quantity: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    vendor: { type: String, trim: true },
    invoiceNumber: String,
    reference: String,
    note: String,
  }],

  // Sales
  salesCount: { type: Number, default: 0, min: 0 },
  lastSoldDate: { type: Date },
  averageSellingPrice: { type: Number, min: 0 },

  // Product Relationships
  frequentlyBoughtTogether: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  crossSell: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  upSell: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  bundle: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  relatedProductsCategory: { type: Schema.Types.ObjectId, ref: 'Category', index: true },

  // Compliance
  compliance: {
    fssai: String,
    bis: String,
    ce: String,
    iso: String,
    fda: String,
    rohs: String,
    msds: String,
    msdsUrl: String,
    productCertifications: [{ type: String, trim: true }],
    certificateUrls: [{ type: String }],
  },

  // Visibility flags
  isTrending: { type: Boolean, default: false, index: true },
  isBestSeller: { type: Boolean, default: false, index: true },
  isRecommended: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false, index: true },
  isLimitedOffer: { type: Boolean, default: false },
  isFlashSale: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false, index: true },
  isMarketplaceEnabled: { type: Boolean, default: false },

  // legacy publish / active
  publishStatus: { type: String, enum: ['unlisted', 'published', 'archived'], default: 'unlisted', index: true },
  listedAt: { type: Date },
  listedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  tags: [{ type: String, lowercase: true, trim: true }],
  badges: [String],
  isFeatured: { type: Boolean, default: false, index: true },
  isVisible: { type: Boolean, default: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['Active', 'Draft', 'Out of Stock', 'Discontinued'], default: 'Draft' },

  // Lifecycle / approval
  lifecycleStatus: { type: String, enum: ['Draft', 'Under Review', 'Approved', 'Published', 'Out of Stock', 'Discontinued', 'Archived'], default: 'Draft', index: true },
  submittedForReviewAt: { type: Date },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  approvalNotes: { type: String, maxlength: 1000 },
  rejectionReason: { type: String, maxlength: 1000 },

  // Analytics
  totalViews: { type: Number, default: 0, min: 0 },
  totalSales: { type: Number, default: 0, min: 0 },
  totalRevenue: { type: Number, default: 0, min: 0 },
  totalCartCount: { type: Number, default: 0, min: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, {
  timestamps: true,
  autoIndex: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ───────────────────────────────────────────────────────
productSchema.index({ category: 1, status: 1, isVisible: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ status: 1 });
productSchema.index({ category: 1, publishStatus: 1 });
productSchema.index({ deletedAt: 1 }, { sparse: true });
productSchema.index({ name: 'text', 'seo.metaKeywords': 'text', tags: 'text' }, { weights: { name: 10, tags: 5 } });
productSchema.index({ sellingPrice: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ totalSales: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isDeleted: 1, publishStatus: 1 });
productSchema.index({ isDeleted: 1, createdAt: -1 });
// enterprise
productSchema.index({ name: 1, brand: 1 }, { unique: true });
productSchema.index({ barcode: 1 }, { unique: true, sparse: true });
productSchema.index({ serialNumber: 1 }, { sparse: true });
productSchema.index({ 'variants.sku': 1 });
productSchema.index({ 'variants.barcode': 1 }, { sparse: true });
productSchema.index({ lifecycleStatus: 1 });
productSchema.index({ inventoryType: 1 });
productSchema.index({ uuid: 1 }, { unique: true });
productSchema.index({ expiryDate: 1 });
productSchema.index({ manufacturingDate: 1 });
productSchema.index({ isHidden: 1, isMarketplaceEnabled: 1 });
productSchema.index({ 'suppliers.supplierId': 1 });

// ─── Virtuals (atomic calc) ────────────────────────────────────────
productSchema.virtual('availableStock').get(function (this: IProduct) {
  const cur = (this as any).quantity ?? 0;
  const res = (this as any).reservedQuantity ?? 0;
  return Math.max(0, cur - res);
});
productSchema.virtual('currentStock').get(function (this: IProduct) {
  return (this as any).quantity ?? 0;
});
productSchema.virtual('reservedStock').get(function (this: IProduct) {
  return (this as any).reservedQuantity ?? 0;
});
productSchema.virtual('profitMargin').get(function (this: IProduct) {
  const cost = (this as any).costPrice ?? (this as any).purchasePrice ?? 0;
  const selling = (this as any).sellingPrice ?? 0;
  if (!cost || cost <= 0) return 0;
  return Number((((selling - cost) / cost) * 100).toFixed(2));
});

// ─── Pre-save hooks ────────────────────────────────────────────────
productSchema.pre('validate', function () {
  // auto slug
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  } else if (this.slug) {
    this.slug = slugify(this.slug);
  }
  // auto meta
  if (!this.seo) (this as any).seo = {};
  if (!this.seo.metaTitle && this.name) {
    const base = this.brand ? `${this.name} - ${this.brand}` : this.name;
    this.seo.metaTitle = base.slice(0, 70);
  }
  if (!this.seo.metaDescription) {
    const src = (this as any).shortDescription || this.description || '';
    this.seo.metaDescription = src.toString().slice(0, 160);
  }
  // expiry > manufacturing
  if (this.expiryDate && this.manufacturingDate) {
    if (this.expiryDate <= this.manufacturingDate) {
      throw new Error('expiryDate must be after manufacturingDate');
    }
  }
  // price window
  if (this.priceEffectiveFrom && this.priceEffectiveTo) {
    if (this.priceEffectiveFrom >= this.priceEffectiveTo) {
      throw new Error('priceEffectiveFrom must be before priceEffectiveTo');
    }
  }
  // uuid ensure
  if (!this.uuid) this.uuid = randomUUID();
});

productSchema.pre('save', function () {
  // discount % auto
  if (this.mrpPrice && this.sellingPrice && this.mrpPrice > 0) {
    (this as any).discountPercent = Math.round(((this.mrpPrice - this.sellingPrice) / this.mrpPrice) * 100);
    if ((this as any).discountPercent < 0) (this as any).discountPercent = 0;
    if ((this as any).discountPercent > 100) (this as any).discountPercent = 100;
  }
  // purchasePrice alias costPrice if missing
  if ((this as any).purchasePrice == null && (this as any).costPrice != null) {
    (this as any).purchasePrice = (this as any).costPrice;
  }
  if ((this as any).costPrice == null && (this as any).purchasePrice != null) {
    (this as any).costPrice = (this as any).purchasePrice;
  }
  // version increment
  if (!this.isNew) {
    (this as any).version = ((this as any).version || 0) + 1;
  } else {
    if ((this as any).version == null) (this as any).version = 0;
  }
  // lifecycle mirrors publishStatus/status for backward compat
  // thumbnail fallback to first image
  if (!this.thumbnail && Array.isArray(this.images) && this.images.length > 0) {
    this.thumbnail = this.images[0].url;
  }
});

productSchema.pre('init', function (doc) {
  if (doc && (doc as any).variantTypeImages) {
    ['material', 'color', 'size', 'unit'].forEach((key) => {
      const val = (doc as any).variantTypeImages?.[key];
      if (val && !Array.isArray(val) && typeof val === 'object' && val.url) {
        (doc as any).variantTypeImages[key] = [val];
      }
    });
  }
});

// soft delete helper via index – actual delete must set isDeleted+deletedAt
productSchema.pre('findOneAndUpdate', function () {
  const upd: any = this.getUpdate();
  // if soft-deleting, ensure deletedAt set
  if (upd && (upd.isDeleted === true || (upd.$set && upd.$set.isDeleted === true))) {
    const set = upd.$set || upd;
    if (!set.deletedAt) set.deletedAt = new Date();
    if (upd.$set) upd.$set.deletedAt = set.deletedAt;
    else upd.deletedAt = set.deletedAt;
  }
});

export const Product = mongoose.model<IProduct>('Product', productSchema);
