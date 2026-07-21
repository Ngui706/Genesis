import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  lockSeat,
  releaseSeat,
  createBooking,
  myBookings,
  cancelBooking,
  getBookingById,
  downloadTicketPdf,
  getBookingPaymentStatus,
  simulatePayment,
  mpesaCallback
} from '../controllers/booking.controller.js';

const router = Router();

// Seat locking can happen pre-auth (guest browsing) so it's public; booking itself requires auth.
router.post('/seats/lock', lockSeat);
router.post('/seats/release', releaseSeat);

router.post('/bookings', requireAuth, createBooking);
router.get('/bookings/me', requireAuth, myBookings);
router.get('/bookings/:id', requireAuth, getBookingById);
router.get('/bookings/:id/ticket.pdf', requireAuth, downloadTicketPdf);
router.post('/bookings/:id/cancel', requireAuth, cancelBooking);

// M-Pesa integration routes
router.get('/bookings/:id/payment-status', requireAuth, getBookingPaymentStatus);
router.post('/bookings/:id/simulate-payment', requireAuth, simulatePayment);
router.post('/payments/mpesa-callback', mpesaCallback);

export default router;
