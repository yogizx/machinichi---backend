import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import {
  getStatesList,
  getStateDetail,
  getStateMonthlyTrends,
  getStateGrowth,
  getTopStates,
  getBottomStates,
  getRegionalOverview,
  getStateAOV,
  getStateRepeatRates,
  exportRegionalCSV,
} from '../controllers/regional.controller';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/overview', getRegionalOverview);
router.get('/states', getStatesList);
router.get('/states/top', getTopStates);
router.get('/states/bottom', getBottomStates);
router.get('/states/aov', getStateAOV);
router.get('/states/repeat-rates', getStateRepeatRates);
router.get('/states/:stateName', getStateDetail);
router.get('/states/:stateName/trends', getStateMonthlyTrends);
router.get('/states/:stateName/growth', getStateGrowth);
router.get('/export/csv', exportRegionalCSV);

export default router;
