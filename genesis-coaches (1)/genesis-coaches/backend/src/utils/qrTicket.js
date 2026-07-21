import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

/** Human-readable booking reference, e.g. GC-7F3KQ2AB */
export function generateBookingReference() {
  return `GC-${nanoid()}`;
}

/**
 * The QR code does NOT embed raw passenger data. It embeds a signed token
 * (ticket_code) that a conductor's scan app / verify endpoint exchanges for
 * live booking details from the database. This means: revoked/cancelled
 * tickets stop working immediately, and no PII sits inside the QR image itself.
 */
export function signTicketPayload({ ticketCode, bookingId }) {
  return jwt.sign({ tc: ticketCode, bid: bookingId }, process.env.TICKET_SIGNING_SECRET, {
    expiresIn: '180d',
  });
}

export function verifyTicketPayload(token) {
  return jwt.verify(token, process.env.TICKET_SIGNING_SECRET);
}

/** Renders the signed payload as a QR code PNG data URL for embedding in the e-ticket PDF/UI. */
export async function renderQrDataUrl(signedPayload) {
  return QRCode.toDataURL(signedPayload, { errorCorrectionLevel: 'M', margin: 1, width: 320 });
}
