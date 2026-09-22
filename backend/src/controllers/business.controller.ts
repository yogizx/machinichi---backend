import { Request, Response } from 'express';
import { Business } from '../models/Business';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getBusinesses = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query;
    const filter: any = {};

    if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tagline: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [businesses, total] = await Promise.all([
      Business.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Business.countDocuments(filter),
    ]);

    return res.status(200).json({
      businesses,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch businesses', error: err.message });
  }
};

export const getBusinessById = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const business = await Business.findById(req.params.id).lean();
    if (!business) return res.status(404).json({ message: 'Business not found' });
    return res.status(200).json({ business });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch business', error: err.message });
  }
};

export const approveBusiness = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: 'Business not found' });

    business.status = 'approved';
    business.reviewedBy = req.user?.userId as any;
    business.reviewedAt = new Date();
    business.rejectionReason = undefined;
    await business.save();

    return res.status(200).json({ message: 'Business approved successfully', business });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to approve business', error: err.message });
  }
};

export const rejectBusiness = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: 'Business not found' });

    business.status = 'rejected';
    business.rejectionReason = reason.trim();
    business.reviewedBy = req.user?.userId as any;
    business.reviewedAt = new Date();
    await business.save();

    return res.status(200).json({ message: 'Business rejected', business });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to reject business', error: err.message });
  }
};

export const deleteBusiness = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const business = await Business.findByIdAndDelete(req.params.id);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    return res.status(200).json({ message: 'Business deleted' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to delete business', error: err.message });
  }
};
