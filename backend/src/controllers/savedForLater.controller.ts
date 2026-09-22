import { Response, NextFunction } from 'express';
import { SavedForLater } from '../models/SavedForLater';
import { Cart } from '../models/Cart';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../services/apiResponse';
import { saveForLaterSchema, moveToCartSchema } from '../validators';
import { Types } from 'mongoose';

export const getSavedItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const userId = new Types.ObjectId(req.user.userId);
    let saved = await SavedForLater.findOne({ userId })
      .populate({
        path: 'items.productId',
        select: 'name slug images sellingPrice mrp quantity variants isActive',
      });

    if (!saved) {
      saved = await SavedForLater.create({ userId, items: [] });
    }

    sendSuccess(res, { data: saved });
  } catch (error) {
    next(error);
  }
};

export const saveForLater = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = saveForLaterSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { productId, variantSize, quantity } = validation.data;
    const userId = new Types.ObjectId(req.user.userId);
    const prodObjId = new Types.ObjectId(productId);

    let saved = await SavedForLater.findOne({ userId });
    if (!saved) {
      saved = await SavedForLater.create({ userId, items: [] });
    }

    const alreadyExists = saved.items.some(
      item => item.productId.toString() === productId && item.variantSize === (variantSize || null)
    );

    if (!alreadyExists) {
      saved.items.push({ productId: prodObjId, variantSize: variantSize || null, quantity } as any);
      await saved.save();
    }

    const cart = await Cart.findOne({ userId });
    if (cart) {
      const cartIndex = cart.items.findIndex(
        item => item.productId.toString() === productId && item.variantSize === (variantSize || null)
      );
      if (cartIndex > -1) {
        cart.items.splice(cartIndex, 1);
        await cart.save();
      }
    }

    await saved.populate({
      path: 'items.productId',
      select: 'name slug images sellingPrice mrp quantity variants isActive',
    });

    sendSuccess(res, { data: saved, message: 'Saved for later' });
  } catch (error) {
    next(error);
  }
};

export const moveToCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const { productId } = req.params;
    const variantSize = req.query.variantSize as string | undefined;
    const userId = new Types.ObjectId(req.user.userId);

    let saved = await SavedForLater.findOne({ userId });
    if (!saved) return sendError(res, 'No saved items found', 404);

    const savedIndex = saved.items.findIndex(
      item => item.productId.toString() === productId && item.variantSize === (variantSize || null)
    );

    if (savedIndex === -1) return sendError(res, 'Item not found in saved list', 404);

    const item = saved.items[savedIndex];
    saved.items.splice(savedIndex, 1);
    await saved.save();

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    cart.items.push(item as any);
    await cart.save();

    sendSuccess(res, { data: saved, message: 'Moved to cart' });
  } catch (error) {
    next(error);
  }
};

export const removeSavedItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const { productId } = req.params;
    const variantSize = req.query.variantSize as string | undefined;
    const userId = new Types.ObjectId(req.user.userId);

    const saved = await SavedForLater.findOne({ userId });
    if (!saved) return sendError(res, 'No saved items found', 404);

    saved.items = saved.items.filter(
      item => !(item.productId.toString() === productId && item.variantSize === (variantSize || null))
    );
    await saved.save();

    sendSuccess(res, { data: saved, message: 'Removed from saved list' });
  } catch (error) {
    next(error);
  }
};
