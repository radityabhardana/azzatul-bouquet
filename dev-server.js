/**
 * AZZATUL BOUQUET — Local Dev Server + Midtrans Core API QRIS Backend Proxy
 * Zero-dependency (menggunakan built-in Node.js >= 18: http, fs, path, crypto, fetch)
 * Jalankan dengan perintah: npm run dev
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = __dirname;
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const BASE_PORT = Number(process.env.PORT) || 3000;
const MAX_JSON_BODY_BYTES = 1024 * 1024; // 1 MB
const MAX_IMAGE_PROXY_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_WEBHOOK_CACHE_ENTRIES = 500;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

// Explicit public allowlist for root routes & clean URL aliases
const ALLOWED_ROOT_ROUTES = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/customize', 'customize.html'],
  ['/customize.html', 'customize.html'],
  ['/checkout', 'checkout.html'],
  ['/checkout.html', 'checkout.html'],
  ['/admin', 'admin.html'],
  ['/admin.html', 'admin.html'],
  ['/styles.css', 'styles.css'],
  ['/data.js', 'data.js'],
  ['/core.js', 'core.js'],
  ['/admin.js', 'admin.js'],
]);

const ALLOWED_ASSET_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico']);

const ALLOWED_QRIS_IMAGE_HOSTS = new Set([
  'api.midtrans.com',
  'api.sandbox.midtrans.com',
  'simulator.sandbox.midtrans.com',
]);

const ALLOWED_QRIS_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

const ALLOWED_SANDBOX_QR_HOSTS = new Set([
  'api.sandbox.midtrans.com',
  'simulator.sandbox.midtrans.com',
]);

// Bounded in-memory verified webhook status cache
const webhookStatusMap = new Map();

function setVerifiedWebhookStatus(orderId, status) {
  if (webhookStatusMap.has(orderId)) {
    webhookStatusMap.delete(orderId);
  } else if (webhookStatusMap.size >= MAX_WEBHOOK_CACHE_ENTRIES) {
    const oldestKey = webhookStatusMap.keys().next().value;
    if (oldestKey !== undefined) {
      webhookStatusMap.delete(oldestKey);
    }
  }
  webhookStatusMap.set(orderId, status);
}

/**
 * Reads .env dynamically on every request so changes to MIDTRANS_SERVER_KEY
 * or MIDTRANS_IS_PRODUCTION take effect immediately without restarting.
 * Values in .env take priority over stale process.env variables.
 */
function loadMidtransConfig() {
  const envVars = {};
  const envPath = path.join(ROOT_DIR, '.env');
  try {
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
          (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
        ) {
          val = val.slice(1, -1);
        } else if (val.startsWith('#')) {
          val = '';
        } else {
          val = val.split(/\s+#/)[0].trim();
        }
        envVars[key] = val;
      }
    }
  } catch (e) {}

  const serverKey = (envVars.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY || '').trim();
  const isProdRaw = String(envVars.MIDTRANS_IS_PRODUCTION || process.env.MIDTRANS_IS_PRODUCTION || 'false')
    .trim()
    .toLowerCase();
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

function sendJson(res, statusCode, payload) {
  if (res.headersSent) return;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  if (statusCode === 413) {
    headers.Connection = 'close';
  }
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(payload));
}

function sendPlain(res, statusCode, text) {
  if (res.headersSent) return;
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(text);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;

    const declaredLen = Number(req.headers['content-length'] || 0);
    if (Number.isFinite(declaredLen) && declaredLen > MAX_JSON_BODY_BYTES) {
      settled = true;
      req.pause();
      const err = new Error('Payload terlalu besar (maksimal 1 MB).');
      err.statusCode = 413;
      reject(err);
      setTimeout(() => req.destroy(), 50).unref();
      return;
    }

    req.on('data', (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > MAX_JSON_BODY_BYTES) {
        settled = true;
        req.pause();
        const err = new Error('Payload terlalu besar (maksimal 1 MB).');
        err.statusCode = 413;
        reject(err);
        setTimeout(() => req.destroy(), 50).unref();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (settled) return;
      settled = true;
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        const parsed = text ? JSON.parse(text) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          const err = new Error('Format JSON harus berupa objek.');
          err.statusCode = 400;
          reject(err);
          return;
        }
        resolve(parsed);
      } catch (e) {
        const err = new Error('Format JSON tidak valid.');
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      err.statusCode = err.statusCode || 400;
      reject(err);
    });
  });
}

async function readResponseBufferWithLimit(response, maxBytes) {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    if (response.body && typeof response.body.cancel === 'function') {
      await response.body.cancel().catch(() => {});
    }
    const err = new Error('Ukuran respons melebihi batas maksimum.');
    err.code = 'RESPONSE_TOO_LARGE';
    throw err;
  }

  if (!response.body) {
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length > maxBytes) {
      const err = new Error('Ukuran respons melebihi batas maksimum.');
      err.code = 'RESPONSE_TOO_LARGE';
      throw err;
    }
    return buf;
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of response.body) {
    const bufChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bufChunk.length;
    if (total > maxBytes) {
      if (typeof response.body.cancel === 'function') {
        await response.body.cancel().catch(() => {});
      }
      const err = new Error('Ukuran respons melebihi batas maksimum.');
      err.code = 'RESPONSE_TOO_LARGE';
      throw err;
    }
    chunks.push(bufChunk);
  }
  return Buffer.concat(chunks, total);
}

async function fetchSimulatorSafe(urlStr, options = {}, maxRedirects = 3) {
  let currentUrl = new URL(urlStr);
  let currentOpts = { ...options };

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (
      currentUrl.protocol !== 'https:' ||
      currentUrl.hostname !== 'simulator.sandbox.midtrans.com' ||
      currentUrl.port !== '' ||
      currentUrl.username !== '' ||
      currentUrl.password !== ''
    ) {
      const err = new Error('Host simulator tidak diizinkan.');
      err.statusCode = 403;
      throw err;
    }

    const res = await fetch(currentUrl.href, {
      ...currentOpts,
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc || hop === maxRedirects) {
        return res;
      }
      currentUrl = new URL(loc, currentUrl.href);
      if (res.status === 301 || res.status === 302 || res.status === 303) {
        currentOpts = { method: 'GET', headers: {} };
      }
      continue;
    }

    return res;
  }

  throw new Error('Terlalu banyak pengalihan pada simulator.');
}

function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

async function handleQrisApi(req, res, urlObj) {
  const pathname = urlObj.pathname;
  const cfg = loadMidtransConfig();
  const simulatorUrl = cfg.isProduction ? '' : 'https://simulator.sandbox.midtrans.com/v2/qris/index';

  // 0. GET /api/qris/image?url=... — Strictly validated Midtrans QRIS image proxy
  if (req.method === 'GET' && pathname === '/api/qris/image') {
    const targetUrl = (urlObj.searchParams.get('url') || '').trim();
    if (!targetUrl) {
      return sendJson(res, 400, { error: 'INVALID_URL' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (e) {
      return sendJson(res, 403, { error: 'INVALID_URL' });
    }

    if (
      parsedUrl.protocol !== 'https:' ||
      !ALLOWED_QRIS_IMAGE_HOSTS.has(parsedUrl.hostname) ||
      parsedUrl.port !== '' ||
      parsedUrl.username !== '' ||
      parsedUrl.password !== ''
    ) {
      return sendJson(res, 403, { error: 'FORBIDDEN_IMAGE_HOST' });
    }

    try {
      const imgRes = await fetch(parsedUrl.href, {
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
      });
      if (!imgRes.ok) {
        return sendJson(res, 502, { error: 'IMAGE_FETCH_FAILED' });
      }

      const rawCt = (imgRes.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      let safeContentType = '';
      if (ALLOWED_QRIS_IMAGE_MIMES.has(rawCt)) {
        safeContentType = rawCt;
      } else if (rawCt === 'application/octet-stream') {
        safeContentType = 'image/png';
      } else {
        if (imgRes.body && typeof imgRes.body.cancel === 'function') {
          await imgRes.body.cancel().catch(() => {});
        }
        return sendJson(res, 502, { error: 'INVALID_IMAGE_CONTENT_TYPE' });
      }

      const buf = await readResponseBufferWithLimit(imgRes, MAX_IMAGE_PROXY_BYTES);
      res.writeHead(200, {
        'Content-Type': safeContentType,
        'Content-Length': buf.length,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
      });
      res.end(buf);
      return;
    } catch (e) {
      return sendJson(res, 502, { error: 'IMAGE_PROXY_ERROR' });
    }
  }

  // 1. GET /api/qris/config
  if (req.method === 'GET' && pathname === '/api/qris/config') {
    return sendJson(res, 200, {
      configured: cfg.configured,
      mode: cfg.mode,
      simulatorUrl,
    });
  }

  // 2. POST /api/qris/charge — Create Midtrans Core API QRIS transaction
  if (req.method === 'POST' && pathname === '/api/qris/charge') {
    if (!cfg.configured) {
      return sendJson(res, 400, {
        error: 'MIDTRANS_NOT_CONFIGURED',
        message: 'MIDTRANS_SERVER_KEY belum diisi di file .env. Masukkan Server Key Sandbox/Production dari Dashboard Midtrans.',
      });
    }

    let body;
    try {
      body = await readRequestBody(req);
    } catch (e) {
      return sendJson(res, e.statusCode || 400, { error: 'INVALID_BODY', message: e.message });
    }

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
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: orderId,
          price: grossAmount,
          quantity: 1,
          name: itemName,
        },
      ],
      customer_details: {
        first_name: customerName,
        phone: customerPhone,
      },
      qris: {
        acquirer: 'gopay',
      },
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
        signal: AbortSignal.timeout(15000),
      });

      const rawText = await mtRes.text();
      let mtData = {};
      try {
        mtData = rawText ? JSON.parse(rawText) : {};
      } catch {}

      if (!mtRes.ok || !['200', '201'].includes(String(mtData.status_code || ''))) {
        return sendJson(res, 502, {
          error: 'MIDTRANS_CHARGE_FAILED',
          status_code: mtData.status_code || mtRes.status,
          message: mtData.status_message || 'Gagal membuat transaksi QRIS di Midtrans.',
          details: mtData,
        });
      }

      const actions = Array.isArray(mtData.actions) ? mtData.actions : [];
      const qrAction =
        actions.find((a) => a && a.name === 'generate-qr-code') ||
        actions.find((a) => a && a.name === 'generate-qr-code-v2');

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
        simulatorUrl,
      });
    } catch (err) {
      return sendJson(res, 502, {
        error: 'NETWORK_ERROR',
        message: 'Tidak dapat terhubung ke server Midtrans: ' + err.message,
      });
    }
  }

  // 3. GET /api/qris/status?order_id=... — Poll live transaction status from Midtrans
  if (req.method === 'GET' && pathname === '/api/qris/status') {
    const orderId = (urlObj.searchParams.get('order_id') || '').trim();
    if (!orderId) {
      return sendJson(res, 400, { error: 'MISSING_ORDER_ID', message: 'Parameter order_id wajib diisi.' });
    }
    if (!cfg.configured) {
      return sendJson(res, 400, { error: 'MIDTRANS_NOT_CONFIGURED', message: 'MIDTRANS_SERVER_KEY belum diisi.' });
    }

    try {
      const mtRes = await fetch(`${cfg.baseUrl}/v2/${encodeURIComponent(orderId)}/status`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: cfg.authHeader,
        },
        signal: AbortSignal.timeout(10000),
      });

      const rawText = await mtRes.text();
      let mtData = {};
      try {
        mtData = rawText ? JSON.parse(rawText) : {};
      } catch {}

      const hasVerifiedWebhook = webhookStatusMap.has(orderId);
      const statusCodeStr = String(mtData.status_code || '');

      if (
        !hasVerifiedWebhook &&
        (!mtRes.ok || ['401', '404', '500'].includes(statusCodeStr) || !mtData.transaction_status)
      ) {
        const httpStatus = mtRes.status === 404 || statusCodeStr === '404' ? 404 : 502;
        return sendJson(res, httpStatus, {
          error: 'MIDTRANS_STATUS_ERROR',
          status_code: mtData.status_code || mtRes.status,
          message: mtData.status_message || 'Transaksi belum ditemukan di Midtrans.',
        });
      }

      const webhookStatus = webhookStatusMap.get(orderId) || '';
      const apiStatus =
        mtRes.ok && !['401', '404', '500'].includes(statusCodeStr) && mtData.transaction_status
          ? String(mtData.transaction_status)
          : '';
      const status =
        webhookStatus === 'settlement' || webhookStatus === 'capture'
          ? webhookStatus
          : apiStatus || webhookStatus;

      const isPaid = status === 'settlement' || status === 'capture';
      const isExpired = status === 'expire' || status === 'cancel' || status === 'deny';

      return sendJson(res, 200, {
        success: true,
        mode: cfg.mode,
        orderId,
        transactionStatus: status,
        isPaid,
        isExpired,
        settlementTime: mtData.settlement_time || '',
        grossAmount: Number(mtData.gross_amount || 0),
        paymentType: mtData.payment_type || 'qris',
      });
    } catch (err) {
      if (webhookStatusMap.has(orderId)) {
        const status = webhookStatusMap.get(orderId);
        return sendJson(res, 200, {
          success: true,
          mode: cfg.mode,
          orderId,
          transactionStatus: status,
          isPaid: status === 'settlement' || status === 'capture',
          isExpired: status === 'expire' || status === 'cancel' || status === 'deny',
          settlementTime: '',
          grossAmount: 0,
          paymentType: 'qris',
        });
      }
      return sendJson(res, 502, { error: 'NETWORK_ERROR', message: err.message });
    }
  }

  // 3b. POST /api/qris/simulate-pay — Trigger Midtrans v2 Sandbox QRIS payment in 1 click (Sandbox only)
  if (req.method === 'POST' && pathname === '/api/qris/simulate-pay') {
    if (cfg.isProduction) {
      return sendJson(res, 400, { error: 'SANDBOX_ONLY', message: 'Simulasi hanya tersedia di mode Sandbox.' });
    }

    let body;
    try {
      body = await readRequestBody(req);
    } catch (e) {
      return sendJson(res, e.statusCode || 400, { error: 'INVALID_BODY', message: e.message });
    }

    const qrUrl = String(body.qrUrl || '').trim();
    if (!qrUrl) {
      return sendJson(res, 400, { error: 'MISSING_QR_URL', message: 'qrUrl wajib diisi.' });
    }

    let parsedQrUrl;
    try {
      parsedQrUrl = new URL(qrUrl);
    } catch (e) {
      return sendJson(res, 403, { error: 'INVALID_QR_URL', message: 'URL QRIS tidak valid.' });
    }

    if (
      parsedQrUrl.protocol !== 'https:' ||
      !ALLOWED_SANDBOX_QR_HOSTS.has(parsedQrUrl.hostname) ||
      parsedQrUrl.port !== '' ||
      parsedQrUrl.username !== '' ||
      parsedQrUrl.password !== ''
    ) {
      return sendJson(res, 403, { error: 'FORBIDDEN_QR_URL', message: 'Host URL QRIS tidak diizinkan.' });
    }

    try {
      const decodeHtml = (s) => String(s || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const s1Res = await fetchSimulatorSafe('https://simulator.sandbox.midtrans.com/v2/qris/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ qrCodeUrl: parsedQrUrl.href }).toString(),
      });
      const s1 = await s1Res.text();

      const act1 = (s1.match(/<form[^>]*action="([^"]+)"/) || [])[1];
      if (!act1) {
        return sendJson(res, 502, {
          error: 'SIM_SCAN_FAILED',
          message: 'QR tidak dapat dibaca simulator atau sudah kedaluwarsa. Klik Perbarui QR dulu.',
        });
      }

      const hidden = Object.fromEntries(
        [...s1.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g)].map(([_, k, v]) => [k, decodeHtml(v)])
      );

      let parsedPayEndpoint;
      try {
        parsedPayEndpoint = new URL(decodeHtml(act1), 'https://simulator.sandbox.midtrans.com/v2/qris/');
      } catch (e) {
        return sendJson(res, 502, { error: 'INVALID_SIM_ENDPOINT' });
      }

      if (
        parsedPayEndpoint.protocol !== 'https:' ||
        parsedPayEndpoint.hostname !== 'simulator.sandbox.midtrans.com' ||
        parsedPayEndpoint.port !== '' ||
        parsedPayEndpoint.username !== '' ||
        parsedPayEndpoint.password !== ''
      ) {
        return sendJson(res, 403, { error: 'FORBIDDEN_SIM_ENDPOINT' });
      }

      const s2Res = await fetchSimulatorSafe(parsedPayEndpoint.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ ...hidden, issuer: 'gopay' }).toString(),
      });
      const s2 = await s2Res.text();

      const isSuccess = /Status\s*<\/[^>]+>\s*<[^>]+>\s*PAID|Status[\s\S]{0,60}PAID/i.test(s2);
      return sendJson(res, 200, { success: isSuccess });
    } catch (err) {
      return sendJson(res, err.statusCode || 502, { error: 'SIM_ERROR', message: err.message });
    }
  }

  // 4. POST /api/qris/webhook — Official Midtrans Notification Webhook with mandatory SHA-512 verification
  if (req.method === 'POST' && pathname === '/api/qris/webhook') {
    let body;
    try {
      body = await readRequestBody(req);
    } catch (e) {
      return sendJson(res, e.statusCode || 400, { error: 'INVALID_WEBHOOK', message: e.message });
    }

    if (!cfg.configured) {
      return sendJson(res, 403, { error: 'MIDTRANS_NOT_CONFIGURED' });
    }

    const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;
    if (
      !isNonEmptyString(order_id) ||
      !isNonEmptyString(status_code) ||
      !isNonEmptyString(gross_amount) ||
      !isNonEmptyString(signature_key) ||
      !isNonEmptyString(transaction_status)
    ) {
      return sendJson(res, 400, { error: 'INVALID_WEBHOOK_PAYLOAD' });
    }

    const expectedHex = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${cfg.serverKey}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedHex, 'utf8');
    const providedBuf = Buffer.from(String(signature_key).trim().toLowerCase(), 'utf8');

    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return sendJson(res, 403, { error: 'INVALID_SIGNATURE' });
    }

    setVerifiedWebhookStatus(order_id.trim(), transaction_status.trim());
    return sendJson(res, 200, { received: true });
  }

  return sendJson(res, 404, { error: 'API_NOT_FOUND' });
}

function resolveAllowedStaticPath(decodedPath) {
  if (ALLOWED_ROOT_ROUTES.has(decodedPath)) {
    const rootFilename = ALLOWED_ROOT_ROUTES.get(decodedPath);
    return path.join(ROOT_DIR, rootFilename);
  }

  if (decodedPath.startsWith('/assets/')) {
    const filename = decodedPath.slice('/assets/'.length);
    if (
      filename.length > 0 &&
      !filename.includes('/') &&
      !filename.includes('\\') &&
      !filename.includes('..') &&
      !filename.startsWith('.')
    ) {
      const ext = path.extname(filename).toLowerCase();
      if (ALLOWED_ASSET_EXTS.has(ext)) {
        const candidate = path.resolve(ASSETS_DIR, filename);
        if (path.dirname(candidate) === ASSETS_DIR && candidate.startsWith(ASSETS_DIR + path.sep)) {
          return candidate;
        }
      }
    }
  }

  return null;
}

function createStaticServer() {
  return http.createServer(async (req, res) => {
    try {
      const rawUrl = typeof req.url === 'string' ? req.url : '';
      if (
        !rawUrl ||
        !rawUrl.startsWith('/') ||
        rawUrl.startsWith('//') ||
        rawUrl.includes('\0') ||
        /%00/i.test(rawUrl)
      ) {
        return sendPlain(res, 400, 'Bad Request');
      }

      let urlObj;
      try {
        urlObj = new URL(rawUrl, 'http://127.0.0.1');
      } catch (e) {
        return sendPlain(res, 400, 'Bad Request');
      }

      if (urlObj.origin !== 'http://127.0.0.1') {
        return sendPlain(res, 400, 'Bad Request');
      }

      let decodedPath;
      try {
        decodedPath = decodeURIComponent(urlObj.pathname);
      } catch (e) {
        return sendPlain(res, 400, 'Bad Request');
      }

      if (decodedPath.includes('\0')) {
        return sendPlain(res, 400, 'Bad Request');
      }

      if (decodedPath === '/api/qris' || decodedPath.startsWith('/api/qris/')) {
        return await handleQrisApi(req, res, urlObj);
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return sendPlain(res, 405, 'Method Not Allowed');
      }

      if (decodedPath === '/favicon.ico') {
        const favPath = path.join(ROOT_DIR, 'favicon.ico');
        try {
          const favData = await fs.promises.readFile(favPath);
          res.writeHead(200, {
            'Content-Type': MIME_TYPES['.ico'],
            'Cache-Control': 'public, max-age=86400',
            'X-Content-Type-Options': 'nosniff',
          });
          res.end(req.method === 'HEAD' ? undefined : favData);
        } catch {
          res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
          res.end();
        }
        return;
      }

      const filePath = resolveAllowedStaticPath(decodedPath);
      if (!filePath) {
        return sendPlain(res, 403, 'Forbidden');
      }

      let data;
      try {
        const stats = await fs.promises.stat(filePath);
        if (!stats.isFile()) {
          return sendPlain(res, 404, '404 Not Found');
        }
        data = req.method === 'HEAD' ? null : await fs.promises.readFile(filePath);
      } catch (readErr) {
        return sendPlain(res, 404, '404 Not Found');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (err) {
      if (!res.headersSent) {
        sendPlain(res, 500, 'Internal Server Error');
      } else {
        res.destroy();
      }
    }
  });
}

function startServer(port) {
  const host = process.env.HOST || '127.0.0.1';
  const server = createStaticServer();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < BASE_PORT + 20) {
      startServer(port + 1);
      return;
    }
    console.error('Gagal menjalankan server:', err.message);
    process.exit(1);
  });

  server.listen(port, host, () => {
    const cfg = loadMidtransConfig();
    const displayHost = host === '127.0.0.1' || host === '0.0.0.0' ? 'localhost' : host;
    console.log('');
    console.log('AZZATUL BOUQUET — Local Dev Server + Midtrans QRIS API aktif!');
    console.log(`Buka di browser: http://${displayHost}:${port}`);
    console.log(
      `Midtrans QRIS: ${
        cfg.configured ? `AKTIF (${cfg.mode.toUpperCase()})` : 'BELUM DIISI (tempel MIDTRANS_SERVER_KEY di .env)'
      }`
    );
    console.log('Tekan Ctrl + C untuk menghentikan server.');
    console.log('');
  });

  return server;
}

if (require.main === module) {
  startServer(BASE_PORT);
}

module.exports = { createStaticServer, loadMidtransConfig };
