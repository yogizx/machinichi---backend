import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import {
  createProduct, updateProduct, deleteProduct, getAdminProducts, getAdminProductById,
  bulkUpdateStock, getInventoryLogs, getInventoryOverview, updateInventory,
  listProduct, unlistProduct, updateListing,
} from '../controllers/admin/product.controller';
import { generateAIContent } from '../controllers/admin/ai.controller';
import {
  createSupplier, getSuppliers, getSupplierById, updateSupplier, deleteSupplier,
  addSupplierToProduct, removeSupplierFromProduct, addPurchaseRecord, getPurchaseHistory,
} from '../controllers/admin/supplier.controller';
import { getDashboardStats, getRevenueAnalytics, getTopProducts, getOrderStats, getUserAnalytics, getCategoryDistribution, getProductUsers, getAnalyticsPageData, exportAnalyticsReport, getLiveFeedStats, saveReportConfig, getReportConfig, saveAnalyticsSettings, getAnalyticsSettings } from '../controllers/admin/analytics.controller';
import { getTasks, createTask, updateTaskStatus, deleteTask } from '../controllers/admin/task.controller';
import { getAdminCustomers, createAdminCustomer } from '../controllers/admin/customer.controller';
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

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const validateObjectId = (paramName: string) => (req: Request, res: Response, next: NextFunction) => {
  const rawValue = req.params[paramName];
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!value || !Types.ObjectId.isValid(value) || !objectIdPattern.test(value)) {
    return res.status(400).json({ success: false, message: `Invalid ${paramName} format. Must be a 24-character hex string.` });
  }
  req.params[paramName] = value;
  next();
};

router.use(authMiddleware, adminMiddleware);

router.get('/dashboard', getDashboardStats);
router.get('/revenue', getRevenueAnalytics);
router.get('/top-products', getTopProducts);
router.get('/orders', getOrderStats);
router.get('/users', getUserAnalytics);
router.get('/categories', getCategoryDistribution);

// Step 1 — catalog (create/edit product info; never touches publish state)
router.get('/products', getAdminProducts);
router.get('/products/:id', validateObjectId('id'), getAdminProductById);
router.get('/products/:id/users', validateObjectId('id'), getProductUsers);
router.post('/products', createProduct);
router.put('/products/:id', validateObjectId('id'), updateProduct);
router.delete('/products/:id', validateObjectId('id'), deleteProduct);

// Step 2 — inventory (separate screen/workflow from listing)
router.get('/inventory', getInventoryOverview);
router.patch('/products/:id/inventory', validateObjectId('id'), updateInventory);
router.post('/products/bulk-stock', bulkUpdateStock);
router.get('/products/:productId/inventory-logs', validateObjectId('productId'), getInventoryLogs);

// Step 3 & 5 — listing / publish ("Add Product to Store")
router.post('/products/:id/list', validateObjectId('id'), listProduct);
router.post('/products/:id/unlist', validateObjectId('id'), unlistProduct);
router.patch('/products/:id/listing', validateObjectId('id'), updateListing);

// Supplier management routes
router.get('/suppliers', getSuppliers);
router.get('/suppliers/:id', validateObjectId('id'), getSupplierById);
router.post('/suppliers', createSupplier);
router.put('/suppliers/:id', validateObjectId('id'), updateSupplier);
router.delete('/suppliers/:id', validateObjectId('id'), deleteSupplier);

// Product ↔ Supplier linking
router.post('/products/:id/suppliers', validateObjectId('id'), addSupplierToProduct);
router.delete('/products/:id/suppliers/:supplierId', validateObjectId('id'), validateObjectId('supplierId'), removeSupplierFromProduct);

// Purchase history
router.get('/products/:productId/purchase-history', validateObjectId('productId'), getPurchaseHistory);
router.post('/products/:id/purchase-history', validateObjectId('id'), addPurchaseRecord);

// Customers management routes
router.get('/customers', getAdminCustomers);
router.post('/customers', createAdminCustomer);

// AI content generation
router.post('/ai/generate', generateAIContent);

// Tasks management routes
router.get('/tasks', getTasks);
router.post('/tasks', createTask);
router.put('/tasks/:id', validateObjectId('id'), updateTaskStatus);
router.delete('/tasks/:id', validateObjectId('id'), deleteTask);

// Analytics dashboard page routes
router.get('/analytics-page', getAnalyticsPageData);
router.post('/analytics-page/export', exportAnalyticsReport);
router.get('/analytics-page/live-feed', getLiveFeedStats);
router.post('/analytics-page/report-config', saveReportConfig);
router.get('/analytics-page/report-config', getReportConfig);
router.post('/analytics-page/settings', saveAnalyticsSettings);
router.get('/analytics-page/settings', getAnalyticsSettings);

// Regional analytics routes — state-wise breakdown driven entirely by MongoDB
// NOTE: auth + adminMiddleware already applied via router.use() above
router.get('/regional/overview', getRegionalOverview);
router.get('/regional/states/top', getTopStates);
router.get('/regional/states/bottom', getBottomStates);
router.get('/regional/states/aov', getStateAOV);
router.get('/regional/states/repeat-rates', getStateRepeatRates);
router.get('/regional/states', getStatesList);
router.get('/regional/states/:stateName/trends', getStateMonthlyTrends);
router.get('/regional/states/:stateName/growth', getStateGrowth);
router.get('/regional/states/:stateName', getStateDetail);
router.get('/regional/export/csv', exportRegionalCSV);

export default router;
