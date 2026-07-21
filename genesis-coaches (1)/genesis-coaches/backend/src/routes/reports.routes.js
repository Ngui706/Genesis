import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { revenueReport, occupancyReport, routePerformanceReport, dashboardSummary } from '../controllers/reports.controller.js';

const router = Router();
router.use(requireAuth, requireRole('staff', 'admin'));

router.get('/dashboard-summary', dashboardSummary);
router.get('/revenue', revenueReport);
router.get('/occupancy', occupancyReport);
router.get('/route-performance', routePerformanceReport);

export default router;
