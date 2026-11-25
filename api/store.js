/**
 * AZZATUL BOUQUET — Vercel Serverless Supabase Store Bridge (/api/store)
 * Zero-dependency REST proxy to Supabase PostgreSQL table `public.app_store`.
 * Env vars required:
 *   SUPABASE_URL         (e.g. https://xxxxx.supabase.co)
 *   SUPABASE_SERVICE_KEY (Service Role key from Project Settings -> API)
 */

const ALLOWED_KEYS = new Set([
  'kalakreasi_v6_products',
  'kalakreasi_v6_inventory',
  'kalakreasi_v6_stock_logs',
  'kalakreasi_v7_orders',
  'kalakreasi_v6_expenses',
  'kalakreasi_v6_opname_logs',
  'kalakreasi_v7_custom_items',
]);

function getSupabaseConfig() {
  const url = String(process.env.SUPABASE_URL || '')
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
  const key = String(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  return { configured: Boolean(url && key), url, key };
}

function sendJson(res, status, data) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
  }
  if (typeof res.status === 'function') {
    return res.status(status).end(JSON.stringify(data));
  }
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  return res.end(JSON.stringify(data));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return req.body;
}

module.exports = async function handler(req, res) {
  const cfg = getSupabaseConfig();
  if (!cfg.configured) {
    if (req.method === 'GET') {
      return sendJson(res, 200, { enabled: false, data: {} });
    }
    return sendJson(res, 200, { enabled: false, saved: false });
  }

  const baseHeaders = {
    apikey: cfg.key,
    'Content-Type': 'application/json',
  };
  if (cfg.key.startsWith('eyJ')) {
    baseHeaders.Authorization = `Bearer ${cfg.key}`;
  }

  // GET /api/store — Fetch all shared studio collections from Supabase
  if (req.method === 'GET') {
    try {
      const sbRes = await fetch(`${cfg.url}/rest/v1/app_store?select=key,value`, {
        method: 'GET',
        headers: baseHeaders,
        signal: AbortSignal.timeout(8000),
      });
      if (!sbRes.ok) {
        const msg = await sbRes.text();
        return sendJson(res, 502, { enabled: true, error: 'SUPABASE_READ_FAILED', detail: msg.slice(0, 200) });
      }
      const rows = await sbRes.json();
      const data = {};
      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (r && ALLOWED_KEYS.has(r.key)) {
            data[r.key] = r.value;
          }
        }
      }
      return sendJson(res, 200, { enabled: true, data });
    } catch (err) {
      return sendJson(res, 502, { enabled: true, error: 'SUPABASE_NETWORK_ERROR', message: err.message });
    }
  }

  // POST /api/store — Upsert one allowed key into Supabase
  if (req.method === 'POST') {
    const body = parseBody(req);
    const key = String(body.key || '').trim();
    if (!ALLOWED_KEYS.has(key)) {
      return sendJson(res, 400, { error: 'INVALID_STORE_KEY' });
    }
    if (body.value === undefined) {
      return sendJson(res, 400, { error: 'MISSING_VALUE' });
    }
    try {
      const sbRes = await fetch(`${cfg.url}/rest/v1/app_store?on_conflict=key`, {
        method: 'POST',
        headers: {
          ...baseHeaders,
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify([{ key, value: body.value, updated_at: new Date().toISOString() }]),
        signal: AbortSignal.timeout(8000),
      });
      if (!sbRes.ok) {
        const msg = await sbRes.text();
        return sendJson(res, 502, { enabled: true, error: 'SUPABASE_WRITE_FAILED', detail: msg.slice(0, 200) });
      }
      return sendJson(res, 200, { enabled: true, saved: true, key });
    } catch (err) {
      return sendJson(res, 502, { enabled: true, error: 'SUPABASE_NETWORK_ERROR', message: err.message });
    }
  }

  // DELETE /api/store — Clear all shared keys (used by Owner Reset Data Demo)
  if (req.method === 'DELETE') {
    try {
      const inList = [...ALLOWED_KEYS].join(',');
      const sbRes = await fetch(`${cfg.url}/rest/v1/app_store?key=in.(${encodeURIComponent(inList)})`, {
        method: 'DELETE',
        headers: baseHeaders,
        signal: AbortSignal.timeout(8000),
      });
      if (!sbRes.ok) {
        const msg = await sbRes.text();
        return sendJson(res, 502, { enabled: true, error: 'SUPABASE_DELETE_FAILED', detail: msg.slice(0, 200) });
      }
      return sendJson(res, 200, { enabled: true, cleared: true });
    } catch (err) {
      return sendJson(res, 502, { enabled: true, error: 'SUPABASE_NETWORK_ERROR', message: err.message });
    }
  }

  return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
};
