import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { sendError } from '../services/apiResponse';
import { JWT_CONFIG } from '../config/jwt';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    sessionId?: string;
    role: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token = req.cookies?.accessToken;
    console.log(`[AUTH] Checking auth for ${req.method} ${req.path}, cookie token: ${token ? 'present' : 'none'}`);

    if (!token) {
      const authHeader = req.headers.authorization;
      console.log(`[AUTH] Authorization header: ${authHeader ? authHeader.substring(0, 30) + '...' : 'none'}`);
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      console.log(`[AUTH] No token found for ${req.method} ${req.path}`);
      return sendError(res, 'Access denied. No token provided.', 401);
    }

    const decoded = jwt.verify(token, JWT_CONFIG.ACCESS_SECRET) as any;

    const user = await User.findById(decoded.userId).select('_id role isDeleted isActive');
    if (!user || user.isDeleted || !user.isActive) {
      return sendError(res, 'User not found or inactive.', 401);
    }

    req.user = {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
      role: user.role,
      isAdmin: ['admin', 'super_admin'].includes(user.role),
      isSuperAdmin: user.role === 'super_admin',
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token expired. Please refresh your token.', 401);
    }
    return sendError(res, 'Invalid token.', 401);
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token = req.cookies?.accessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      req.user = { userId: '', role: 'guest', isAdmin: false, isSuperAdmin: false };
      return next();
    }

    const decoded = jwt.verify(token, JWT_CONFIG.ACCESS_SECRET) as any;
    const user = await User.findById(decoded.userId).select('_id role isDeleted isActive');
    if (user && !user.isDeleted && user.isActive) {
      req.user = {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
        role: user.role,
        isAdmin: ['admin', 'super_admin'].includes(user.role),
        isSuperAdmin: user.role === 'super_admin',
      };
    } else {
      req.user = { userId: '', role: 'guest', isAdmin: false, isSuperAdmin: false };
    }
    next();
  } catch {
    req.user = { userId: '', role: 'guest', isAdmin: false, isSuperAdmin: false };
    next();
  }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return sendError(res, 'Access denied. Admin privileges required.', 403);
  }
  next();
};

export const superAdminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isSuperAdmin) {
    return sendError(res, 'Access denied. Super admin privileges required.', 403);
  }
  next();
};

export { authMiddleware as authenticateUser, adminMiddleware as authenticateAdmin };

export const refreshTokenMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return sendError(res, 'Refresh token not found.', 401);
    }

    const decoded = jwt.verify(refreshToken, JWT_CONFIG.REFRESH_SECRET) as any;
    req.user = {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
      role: decoded.role || 'user',
      isAdmin: ['admin', 'super_admin'].includes(decoded.role || ''),
      isSuperAdmin: decoded.role === 'super_admin',
    };
    next();
  } catch {
    return sendError(res, 'Invalid or expired refresh token.', 401);
  }
};
