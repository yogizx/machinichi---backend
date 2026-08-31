import { Response, NextFunction } from 'express';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { InventoryLog } from '../../models/InventoryLog';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../../services/apiResponse';
import {
  createProductSchema, updateProductSchema, productQuerySchema,
  inventoryAdjustSchema, listProductSchema, unlistProductSchema, updateListingSchema,
} from '../../validators';
import { Types } from 'mongoose';

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

    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await Product.findOne({ slug });
    if (existing) return sendError(res, 'Product with this slug already exists', 400);

    const skuExists = await Product.findOne({ sku: data.sku.toUpperCase() });
    if (skuExists) return sendError(res, 'Product with this SKU already exists', 400);

    const product = await Product.create({
      ...data,
      slug,
      publishStatus: 'unlisted', // Step 5 gate: never listed on creation
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
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false })
      .populate('category', 'name slug')
      .populate('listedBy', 'name');
    if (!product) return sendError(res, 'Product not found', 404);
    sendSuccess(res, { data: product });
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
    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, 'Product not found', 404);

    const oldQuantity = product.quantity;
    const updates: any = { ...data, updatedBy: new Types.ObjectId(req.user!.userId) };
    // Catalog edits must never sneak a listing/publish change through — that
    // only happens via the dedicated list/unlist endpoints below.
    delete updates.publishStatus;
    delete updates.listedAt;
    delete updates.listedBy;
    delete updates.marketplaceLinks;

    if (data.name && !data.slug) {
      updates.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });

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
    const validation = productQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { page, limit, sort, order, search, category, isActive, publishStatus, inStock } = validation.data as any;
    const filter: any = { isDeleted: false };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { hsnCode: search },
        { sku: { $regex: search, $options: 'i' } },
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
    sortOption[sort || 'createdAt'] = order === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug'),
      Product.countDocuments(filter),
    ]);

    sendPaginated(res, products, total, page, limit);
  } catch (error) {
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
        .select('name sku barcode batchNumber category quantity warehouseStock reservedQuantity minStock maxStock lowStockThreshold publishStatus variants images')
        .sort({ quantity: 1 })
        .skip(skip)
        .limit(limitNum)
        .populate('category', 'name slug'),
      Product.countDocuments(filter),
    ]);

    const withFlags = products.map((p) => {
      const obj: any = p.toObject();
      obj.isLowStock = obj.quantity <= obj.lowStockThreshold;
      obj.isOutOfStock = obj.quantity <= 0 && !(obj.variants || []).some((v: any) => v.quantity > 0);
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
      if (data.minStock !== undefined) product.minStock = data.minStock;
      if (data.maxStock !== undefined) product.maxStock = data.maxStock;
      if (data.lowStockThreshold !== undefined) product.lowStockThreshold = data.lowStockThreshold;
      if (data.barcode !== undefined) product.barcode = data.barcode;
      if (data.batchNumber !== undefined) product.batchNumber = data.batchNumber;

      // Keep the legacy status field in sync for any code still reading it,
      // without touching publishStatus (visibility is decided in Step 5).
      if (product.trackInventory) {
        product.status = product.quantity > 0 ? (product.status === 'Draft' ? 'Draft' : 'Active') : 'Out of Stock';
      }

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
  { field: 'images', check: (p) => Array.isArray(p.images) && p.images.length > 0, label: 'At least one product image' },
  { field: 'sellingPrice', check: (p) => typeof p.sellingPrice === 'number' && p.sellingPrice > 0, label: 'A valid selling price' },
  { field: 'category', check: (p) => Boolean(p.category), label: 'A category' },
  { field: 'description', check: (p) => Boolean(p.description), label: 'A product description' },
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

    const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
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

    const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
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
