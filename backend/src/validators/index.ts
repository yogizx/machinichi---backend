import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(1000).optional().default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ─── Category ────────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(50),
  description: z.string().max(500).optional(),
  image: z.string().optional(),
  parentCategory: objectIdSchema.optional(),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().int().nonnegative().optional(),
  seo: z.object({
    metaTitle: z.string().max(70).optional(),
    metaDescription: z.string().max(160).optional(),
  }).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ─── Product ────────────────────────────────────────────────
// Recursive variant – supports unlimited nesting via subVariants
type VariantInput = z.infer<typeof variantBaseSchema> & { subVariants?: VariantInput[] };
const variantBaseSchema: z.ZodType<any> = z.object({
  name: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  colorName: z.string().optional(),
  unit: z.string().optional(),
  unitQuantity: z.union([z.string(), z.number()]).transform(v => String(v)).optional(),
  material: z.string().optional(),
  attributes: z.record(z.string(), z.any()).optional(),
  sku: z.string().min(1).max(50).optional().or(z.literal('')),
  barcode: z.string().max(50).optional(),
  batchNumber: z.string().max(50).optional(),
  gstRate: z.number().min(0).max(100).optional(),
  costPrice: z.number().nonnegative().optional().default(0),
  mrpPrice: z.number().positive(),
  sellingPrice: z.number().positive(),
  quantity: z.number().int().nonnegative().optional().default(0),
  warehouseStock: z.number().int().nonnegative().optional().default(0),
  reservedQuantity: z.number().int().nonnegative().optional().default(0),
  isAvailable: z.boolean().optional().default(true),
  status: z.enum(['Active', 'Draft', 'Out of Stock', 'Discontinued', 'Inactive']).optional().default('Active'),
  weight: z.number().nonnegative().optional(),
  dimensions: z.object({
    height: z.number().positive().optional(),
    width: z.number().positive().optional(),
    length: z.number().positive().optional(),
  }).optional(),
  images: z.array(z.object({
    url: z.string(),
    alt: z.string().optional(),
  })).optional(),
});
// lazy recursion for unlimited nesting
const variantSchema: z.ZodType<any> = variantBaseSchema.and(z.object({
  subVariants: z.array(z.lazy(() => variantSchema)).optional().default([]),
})) as any;

const productSeoSchema = z.object({
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.array(z.string()).optional(),
  canonicalUrl: z.string().optional().or(z.literal('')),
  focusKeyword: z.string().max(100).optional(),
  ogTitle: z.string().max(70).optional(),
  ogDescription: z.string().max(160).optional(),
  twitterCard: z.enum(['summary', 'summary_large_image', 'app', 'player']).optional(),
  structuredData: z.string().optional(),
  imageAlt: z.string().max(150).optional(),
  imageTitle: z.string().max(150).optional(),
  breadcrumb: z.string().max(300).optional(),
}).optional();

const warrantySchema = z.object({
  period: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  type: z.enum(['Manufacturer', 'Seller', 'Extended', 'None']).optional(),
  terms: z.string().max(2000).optional(),
  documentUrl: z.string().optional().or(z.literal('')),
}).optional();

const returnPolicySchema = z.object({
  isReturnable: z.boolean().optional().default(true),
  returnPeriodDays: z.number().int().positive().optional().default(7),
  returnCondition: z.string().max(500).optional(),
  replacementAvailable: z.boolean().optional().default(false),
  installationRequired: z.boolean().optional().default(false),
  serviceCenter: z.string().max(300).optional(),
}).optional();

const supplierEntrySchema = z.object({
  supplierId: objectIdSchema,
  supplierSKU: z.string().max(50).optional(),
  purchaseCost: z.number().nonnegative().optional(),
  leadTime: z.number().int().nonnegative().optional(),
  isPreferred: z.boolean().optional().default(false),
});

const purchaseHistoryEntrySchema = z.object({
  date: z.coerce.date().optional(),
  quantity: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
  supplierId: objectIdSchema.optional(),
  invoiceNumber: z.string().max(50).optional(),
  reference: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
});

const complianceSchema = z.object({
  fssai: z.string().max(100).optional(),
  bis: z.string().max(100).optional(),
  ce: z.string().max(100).optional(),
  iso: z.string().max(100).optional(),
  fda: z.string().max(100).optional(),
  rohs: z.string().max(100).optional(),
  msds: z.string().max(100).optional(),
  msdsUrl: z.string().url().optional().or(z.literal('')),
  productCertifications: z.array(z.string().max(100)).optional(),
  certificateUrls: z.array(z.string().url()).optional(),
}).optional();

const productHighlightsSchema = z.object({
  brand: z.string().max(100).optional(),
  type: z.string().max(100).optional(),
  quantity: z.string().max(100).optional(),
  maximumShelfLife: z.string().max(100).optional(),
  organic: z.union([z.string(), z.boolean()]).transform(v => String(v)).optional(),
  seller: z.string().max(100).optional(),
  dietType: z.string().max(50).optional(),
  countryOfOrigin: z.string().max(100).optional(),
  items: z.array(z.object({ title: z.string().max(200).optional().default(''), description: z.string().max(500).optional().default(''), icon: z.string().max(50).optional() })).optional(),
}).optional();

const measurementSchema = z.object({
  packageWeight: z.string().max(50).optional(),
  height: z.string().max(50).optional(),
  width: z.string().max(50).optional(),
  length: z.string().max(50).optional(),
  numberOfItems: z.union([z.number(), z.string()]).transform(v => Number(v) || 1).optional(),
  sizes: z.array(z.string().max(50)).optional(),
  dimensionsText: z.string().max(100).optional(),
}).optional();

// Step 1: catalog/product-info creation only. Never accepts publishStatus —
// new products always start 'unlisted' until explicitly added to the store.
const createProductBaseSchema = z.object({
  // DB standards (auto-generated if omitted)
  uuid: z.string().uuid().optional(),
  version: z.number().int().nonnegative().optional(),
  // Basic
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200),
  slug: z.string().min(2).max(250).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional().or(z.literal('')),
  sku: z.string().min(1).max(50).optional().or(z.literal('')), // Auto-generated if omitted
  hsnCode: z.string().optional().default('0000').or(z.literal('')),
  brand: z.string().max(100).optional().default('Machinichi').or(z.literal('')),
  description: z.string().max(5000).optional().or(z.literal('')),
  shortDescription: z.string().max(300).optional().or(z.literal('')),
  category: objectIdSchema,
  subCategory: objectIdSchema.optional().or(z.literal('')),
  manufacturer: objectIdSchema.optional().or(z.literal('')),
  manufacturerName: z.string().max(200).optional().or(z.literal('')),
  modelNumber: z.string().max(100).optional().or(z.literal('')),
  manufacturerPartNumber: z.string().max(100).optional().or(z.literal('')),
  countryOfOrigin: z.string().max(100).optional().or(z.literal('')),
  material: z.string().max(100).optional().or(z.literal('')),
  color: z.string().max(50).optional().or(z.literal('')),
  size: z.string().max(50).optional().or(z.literal('')),
  // Pricing
  costPrice: z.number().nonnegative().optional().default(0),
  mrpPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  comparePrice: z.number().positive().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  wholesalePrice: z.number().nonnegative().optional(),
  distributorPrice: z.number().nonnegative().optional(),
  dealerPrice: z.number().nonnegative().optional(),
  offerPrice: z.number().nonnegative().optional(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY']).optional().default('INR'),
  priceEffectiveFrom: z.coerce.date().optional(),
  priceEffectiveTo: z.coerce.date().optional(),
  // legacy weight/dimensions kept for backward compat
  weight: z.number().positive().optional(),
  dimensions: z.object({
    height: z.number().positive().optional(),
    width: z.number().positive().optional(),
    length: z.number().positive().optional(),
  }).optional(),
  gstRate: z.number().min(0).max(100).optional().default(5),
  gstCategory: z.string().optional(),
  unitType: z.string().optional().default('Kilogram'),
  availableSizes: z.array(z.string()).optional(),
  variantType: z.string().optional(),
  variants: z.array(variantSchema).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  warranty: warrantySchema,
  returnPolicy: returnPolicySchema,
  images: z.array(z.object({
    url: z.string().min(1),
    alt: z.string().optional(),
    isPrimary: z.boolean().optional().default(false),
    order: z.number().int().nonnegative().optional().default(0),
  })).optional().default([]),
  // Variant type images (per variant-type representative images — up to 4 images per type)
  variantTypeImages: z.object({
    material: z.union([
      z.array(z.object({ url: z.string(), alt: z.string().optional() })),
      z.object({ url: z.string(), alt: z.string().optional() }).transform(val => [val]),
    ]).nullable().optional(),
    color: z.union([
      z.array(z.object({ url: z.string(), alt: z.string().optional() })),
      z.object({ url: z.string(), alt: z.string().optional() }).transform(val => [val]),
    ]).nullable().optional(),
    size: z.union([
      z.array(z.object({ url: z.string(), alt: z.string().optional() })),
      z.object({ url: z.string(), alt: z.string().optional() }).transform(val => [val]),
    ]).nullable().optional(),
    unit: z.union([
      z.array(z.object({ url: z.string(), alt: z.string().optional() })),
      z.object({ url: z.string(), alt: z.string().optional() }).transform(val => [val]),
    ]).nullable().optional(),
  }).optional(),
  // Extended media
  images360: z.array(z.object({ url: z.string(), alt: z.string().optional() })).optional(),
  pdfDocuments: z.array(z.object({ url: z.string(), title: z.string().optional() })).optional(),
  certificates: z.array(z.object({ url: z.string(), title: z.string().optional() })).optional(),
  installationGuide: z.string().optional().or(z.literal('')),
  datasheet: z.string().optional().or(z.literal('')),
  thumbnail: z.string().optional().or(z.literal('')),
  videos: z.array(z.object({
    url: z.string(),
    title: z.string().optional(),
  })).optional(),
  tags: z.array(z.string().max(30)).optional(),
  seo: productSeoSchema,
  // Shipping
  packageWeight: z.number().nonnegative().optional(),
  packageDimensions: z.object({
    height: z.number().positive().optional(),
    width: z.number().positive().optional(),
    length: z.number().positive().optional(),
  }).optional(),
  shippingClass: z.string().max(50).optional(),
  shippingCost: z.number().nonnegative().optional(),
  deliveryTime: z.string().max(100).optional(),
  pickupAvailable: z.boolean().optional().default(false),
  freeShipping: z.boolean().optional().default(false),
  codAvailable: z.boolean().optional().default(true),
  isFragile: z.boolean().optional().default(false),
  isHazardous: z.boolean().optional().default(false),
  // Supplier & compliance
  suppliers: z.array(supplierEntrySchema).optional(),
  purchaseHistory: z.array(purchaseHistoryEntrySchema).optional(),
  compliance: complianceSchema,
  // Sales
  salesCount: z.number().int().nonnegative().optional(),
  lastSoldDate: z.coerce.date().optional(),
  averageSellingPrice: z.number().nonnegative().optional(),
  // Product Relationships
  frequentlyBoughtTogether: z.array(objectIdSchema).optional(),
  crossSell: z.array(objectIdSchema).optional(),
  upSell: z.array(objectIdSchema).optional(),
  bundle: z.array(objectIdSchema).optional(),
  relatedProductsCategory: objectIdSchema.optional().or(z.literal('')),
  // Visibility flags
  isFeatured: z.boolean().optional().default(false),
  isTrending: z.boolean().optional().default(false),
  isBestSeller: z.boolean().optional().default(false),
  isRecommended: z.boolean().optional().default(false),
  isNewArrival: z.boolean().optional().default(false),
  isLimitedOffer: z.boolean().optional().default(false),
  isFlashSale: z.boolean().optional().default(false),
  isHidden: z.boolean().optional().default(false),
  isMarketplaceEnabled: z.boolean().optional().default(false),
  // Lifecycle
  lifecycleStatus: z.enum(['Draft', 'Under Review', 'Approved', 'Published', 'Out of Stock', 'Discontinued', 'Archived']).optional().default('Draft'),
  submittedForReviewAt: z.coerce.date().optional(),
  reviewedBy: objectIdSchema.optional(),
  reviewedAt: z.coerce.date().optional(),
  approvedBy: objectIdSchema.optional(),
  approvedAt: z.coerce.date().optional(),
  approvalNotes: z.string().max(1000).optional(),
  rejectionReason: z.string().max(1000).optional(),
  // Inventory (kept independent of listing/publishing)
  quantity: z.number().int().nonnegative().optional().default(0),
  warehouseStock: z.number().int().nonnegative().optional().default(0),
  openingStock: z.number().int().nonnegative().optional().default(0),
  minStock: z.number().int().nonnegative().optional().default(5),
  maxStock: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional().default(10),
  reorderLevel: z.number().int().nonnegative().optional(),
  warehouse: z.string().max(100).optional(),
  rackLocation: z.string().max(100).optional(),
  barcode: z.string().max(50).optional(),
  batchNumber: z.string().max(50).optional(),
  lotNumber: z.string().max(50).optional(),
  serialNumber: z.string().max(100).optional(),
  expiryDate: z.coerce.date().optional(),
  manufacturingDate: z.coerce.date().optional(),
  inventoryType: z.enum(['Normal', 'Serialized', 'Batch Managed', 'Lot Managed', 'Digital']).optional().default('Normal'),
  trackInventory: z.boolean().optional().default(true),
  status: z.enum(['Active', 'Draft', 'Out of Stock', 'Discontinued']).optional(),
  isActive: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  badges: z.array(z.string()).optional(),
  // Enterprise: maggi reference sections (Product Highlights etc. — replaces Marketplace)
  productHighlights: productHighlightsSchema,
  additionalFeatures: z.array(z.object({ key: z.string().max(50).optional(), label: z.string().max(100).optional().default(''), value: z.string().max(500).optional().default(''), icon: z.string().max(50).optional() })).optional(),
  aboutThisProduct: z.array(z.string().max(1000).nullable().optional()).transform(arr => (arr || []).filter((s): s is string => typeof s === 'string' && s.trim() !== '')).optional(),
  productDescriptionDetailed: z.string().max(5000).optional(),
  measurement: measurementSchema,
});

function productEnterpriseRefine(data: any, ctx: any) {
  if (data.expiryDate && data.manufacturingDate) {
    if (new Date(data.expiryDate) <= new Date(data.manufacturingDate)) {
      ctx.addIssue({ code: 'custom', message: 'expiryDate must be after manufacturingDate', path: ['expiryDate'] });
    }
  }
  if (data.priceEffectiveFrom && data.priceEffectiveTo) {
    if (new Date(data.priceEffectiveFrom) >= new Date(data.priceEffectiveTo)) {
      ctx.addIssue({ code: 'custom', message: 'priceEffectiveFrom must be before priceEffectiveTo', path: ['priceEffectiveFrom'] });
    }
  }
  // SKU / barcode uniqueness is enforced at DB level (unique + sparse indexes);
  // name+brand unique is enforced via DB unique index – surface duplicate key error in handler
}

export const createProductSchema = createProductBaseSchema.superRefine(productEnterpriseRefine);

export const updateProductSchema = createProductBaseSchema.partial().superRefine(productEnterpriseRefine);

export const productQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  isTrending: z.coerce.boolean().optional(),
  isBestSeller: z.coerce.boolean().optional(),
  isNewArrival: z.coerce.boolean().optional(),
  isHidden: z.coerce.boolean().optional(),
  lifecycleStatus: z.enum(['Draft', 'Under Review', 'Approved', 'Published', 'Out of Stock', 'Discontinued', 'Archived']).optional(),
  inventoryType: z.enum(['Normal', 'Serialized', 'Batch Managed', 'Lot Managed', 'Digital']).optional(),
  publishStatus: z.enum(['unlisted', 'published', 'archived']).optional(),
  tags: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
});

// ─── Inventory (Step 2 — completely separate from listing) ──────────────
export const inventoryAdjustSchema = z.object({
  variantSku: z.string().optional(), // omit to adjust the base product
  quantity: z.number().int().nonnegative().optional(),
  warehouseStock: z.number().int().nonnegative().optional(),
  reservedQuantity: z.number().int().nonnegative().optional(),
  openingStock: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  maxStock: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  reorderLevel: z.number().int().nonnegative().optional(),
  warehouse: z.string().max(100).optional(),
  rackLocation: z.string().max(100).optional(),
  barcode: z.string().max(50).optional(),
  batchNumber: z.string().max(50).optional(),
  lotNumber: z.string().max(50).optional(),
  serialNumber: z.string().max(100).optional(),
  expiryDate: z.coerce.date().optional(),
  manufacturingDate: z.coerce.date().optional(),
  inventoryType: z.enum(['Normal', 'Serialized', 'Batch Managed', 'Lot Managed', 'Digital']).optional(),
  // Product relationship fields
  frequentlyBoughtTogether: z.array(objectIdSchema).optional(),
  crossSell: z.array(objectIdSchema).optional(),
  upSell: z.array(objectIdSchema).optional(),
  bundle: z.array(objectIdSchema).optional(),
  note: z.string().max(300).optional(),
}).refine(
  d => d.quantity !== undefined || d.warehouseStock !== undefined || d.reservedQuantity !== undefined ||
       d.openingStock !== undefined || d.minStock !== undefined || d.maxStock !== undefined || d.lowStockThreshold !== undefined ||
       d.reorderLevel !== undefined || d.warehouse !== undefined || d.rackLocation !== undefined ||
       d.barcode !== undefined || d.batchNumber !== undefined || d.lotNumber !== undefined || d.serialNumber !== undefined ||
       d.expiryDate !== undefined || d.manufacturingDate !== undefined || d.inventoryType !== undefined ||
       d.frequentlyBoughtTogether !== undefined || d.crossSell !== undefined || d.upSell !== undefined || d.bundle !== undefined,
  { message: 'At least one field must be provided' },
).superRefine((data, ctx) => {
  if (data.expiryDate && data.manufacturingDate && new Date(data.expiryDate) <= new Date(data.manufacturingDate)) {
    ctx.addIssue({ code: 'custom', message: 'expiryDate must be after manufacturingDate', path: ['expiryDate'] });
  }
});

// ─── Listing (Step 3 & 5 — explicit "Add Product to Store" / publish) ───
const marketplaceLinksSchema = z.object({
  amazon: z.string().url().optional().or(z.literal('')),
  flipkart: z.string().url().optional().or(z.literal('')),
  meesho: z.string().url().optional().or(z.literal('')),
  myntra: z.string().url().optional().or(z.literal('')),
  ajio: z.string().url().optional().or(z.literal('')),
  snapdeal: z.string().url().optional().or(z.literal('')),
  jiomart: z.string().url().optional().or(z.literal('')),
  ownWebsite: z.string().url().optional().or(z.literal('')),
}).optional();

export const listProductSchema = z.object({
  marketplaceLinks: marketplaceLinksSchema,
});

export const unlistProductSchema = z.object({
  status: z.enum(['unlisted', 'archived']).default('unlisted'),
  reason: z.string().max(300).optional(),
});

export const updateListingSchema = z.object({
  marketplaceLinks: marketplaceLinksSchema,
});

// ─── Cart ────────────────────────────────────────────────
const cartItemSchema = z.object({
  productId: objectIdSchema,
  variantSize: z.string().optional(),
  quantity: z.number().int().positive().min(1).max(99),
});

export const addToCartSchema = z.object({
  productId: objectIdSchema,
  variantSize: z.string().optional(),
  quantity: z.number().int().positive().min(1).max(99),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive().min(1).max(99),
});

export const removeCartItemSchema = z.object({
  productId: objectIdSchema,
  variantSize: z.string().optional(),
});

export const clearCartSchema = z.object({
  sessionId: z.string().optional(),
});

export const mergeCartSchema = z.object({
  sessionId: z.string(),
});

// ─── Wishlist ────────────────────────────────────────────────
export const addToWishlistSchema = z.object({
  productId: objectIdSchema,
});

export const removeFromWishlistSchema = z.object({
  productId: objectIdSchema,
});

// ─── Saved For Later ─────────────────────────────────────────
export const saveForLaterSchema = z.object({
  productId: objectIdSchema,
  variantSize: z.string().optional(),
  quantity: z.number().int().positive().optional().default(1),
});

export const moveToCartSchema = z.object({
  productId: objectIdSchema,
  variantSize: z.string().optional(),
  quantity: z.number().int().positive().optional(),
});

// ─── Order ────────────────────────────────────────────────
const addressDetailSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  addressLine1: z.string().min(5).max(200),
  addressLine2: z.string().max(200).optional(),
  landmark: z.string().max(100).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  country: z.string().optional().default('India'),
  addressType: z.enum(['home', 'work', 'other']).optional(),
});

const orderItemSchema = z.object({
  productId: objectIdSchema,
  name: z.string(),
  image: z.string().url(),
  variantSize: z.string().optional(),
  quantity: z.number().int().positive(),
  mrp: z.number().positive(),
  sellingPrice: z.number().positive(),
  gstRate: z.number().optional().default(5),
});

const couponApplySchema = z.object({
  code: z.string().optional(),
  discountAmount: z.number().nonnegative().optional().default(0),
  couponId: objectIdSchema.optional(),
}).optional();

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  shippingAddress: addressDetailSchema,
  billingAddress: addressDetailSchema.optional(),
  paymentMethod: z.enum(['razorpay', 'cod']),
  coupon: couponApplySchema,
  scratchCouponId: objectIdSchema.optional(),
  notes: z.string().max(500).optional(),
  isIntraState: z.boolean().optional().default(true),
  shippingCharges: z.number().nonnegative().optional().default(0),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(['pending_approval', 'accepted', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'returned']),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
  courierName: z.string().optional(),
  packageWeight: z.number().optional(),
});

export const delayOrderSchema = z.object({
  reason: z.string().min(1, 'Delay reason is required'),
  expectedDate: z.string().min(1, 'Expected delivery date is required'),
  customerNote: z.string().optional(),
});

export const orderHistoryQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

// ─── Payment ────────────────────────────────────────────────
export const createPaymentOrderSchema = z.object({
  orderId: objectIdSchema,
  amount: z.number().positive(),
  currency: z.string().optional().default('INR'),
});

export const createDirectPaymentOrderSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().optional().default('INR'),
  items: z.array(z.object({
    productId: objectIdSchema,
    // name/image are accepted for backward compatibility but are never
    // trusted — the server always re-resolves them from the Product
    // collection using productId (see createDirectPaymentOrder). This
    // prevents an order ever being stored with a mismatched product name.
    name: z.string().optional(),
    image: z.string().optional().default(''),
    quantity: z.number().int().positive(),
    sellingPrice: z.number().positive(),
    selectedSize: z.string().optional(),
  })).min(1, 'At least one item is required'),
  shippingAddress: z.object({
    fullName: z.string().optional(),
    streetAddress: z.string().optional(),
    city: z.string().optional(),
    zipCode: z.string().optional(),
    phoneNumber: z.string().optional(),
    mobileNumber: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    houseFlat: z.string().optional(),
    streetArea: z.string().optional(),
    landmark: z.string().optional(),
    deliveryInstructions: z.string().optional(),
    isDefault: z.boolean().optional(),
  }).optional(),
  subtotal: z.number().optional(),
  shippingCharges: z.number().optional().default(0),
  discountAmount: z.number().optional().default(0),
  promoCode: z.string().optional(),
  promoDiscount: z.number().optional().default(0),
  coupon: z.object({
    code: z.string(),
    couponId: objectIdSchema,
  discountAmount: z.number().optional().default(0),
  discountType: z.string().optional(),
  }).optional(),
  scratchCouponId: objectIdSchema.optional(),
  scratchDiscountAmount: z.number().nonnegative().optional().default(0),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  orderId: objectIdSchema,
});

export const refundPaymentSchema = z.object({
  paymentId: objectIdSchema,
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

// ─── Review ────────────────────────────────────────────────
export const createReviewSchema = z.object({
  productId: objectIdSchema,
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().min(5).max(2000),
  images: z.array(z.string().url()).max(5).optional(),
  variantSize: z.string().trim().max(200).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  comment: z.string().min(5).max(2000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
}).refine(d => d.rating || d.comment || d.images, {
  message: 'At least one field must be provided',
});

export const reviewQuerySchema = paginationSchema.extend({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  variant: z.string().trim().max(200).optional(),
});

// ─── Coupon ────────────────────────────────────────────────
export const scratchRuleSchema = z.object({
  basis: z.enum(['quantity', 'order_amount']),
  threshold: z.number().nonnegative('Rule threshold cannot be negative'),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().nonnegative('Rule discount value cannot be negative'),
  label: z.string().trim().max(80).optional(),
}).superRefine((rule, ctx) => {
  if (rule.basis === 'quantity' && rule.threshold < 1) {
    ctx.addIssue({ code: 'custom', path: ['threshold'], message: 'Product quantity rule must start at 1 item or more' });
  }
  if (rule.discountType === 'percentage' && (rule.discountValue <= 0 || rule.discountValue > 100)) {
    ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'Percentage must be between 1 and 100' });
  }
  if (rule.discountType === 'fixed' && rule.discountValue <= 0) {
    ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'Fixed amount must be greater than 0' });
  }
});

export const districtNameSchema = z.string().trim().min(2, 'District name is too short').max(80, 'District name is too long');

export const createCouponSchema = z.object({
  name: z.string().min(1, 'Offer name is required').max(100),
  code: z.string()
    .min(3, 'Code must be at least 3 characters')
    .max(10, 'Code must be at most 10 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Code must contain only letters and numbers')
    .transform(v => v.toUpperCase()),
  description: z.string().max(500).optional().default(''),
  offerType: z.enum(['coupon', 'flash_sale', 'bundle', 'scratch_card', 'free_delivery']).optional().default('coupon'),
  discountType: z.enum(['percentage', 'free_delivery']),
  discountValue: z.number().min(0),
  maxDiscountAmount: z.number().positive().optional(),
  minOrderAmount: z.number().nonnegative().optional().default(0),
  minQuantity: z.number().int().nonnegative().optional().default(1),
  scratchRules: z.array(scratchRuleSchema).max(20, 'A maximum of 20 scratch card rules is allowed').optional().default([]),
  freeDeliveryDistricts: z.array(districtNameSchema).max(200, 'A maximum of 200 districts is allowed').optional().default([]),
  usageLimit: z.number().int().nonnegative().optional().default(0),
  perUserLimit: z.number().int().positive().optional().default(1),
  isActive: z.boolean().optional().default(true),
  status: z.enum(['active', 'draft']).optional().default('active'),
  startsAt: z.string().min(1, 'Start date is required'),
  expiresAt: z.string().min(1, 'End date is required'),
}).superRefine((data, ctx) => {
  if (data.discountType === 'percentage' && data.discountValue > 100) {
    ctx.addIssue({ code: 'custom', path: ['discountValue'], message: 'Percentage discount cannot exceed 100' });
  }
  if (data.offerType === 'scratch_card' && data.scratchRules.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['scratchRules'], message: 'Add at least one scratch card discount rule' });
  }
  const seen = new Set<string>();
  data.scratchRules.forEach((rule, index) => {
    const key = `${rule.basis}:${rule.threshold}`;
    if (seen.has(key)) {
      ctx.addIssue({ code: 'custom', path: ['scratchRules', index, 'threshold'], message: 'Duplicate rule for the same condition' });
    }
    seen.add(key);
  });
});

export const updateCouponSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string()
    .min(3).max(10)
    .regex(/^[A-Za-z0-9]+$/, 'Code must contain only letters and numbers')
    .transform(v => v.toUpperCase())
    .optional(),
  description: z.string().max(500).optional(),
  offerType: z.enum(['coupon', 'flash_sale', 'bundle', 'scratch_card', 'free_delivery']).optional(),
  discountType: z.enum(['percentage', 'free_delivery']).optional(),
  discountValue: z.number().min(0).optional(),
  maxDiscountAmount: z.number().positive().nullable().optional(),
  minOrderAmount: z.number().nonnegative().optional(),
  minQuantity: z.number().int().nonnegative().optional(),
  scratchRules: z.array(scratchRuleSchema).max(20).optional(),
  freeDeliveryDistricts: z.array(districtNameSchema).max(200).optional(),
  usageLimit: z.number().int().nonnegative().optional(),
  perUserLimit: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(['active', 'draft', 'disabled', 'expired']).optional(),
  startsAt: z.string().min(1).optional(),
  expiresAt: z.string().min(1).optional(),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1).transform(v => v.toUpperCase()),
  orderAmount: z.number().nonnegative(),
  totalQuantity: z.number().int().nonnegative().optional().default(0),
  district: z.string().trim().max(80).optional(),
  items: z.array(z.object({
    productId: objectIdSchema,
    categoryId: objectIdSchema.optional(),
    quantity: z.number().int().positive(),
    sellingPrice: z.number().nonnegative(),
  })).min(1),
});

export const evaluateOffersSchema = z.object({
  orderAmount: z.number().nonnegative(),
  totalQuantity: z.number().int().nonnegative().optional().default(0),
  district: z.string().trim().max(80).optional(),
  couponCode: z.string().trim().max(20).optional(),
});

// ─── Return Request ─────────────────────────────────────────
export const createReturnRequestSchema = z.object({
  orderId: objectIdSchema,
  orderItemId: objectIdSchema,
  reason: z.string().min(5).max(500),
  description: z.string().min(5).max(2000),
  quantity: z.number().int().positive(),
  images: z.array(z.string().url()).max(5).optional(),
  pickupAddress: addressDetailSchema,
});

export const returnActionSchema = z.object({
  status: z.enum(['approved', 'rejected', 'picked_up', 'refunded']),
  adminNote: z.string().max(500).optional(),
  refundAmount: z.number().positive().optional(),
});

// ─── Address ────────────────────────────────────────────────
export const createAddressSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  addressLine1: z.string().min(5).max(200),
  addressLine2: z.string().max(200).optional(),
  landmark: z.string().max(100).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  country: z.string().optional().default('India'),
  addressType: z.enum(['home', 'work', 'other']).optional().default('home'),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();

// ─── Notification ───────────────────────────────────────────
export const notificationQuerySchema = paginationSchema.extend({
  type: z.string().optional(),
  isRead: z.coerce.boolean().optional(),
});

export const markReadSchema = z.object({
  notificationIds: z.array(objectIdSchema).min(1),
});

// ─── Banner ─────────────────────────────────────────────────
export const createBannerSchema = z.object({
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  image: z.string().optional(),
  imageWebp: z.string(),
  imageFallback: z.string(),
  bigText: z.string().max(100).optional(),
  smallText: z.string().max(150).optional(),
  buttonText: z.string().max(30).optional(),
  buttonURL: z.string().optional(),
  contentPosition: z.enum(['Left Side', 'Right Side']).optional().default('Left Side'),
  link: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  position: z.number().int().nonnegative().optional(),
  order: z.number().int().optional(),
  bgColor: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateBannerSchema = createBannerSchema.partial();

// ─── Auth ────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email().max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  password: z.string().min(1),
}).refine(d => d.email || d.phone, {
  message: 'Either email or phone is required',
});

export const otpSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  purpose: z.enum(['email_verification', 'phone_verification', 'password_reset', 'login']),
}).refine(d => d.email || d.phone, {
  message: 'Either email or phone is required',
});

export const verifyOtpSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  otp: z.string().length(6),
  purpose: z.enum(['email_verification', 'phone_verification', 'password_reset', 'login']),
}).refine(d => d.email || d.phone, {
  message: 'Either email or phone is required',
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

// ─── Profile ──────────────────────────────────────────────
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  avatar: z.string().url().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
});

// ─── Analytics ──────────────────────────────────────────────
export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});
