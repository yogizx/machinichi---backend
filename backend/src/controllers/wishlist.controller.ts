import { Response, NextFunction } from 'express';
import { Wishlist } from '../models/Wishlist';
import { Product } from '../models/Product';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../services/apiResponse';
import { addToWishlistSchema, removeFromWishlistSchema } from '../validators';
import { Types } from 'mongoose';
import { trackWishlistAdd, trackWishlistRemove } from '../services/analytics.service';

export const getWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    let wishlist = await Wishlist.findOne({ userId: new Types.ObjectId(req.user.userId) })
      .populate({
        path: 'products',
        select: 'name slug images sellingPrice mrp quantity variants isActive',
      });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        userId: new Types.ObjectId(req.user.userId),
        products: [],
      });
    }

    sendSuccess(res, { data: wishlist });
  } catch (error) {
    next(error);
  }
};

export const addToWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = addToWishlistSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { productId } = validation.data;

    const product = await Product.findById(productId);
    if (!product || !product.isActive || product.isDeleted) {
      return sendError(res, 'Product not found or inactive', 404);
    }

    const userId = new Types.ObjectId(req.user.userId);
    const prodObjId = new Types.ObjectId(productId);

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId, products: [{ productId: prodObjId, addedAt: new Date() }] });
    } else {
      if ((wishlist.products as any).some((p: any) => (p.productId?.toString() || p.toString()) === productId)) {
        return sendError(res, 'Product already in wishlist', 400);
      }
      (wishlist.products as any).push({ productId: prodObjId, addedAt: new Date() });
      await wishlist.save();
    }

    await wishlist.populate({
      path: 'products',
      select: 'name slug images sellingPrice mrp quantity variants isActive',
    });

    // analytics: real wishlist count (unique users) — no mock
    const gh = req.headers['x-guest-id'];
    const guestId = Array.isArray(gh) ? gh[0] : (gh as string | undefined);
    await trackWishlistAdd(productId, { userId: req.user.userId, guestId });

    sendSuccess(res, { data: wishlist, message: 'Added to wishlist' });
  } catch (error) {
    next(error);
  }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const rawId = (req.params as any).productId as string | string[] | undefined;
    const productId = Array.isArray(rawId) ? rawId[0] : String(rawId || '');
    if (!productId) return sendError(res, 'Product ID required', 400);
    const userId = new Types.ObjectId(req.user.userId);

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) return sendError(res, 'Wishlist not found', 404);

    wishlist.products = (wishlist.products as any).filter((p: any) => (p.productId?.toString() || p.toString()) !== productId);
    await wishlist.save();

    await wishlist.populate({
      path: 'products',
      select: 'name slug images sellingPrice mrp quantity variants isActive',
    });

    const gh2 = req.headers['x-guest-id'];
    const guestId = Array.isArray(gh2) ? gh2[0] : (gh2 as string | undefined);
    await trackWishlistRemove(String(productId), { userId: req.user.userId, guestId });

    sendSuccess(res, { data: wishlist, message: 'Removed from wishlist' });
  } catch (error) {
    next(error);
  }
};

export const checkWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendSuccess(res, { inWishlist: false });
    }

    const productId = String(req.params.productId);
    const wishlist = await Wishlist.findOne({
      userId: new Types.ObjectId(req.user.userId),
      'products.productId': new Types.ObjectId(productId),
    } as any);

    sendSuccess(res, { inWishlist: !!wishlist });
  } catch (error) {
    next(error);
  }
};
