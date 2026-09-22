import { Response, NextFunction } from 'express';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { InventoryLog } from '../../models/InventoryLog';
import { User } from '../../models/User';
import { Supplier } from '../../models/Supplier';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../../services/apiResponse';
import {
  createProductSchema, updateProductSchema, productQuerySchema,
  inventoryAdjustSchema, listProductSchema, unlistProductSchema, updateListingSchema,
} from '../../validators';
import { Types } from 'mongoose';

// Auto-generate unique slug: apple, apple-2, apple-3...
async function generateUniqueProductSlug(baseName: string, requestedSlug?: string): Promise<string> {
  const base = (requestedSlug && requestedSlug.trim() !== '')
    ? requestedSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
  let slug = base || 'product';
  let counter = 1;
  while (await Product.exists({ slug })) {
    counter++;
    slug = `${base}-${counter}`;
  }
  return slug;
}

// Auto-generate unique SKU: MCH-<category-prefix>-<random>
async function generateSku(categoryName?: string): Promise<string> {
  const prefix = categoryName ? categoryName.slice(0, 3).toUpperCase() : 'GEN';
  let sku: string;
  let attempts = 0;
  do {
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    sku = `MCH-${prefix}-${rand}`;
    attempts++;
  } while (attempts < 20 && await Product.exists({ sku }));
  return sku;
}

// Auto-generate unique barcode
async function generateBarcode(): Promise<string> {
  let barcode: string;
  let attempts = 0;
  do {
    barcode = `890${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 10)}`;
    attempts++;
  } while (attempts < 20 && await Product.exists({ barcode }));
  return barcode;
}

// STEP 1 — Admin creates the product (catalog info only). Every new product
// starts life as `publishStatus: 'unlisted'` — it exists in inventory but is
// never visible to shoppers until it goes through the explicit listing step.
export const createProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = createProductSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const data: any = validation.data;

    const categoryExists = await Category.findById(data.category);
    if (!categoryExists) return sendError(res, 'Category not found', 404);

    const slug = await generateUniqueProductSlug(data.name, data.slug);

    // Auto-generate SKU if not provided or if it matches a default pattern
    let sku = data.sku;
    if (!sku || sku.trim() === '') {
      sku = await generateSku(categoryExists.name);
    } else {
      sku = sku.toUpperCase().trim();
      const skuExists = await Product.findOne({ sku });
      if (skuExists) return sendError(res, 'Product with this SKU already exists', 400);
    }

    // Auto-generate barcode if not provided
    let barcode = data.barcode;
    if (!barcode || barcode.trim() === '') {
      barcode = await generateBarcode();
    }

    const hsnCode = data.hsnCode && data.hsnCode.trim() !== '' ? data.hsnCode.trim() : '0000';
    const brand = data.brand && data.brand.trim() !== '' ? data.brand.trim() : 'Machinichi';
    const description = data.description && data.description.trim() !== '' ? data.description.trim() : `${data.name} - Machinichi product.`;

    const product = await Product.create({
      ...data,
      hsnCode,
      brand,
      description,
      slug,
      sku,
      barcode,
      // Ensure numeric fields are properly typed
      quantity: Number(data.quantity) || 0,
      reservedQuantity: Number(data.reservedQuantity) || 0,
      openingStock: Number(data.openingStock) || 0,
      minStock: Number(data.minStock) || 5,
      maxStock: data.maxStock ? Number(data.maxStock) : undefined,
      lowStockThreshold: Number(data.lowStockThreshold) || 10,
      reorderLevel: data.reorderLevel ? Number(data.reorderLevel) : undefined,
      mrpPrice: Number(data.mrpPrice),
      sellingPrice: Number(data.sellingPrice),
      costPrice: Number(data.costPrice) || 0,
      // Auto-generate availableStock virtual will handle this
      publishStatus: 'unlisted',
      isVisible: false,
      status: 'Draft',
      createdBy: new Types.ObjectId(req.user!.userId),
    } as any);

    await InventoryLog.create({
      productId: product._id,
      type: 'admin_adjustment',
      quantityBefore: 0,
      quantityChange: data.quantity || 0,
      quantityAfter: data.quantity || 0,
      reference: 'initial_stock',
      performedBy: new Types.ObjectId(req.user!.userId),
      note: 'Product created (unlisted)',
    });

    sendSuccess(res, { data: product, message: 'Product created and added to inventory. It is not yet visible in the store — use "Add to Store" to publish it.' }, 201);
  } catch (error) {
    next(error);
  }
};

// Admin-only single product fetch — unlike the public endpoint, this ignores
// publishStatus so admins can view/edit Draft, Unlisted and Archived products.
export const getAdminProductById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id as string;
    const id = rawId ? rawId.trim() : '';
    if (!id || !Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ID format', 400);
    }
    const product = await Product.findOne({
      $or: [{ _id: new Types.ObjectId(id) }, { _id: id }],
      isDeleted: false,
    })
      .populate('category', 'name slug')
      .populate('relatedProductsCategory', 'name slug')
      .populate('listedBy', 'name')
      .lean();
    if (!product) return sendError(res, 'Product not found', 404);
    // Strip base64 data URLs from variants to prevent huge payloads
    const cleanProduct = { ...product } as any;
    if (Array.isArray(cleanProduct.variants)) {
      cleanProduct.variants = cleanProduct.variants.map((v: any) => ({
        ...v,
        images: Array.isArray(v.images) ? v.images.filter((img: any) => img.url && !img.url.startsWith('data:')) : [],
      }));
    }
    sendSuccess(res, { data: cleanProduct });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = updateProductSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const data: any = validation.data;
    const rawId = req.params.id as string;
    const id = rawId ? rawId.trim() : '';
    if (!id || !Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ID format', 400);
    }
    const product = await Product.findOne({
      $or: [{ _id: new Types.ObjectId(id) }, { _id: id }],
      isDeleted: false,
    });
    if (!product) return sendError(res, 'Product not found', 404);

    const oldQuantity = product.quantity;
    const updates: any = { ...data, updatedBy: new Types.ObjectId(req.user!.userId) };
    // Catalog edits must never sneak a listing/publish change through — that
    // only happens via the dedicated list/unlist endpoints below.
    delete updates.publishStatus;
    delete updates.listedAt;
    delete updates.listedBy;
    delete updates.marketplaceLinks;

    // Auto-generate SKUs for variants that have empty/missing SKUs
    if (Array.isArray(updates.variants)) {
      const productSku = updates.sku || product.sku || 'PROD';
      updates.variants = updates.variants.map((v: any, idx: number) => {
        if (!v.sku || v.sku.trim() === '') {
          const suffix = v.material || v.color || v.colorName || v.size || v.unit || idx;
          v.sku = `${productSku}-V${idx + 1}-${suffix}`.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        }
        return v;
      });
    }

    if (data.name && !data.slug) {
      updates.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Clean empty strings / invalid values for ObjectId fields to prevent CastError
    if (updates.category && typeof updates.category === 'string' && Types.ObjectId.isValid(updates.category)) {
      updates.category = new Types.ObjectId(updates.category);
    } else if (updates.category === '' || !updates.category) {
      delete updates.category;
    }

    if (updates.subCategory && typeof updates.subCategory === 'string' && Types.ObjectId.isValid(updates.subCategory)) {
      updates.subCategory = new Types.ObjectId(updates.subCategory);
    } else if (updates.subCategory === '' || updates.subCategory === null) {
      updates.subCategory = null;
    }

    if (updates.manufacturer && typeof updates.manufacturer === 'string' && Types.ObjectId.isValid(updates.manufacturer)) {
      updates.manufacturer = new Types.ObjectId(updates.manufacturer);
    } else if (updates.manufacturer === '' || updates.manufacturer === null) {
      updates.manufacturer = null;
    }

    if (updates.relatedProductsCategory && typeof updates.relatedProductsCategory === 'string' && Types.ObjectId.isValid(updates.relatedProductsCategory)) {
      updates.relatedProductsCategory = new Types.ObjectId(updates.relatedProductsCategory);
    } else if (updates.relatedProductsCategory === '' || updates.relatedProductsCategory === null) {
      updates.relatedProductsCategory = null;
    }

    // Handle product relationship fields safely
    if (Array.isArray(data.frequentlyBoughtTogether)) {
      updates.frequentlyBoughtTogether = data.frequentlyBoughtTogether
        .filter((id: string) => id && typeof id === 'string' && Types.ObjectId.isValid(id.trim()))
        .map((id: string) => new Types.ObjectId(id.trim()));
    }
    if (Array.isArray(data.crossSell)) {
      updates.crossSell = data.crossSell
        .filter((id: string) => id && typeof id === 'string' && Types.ObjectId.isValid(id.trim()))
        .map((id: string) => new Types.ObjectId(id.trim()));
    }
    if (Array.isArray(data.upSell)) {
      updates.upSell = data.upSell
        .filter((id: string) => id && typeof id === 'string' && Types.ObjectId.isValid(id.trim()))
        .map((id: string) => new Types.ObjectId(id.trim()));
    }
    if (Array.isArray(data.bundle)) {
      updates.bundle = data.bundle
        .filter((id: string) => id && typeof id === 'string' && Types.ObjectId.isValid(id.trim()))
        .map((id: string) => new Types.ObjectId(id.trim()));
    }

    const updated = await Product.findByIdAndUpdate(product._id, updates, { new: true });

    if (data.quantity !== undefined && data.quantity !== oldQuantity) {
      await InventoryLog.create({
        productId: product._id,
        type: 'admin_adjustment',
        quantityBefore: oldQuantity,
        quantityChange: data.quantity - oldQuantity,
        quantityAfter: data.quantity,
        reference: 'admin_update',
        performedBy: new Types.ObjectId(req.user!.userId),
        note: 'Stock updated via admin',
      });
    }

    sendSuccess(res, { data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
        updatedBy: new Types.ObjectId(req.user!.userId),
      },
      { new: true }
    );

    if (!product) return sendError(res, 'Product not found', 404);
    sendSuccess(res, { message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};

export const getAdminProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('[GET ADMIN PRODUCTS] Request received, query:', req.query);
    const validation = productQuerySchema.safeParse(req.query);
    if (!validation.success) {
      console.log('[GET ADMIN PRODUCTS] Validation failed:', validation.error.issues);
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { page, limit, sort, order, search, category, isActive, publishStatus, inStock } = validation.data as any;
    const filter: any = { isDeleted: false };

    if (search) {
      let pattern = search;
      if (/id+iyappam/i.test(search)) {
        pattern = 'id+iyappam';
      }
      const searchRegex = { $regex: pattern, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { slug: searchRegex },
        { brand: searchRegex },
        { description: searchRegex },
        { shortDescription: searchRegex },
        { tags: searchRegex },
        { sku: searchRegex },
        { hsnCode: searchRegex },
        { 'variants.name': searchRegex },
        { 'variants.material': searchRegex },
        { 'variants.colorName': searchRegex },
        { 'variants.size': searchRegex },
        { 'variants.sku': searchRegex },
      ];
    }
    if (category) filter.category = new Types.ObjectId(category);
    if (isActive !== undefined) filter.isActive = isActive;
    if (publishStatus) filter.publishStatus = publishStatus;
    if (inStock) {
      filter.$or = [
        { quantity: { $gt: 0 } },
        { 'variants.quantity': { $gt: 0 } },
      ];
    }

    const sortOption: any = {};
    const sortField = (!sort || sort === 'createdAt') ? '_id' : sort;
    sortOption[sortField] = order === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;
    console.log(`[GET ADMIN PRODUCTS] Running mongo query with filter:`, JSON.stringify(filter), 'skip:', skip, 'limit:', limit);

    // Use aggregation pipeline to avoid transferring base64 blobs (thumbnail, variant images)
    // that cause 20s+ queries. Project only listing-needed fields; exclude base64 variant images.
    const pipeline: any[] = [
      { $match: filter },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: '_cat', pipeline: [{ $project: { name: 1, slug: 1 } }] } },
      { $addFields: { category: { $first: '$_cat' } } },
      { $addFields: {
        _cleanVariants: {
          $map: {
            input: { $ifNull: ['$variants', []] },
            as: 'v',
            in: {
              name: '$$v.name', size: '$$v.size', sku: '$$v.sku',
              sellingPrice: '$$v.sellingPrice', mrpPrice: '$$v.mrpPrice', costPrice: '$$v.costPrice',
              quantity: '$$v.quantity', isAvailable: '$$v.isAvailable', status: '$$v.status',
              material: '$$v.material', colorName: '$$v.colorName', unit: '$$v.unit', unitQuantity: '$$v.unitQuantity',
              attributes: '$$v.attributes',
              images: {
                $filter: {
                  input: { $ifNull: ['$$v.images', []] },
                  as: 'img',
                  cond: { $not: [{ $regexMatch: { input: '$$img.url', regex: '^data:' } }] },
                },
              },
            },
          },
        },
      }},
      { $project: {
        name: 1, slug: 1, sku: 1, barcode: 1, brand: 1, subCategory: 1,
        mrpPrice: 1, sellingPrice: 1, costPrice: 1, quantity: 1, warehouseStock: 1, reservedQuantity: 1,
        publishStatus: 1, status: 1, isFeatured: 1, badges: 1, weight: 1, unitType: 1,
        variantType: 1, variantTypeImages: 1, createdAt: 1, updatedAt: 1, category: 1,
        variants: '$_cleanVariants',
      }},
      { $sort: sortOption },
      { $skip: skip },
      { $limit: limit },
    ];

    let rawProducts: any[];
    let total: number;
    try {
      [rawProducts, total] = await Promise.all([
        Product.aggregate(pipeline).allowDiskUse(true),
        Product.countDocuments(filter),
      ]);
    } catch (aggError: any) {
      console.error('[GET ADMIN PRODUCTS] Aggregation failed, falling back to simple query:', aggError.message);
      const fallbackProducts = await Product.find(filter)
        .select('name slug sku barcode brand subCategory mrpPrice sellingPrice costPrice quantity publishStatus status isFeatured badges weight variantType variantTypeImages createdAt updatedAt category')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug')
        .lean();
      rawProducts = fallbackProducts.map((p: any) => {
        if (p.variants) {
          p.variants = p.variants.filter((v: any) => {
            if (v.images) {
              v.images = v.images.filter((img: any) => img.url && !img.url.startsWith('data:'));
            }
            return true;
          });
        }
        return p;
      });
      total = await Product.countDocuments(filter);
    }

    const sanitizedProducts = rawProducts.map((p: any) => {
      // Derive listing image from first non-base64 variant image URL.
      // thumbnail and full variant blobs are excluded to keep queries under 1s.
      if (!p.images || p.images.length === 0) {
        const variantImage = p.variants?.find((v: any) => v.images?.[0]?.url && !v.images[0].url.startsWith('data:'))?.images?.[0];
        if (variantImage) {
          p.images = [variantImage];
        } else {
          p.images = [];
        }
      }
      p.variants = p.variants || [];
      return p;
    });

    console.log(`[GET ADMIN PRODUCTS] Query completed! Fetched ${sanitizedProducts.length} products out of ${total}`);
    return sendPaginated(res, sanitizedProducts, total, page, limit);
  } catch (error) {
    console.error('[GET ADMIN PRODUCTS ERROR]', error);
    next(error);
  }
};

export const bulkUpdateStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return sendError(res, 'Updates array is required', 400);
    }

    const results: any[] = [];
    for (const update of updates) {
      const { productId, quantity, variantSize } = update;
      const product = await Product.findById(productId);
      if (!product) continue;

      if (variantSize && product.variants) {
        const variant = product.variants.find(v => v.size === variantSize);
        if (variant) {
          const before = variant.quantity || 0;
          variant.quantity = quantity;
          await product.save();
          await InventoryLog.create({
            productId, variantSize, type: 'admin_adjustment',
            quantityBefore: before, quantityChange: quantity - before, quantityAfter: quantity,
            reference: 'bulk_update', performedBy: new Types.ObjectId(req.user!.userId),
          });
          results.push({ productId, variantSize, success: true });
        }
      } else {
        const before = product.quantity || 0;
        product.quantity = quantity;
        await product.save();
        await InventoryLog.create({
          productId, type: 'admin_adjustment',
          quantityBefore: before, quantityChange: quantity - before, quantityAfter: quantity,
          reference: 'bulk_update', performedBy: new Types.ObjectId(req.user!.userId),
        });
        results.push({ productId, success: true });
      }
    }

    sendSuccess(res, { data: results, message: `Updated ${results.length} products` });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════
// STEP 2 — Inventory management. Completely separate from the listing/
// publish workflow below: adjusting stock here never changes whether a
// product is visible in the store.
// ═══════════════════════════════════════════════════════════════════════

// Dedicated inventory overview — shows every product (regardless of publish
// status) with stock summary and low-stock/out-of-stock flags, for the admin
// Inventory screen (Step 2), independent of the Product Listing screen.
export const getInventoryOverview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50', lowStockOnly, search } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const filter: any = { isDeleted: false };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    if (lowStockOnly === 'true') {
      filter.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
    }

    const skip = (pageNum - 1) * limitNum;
    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('name slug sku barcode brand manufacturerName category subCategory quantity warehouseStock reservedQuantity openingStock minStock maxStock lowStockThreshold reorderLevel warehouse rackLocation batchNumber lotNumber serialNumber expiryDate manufacturingDate inventoryType trackInventory publishStatus thumbnail costPrice mrpPrice sellingPrice')
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug')
        .lean(),
      Product.countDocuments(filter),
    ]);

    const withFlags = products.map((obj: any) => {
      obj.images = obj.thumbnail ? [{ url: obj.thumbnail }] : [];
      obj.isLowStock = (obj.quantity || 0) <= (obj.lowStockThreshold || 10);
      obj.isOutOfStock = (obj.quantity || 0) <= 0;
      obj.availableStock = Math.max(0, (obj.quantity || 0) - (obj.reservedQuantity || 0));
      return obj;
    });

    sendPaginated(res, withFlags, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

// Adjust stock for a product or a specific variant (by variantSku). This is
// the only Step-2 write path admins should use for day-to-day stock changes
// — it always logs to InventoryLog for a full audit trail.
export const updateInventory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = inventoryAdjustSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }
    const data = validation.data;

    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, 'Product not found', 404);

    if (data.variantSku) {
      const variant = product.variants?.find((v) => v.sku === data.variantSku);
      if (!variant) return sendError(res, 'Variant not found', 404);

      const before = variant.quantity || 0;
      if (data.quantity !== undefined) variant.quantity = data.quantity;
      if (data.warehouseStock !== undefined) variant.warehouseStock = data.warehouseStock;
      if (data.reservedQuantity !== undefined) variant.reservedQuantity = data.reservedQuantity;
      if (data.barcode !== undefined) variant.barcode = data.barcode;
      if (data.batchNumber !== undefined) variant.batchNumber = data.batchNumber;

      await product.save();

      if (data.quantity !== undefined && data.quantity !== before) {
        await InventoryLog.create({
          productId: product._id,
          variantSize: variant.size,
          type: 'admin_adjustment',
          quantityBefore: before,
          quantityChange: data.quantity - before,
          quantityAfter: data.quantity,
          reference: 'inventory_update',
          performedBy: new Types.ObjectId(req.user!.userId),
          note: data.note || 'Variant stock updated',
        });
      }
    } else {
      const before = product.quantity || 0;
      if (data.quantity !== undefined) product.quantity = data.quantity;
      if (data.warehouseStock !== undefined) product.warehouseStock = data.warehouseStock;
      if (data.reservedQuantity !== undefined) product.reservedQuantity = data.reservedQuantity;
      if (data.openingStock !== undefined) product.openingStock = data.openingStock;
      if (data.minStock !== undefined) product.minStock = data.minStock;
      if (data.maxStock !== undefined) product.maxStock = data.maxStock;
      if (data.lowStockThreshold !== undefined) product.lowStockThreshold = data.lowStockThreshold;
      if (data.reorderLevel !== undefined) product.reorderLevel = data.reorderLevel;
      if (data.warehouse !== undefined) product.warehouse = data.warehouse;
      if (data.rackLocation !== undefined) product.rackLocation = data.rackLocation;
      if (data.barcode !== undefined) product.barcode = data.barcode;
      if (data.batchNumber !== undefined) product.batchNumber = data.batchNumber;
      if (data.lotNumber !== undefined) product.lotNumber = data.lotNumber;
      if (data.serialNumber !== undefined) product.serialNumber = data.serialNumber;
      if (data.expiryDate !== undefined) product.expiryDate = data.expiryDate;
      if (data.manufacturingDate !== undefined) product.manufacturingDate = data.manufacturingDate;
      if (data.inventoryType !== undefined) product.inventoryType = data.inventoryType;
      // Product relationship fields
      if (data.frequentlyBoughtTogether !== undefined) product.frequentlyBoughtTogether = data.frequentlyBoughtTogether.map((id: string) => new Types.ObjectId(id));
      if (data.crossSell !== undefined) product.crossSell = data.crossSell.map((id: string) => new Types.ObjectId(id));
      if (data.upSell !== undefined) product.upSell = data.upSell.map((id: string) => new Types.ObjectId(id));
      if (data.bundle !== undefined) product.bundle = data.bundle.map((id: string) => new Types.ObjectId(id));

      // Keep the legacy status field in sync for any code still reading it,
      // without touching publishStatus (visibility is decided in Step 5).
      if (product.trackInventory) {
        product.status = product.quantity > 0 ? (product.status === 'Draft' ? 'Draft' : 'Active') : 'Out of Stock';
      }

      product.updatedBy = new Types.ObjectId(req.user!.userId);
      await product.save();

      if (data.quantity !== undefined && data.quantity !== before) {
        await InventoryLog.create({
          productId: product._id,
          type: 'admin_adjustment',
          quantityBefore: before,
          quantityChange: data.quantity - before,
          quantityAfter: data.quantity,
          reference: 'inventory_update',
          performedBy: new Types.ObjectId(req.user!.userId),
          note: data.note || 'Stock updated',
        });
      }
    }

    sendSuccess(res, { data: product, message: 'Inventory updated' });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════
// STEP 3 & 5 — Listing / publishing. A product only becomes visible to
// shoppers when explicitly "added to the store" here. Draft/unlisted and
// archived products never reach the public catalog (enforced again in the
// public product.controller.ts as a second gate).
// ═══════════════════════════════════════════════════════════════════════

const REQUIRED_TO_LIST: Array<{ field: string; check: (p: any) => boolean; label: string }> = [
  { field: 'images', check: (p) => (Array.isArray(p.images) && p.images.length > 0) || Boolean(p.thumbnail), label: 'At least one product image' },
  { field: 'sellingPrice', check: (p) => typeof p.sellingPrice === 'number' && p.sellingPrice > 0, label: 'A valid selling price' },
  { field: 'category', check: (p) => Boolean(p.category), label: 'A category' },
  { field: 'description', check: (p) => Boolean(p.description) || Boolean(p.shortDescription) || Boolean(p.name), label: 'A product description' },
];

// Step 3: "Add Product to Store". Only inventory products (already created
// in Step 1) can be selected here — there is no separate product creation
// happening in this step. Optional marketplace URLs may be attached.
export const listProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = listProductSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const id = String(req.params.id || '').trim();
    const product = await Product.findOne({
      $or: Types.ObjectId.isValid(id) ? [{ _id: new Types.ObjectId(id) }, { _id: id }] : [{ _id: id }],
      isDeleted: false,
    });
    if (!product) return sendError(res, 'Product not found', 404);

    if (product.publishStatus === 'published') {
      return sendError(res, 'Product is already listed in the store', 400);
    }

    const missing = REQUIRED_TO_LIST.filter((r) => !r.check(product)).map((r) => r.label);
    if (missing.length) {
      return sendError(res, `Cannot list this product yet. Missing: ${missing.join(', ')}`, 400);
    }

    product.publishStatus = 'published';
    product.status = 'Active';
    product.isVisible = true;
    product.isActive = true;
    product.listedAt = new Date();
    product.listedBy = new Types.ObjectId(req.user!.userId);
    if (validation.data.marketplaceLinks) {
      product.marketplaceLinks = { ...(product.marketplaceLinks || {}), ...validation.data.marketplaceLinks } as any;
    }
    product.updatedBy = new Types.ObjectId(req.user!.userId);

    await product.save();

    sendSuccess(res, { data: product, message: 'Product added to the store and is now live.' });
  } catch (error) {
    next(error);
  }
};

// Unlist (back to draft/inventory-only) or archive a published product.
// Either way it immediately disappears from the public storefront.
export const unlistProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = unlistProductSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const id = String(req.params.id || '').trim();
    const product = await Product.findOne({
      $or: Types.ObjectId.isValid(id) ? [{ _id: new Types.ObjectId(id) }, { _id: id }] : [{ _id: id }],
      isDeleted: false,
    });
    if (!product) return sendError(res, 'Product not found', 404);

    product.publishStatus = validation.data.status;
    product.isVisible = false;
    product.status = validation.data.status === 'archived' ? 'Discontinued' : 'Draft';
    product.updatedBy = new Types.ObjectId(req.user!.userId);

    await product.save();

    sendSuccess(res, { data: product, message: `Product ${validation.data.status === 'archived' ? 'archived' : 'removed from the store'}.` });
  } catch (error) {
    next(error);
  }
};

// Update marketplace links / listing metadata without touching inventory or
// the publish state.
export const updateListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = updateListingSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, 'Product not found', 404);

    if (validation.data.marketplaceLinks) {
      product.marketplaceLinks = { ...(product.marketplaceLinks || {}), ...validation.data.marketplaceLinks } as any;
    }
    product.updatedBy = new Types.ObjectId(req.user!.userId);
    await product.save();

    sendSuccess(res, { data: product, message: 'Listing details updated' });
  } catch (error) {
    next(error);
  }
};

export const getInventoryLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const filter: any = {};

    if (req.params.productId) filter.productId = new Types.ObjectId(String(req.params.productId));

    const skip = (pageNum - 1) * limitNum;
    const [logs, total] = await Promise.all([
      InventoryLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('performedBy', 'name'),
      InventoryLog.countDocuments(filter),
    ]);

    sendPaginated(res, logs, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};
