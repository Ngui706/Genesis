import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { verifyTicket, getManifest } from '../controllers/ticket.controller.js';

const router = Router();

router.post('/tickets/verify', requireAuth, requireRole('staff', 'admin'), verifyTicket);
router.get('/schedules/:id/manifest', requireAuth, requireRole('staff', 'admin'), getManifest);

export default router;
