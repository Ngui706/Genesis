import { Router } from 'express';
import { listRoutes, searchSchedules, getScheduleDetail, getPopularRoutes, getFeaturedBranches } from '../controllers/catalog.controller.js';

const router = Router();

router.get('/routes', listRoutes);
router.get('/schedules/search', searchSchedules);
router.get('/schedules/:id', getScheduleDetail);
router.get('/popular-routes', getPopularRoutes);
router.get('/featured-branches', getFeaturedBranches);

export default router;
