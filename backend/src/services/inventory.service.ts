import { Product } from '../models/Product';
import { InventoryLog } from '../models/InventoryLog';
import { Types } from 'mongoose';

export const checkStock = async (
  productId: Types.ObjectId,
  quantity: number,
  variantSize?: string
): Promise<{ available: boolean; currentStock: number; message?: string }> => {
  const product = await Product.findById(productId);
  if (!product) return { available: false, currentStock: 0, message: 'Product not found' };

  if (variantSize && product.variants && product.variants.length > 0) {
    const variant = product.variants.find(v => v.size === variantSize);
    if (!variant) return { available: false, currentStock: 0, message: 'Variant not found' };
    if (!variant.isAvailable) return { available: false, currentStock: 0, message: 'Variant is not available' };
    const currentStock = variant.quantity || 0;
    if (currentStock < quantity) return { available: false, currentStock, message: `Only ${currentStock} units available` };
    return { available: true, currentStock };
  }

  const currentStock = product.quantity || 0;
  if (currentStock < quantity) return { available: false, currentStock, message: `Only ${currentStock} units available` };
  return { available: true, currentStock };
};

export const reserveStock = async (
  productId: Types.ObjectId,
  quantity: number,
  variantSize?: string,
  reference?: string,
  performedBy?: Types.ObjectId
): Promise<boolean> => {
  // Enterprise reservation semantics: a successful payment reserves stock so
  // it can't be oversold to someone else, but it must NOT move the
  // `quantity` field yet — `quantity` is the single source of truth both
  // /admin/inventory and /admin/product-listing read from, and it must stay
  // unchanged until the seller actually confirms the order (see
  // order.controller.ts updateOrderStatus, the 'accepted' transition, which
  // is the only place stock is ever committed via deductStock(..., { fromReservation: true })).
  // Availability is checked against quantity - reservedQuantity so concurrent
  // reservations can't oversell the same units.
  const result = variantSize
    ? await Product.findOneAndUpdate(
        {
          _id: productId,
          'variants.size': variantSize,
          $expr: { $gte: [{ $subtract: ['$variants.quantity', { $ifNull: ['$variants.reservedQuantity', 0] }] }, quantity] },
        },
        { $inc: { 'variants.$.reservedQuantity': quantity } },
        { new: true }
      )
    : await Product.findOneAndUpdate(
        {
          _id: productId,
          $expr: { $gte: [{ $subtract: ['$quantity', '$reservedQuantity'] }, quantity] },
        },
        { $inc: { reservedQuantity: quantity } },
        { new: true }
      );

  if (!result) return false;

  await InventoryLog.create({
    productId,
    variantSize,
    type: 'reservation',
    quantityChange: 0, // available-to-display quantity is untouched by a reservation
    reference: reference || 'payment_reservation',
    performedBy: performedBy || productId,
  });
  return true;
};

// Undo a reservation that was never committed — e.g. admin rejects/cancels an
// order while it's still 'pending_approval' (reserved but not yet accepted).
// Only reservedQuantity is touched; `quantity` was never decremented for this
// order, so there's nothing to restore there.
export const releaseReservation = async (
  productId: Types.ObjectId,
  quantity: number,
  variantSize?: string,
  reference?: string
): Promise<boolean> => {
  const result = variantSize
    ? await Product.findOneAndUpdate(
        { _id: productId, 'variants.size': variantSize },
        { $inc: { 'variants.$.reservedQuantity': -quantity } },
        { new: true }
      )
    : await Product.findOneAndUpdate(
        { _id: productId },
        { $inc: { reservedQuantity: -quantity } },
        { new: true }
      );

  if (!result) return false;

  await InventoryLog.create({
    productId,
    variantSize,
    type: 'reservation_release' as const,
    quantityChange: 0,
    reference: reference || 'reservation_cancelled',
  });
  return true;
};

export const releaseStock = async (
  productId: Types.ObjectId,
  quantity: number,
  variantSize?: string,
  reference?: string
): Promise<boolean> => {
  const result = variantSize
    ? await Product.findOneAndUpdate(
        { _id: productId, 'variants.size': variantSize },
        { $inc: { 'variants.$.quantity': quantity } },
        { new: true }
      )
    : await Product.findOneAndUpdate(
        { _id: productId },
        { $inc: { quantity } },
        { new: true }
      );

  if (!result) return false;

  await InventoryLog.create({
    productId,
    variantSize,
    type: 'reservation_release' as const,
    quantityChange: quantity,
    reference: reference || 'reservation_release',
  });
  return true;
};

export const deductStock = async (
  productId: Types.ObjectId,
  quantity: number,
  variantSize?: string,
  reference?: string,
  performedBy?: Types.ObjectId
): Promise<boolean> => {
  const result = variantSize
    ? await Product.findOneAndUpdate(
        { _id: productId, 'variants.size': variantSize, 'variants.quantity': { $gte: quantity } },
        { $inc: { 'variants.$.quantity': -quantity, 'variants.$.reservedQuantity': -quantity, totalSales: quantity } },
        { new: true }
      )
    : await Product.findOneAndUpdate(
        { _id: productId, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity, reservedQuantity: -quantity, totalSales: quantity } },
        { new: true }
      );

  if (!result) return false;

  await InventoryLog.create({
    productId,
    variantSize,
    type: 'sale',
    quantityChange: -quantity,
    reference: reference || 'sale',
    performedBy: performedBy || productId,
  });
  return true;
};
