import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} from '../controllers/notification.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/mark-read', markAsRead);
router.put('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;
