import { Response, NextFunction } from 'express';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../services/apiResponse';
import { addToCartSchema, updateCartItemSchema, removeCartItemSchema, mergeCartSchema } from '../validators';
import { checkStock } from '../services/inventory.service';
import { trackCartAdd, trackCartRemove, mergeGuestViews } from '../services/analytics.service';
import { Types } from 'mongoose';
import crypto from 'crypto';

const getOrCreateSessionId = (req: AuthRequest): string => {
  if (req.user?.sessionId) return req.user.sessionId;
  if (req.cookies?.sessionId) return req.cookies.sessionId;
  const sessionId = crypto.randomBytes(16).toString('hex');
  return sessionId;
};

const getGuestId = (req: AuthRequest): string => {
  const body = req.body as Record<string, unknown>;
  const gid = body?.guestId;
  if (typeof gid === 'string') return gid;
  const header = req.headers['x-guest-id'];
  if (Array.isArray(header)) return header[0] || '';
  return header || '';
};

export const getCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = getOrCreateSessionId(req);
    const query = req.user?.userId
      ? { userId: new Types.ObjectId(req.user.userId) }
      : { sessionId, userId: { $exists: false } };

    let cart = await Cart.findOne(query)
      .populate({
        path: 'items.productId',
        select: 'name slug images sellingPrice mrp quantity variants isActive',
      });

    if (!cart) {
      cart = await Cart.create({
        ...(req.user?.userId ? { userId: new Types.ObjectId(req.user.userId) } : { sessionId }),
        items: [],
      });
    }

    cart.items = cart.items.filter(item => {
      const product: any = item.productId;
      return product && !product.isDeleted && product.isActive;
    });
    await cart.save();

    sendSuccess(res, { data: cart });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = addToCartSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { productId, variantSize, quantity } = validation.data;
    const sessionId = getOrCreateSessionId(req);
    const product = await Product.findById(productId);
    if (!product || !product.isActive || product.isDeleted) {
      return sendError(res, 'Product not found or inactive', 404);
    }

    const stockCheck = await checkStock(new Types.ObjectId(productId), quantity, variantSize);
    if (!stockCheck.available) {
      return sendError(res, stockCheck.message || 'Insufficient stock', 400);
    }

    const query = req.user?.userId
      ? { userId: new Types.ObjectId(req.user.userId) }
      : { sessionId, userId: { $exists: false } };

    let cart = await Cart.findOne(query);
    if (!cart) {
      cart = await Cart.create({
        ...(req.user?.userId ? { userId: new Types.ObjectId(req.user.userId) } : { sessionId }),
        items: [],
      });
    }

    const existingIndex = cart.items.findIndex(
      item => item.productId.toString() === productId && item.variantSize === (variantSize || null)
    );

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;
      const restockCheck = await checkStock(new Types.ObjectId(productId), newQty, variantSize);
      if (!restockCheck.available) {
        return sendError(res, restockCheck.message || 'Insufficient stock', 400);
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      cart.items.push({
        productId: new Types.ObjectId(productId),
        variantSize: variantSize || null,
        quantity,
        mrpPrice: product.mrpPrice,
        sellingPrice: product.sellingPrice,
        image: product.images?.[0]?.url || '',
        name: product.name,
      } as any);
    }

    cart.updatedAt = new Date();
    await cart.save();

    // Analytics: record this cart owner (guest sessionId or logged-in userId)
    // as currently holding the product. Idempotent on the service side —
    // re-adding the same product (e.g. increasing quantity via Add to Cart)
    // never double-counts totalUniqueCartUsers, so it's safe to call on
    // every successful add rather than only on first-add.
    await trackCartAdd(productId, {
      userId: req.user?.userId,
      guestId: req.user?.userId ? undefined : getGuestId(req),
      sessionId: req.user?.userId ? undefined : sessionId,
    });

    await cart.populate({
      path: 'items.productId',
      select: 'name slug images sellingPrice mrp quantity variants isActive',
    });

    sendSuccess(res, { data: cart, message: 'Item added to cart' });
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = updateCartItemSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { quantity } = validation.data;
    const productId = String(req.params.productId);
    const variantSize = req.query.variantSize as string | undefined;
    const sessionId = getOrCreateSessionId(req);

    const query = req.user?.userId
      ? { userId: new Types.ObjectId(req.user.userId) }
      : { sessionId, userId: { $exists: false } };

    const cart = await Cart.findOne(query);
    if (!cart) return sendError(res, 'Cart not found', 404);

    const existingIndex = cart.items.findIndex(
      item => item.productId.toString() === productId && item.variantSize === (variantSize || null)
    );

    if (existingIndex === -1) return sendError(res, 'Item not found in cart', 404);

    const newQty = quantity;

    const stockCheck = await checkStock(new Types.ObjectId(productId), newQty, variantSize);
    if (!stockCheck.available) {
      return sendError(res, stockCheck.message || 'Insufficient stock', 400);
    }

    cart.items[existingIndex].quantity = quantity;
    cart.updatedAt = new Date();
    await cart.save();

    await cart.populate({
      path: 'items.productId',
      select: 'name slug images sellingPrice mrp quantity variants isActive',
    });

    sendSuccess(res, { data: cart, message: 'Cart updated' });
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const productId = String(req.params.productId);
    const variantSize = req.query.variantSize as string | undefined;
    const sessionId = getOrCreateSessionId(req);

    const query = req.user?.userId
      ? { userId: new Types.ObjectId(req.user.userId) }
      : { sessionId, userId: { $exists: false } };

    const cart = await Cart.findOne(query);
    if (!cart) return sendError(res, 'Cart not found', 404);

    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId && item.variantSize === (variantSize || null)
    );

    if (itemIndex === -1) return sendError(res, 'Item not found in cart', 404);

    cart.items.splice(itemIndex, 1);
    cart.updatedAt = new Date();
    await cart.save();

    // If no other line of the same product remains, remove every possible
    // identity key (userId for logged-in, sessionId for guest) so the active-
    // cart count always drops regardless of which key was stored at add time.
    const stillInCart = cart.items.some(item => item.productId.toString() === productId);
    if (!stillInCart) {
      await trackCartRemove(productId, { userId: req.user?.userId, guestId: getGuestId(req), sessionId });
    }

    await cart.populate({
      path: 'items.productId',
      select: 'name slug images sellingPrice mrp quantity variants isActive',
    });

    sendSuccess(res, { data: cart, message: 'Item removed from cart' });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = getOrCreateSessionId(req);
    const query = req.user?.userId
      ? { userId: new Types.ObjectId(req.user.userId) }
      : { sessionId, userId: { $exists: false } };

    const cart = await Cart.findOne(query);
    if (!cart) return sendError(res, 'Cart not found', 404);

    // Analytics: release this cart owner from every product they held before
    // wiping the cart, so Cart Count doesn't get stuck showing them as active.
    // Pass both userId and sessionId to ensure matches regardless of which
    // identity key was stored at add time (guest session → login merge).
    const uniqueProductIds = [...new Set(cart.items.map(item => item.productId.toString()))];
    for (const productId of uniqueProductIds) {
      await trackCartRemove(productId, { userId: req.user?.userId, guestId: getGuestId(req), sessionId });
    }

    cart.items = [];
    cart.updatedAt = new Date();
    await cart.save();

    sendSuccess(res, { data: cart, message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
};

export const mergeCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Login required to merge cart', 401);
    }

    const validation = mergeCartSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { sessionId } = validation.data;
    const guestId = getGuestId(req) || sessionId;
    const userId = new Types.ObjectId(req.user.userId);

    const guestCart = await Cart.findOne({ sessionId, userId: { $exists: false } });
    if (!guestCart || guestCart.items.length === 0) {
      return sendSuccess(res, { data: null, message: 'No guest cart to merge' });
    }

    let userCart = await Cart.findOne({ userId });
    if (!userCart) {
      userCart = await Cart.create({ userId, items: [] });
    }

    for (const guestItem of guestCart.items) {
      const existingIndex = userCart.items.findIndex(
        item => item.productId.toString() === guestItem.productId.toString() &&
          item.variantSize === guestItem.variantSize
      );

      if (existingIndex > -1) {
        userCart.items[existingIndex].quantity += guestItem.quantity;
      } else {
        userCart.items.push(guestItem);
      }
    }

    userCart.updatedAt = new Date();
    await userCart.save();

    await Cart.deleteOne({ _id: guestCart._id });

    // Analytics: reassign the guest's cart-ownership identity to the
    // authenticated user instead of creating new events, so a product the
    // guest already had in cart doesn't get double-counted as +2 after login.
    await mergeGuestViews(req.user.userId, guestId);

    await userCart.populate({
      path: 'items.productId',
      select: 'name slug images sellingPrice mrp quantity variants isActive',
    });

    sendSuccess(res, { data: userCart, message: 'Cart merged successfully' });
  } catch (error) {
    next(error);
  }
};

export const getCartCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = getOrCreateSessionId(req);
    const query = req.user?.userId
      ? { userId: new Types.ObjectId(req.user.userId) }
      : { sessionId, userId: { $exists: false } };

    const cart = await Cart.findOne(query);
    const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

    sendSuccess(res, { count });
  } catch (error) {
    next(error);
  }
};
