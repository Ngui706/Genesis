import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { registerCustomer, createStaffAccount, changePassword, getMe } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', registerCustomer);
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);
router.post('/staff', requireAuth, requireRole('admin'), createStaffAccount);

export default router;
