import { Router } from 'express';
import { authenticateAdmin } from '../middlewares/auth.middleware';
import {
  getBusinesses, getBusinessById,
  approveBusiness, rejectBusiness, deleteBusiness,
} from '../controllers/business.controller';

const router = Router();

router.use(authenticateAdmin);

router.get('/', getBusinesses);
router.get('/:id', getBusinessById);
router.post('/:id/approve', approveBusiness);
router.post('/:id/reject', rejectBusiness);
router.delete('/:id', deleteBusiness);

export default router;
