/**
 * AZZATUL BOUQUET — Vercel Serverless Function for Midtrans Core API QRIS
 * Handles:
 *   GET  /api/qris/config
 *   GET  /api/qris/image?url=...
 *   POST /api/qris/charge
 *   GET  /api/qris/status?order_id=...
 *   POST /api/qris/simulate-pay
 *   POST /api/qris/webhook
 */

const crypto = require('crypto');

const ALLOWED_IMAGE_HOSTS = new Set([
  'api.midtrans.com',
  'api.sandbox.midtrans.com',
  'simulator.sandbox.midtrans.com',
]);

const ALLOWED_SIM_HOSTS = new Set([
  'api.sandbox.midtrans.com',
  'simulator.sandbox.midtrans.com',
]);

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

const webhookStatusMap = new Map();

function getMidtransConfig() {
  const serverKey = String(process.env.MIDTRANS_SERVER_KEY || '').trim();
  const isProdRaw = String(process.env.MIDTRANS_IS_PRODUCTION || 'false').toLowerCase();
  const isProduction = isProdRaw === 'true' || isProdRaw === '1';
  const baseUrl = isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
  const authHeader = serverKey ? 'Basic ' + Buffer.from(serverKey + ':').toString('base64') : '';
  return {
    configured: Boolean(serverKey),
    serverKey,
    isProduction,
    mode: isProduction ? 'production' : 'sandbox',
    baseUrl,
    authHeader,
  };
}

function sendJson(res, status, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).end(JSON.stringify(data));
}

async function parseJsonResponse(fetchRes) {
  const raw = await fetchRes.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return { status_message: raw.slice(0, 200) };
  }
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return req.body;
}

module.exports = async function handler(req, res) {
  const urlObj = new URL(req.url || '/', 'https://azzatul-bouquet.vercel.app');
  const action = String((req.query && req.query.action) || urlObj.pathname.split('/').pop() || '').trim();
  const cfg = getMidtransConfig();

  // 1. GET /api/qris/config
  if (req.method === 'GET' && action === 'config') {
    return sendJson(res, 200, {
      configured: cfg.configured,
      mode: cfg.mode,
      simulatorUrl: cfg.isProduction ? '' : 'https://simulator.sandbox.midtrans.com/v2/qris/index',
    });
  }

  // 2. GET /api/qris/image?url=... (Hardened same-origin proxy for Midtrans QRIS PNG)
  if (req.method === 'GET' && action === 'image') {
    const targetUrl = String((req.query && req.query.url) || urlObj.searchParams.get('url') || '').trim();
    let parsed;
    try { parsed = new URL(targetUrl); } catch (e) { return sendJson(res, 400, { error: 'INVALID_URL' }); }
    if (parsed.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) {
      return sendJson(res, 403, { error: 'HOST_NOT_ALLOWED' });
    }
    try {
      const imgRes = await fetch(parsed.toString(), {
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
      });
      if (!imgRes.ok) return sendJson(res, 502, { error: 'IMAGE_FETCH_FAILED' });
      const rawCt = String(imgRes.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      let safeCt = rawCt;
      if (rawCt === 'application/octet-stream') safeCt = 'image/png';
      if (!ALLOWED_IMAGE_TYPES.has(safeCt)) return sendJson(res, 502, { error: 'INVALID_IMAGE_TYPE' });
      const buf = Buffer.from(await imgRes.arrayBuffer());
      if (buf.length > 2 * 1024 * 1024) return sendJson(res, 502, { error: 'IMAGE_TOO_LARGE' });
      res.setHeader('Content-Type', safeCt);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      return res.status(200).end(buf);
    } catch (e) {
      return sendJson(res, 502, { error: 'IMAGE_PROXY_ERROR' });
    }
  }

  // 3. POST /api/qris/charge
  if (req.method === 'POST' && action === 'charge') {
    if (!cfg.configured) {
      return sendJson(res, 400, {
        error: 'MIDTRANS_NOT_CONFIGURED',
        message: 'MIDTRANS_SERVER_KEY belum diisi di Environment Variables hosting.',
      });
    }
    const body = getBody(req);
    const orderId = String(body.orderId || '').trim();
    const rawAmt = Number(body.grossAmount);
    const grossAmount = Number.isFinite(rawAmt) ? Math.round(rawAmt) : 0;
    const customerName = String(body.customerName || 'Pelanggan Azzatul Bouquet').trim();
    const customerPhone = String(body.customerPhone || '').trim();
    const itemName = String(body.itemName || 'Buket Custom Azzatul Bouquet').slice(0, 48);

    if (!orderId || grossAmount < 1000) {
      return sendJson(res, 400, {
        error: 'INVALID_PARAMS',
        message: 'orderId dan grossAmount (minimal Rp 1.000) wajib diisi.',
      });
    }

    const midtransPayload = {
      payment_type: 'qris',
      transaction_details: { order_id: orderId, gross_amount: grossAmount },
      item_details: [{ id: orderId, price: grossAmount, quantity: 1, name: itemName }],
      customer_details: { first_name: customerName, phone: customerPhone },
      qris: { acquirer: 'gopay' },
    };

    try {
      const mtRes = await fetch(`${cfg.baseUrl}/v2/charge`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: cfg.authHeader,
        },
        body: JSON.stringify(midtransPayload),
        signal: AbortSignal.timeout(12000),
      });
      const mtData = await parseJsonResponse(mtRes);
      if (!mtRes.ok || (mtData.status_code && !['200', '201'].includes(String(mtData.status_code)))) {
        return sendJson(res, 502, {
          error: 'MIDTRANS_CHARGE_FAILED',
          status_code: mtData.status_code || mtRes.status,
          message: mtData.status_message || 'Gagal membuat transaksi QRIS di Midtrans.',
        });
      }
      const actions = Array.isArray(mtData.actions) ? mtData.actions : [];
      const qrAction = actions.find((a) => a.name === 'generate-qr-code') || actions.find((a) => a.name === 'generate-qr-code-v2');
      return sendJson(res, 200, {
        success: true,
        mode: cfg.mode,
        orderId: mtData.order_id || orderId,
        transactionId: mtData.transaction_id || '',
        transactionStatus: mtData.transaction_status || 'pending',
        grossAmount: Number(mtData.gross_amount || grossAmount),
        qrUrl: qrAction ? qrAction.url : '',
        qrString: mtData.qr_string || '',
        expiryTime: mtData.expiry_time || '',
        acquirer: mtData.acquirer || 'gopay',
        simulatorUrl: cfg.isProduction ? '' : 'https://simulator.sandbox.midtrans.com/v2/qris/index',
      });
    } catch (err) {
      return sendJson(res, 500, { error: 'NETWORK_ERROR', message: 'Tidak dapat terhubung ke Midtrans: ' + err.message });
    }
  }

  // 4. GET /api/qris/status?order_id=...
  if (req.method === 'GET' && action === 'status') {
    const orderId = String((req.query && req.query.order_id) || urlObj.searchParams.get('order_id') || '').trim();
    if (!orderId) return sendJson(res, 400, { error: 'MISSING_ORDER_ID', message: 'Parameter order_id wajib diisi.' });
    if (!cfg.configured) return sendJson(res, 400, { error: 'MIDTRANS_NOT_CONFIGURED', message: 'MIDTRANS_SERVER_KEY belum diisi.' });

    try {
      const mtRes = await fetch(`${cfg.baseUrl}/v2/${encodeURIComponent(orderId)}/status`, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: cfg.authHeader },
        signal: AbortSignal.timeout(10000),
      });
      const mtData = await parseJsonResponse(mtRes);
      const cached = webhookStatusMap.get(orderId);
      if ((!mtRes.ok || ['401', '404', '500'].includes(String(mtData.status_code || '')) || !mtData.transaction_status) && !cached) {
        const code = mtRes.status === 404 || String(mtData.status_code) === '404' ? 404 : 502;
        return sendJson(res, code, {
          error: 'MIDTRANS_STATUS_ERROR',
          status_code: mtData.status_code || mtRes.status,
          message: mtData.status_message || 'Transaksi belum ditemukan di Midtrans.',
        });
      }
      const status = mtData.transaction_status || cached || 'pending';
      return sendJson(res, 200, {
        success: true,
        mode: cfg.mode,
        orderId,
        transactionStatus: status,
        isPaid: status === 'settlement' || status === 'capture',
        isExpired: status === 'expire' || status === 'cancel' || status === 'deny',
        settlementTime: mtData.settlement_time || '',
        grossAmount: Number(mtData.gross_amount || 0),
        paymentType: mtData.payment_type || 'qris',
      });
    } catch (err) {
      return sendJson(res, 500, { error: 'NETWORK_ERROR', message: err.message });
    }
  }

  // 5. POST /api/qris/simulate-pay (Sandbox only)
  if (req.method === 'POST' && action === 'simulate-pay') {
    if (cfg.isProduction) return sendJson(res, 400, { error: 'SANDBOX_ONLY', message: 'Simulasi hanya tersedia di mode Sandbox.' });
    const body = getBody(req);
    const qrUrl = String(body.qrUrl || '').trim();
    let parsedQr;
    try { parsedQr = new URL(qrUrl); } catch (e) { return sendJson(res, 400, { error: 'MISSING_QR_URL' }); }
    if (parsedQr.protocol !== 'https:' || !ALLOWED_SIM_HOSTS.has(parsedQr.hostname)) {
      return sendJson(res, 403, { error: 'HOST_NOT_ALLOWED' });
    }
    try {
      const decodeHtml = (s) => String(s || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const s1 = await fetch('https://simulator.sandbox.midtrans.com/v2/qris/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ qrCodeUrl: qrUrl }).toString(),
        signal: AbortSignal.timeout(10000),
      }).then((r) => r.text());

      const act1 = (s1.match(/<form[^>]*action="([^"]+)"/) || [])[1];
      if (!act1) return sendJson(res, 502, { error: 'SIM_SCAN_FAILED', message: 'QR tidak terbaca simulator. Klik Perbarui QR dulu.' });
      const hidden = Object.fromEntries(
        [...s1.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g)].map(([_, k, v]) => [k, decodeHtml(v)])
      );
      const payEndpoint = act1.startsWith('http')
        ? act1
        : act1.startsWith('/')
        ? 'https://simulator.sandbox.midtrans.com' + act1
        : 'https://simulator.sandbox.midtrans.com/v2/qris/' + act1;
      const parsedPay = new URL(payEndpoint);
      if (parsedPay.protocol !== 'https:' || parsedPay.hostname !== 'simulator.sandbox.midtrans.com') {
        return sendJson(res, 403, { error: 'HOST_NOT_ALLOWED' });
      }
      const s2 = await fetch(parsedPay.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ ...hidden, issuer: 'gopay' }).toString(),
        signal: AbortSignal.timeout(10000),
      }).then((r) => r.text());

      const isSuccess = /Status\s*<\/[^>]+>\s*<[^>]+>\s*PAID|Status[\s\S]{0,60}PAID/i.test(s2);
      return sendJson(res, 200, { success: isSuccess });
    } catch (err) {
      return sendJson(res, 500, { error: 'SIM_ERROR', message: err.message });
    }
  }

  // 6. POST /api/qris/webhook (Mandatory SHA-512 signature check)
  if (req.method === 'POST' && action === 'webhook') {
    if (!cfg.configured) return sendJson(res, 403, { error: 'MIDTRANS_NOT_CONFIGURED' });
    const body = getBody(req);
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;
    if (!order_id || !status_code || !gross_amount || !signature_key || !transaction_status) {
      return sendJson(res, 400, { error: 'MISSING_FIELDS' });
    }
    const expected = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${cfg.serverKey}`)
      .digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(signature_key), 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return sendJson(res, 403, { error: 'INVALID_SIGNATURE' });
    }
    if (webhookStatusMap.size >= 500) {
      webhookStatusMap.delete(webhookStatusMap.keys().next().value);
    }
    webhookStatusMap.set(String(order_id), String(transaction_status));
    return sendJson(res, 200, { received: true });
  }

  return sendJson(res, 404, { error: 'API_NOT_FOUND' });
};
