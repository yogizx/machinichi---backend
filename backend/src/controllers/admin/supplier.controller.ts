import { Response, NextFunction } from 'express';
import { Supplier } from '../../models/Supplier';
import { Product } from '../../models/Product';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../../services/apiResponse';
import { Types } from 'mongoose';

// Create a new supplier
export const createSupplier = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, code, contactPerson, email, phone, address, city, state, pincode, country, gstNumber, panNumber, paymentTerms, leadTimeDays } = req.body;

    if (!name || !code) {
      return sendError(res, 'Supplier name and code are required', 400);
    }

    const existing = await Supplier.findOne({ code: code.toUpperCase(), isDeleted: false });
    if (existing) {
      return sendError(res, 'Supplier with this code already exists', 400);
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      contactPerson: contactPerson?.trim(),
      email: email?.trim()?.toLowerCase(),
      phone: phone?.trim(),
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      pincode: pincode?.trim(),
      country: country?.trim() || 'India',
      gstNumber: gstNumber?.trim()?.toUpperCase(),
      panNumber: panNumber?.trim()?.toUpperCase(),
      paymentTerms,
      leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
      createdBy: new Types.ObjectId(req.user!.userId),
    });

    sendSuccess(res, { data: supplier, message: 'Supplier created' }, 201);
  } catch (error) {
    next(error);
  }
};

// Get all suppliers
export const getSuppliers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50', search } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const filter: any = { isDeleted: false };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (pageNum - 1) * limitNum;
    const [suppliers, total] = await Promise.all([
      Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Supplier.countDocuments(filter),
    ]);

    sendPaginated(res, suppliers, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

// Get single supplier
export const getSupplierById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, isDeleted: false });
    if (!supplier) return sendError(res, 'Supplier not found', 404);
    sendSuccess(res, { data: supplier });
  } catch (error) {
    next(error);
  }
};

// Update supplier
export const updateSupplier = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, isDeleted: false });
    if (!supplier) return sendError(res, 'Supplier not found', 404);

    if (req.body.code && req.body.code.toUpperCase() !== supplier.code) {
      const existing = await Supplier.findOne({ code: req.body.code.toUpperCase(), isDeleted: false, _id: { $ne: req.params.id } });
      if (existing) return sendError(res, 'Supplier code already in use', 400);
    }

    const updated = await Supplier.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: new Types.ObjectId(req.user!.userId) },
      { new: true }
    );

    sendSuccess(res, { data: updated, message: 'Supplier updated' });
  } catch (error) {
    next(error);
  }
};

// Delete supplier (soft)
export const deleteSupplier = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date(), isActive: false, updatedBy: new Types.ObjectId(req.user!.userId) },
      { new: true }
    );
    if (!supplier) return sendError(res, 'Supplier not found', 404);
    sendSuccess(res, { message: 'Supplier deleted' });
  } catch (error) {
    next(error);
  }
};

// Add supplier to a product
export const addSupplierToProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    const { supplierId, supplierSKU, purchaseCost, leadTime, isPreferred } = req.body;

    if (!supplierId) return sendError(res, 'Supplier ID is required', 400);

    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) return sendError(res, 'Product not found', 404);

    const supplier = await Supplier.findOne({ _id: supplierId, isDeleted: false });
    if (!supplier) return sendError(res, 'Supplier not found', 404);

    // Check for duplicate supplier on same product
    if (product.suppliers?.some(s => s.supplierId?.toString() === supplierId)) {
      return sendError(res, 'This supplier is already linked to this product', 400);
    }

    // If marking as preferred, unset other preferred suppliers
    if (isPreferred && product.suppliers) {
      product.suppliers.forEach(s => { s.isPreferred = false; });
    }

    product.suppliers = product.suppliers || [];
    product.suppliers.push({
      supplierId: new Types.ObjectId(supplierId),
      supplierSKU: supplierSKU?.trim(),
      purchaseCost: purchaseCost ? Number(purchaseCost) : undefined,
      leadTime: leadTime ? Number(leadTime) : undefined,
      isPreferred: Boolean(isPreferred),
    } as any);

    product.updatedBy = new Types.ObjectId(req.user!.userId);
    await product.save();

    sendSuccess(res, { data: product, message: 'Supplier linked to product' });
  } catch (error) {
    next(error);
  }
};

// Remove supplier from a product
export const removeSupplierFromProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id: productId, supplierId } = req.params;

    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) return sendError(res, 'Product not found', 404);

    product.suppliers = (product.suppliers || []).filter(
      s => s.supplierId?.toString() !== supplierId
    );
    product.updatedBy = new Types.ObjectId(req.user!.userId);
    await product.save();

    sendSuccess(res, { data: product, message: 'Supplier removed from product' });
  } catch (error) {
    next(error);
  }
};

// Add purchase record to a product
export const addPurchaseRecord = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    const { date, quantity, cost, supplierId, invoiceNumber, reference, note } = req.body;

    if (!quantity || !cost) return sendError(res, 'Quantity and cost are required', 400);

    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) return sendError(res, 'Product not found', 404);

    product.purchaseHistory = product.purchaseHistory || [];
    product.purchaseHistory.push({
      date: date ? new Date(date) : new Date(),
      quantity: Number(quantity),
      cost: Number(cost),
      supplierId: supplierId ? new Types.ObjectId(supplierId) : undefined,
      invoiceNumber: invoiceNumber?.trim(),
      reference: reference?.trim(),
      note: note?.trim(),
    } as any);

    product.updatedBy = new Types.ObjectId(req.user!.userId);
    await product.save();

    sendSuccess(res, { data: product, message: 'Purchase record added' }, 201);
  } catch (error) {
    next(error);
  }
};

// Get purchase history for a product
export const getPurchaseHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findOne({ _id: req.params.productId, isDeleted: false })
      .select('purchaseHistory name sku')
      .populate('purchaseHistory.supplierId', 'name code');

    if (!product) return sendError(res, 'Product not found', 404);

    sendSuccess(res, { data: { product: product.name, sku: product.sku, history: product.purchaseHistory || [] } });
  } catch (error) {
    next(error);
  }
};
