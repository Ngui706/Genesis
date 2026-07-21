const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sends transactional email via the Brevo (formerly Sendinblue) HTTP API.
 * Uses the runtime's native fetch — no extra HTTP client dependency needed.
 * Requires BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME in the environment.
 */
export async function sendMail({ to, subject, html }) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn('[mailer] BREVO_API_KEY not set — skipping send to', to);
      return;
    }

    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'Genesis Coaches',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Brevo API responded ${res.status}: ${body}`);
    }
  } catch (err) {
    // Don't let email failures break a booking — log and move on.
    console.error('[mailer] failed to send:', err.message);
  }
}

export function bookingConfirmationEmail({ name, reference, route, departureTime, seats, total }) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#0B0F1A;padding:32px;color:#F7F4EC">
    <h1 style="color:#F2A93B;margin:0 0 4px">Genesis Coaches</h1>
    <p style="color:#9AA3B2;margin:0 0 24px">Beyond your Imagination</p>
    <h2 style="color:#F7F4EC">Booking Confirmed</h2>
    <p>Hi ${name}, your booking <strong>${reference}</strong> is confirmed.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <tr><td style="padding:8px 0;color:#9AA3B2">Route</td><td style="padding:8px 0">${route}</td></tr>
      <tr><td style="padding:8px 0;color:#9AA3B2">Departure</td><td style="padding:8px 0">${departureTime}</td></tr>
      <tr><td style="padding:8px 0;color:#9AA3B2">Seats</td><td style="padding:8px 0">${seats}</td></tr>
      <tr><td style="padding:8px 0;color:#9AA3B2">Total Paid</td><td style="padding:8px 0">${total}</td></tr>
    </table>
    <p style="margin-top:24px">Your e-ticket with QR code is attached / available in your dashboard.</p>
  </div>`;
}

export function staffWelcomeEmail({ name, email, tempPassword, loginUrl }) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#0B0F1A;padding:32px;color:#F7F4EC">
    <h1 style="color:#F2A93B;margin:0 0 4px">Genesis Coaches</h1>
    <p style="color:#9AA3B2;margin:0 0 24px">Staff account created</p>
    <p>Hi ${name}, an account was created for you.</p>
    <p><strong>Email:</strong> ${email}<br/><strong>Temporary password:</strong> ${tempPassword}</p>
    <p>You'll be required to set a new password on first login.</p>
    <a href="${loginUrl}" style="display:inline-block;margin-top:16px;background:#F2A93B;color:#0B0F1A;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Log in</a>
  </div>`;
}
