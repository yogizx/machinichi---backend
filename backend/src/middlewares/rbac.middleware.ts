import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { sendError } from '../services/apiResponse';

export type Role = 'user' | 'admin' | 'super_admin';

export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }
    if (!roles.includes(req.user.role as Role)) {
      return sendError(res, 'You do not have permission to perform this action.', 403);
    }
    next();
  };
};

export const adminOrAbove = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return sendError(res, 'Admin access required.', 403);
  }
  next();
};

export const selfOrAdmin = (paramUserId: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }
    if (req.user.userId === paramUserId || req.user.isAdmin) {
      return next();
    }
    return sendError(res, 'You can only access your own resources.', 403);
  };
};
