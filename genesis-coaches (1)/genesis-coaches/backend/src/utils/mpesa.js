import dotenv from 'dotenv';
dotenv.config();

const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || '';
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || '';
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '174379';
const MPESA_PASSKEY = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'http://localhost:4000/api/payments/mpesa-callback';

const IS_MOCK = !MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET;

/** Generates OAuth Access Token from Safaricom */
async function getMpesaToken() {
  if (IS_MOCK) return null;
  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
  try {
    const res = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw new Error('Failed to fetch M-Pesa token');
    const data = await res.json();
    return data.access_token;
  } catch (err) {
    console.error('[mpesa] OAuth Error:', err.message);
    throw err;
  }
}

/** Format phone number to 254XXXXXXXXX format */
export function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
}

/** Initiates Lipa Na M-Pesa Online STK Push */
export async function initiateStkPush({ amount, phone, reference, description }) {
  const formattedPhone = formatPhoneNumber(phone);
  
  const isInvalidCallback = !MPESA_CALLBACK_URL.startsWith('https://') || 
                            MPESA_CALLBACK_URL.includes('localhost') || 
                            MPESA_CALLBACK_URL.includes('127.0.0.1');

  if (IS_MOCK || isInvalidCallback) {
    if (isInvalidCallback && !IS_MOCK) {
      console.warn(`[mpesa] WARNING: Safaricom Daraja API requires a public HTTPS Callback URL. ` +
                   `Detected: "${MPESA_CALLBACK_URL}". Falling back to simulated mock payment mode.`);
    }
    // Return a mocked STK Push response
    const mockCheckoutRequestId = `ws_CO_${Date.now()}`;
    console.log(`[mpesa] Mock STK Push initiated for ${formattedPhone} of KES ${amount}. Request ID: ${mockCheckoutRequestId}`);
    return {
      success: true,
      mock: true,
      MerchantRequestID: `mock_merch_${Date.now()}`,
      CheckoutRequestID: mockCheckoutRequestId,
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing',
      CustomerMessage: 'Single-stage mock STK Push initiated successfully.',
    };
  }

  try {
    const token = await getMpesaToken();
    const date = new Date();
    const timestamp = date.getFullYear() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0') +
      String(date.getHours()).padStart(2, '0') +
      String(date.getMinutes()).padStart(2, '0') +
      String(date.getSeconds()).padStart(2, '0');

    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

    const payload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: reference.substring(0, 12),
      TransactionDesc: description || 'Bus Ticket',
    };

    const res = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.ResponseCode !== '0') {
      throw new Error(data.errorMessage || data.ResponseDescription || 'STK Push failed');
    }

    return {
      success: true,
      mock: false,
      MerchantRequestID: data.MerchantRequestID,
      CheckoutRequestID: data.CheckoutRequestID,
      ResponseCode: data.ResponseCode,
      ResponseDescription: data.ResponseDescription,
      CustomerMessage: data.CustomerMessage,
    };
  } catch (err) {
    console.error('[mpesa] STK Push Error:', err.message);
    throw err;
  }
}
