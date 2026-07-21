import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as admin from '../controllers/admin.controller.js';

const router = Router();
router.use(requireAuth);

// Branches — staff can create/view own, admin manages all
router.get('/branches', requireRole('staff', 'admin'), admin.listBranches);
router.post('/branches', requireRole('staff', 'admin'), admin.createBranch);
router.put('/branches/:id', requireRole('staff', 'admin'), admin.updateBranch);
router.delete('/branches/:id', requireRole('admin'), admin.deleteBranch);

// Buses — staff can create/view for their branch, admin unrestricted
router.get('/buses', requireRole('staff', 'admin'), admin.listBuses);
router.post('/buses', requireRole('staff', 'admin'), admin.createBus);
router.put('/buses/:id', requireRole('staff', 'admin'), admin.updateBus);
router.delete('/buses/:id', requireRole('admin'), admin.deleteBus);

// Routes (origin/destination catalog) — staff can create, admin manages
router.get('/routes-admin', requireRole('staff', 'admin'), admin.listAllRoutes);
router.post('/routes-admin', requireRole('staff', 'admin'), admin.createRoute);
router.put('/routes-admin/:id', requireRole('admin'), admin.updateRoute);
router.delete('/routes-admin/:id', requireRole('admin'), admin.deleteRoute);

// Schedules — staff can create/update for their branch, admin unrestricted
router.get('/schedules-admin', requireRole('staff', 'admin'), admin.listAllSchedules);
router.post('/schedules-admin', requireRole('staff', 'admin'), admin.createSchedule);
router.put('/schedules-admin/:id', requireRole('staff', 'admin'), admin.updateSchedule);
router.delete('/schedules-admin/:id', requireRole('admin'), admin.deleteSchedule);

// Staff management — admin only
router.get('/staff', requireRole('admin'), admin.listStaff);
router.put('/staff/:id', requireRole('admin'), admin.updateStaff);
router.delete('/staff/:id', requireRole('admin'), admin.deleteStaff);

// Customer / user management — staff (scoped) + admin
router.get('/customers', requireRole('staff', 'admin'), admin.listCustomers);
router.put('/customers/:id/active', requireRole('admin'), admin.setUserActive);

// Promo codes — staff can create/manage for their branch, admin unrestricted
router.get('/promo-codes', requireRole('staff', 'admin'), admin.listPromoCodes);
router.post('/promo-codes', requireRole('staff', 'admin'), admin.createPromoCode);
router.put('/promo-codes/:id', requireRole('staff', 'admin'), admin.updatePromoCode);
router.delete('/promo-codes/:id', requireRole('staff', 'admin'), admin.deletePromoCode);

// Cancellation policies — admin only
router.get('/policies', requireRole('staff', 'admin'), admin.listPolicies);
router.post('/policies', requireRole('admin'), admin.createPolicy);
router.put('/policies/:id', requireRole('admin'), admin.updatePolicy);
router.delete('/policies/:id', requireRole('admin'), admin.deletePolicy);

// System settings — admin only
router.get('/settings', requireRole('staff', 'admin'), admin.listSettings);
router.put('/settings/:key', requireRole('admin'), admin.updateSetting);

// Audit logs — admin only
router.get('/audit-logs', requireRole('admin'), admin.listAuditLogs);

// Refunds queue — staff/admin
router.get('/refunds', requireRole('staff', 'admin'), admin.listRefunds);
router.put('/refunds/:id', requireRole('staff', 'admin'), admin.updateRefundStatus);

// Popular Routes — public read, admin write
router.get('/popular-routes', requireRole('staff', 'admin'), admin.listPopularRoutes);
router.post('/popular-routes', requireRole('admin'), admin.createPopularRoute);
router.put('/popular-routes/:id', requireRole('admin'), admin.updatePopularRoute);
router.delete('/popular-routes/:id', requireRole('admin'), admin.deletePopularRoute);

// Featured Branches — public read, admin write
router.get('/featured-branches', requireRole('staff', 'admin'), admin.listFeaturedBranches);
router.post('/featured-branches', requireRole('admin'), admin.createFeaturedBranch);
router.put('/featured-branches/:id', requireRole('admin'), admin.updateFeaturedBranch);
router.delete('/featured-branches/:id', requireRole('admin'), admin.deleteFeaturedBranch);

// Branch Updates — staff submit, admin approves
router.get('/branch-updates', requireRole('staff', 'admin'), admin.listBranchUpdates);
router.post('/branch-updates', requireRole('staff', 'admin'), admin.createBranchUpdate);
router.put('/branch-updates/:id', requireRole('staff', 'admin'), admin.updateBranchUpdate);
router.delete('/branch-updates/:id', requireRole('staff', 'admin'), admin.deleteBranchUpdate);

export default router;
