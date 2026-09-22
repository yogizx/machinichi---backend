import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../services/apiResponse';
import * as regionalService from '../services/regionalAnalytics.service';

const parseDateRange = (req: AuthRequest) => {
  const { startDate, endDate } = req.query as Record<string, string>;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
    }
    return { startDate: start, endDate: end };
  }
  return { startDate: undefined, endDate: undefined };
};

export const getStatesList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const states = await regionalService.getAllStatesWithData(startDate, endDate);
    sendSuccess(res, { data: states });
  } catch (error) {
    next(error);
  }
};

const getStateName = (req: AuthRequest): string => {
  const name = req.params.stateName;
  return Array.isArray(name) ? name[0] : name;
};

export const getStateDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stateName = getStateName(req);
    if (!stateName) return sendError(res, 'State name is required', 400);
    const { startDate, endDate } = parseDateRange(req);
    const detail = await regionalService.getStateDetail(stateName, startDate, endDate);
    sendSuccess(res, { data: detail });
  } catch (error) {
    next(error);
  }
};

export const getStateMonthlyTrends = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stateName = getStateName(req);
    if (!stateName) return sendError(res, 'State name is required', 400);
    const { startDate, endDate } = parseDateRange(req);
    const trends = await regionalService.getMonthlyTrendsByState(stateName, startDate, endDate);
    sendSuccess(res, { data: trends });
  } catch (error) {
    next(error);
  }
};

export const getStateGrowth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stateName = getStateName(req);
    if (!stateName) return sendError(res, 'State name is required', 400);
    const { startDate, endDate } = parseDateRange(req);
    if (!startDate || !endDate) return sendError(res, 'startDate and endDate are required for growth calculation', 400);
    const growth = await regionalService.getStateGrowthData(stateName, startDate, endDate);
    sendSuccess(res, { data: growth });
  } catch (error) {
    next(error);
  }
};

export const getTopStates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const { startDate, endDate } = parseDateRange(req);
    const states = await regionalService.getTopStates(limit, startDate, endDate);
    sendSuccess(res, { data: states });
  } catch (error) {
    next(error);
  }
};

export const getBottomStates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const { startDate, endDate } = parseDateRange(req);
    const states = await regionalService.getBottomStates(limit, startDate, endDate);
    sendSuccess(res, { data: states });
  } catch (error) {
    next(error);
  }
};

export const getRegionalOverview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const overview = await regionalService.getRegionalOverview(startDate, endDate);
    sendSuccess(res, { data: overview });
  } catch (error) {
    next(error);
  }
};

export const getStateAOV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const aovData = await regionalService.getStateAOV(startDate, endDate);
    sendSuccess(res, { data: aovData });
  } catch (error) {
    next(error);
  }
};

export const getStateRepeatRates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const rates = await regionalService.getStateRepeatRate(startDate, endDate);
    sendSuccess(res, { data: rates });
  } catch (error) {
    next(error);
  }
};

export const exportRegionalCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = parseDateRange(req);
    const states = await regionalService.getAllStatesWithData(startDate, endDate);
    const overview = await regionalService.getRegionalOverview(startDate, endDate);

    let csv = 'MACHINICHI REGIONAL ANALYTICS\n';
    csv += `Generated,${new Date().toISOString()}\n\n`;
    csv += `OVERVIEW\n`;
    csv += `Total Revenue,₹${overview.totalRevenue.toLocaleString('en-IN')}\n`;
    csv += `Total Orders,${overview.totalOrders}\n`;
    csv += `Total Customers,${overview.totalCustomers}\n`;
    csv += `Active States,${overview.activeStates}\n`;
    csv += `Average Order Value,₹${overview.aov.toLocaleString('en-IN')}\n`;
    csv += `Repeat Customer Rate,${overview.repeatCustomerPct}%\n`;
    csv += `Cancellation Rate,${overview.cancellationRate}%\n`;
    csv += `Refund Rate,${overview.refundRate}%\n\n`;
    csv += `STATE,ORDERS,REVENUE,CUSTOMERS,MARKET SHARE\n`;
    for (const s of states) {
      csv += `"${s.name}",${s.totalOrders},₹${s.revenue.toLocaleString('en-IN')},${s.totalCustomers},${s.marketShare}%\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="regional-analytics-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};
