import { Response, NextFunction } from 'express';
import { User } from '../../models/User';
import { Order } from '../../models/Order';
import { Cart } from '../../models/Cart';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../../services/apiResponse';

export const getAdminCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 15;
    const search = req.query.search as string;

    const skip = (page - 1) * limit;

    // Stage 1: Get unique customer IDs from orders (primary data source)
    const orderMatch: any = {};
    if (search) {
      orderMatch.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
      ];
    }

    const orderAggPipeline: any[] = [
      { $match: orderMatch },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          latestOrder: { $max: '$createdAt' },
          customerName: { $first: '$customerName' },
          shippingName: { $first: '$shippingAddress.fullName' },
        },
      },
      { $sort: { latestOrder: -1 } },
    ];

    const [orderAggResults, totalCountResult] = await Promise.all([
      Order.aggregate([...orderAggPipeline, { $skip: skip }, { $limit: limit }]),
      Order.aggregate([...orderAggPipeline, { $count: 'total' }]),
    ]);

    // Get user data for the customers found
    const userIds = orderAggResults.map(r => r._id);
    const users = userIds.length > 0
      ? await User.find({ _id: { $in: userIds } }).lean()
      : [];

    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Get cart stats for these customers
    const cartMap = new Map<string, number>();
    if (userIds.length > 0) {
      const carts = await Cart.find({ userId: { $in: userIds } }).lean();
      for (const cart of carts) {
        if (cart.userId) {
          cartMap.set(cart.userId.toString(), (cart.items || []).length);
        }
      }
    }

    const total = totalCountResult[0]?.total || 0;

    const formattedCustomers = orderAggResults.map((orderResult) => {
      const user = userMap.get(orderResult._id.toString());
      const orderCount = orderResult.orderCount;
      const latestOrder = orderResult.latestOrder;
      const lastLogin = user?.lastLogin || null;

      let lastActive = null;
      if (lastLogin && latestOrder) {
        lastActive = lastLogin > latestOrder ? lastLogin : latestOrder;
      } else {
        lastActive = lastLogin || latestOrder || null;
      }

      const customerName = user?.fullName || orderResult.customerName || orderResult.shippingName || 'Customer';
      const email = user?.email || null;
      const phone = user?.phone || null;
      const tier = user?.customerTier || 'Regular';

      return {
        _id: orderResult._id,
        name: customerName,
        email,
        phone,
        tier,
        orderCount,
        lastActive,
        cartItems: cartMap.get(orderResult._id.toString()) || 0,
        createdAt: user?.createdAt || latestOrder || null,
      };
    });

    return sendPaginated(res, formattedCustomers, total, page, limit);
  } catch (error) {
    next(error);
  }
};

export const createAdminCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, 'Name is required.', 400);
    }
    if (!email || !email.trim()) {
      return sendError(res, 'Email is required.', 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if the user already exists
    const existingUser = await User.findOne({ email: cleanEmail, isDeleted: { $ne: true } });
    if (existingUser) {
      return sendError(res, 'A customer with this email already exists.', 400);
    }

    const newCustomer = await User.create({
      fullName: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : undefined,
      role: 'customer',
      provider: 'local',
      customerTier: 'Regular',
      totalOrders: 0,
      totalSpend: 0,
    });

    return sendSuccess(res, { data: newCustomer }, 201);
  } catch (error) {
    next(error);
  }
};
