import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../services/apiResponse';
import { trackView, trackCartAdd, trackCartRemove, mergeGuestViews } from '../services/analytics.service';

function getSessionId(req: AuthRequest): string {
  const body = req.body as Record<string, unknown>;
  const sid = body?.sessionId;
  if (typeof sid === 'string') return sid;
  const header = req.headers['x-session-id'];
  if (Array.isArray(header)) return header[0] || '';
  return header || '';
}

function getGuestId(req: AuthRequest): string {
  const body = req.body as Record<string, unknown>;
  const gid = body?.guestId;
  if (typeof gid === 'string') return gid;
  const header = req.headers['x-guest-id'];
  if (Array.isArray(header)) return header[0] || '';
  return header || '';
}

function getSource(req: AuthRequest): string {
  const src = req.query.source;
  if (typeof src === 'string') return src;
  if (Array.isArray(src)) {
    const first = src[0];
    if (typeof first === 'string') return first;
  }
  return 'direct';
}

function getReferrer(req: AuthRequest): string | undefined {
  const ref = req.headers.referer;
  if (Array.isArray(ref)) return ref[0];
  return typeof ref === 'string' ? ref : undefined;
}

function getIp(req: AuthRequest): string | undefined {
  const ip = req.ip;
  return typeof ip === 'string' ? ip : undefined;
}

export const registerView = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.productId as string;
    if (!productId) return sendError(res, 'Product ID is required', 400);

    const userId = req.user?.userId || '';
    const guestId = getGuestId(req);
    const sessionId = getSessionId(req);

    if (!userId && !guestId && !sessionId) {
      return sendError(res, 'Authentication or guest/session ID required', 400);
    }

    const result = await trackView(productId, { userId, guestId, sessionId }, {
      referrer: getReferrer(req),
      source: getSource(req),
      ip: getIp(req),
    });

    sendSuccess(res, { data: result });
  } catch (error) {
    next(error);
  }
};

export const registerCartAdd = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.productId as string;
    if (!productId) return sendError(res, 'Product ID is required', 400);

    const userId = req.user?.userId || '';
    const guestId = getGuestId(req);
    const sessionId = getSessionId(req);

    if (!userId && !guestId && !sessionId) {
      return sendError(res, 'Authentication or guest/session ID required', 400);
    }

    const result = await trackCartAdd(productId, { userId, guestId, sessionId });
    sendSuccess(res, { data: result });
  } catch (error) {
    next(error);
  }
};

export const registerCartRemove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.productId as string;
    if (!productId) return sendError(res, 'Product ID is required', 400);

    const userId = req.user?.userId || '';
    const guestId = getGuestId(req);
    const sessionId = getSessionId(req);

    if (!userId && !guestId && !sessionId) {
      return sendError(res, 'Authentication or guest/session ID required', 400);
    }

    const result = await trackCartRemove(productId, { userId, guestId, sessionId });
    sendSuccess(res, { data: result });
  } catch (error) {
    next(error);
  }
};

export const mergeIdentity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const guestId = getGuestId(req);
    const sessionId = getSessionId(req);
    const identity = guestId || sessionId;
    if (!userId || !identity) {
      return sendError(res, 'Both userId and guestId/sessionId are required', 400);
    }

    await mergeGuestViews(userId, identity);
    sendSuccess(res, { data: { merged: true } });
  } catch (error) {
    next(error);
  }
};
