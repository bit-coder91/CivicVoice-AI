/**
 * CivicVoice AI — Serverless Integration & Unit Test Suite
 * Tests all NLP logic, CRUD operations, status transitions, and CORS.
 */

const assert = require('assert');
const http = require('http');
const nlp = require('./api/_lib/nlp');
const store = require('./api/_lib/store');
const handler = require('./api/index');

console.log('🧪 Starting CivicVoice AI Serverless Test Suite...\n');

// ─── 1. NLP Tests ─────────────────────────────────────────────────────────────

console.log('--- 1. Testing NLP Pipeline ---');

// Test preprocessing
const prep = nlp.preprocessText('Large potholes on the main road are causing accidents!');
assert(prep.tokens.includes('potholes') || prep.tokens.includes('pothole') || prep.tokens.includes('road'), 'Should tokenize properly');
console.log('✓ NLP Preprocessing passed');

// Test department classification
const roadDept = nlp.classifyDepartment('there is a huge pothole and broken road here');
assert.strictEqual(roadDept.department, 'Roads', 'Should identify Roads department');
const waterDept = nlp.classifyDepartment('water leakage in pipeline outside building');
assert.strictEqual(waterDept.department, 'Water Supply', 'Should identify Water Supply department');
const electricDept = nlp.classifyDepartment('exposed wire electric wire power outage');
assert.strictEqual(electricDept.department, 'Electricity', 'Should identify Electricity department');
console.log('✓ Department classification passed');

// Test sentiment analysis
const negSentiment = nlp.analyzeSentiment('broken and damaged, terrible condition');
assert.strictEqual(negSentiment.sentiment, 'Negative', 'Should identify Negative sentiment');
const posSentiment = nlp.analyzeSentiment('clean park, happy and thank you');
assert.strictEqual(posSentiment.sentiment, 'Positive', 'Should identify Positive sentiment');
console.log('✓ Sentiment analysis passed');

// Test priority prediction
const highPriority = nlp.predictPriority('danger accident hospital emergency', 'Negative');
assert.strictEqual(highPriority.priority, 'High', 'Should identify High priority');
const medPriority = nlp.predictPriority('dustbin overflowing', 'Negative');
assert.strictEqual(medPriority.priority, 'Medium', 'Should identify Medium priority');
console.log('✓ Priority prediction passed');

// Test summary
const summary = nlp.generateSummary('This is a test text that is reasonably long and should be summarized nicely');
assert(summary.length > 0, 'Summary should not be empty');
console.log('✓ Summary generation passed');

// Test duplicate detection
const duplicates = nlp.findDuplicates('Pothole and road damage', store.getAllComplaints());
assert(Array.isArray(duplicates), 'Duplicates should return an array');
console.log('✓ Duplicate detection passed');

// ─── 2. HTTP Serverless Integration Tests ─────────────────────────────────────

console.log('\n--- 2. Testing Serverless Endpoints & Status Transitions ---');

const server = http.createServer(async (req, res) => {
  await handler(req, res);
});

server.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${baseUrl}${path}`;
      const req = http.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch {}
          resolve({ status: res.statusCode, headers: res.headers, body: json, raw: data });
        });
      });
      req.on('error', reject);
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  }

  try {
    // 2.1 Health check
    const healthRes = await request('/api/health');
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthRes.body.status, 'ok');
    console.log('✓ GET /api/health returned 200 OK');

    // 2.2 Get all complaints
    const complaintsRes = await request('/api/complaints');
    assert.strictEqual(complaintsRes.status, 200);
    assert(Array.isArray(complaintsRes.body) && complaintsRes.body.length >= 10);
    console.log(`✓ GET /api/complaints returned ${complaintsRes.body.length} complaints`);

    // 2.3 CORS Preflight check for status update
    const optionsRes = await request('/api/complaints/CV-1001/status', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://civicvoice-ai.vercel.app',
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'Content-Type',
      }
    });
    assert.strictEqual(optionsRes.status, 204);
    assert.strictEqual(optionsRes.headers['access-control-allow-origin'], '*');
    console.log('✓ OPTIONS /api/complaints/CV-1001/status handled with 204 and CORS headers');

    // 2.4 Update status from Pending to In Progress
    const inProgressRes = await request('/api/complaints/CV-1001/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: { status: 'In Progress' }
    });
    assert.strictEqual(inProgressRes.status, 200);
    assert.strictEqual(inProgressRes.body.status, 'In Progress');
    console.log('✓ PUT /api/complaints/CV-1001/status -> In Progress succeeded');

    // 2.5 Update status from In Progress to Resolved
    const resolvedRes = await request('/api/complaints/CV-1001/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: { status: 'Resolved' }
    });
    assert.strictEqual(resolvedRes.status, 200);
    assert.strictEqual(resolvedRes.body.status, 'Resolved');
    console.log('✓ PUT /api/complaints/CV-1001/status -> Resolved succeeded');

    // 2.6 Verify persistence of update
    const getSingleRes = await request('/api/complaints/CV-1001');
    assert.strictEqual(getSingleRes.status, 200);
    assert.strictEqual(getSingleRes.body.status, 'Resolved');
    console.log('✓ GET /api/complaints/CV-1001 verified updated status is Resolved');

    // 2.7 Verify invalid status rejection
    const invalidRes = await request('/api/complaints/CV-1001/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: { status: 'InvalidStatus' }
    });
    assert.strictEqual(invalidRes.status, 400);
    console.log('✓ PUT /api/complaints/CV-1001/status correctly rejected invalid status with 400');

    // 2.8 Create new complaint with automatic AI categorization
    const newComplaintRes = await request('/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        title: 'Open transformer sparking near community hall',
        text: 'Sparking electric wire and open transformer near community hall. High danger of electric shock.',
        location: 'Ward 9',
      }
    });
    assert.strictEqual(newComplaintRes.status, 201);
    assert(newComplaintRes.body.id.startsWith('CV-'));
    assert.strictEqual(newComplaintRes.body.status, 'Pending');
    assert.strictEqual(newComplaintRes.body.department, 'Electricity');
    assert.strictEqual(newComplaintRes.body.priority, 'High');
    console.log(`✓ POST /api/complaints created ${newComplaintRes.body.id} classified as ${newComplaintRes.body.department} [${newComplaintRes.body.priority} priority]`);

    // 2.9 Dashboard Stats
    const statsRes = await request('/api/dashboard/stats');
    assert.strictEqual(statsRes.status, 200);
    assert(statsRes.body.total >= 11);
    assert(typeof statsRes.body.resolved === 'number');
    assert(statsRes.body.byDepartment['Electricity'] >= 1);
    console.log(`✓ GET /api/dashboard/stats returned total: ${statsRes.body.total}, resolved: ${statsRes.body.resolved}`);

    // 2.10 NLP Analyze Route
    const nlpRes = await request('/api/nlp/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { text: 'Water pipe leaking severely creating flooding' }
    });
    assert.strictEqual(nlpRes.status, 200);
    assert.strictEqual(nlpRes.body.department, 'Water Supply');
    console.log('✓ POST /api/nlp/analyze returned proper NLP response');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The Vercel Serverless backend is 100% operational!');
    server.close(() => process.exit(0));
  } catch (err) {
    console.error('❌ Test failed:', err);
    server.close(() => process.exit(1));
  }
});
