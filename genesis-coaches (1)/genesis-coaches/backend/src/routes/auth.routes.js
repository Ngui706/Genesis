import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { registerCustomer, createStaffAccount, changePassword, getMe, verifyEmail, resendVerification } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', registerCustomer);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);
router.post('/staff', requireAuth, requireRole('admin'), createStaffAccount);

export default router;
