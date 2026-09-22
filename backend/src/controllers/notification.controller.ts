import { Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../services/apiResponse';
import { notificationQuerySchema, markReadSchema } from '../validators';
import { Types } from 'mongoose';

export const getMyNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = notificationQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { page, limit, type, isRead } = validation.data;
    const filter: any = { userId: new Types.ObjectId(req.user.userId) };

    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead;

    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: new Types.ObjectId(req.user.userId), isRead: false }),
    ]);

    sendSuccess(res, {
      data: notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = markReadSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    await Notification.updateMany(
      {
        _id: { $in: validation.data.notificationIds.map(id => new Types.ObjectId(id)) },
        userId: new Types.ObjectId(req.user.userId),
      },
      { isRead: true, readAt: new Date() }
    );

    sendSuccess(res, { message: 'Notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    await Notification.updateMany(
      { userId: new Types.ObjectId(req.user.userId), isRead: false },
      { isRead: true, readAt: new Date() }
    );

    sendSuccess(res, { message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendSuccess(res, { unreadCount: 0 });
    }

    const count = await Notification.countDocuments({
      userId: new Types.ObjectId(req.user.userId),
      isRead: false,
    });

    sendSuccess(res, { unreadCount: count });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: new Types.ObjectId(req.user.userId),
    });

    if (!notification) return sendError(res, 'Notification not found', 404);
    sendSuccess(res, { message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};
