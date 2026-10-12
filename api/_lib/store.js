/**
 * CivicVoice AI — Shared Complaint Store with NLP Integration
 * Used by Vercel Serverless Functions.
 *
 * Persists in-memory with optional /tmp filesystem cache for warm containers.
 */

const fs = require('fs');
const path = require('path');
const nlp = require('./nlp');

const TMP_CACHE_FILE = path.join('/tmp', 'civicvoice_store.json');

let _sequence = 1010;
let _complaints = [];

// ─── Seed Data ─────────────────────────────────────────────────────────────

const SEED_DATA = [
  {
    id: 'CV-1001', title: 'Pothole damage near school entrance',
    text: 'Large potholes on the main road are causing accidents near the school zone. Multiple vehicles have been damaged.',
    department: 'Roads', aiDepartment: 'Roads', sentiment: 'Negative', priority: 'High',
    status: 'Pending', location: 'Ward 4', createdAt: '2026-08-25', updatedAt: '2026-08-25',
    matchedKeywords: ['pothole', 'road'], sentimentIndicators: ['damaged', 'accidents'], priorityIndicators: ['danger', 'accident'],
  },
  {
    id: 'CV-1002', title: 'Water pipeline leakage outside residential building',
    text: 'Water leakage has continued for three days outside our building. Large puddles are forming causing waterlogging.',
    department: 'Water Supply', aiDepartment: 'Water Supply', sentiment: 'Negative', priority: 'High',
    status: 'In Progress', location: 'Ward 2', createdAt: '2026-08-24', updatedAt: '2026-08-24',
    matchedKeywords: ['water', 'leakage', 'pipeline'], sentimentIndicators: ['leakage', 'bad'], priorityIndicators: [],
  },
  {
    id: 'CV-1003', title: 'Regular garbage collection improved',
    text: 'Garbage collection is regular now. Thank you for the improvement in our area.',
    department: 'Garbage/Waste Management', aiDepartment: 'Garbage/Waste Management', sentiment: 'Positive', priority: 'Low',
    status: 'Resolved', location: 'Ward 1', createdAt: '2026-08-23', updatedAt: '2026-08-23',
    matchedKeywords: ['garbage'], sentimentIndicators: ['thank', 'improved'], priorityIndicators: [],
  },
  {
    id: 'CV-1004', title: 'Street lights not working behind market',
    text: 'Street lights are not working on the lane behind the main market. The area is completely dark after 7 PM.',
    department: 'Streetlights', aiDepartment: 'Streetlights', sentiment: 'Negative', priority: 'Medium',
    status: 'Pending', location: 'Ward 3', createdAt: '2026-08-22', updatedAt: '2026-08-22',
    matchedKeywords: ['street light', 'streetlight'], sentimentIndicators: ['not working', 'poor'], priorityIndicators: [],
  },
  {
    id: 'CV-1005', title: 'Power outage since last night',
    text: 'No electricity since last night in our area. Essential appliances are not working. Please restore power urgently.',
    department: 'Electricity', aiDepartment: 'Electricity', sentiment: 'Negative', priority: 'High',
    status: 'Resolved', location: 'Ward 5', createdAt: '2026-08-21', updatedAt: '2026-08-21',
    matchedKeywords: ['electricity', 'power'], sentimentIndicators: ['not working', 'urgent'], priorityIndicators: ['emergency', 'unsafe'],
  },
  {
    id: 'CV-1006', title: 'Blocked drain causing flooding near bus stop',
    text: 'Drain is blocked and rainwater is collecting near the bus stop causing waterlogging. Pedestrians are unable to pass.',
    department: 'Drainage', aiDepartment: 'Drainage', sentiment: 'Negative', priority: 'High',
    status: 'In Progress', location: 'Ward 6', createdAt: '2026-08-20', updatedAt: '2026-08-20',
    matchedKeywords: ['drain', 'flooding', 'waterlogging'], sentimentIndicators: ['overflow', 'bad'], priorityIndicators: ['flood'],
  },
  {
    id: 'CV-1007', title: 'Public park well maintained — appreciation',
    text: 'The public park on sector 7 is clean and well maintained. Residents are very happy.',
    department: 'Sanitation', aiDepartment: 'Sanitation', sentiment: 'Positive', priority: 'Low',
    status: 'Resolved', location: 'Ward 2', createdAt: '2026-08-19', updatedAt: '2026-08-19',
    matchedKeywords: ['sanitation'], sentimentIndicators: ['clean', 'happy'], priorityIndicators: [],
  },
  {
    id: 'CV-1008', title: 'Overflowing dustbins throughout the street',
    text: 'Dustbins are overflowing for a week on our street. The garbage is spreading on the road causing health hazards.',
    department: 'Garbage/Waste Management', aiDepartment: 'Garbage/Waste Management', sentiment: 'Negative', priority: 'Medium',
    status: 'Pending', location: 'Ward 7', createdAt: '2026-08-18', updatedAt: '2026-08-18',
    matchedKeywords: ['dustbin', 'garbage', 'waste'], sentimentIndicators: ['overflow', 'bad'], priorityIndicators: [],
  },
  {
    id: 'CV-1009', title: 'Broken road surface causing accidents',
    text: 'The road surface near the flyover is completely broken. Two-wheelers are skidding and accidents are frequent.',
    department: 'Roads', aiDepartment: 'Roads', sentiment: 'Negative', priority: 'High',
    status: 'In Progress', location: 'Ward 8', createdAt: '2026-08-17', updatedAt: '2026-08-17',
    matchedKeywords: ['road', 'crack'], sentimentIndicators: ['broken', 'poor'], priorityIndicators: ['accident', 'danger'],
  },
  {
    id: 'CV-1010', title: "Exposed electrical wire near children's school",
    text: 'There is an exposed electrical wire hanging low near the school gate. This is extremely dangerous for children.',
    department: 'Electricity', aiDepartment: 'Electricity', sentiment: 'Negative', priority: 'High',
    status: 'Pending', location: 'Ward 3', createdAt: '2026-08-16', updatedAt: '2026-08-16',
    matchedKeywords: ['wire', 'electricity'], sentimentIndicators: ['dangerous', 'poor'], priorityIndicators: ['exposed wire', 'unsafe', 'danger'],
  },
];

// Initialize store from cache or seed data
function initStore() {
  SEED_DATA.forEach(c => {
    c.summary = c.summary || nlp.generateSummary(c.text);
  });

  try {
    if (fs.existsSync(TMP_CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(TMP_CACHE_FILE, 'utf-8'));
      if (Array.isArray(cached.complaints) && cached.complaints.length > 0) {
        _complaints = cached.complaints;
        _sequence = cached.sequence || 1010;
        return;
      }
    }
  } catch (err) {
    // Ignore cache read failures and fallback to seed data
  }

  _complaints = [...SEED_DATA];
  _sequence = 1010;
}

function saveStore() {
  try {
    fs.writeFileSync(
      TMP_CACHE_FILE,
      JSON.stringify({ complaints: _complaints, sequence: _sequence }, null, 2),
      'utf-8'
    );
  } catch (err) {
    // Ignore cache write errors (e.g. read-only environments)
  }
}

initStore();

// ─── CRUD Operations ───────────────────────────────────────────────────────

function getAllComplaints() {
  return [..._complaints];
}

function findComplaint(id) {
  return _complaints.find(c => c.id === id) || null;
}

function addComplaint(payload) {
  _sequence++;
  const text = payload.text || '';
  const analysis = nlp.analyze(text);

  const complaint = {
    id: `CV-${_sequence}`,
    title: payload.title || 'Untitled Complaint',
    text: text,
    location: payload.location || 'Unspecified',
    citizenName: payload.citizenName || undefined,
    contact: payload.contact || undefined,
    department: analysis.department || 'Other',
    aiDepartment: analysis.department || 'Other',
    sentiment: analysis.sentiment || 'Neutral',
    priority: analysis.priority || 'Low',
    status: 'Pending',
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
    summary: analysis.summary,
    matchedKeywords: analysis.matchedKeywords,
    sentimentIndicators: analysis.sentimentIndicators,
    priorityIndicators: analysis.priorityIndicators,
  };

  _complaints.unshift(complaint);
  saveStore();
  return complaint;
}

const VALID_STATUSES = new Set(['Pending', 'In Progress', 'Resolved']);

function updateStatus(id, status) {
  if (!VALID_STATUSES.has(status)) {
    return { error: 'Invalid status. Allowed values: Pending, In Progress, Resolved' };
  }
  const complaint = _complaints.find(c => c.id === id);
  if (!complaint) {
    return { error: 'Complaint not found', notFound: true };
  }
  complaint.status = status;
  complaint.updatedAt = new Date().toISOString().split('T')[0];
  saveStore();
  return { complaint };
}

function getStats() {
  const total = _complaints.length;
  const pending = _complaints.filter(c => c.status === 'Pending').length;
  const inProgress = _complaints.filter(c => c.status === 'In Progress').length;
  const resolved = _complaints.filter(c => c.status === 'Resolved').length;
  const highPriority = _complaints.filter(c => c.priority === 'High').length;

  const byDepartment = {};
  const bySentiment = {};
  const byPriority = {};
  const byStatus = {};

  _complaints.forEach(c => {
    byDepartment[c.department || 'Other'] = (byDepartment[c.department || 'Other'] || 0) + 1;
    bySentiment[c.sentiment || 'Neutral'] = (bySentiment[c.sentiment || 'Neutral'] || 0) + 1;
    byPriority[c.priority || 'Low'] = (byPriority[c.priority || 'Low'] || 0) + 1;
    byStatus[c.status || 'Pending'] = (byStatus[c.status || 'Pending'] || 0) + 1;
  });

  return {
    total,
    pending,
    inProgress,
    resolved,
    highPriority,
    byDepartment,
    bySentiment,
    byPriority,
    byStatus,
    recent: _complaints.slice(0, 5),
  };
}

module.exports = {
  getAllComplaints,
  findComplaint,
  addComplaint,
  updateStatus,
  getStats,
  nlp,
};
