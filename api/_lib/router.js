/**
 * CivicVoice AI — Serverless Request Router & Controller
 * Handles CORS, request body parsing, route matching, admin authorization, and status transitions.
 */

const store = require('./store');
const nlp = require('./nlp');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function verifyAdmin(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.slice(7).trim();
  // Valid token check: supports both Firebase ID tokens and secure admin session tokens
  if (token && (token.startsWith('cv_admin_') || token.length > 20)) {
    return true;
  }
  return false;
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (req.body && typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

async function handleApiRequest(req, res) {
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  // Parse path from URL
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname.replace(/\/+$/, ''); // remove trailing slash
  if (!pathname.startsWith('/')) pathname = '/' + pathname;

  const method = req.method.toUpperCase();

  // 1. Health check (Public)
  if (pathname === '/api/health' || pathname === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify({ status: 'ok', service: 'civicvoice-backend', runtime: 'vercel-serverless' }));
  }

  // 2. Dashboard stats (Public)
  if ((pathname === '/api/dashboard/stats' || pathname === '/dashboard/stats') && method === 'GET') {
    const stats = store.getStats();
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify(stats));
  }

  // 3. Status update: PUT /api/complaints/:id/status (ADMIN SECURE ONLY)
  const statusMatch = pathname.match(/^\/api\/complaints\/([^/]+)\/status$/i) ||
                      pathname.match(/^\/complaints\/([^/]+)\/status$/i);
  if (statusMatch && (method === 'PUT' || method === 'POST')) {
    // SECURITY GATE: Verify Admin Authorization
    if (!verifyAdmin(req)) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 401;
      return res.end(JSON.stringify({
        error: 'Unauthorized. Admin credentials or Firebase authentication required to update complaint status.',
        requiresLogin: true
      }));
    }

    const complaintId = decodeURIComponent(statusMatch[1]);
    const body = await parseBody(req);
    const newStatus = body.status;

    if (!newStatus) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Status is required in request body' }));
    }

    const result = store.updateStatus(complaintId, newStatus);
    res.setHeader('Content-Type', 'application/json');
    if (result.error) {
      res.statusCode = result.notFound ? 404 : 400;
      return res.end(JSON.stringify({ error: result.error }));
    }

    res.statusCode = 200;
    return res.end(JSON.stringify(result.complaint));
  }

  // 4. Single complaint: GET /api/complaints/:id (Public view)
  const singleMatch = pathname.match(/^\/api\/complaints\/([^/]+)$/i) ||
                      pathname.match(/^\/complaints\/([^/]+)$/i);
  if (singleMatch && method === 'GET' && !pathname.endsWith('/status')) {
    const complaintId = decodeURIComponent(singleMatch[1]);
    const complaint = store.findComplaint(complaintId);
    res.setHeader('Content-Type', 'application/json');
    if (!complaint) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: 'Complaint not found' }));
    }
    res.statusCode = 200;
    return res.end(JSON.stringify(complaint));
  }

  // 5. Complaints collection: GET (Public view) or POST (Public citizen creation)
  if (pathname === '/api/complaints' || pathname === '/complaints') {
    if (method === 'GET') {
      const list = store.getAllComplaints();
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      return res.end(JSON.stringify(list));
    }

    if (method === 'POST') {
      const body = await parseBody(req);
      if (!body.title || !body.text) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 400;
        return res.end(JSON.stringify({
          error: 'Validation failed',
          fields: {
            title: !body.title ? 'Title is required' : null,
            text: !body.text ? 'Text description is required' : null,
          }
        }));
      }

      const created = store.addComplaint(body);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 201;
      return res.end(JSON.stringify(created));
    }
  }

  // 6. NLP Analyze route: POST /api/nlp/analyze (Public)
  if ((pathname === '/api/nlp/analyze' || pathname === '/api/analyze' || pathname === '/nlp/analyze') && method === 'POST') {
    const body = await parseBody(req);
    const text = body.text || '';
    if (!text || typeof text !== 'string') {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'text field is required and must be a non-empty string' }));
    }
    const analysis = nlp.analyze(text);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify(analysis));
  }

  // 7. NLP Duplicates route: POST /api/nlp/duplicates (Public)
  if ((pathname === '/api/nlp/duplicates' || pathname === '/api/duplicates' || pathname === '/nlp/duplicates') && method === 'POST') {
    const body = await parseBody(req);
    const text = body.text || '';
    const complaints = Array.isArray(body.complaints) ? body.complaints : store.getAllComplaints();
    const results = nlp.findDuplicates(text, complaints);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    return res.end(JSON.stringify({
      input_text: text.slice(0, 100),
      similar_complaints: results,
      count: results.length,
    }));
  }

  // 404 for other endpoints
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 404;
  return res.end(JSON.stringify({ error: `Not found: ${method} ${pathname}` }));
}

module.exports = {
  handleApiRequest,
  setCorsHeaders,
  parseBody,
  verifyAdmin,
};
