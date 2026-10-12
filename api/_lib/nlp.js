/**
 * CivicVoice AI — Pure JavaScript NLP Pipeline
 * Ported from Flask NLP Service for Vercel Serverless Functions.
 * Zero external dependencies.
 */

// ─── Knowledge Base ───────────────────────────────────────────────────────────

const DEPARTMENT_RULES = {
  'Roads': [
    'pothole', 'road damage', 'road surface', 'street damage', 'crack',
    'broken road', 'road repair', 'flyover'
  ],
  'Water Supply': [
    'water supply', 'water leakage', 'pipeline', 'water pipe', 'no water',
    'water shortage', 'contaminated water'
  ],
  'Electricity': [
    'electricity', 'power cut', 'power outage', 'no power', 'wire',
    'electric wire', 'transformer', 'streetlight short'
  ],
  'Garbage/Waste Management': [
    'garbage', 'waste', 'dustbin', 'trash', 'litter',
    'overflowing bin', 'dump', 'solid waste'
  ],
  'Drainage': [
    'drain', 'flooding', 'waterlogging', 'sewage', 'sewer',
    'rainwater', 'blocked drain', 'stagnant water'
  ],
  'Streetlights': [
    'street light', 'streetlight', 'lamp post', 'no light', 'dark road'
  ],
  'Sanitation': [
    'sanitation', 'toilet', 'hygiene', 'public toilet', 'open defecation',
    'cleanliness'
  ],
};

const PRIORITY_HIGH_WORDS = [
  'emergency', 'accident', 'danger', 'dangerous', 'fire', 'hospital',
  'flood', 'exposed wire', 'unsafe', 'hazard', 'life risk', 'critical',
  'urgent', 'immediately', 'children', 'school', 'injury'
];

const NEGATIVE_WORDS = [
  'bad', 'poor', 'broken', 'not working', 'overflow', 'leak', 'leakage',
  'urgent', 'damaged', 'terrible', 'horrible', 'worst', 'useless',
  'disgusting', 'no response', 'ignored', 'negligence', 'complaining', 'dirty'
];

const POSITIVE_WORDS = [
  'thank', 'good', 'clean', 'improved', 'happy', 'well maintained',
  'appreciate', 'excellent', 'resolved', 'better', 'great work'
];

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'for', 'to',
  'of', 'and', 'or', 'but', 'our', 'my', 'we', 'this', 'that',
  'are', 'was', 'has', 'have', 'been', 'be', 'by', 'with', 'from',
  'near', 'their', 'there', 'these', 'they', 'not', 'no', 'do',
  'does', 'did', 'will', 'would', 'can', 'could', 'should'
]);

// ─── NLP Pipeline Functions ───────────────────────────────────────────────────

function preprocessText(text) {
  if (!text || typeof text !== 'string') return { cleaned: '', tokens: [] };
  let lower = text.toLowerCase();
  // Remove URLs
  lower = lower.replace(/https?:\/\/\S+|www\.\S+/g, ' ');
  // Remove non-alphanumeric (preserve spaces)
  lower = lower.replace(/[^a-z0-9\s]/g, ' ');
  // Collapse whitespace
  const cleaned = lower.replace(/\s+/g, ' ').trim();
  // Tokenize and filter stopwords
  const tokens = cleaned.split(' ').filter(t => !STOPWORDS.has(t) && t.length > 2);
  return { cleaned, tokens };
}

function classifyDepartment(cleaned) {
  for (const [dept, keywords] of Object.entries(DEPARTMENT_RULES)) {
    const matched = keywords.filter(kw => cleaned.includes(kw));
    if (matched.length > 0) {
      return { department: dept, matchedKeywords: matched };
    }
  }
  return { department: 'Other', matchedKeywords: [] };
}

function analyzeSentiment(cleaned) {
  const posMatches = POSITIVE_WORDS.filter(w => cleaned.includes(w));
  const negMatches = NEGATIVE_WORDS.filter(w => cleaned.includes(w));

  if (posMatches.length > 0 && negMatches.length === 0) {
    return { sentiment: 'Positive', sentimentIndicators: posMatches };
  } else if (negMatches.length > 0) {
    return { sentiment: 'Negative', sentimentIndicators: negMatches };
  }
  return { sentiment: 'Neutral', sentimentIndicators: [] };
}

function predictPriority(cleaned, sentiment) {
  const highMatches = PRIORITY_HIGH_WORDS.filter(w => cleaned.includes(w));
  if (highMatches.length > 0) {
    return { priority: 'High', priorityIndicators: highMatches };
  }
  if (sentiment === 'Negative') {
    return { priority: 'Medium', priorityIndicators: [] };
  }
  return { priority: 'Low', priorityIndicators: [] };
}

function generateSummary(text, maxWords = 18) {
  if (!text || typeof text !== 'string') return '';
  const words = text.trim().split(/\s+/);
  const summary = words.slice(0, maxWords).join(' ');
  return words.length > maxWords ? `${summary}...` : summary;
}

// ─── TF-IDF Cosine Similarity for Duplicate Detection ─────────────────────────

function tokenizeForSimilarity(text) {
  const { tokens } = preprocessText(text);
  return tokens;
}

function computeTF(tokens) {
  const tf = {};
  for (const t of tokens) {
    tf[t] = (tf[t] || 0) + 1;
  }
  const len = tokens.length || 1;
  for (const k in tf) {
    tf[k] = tf[k] / len;
  }
  return tf;
}

function computeCosineSimilarity(tf1, tf2, idf) {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  const allWords = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
  for (const word of allWords) {
    const weight1 = (tf1[word] || 0) * (idf[word] || 1);
    const weight2 = (tf2[word] || 0) * (idf[word] || 1);
    dotProduct += weight1 * weight2;
    norm1 += weight1 * weight1;
    norm2 += weight2 * weight2;
  }

  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

function similarityLabel(score) {
  if (score >= 0.7) return 'Very Similar';
  if (score >= 0.5) return 'Similar';
  if (score >= 0.25) return 'Possibly Related';
  return 'Low Similarity';
}

function findDuplicates(text, existingComplaints = [], topK = 3) {
  if (!existingComplaints || existingComplaints.length === 0 || !text) {
    return [];
  }

  const docs = existingComplaints.map(c => tokenizeForSimilarity(c.text || ''));
  const queryTokens = tokenizeForSimilarity(text);
  const allDocs = [...docs, queryTokens];
  const totalDocs = allDocs.length;

  // Compute IDF across documents
  const docFreq = {};
  for (const doc of allDocs) {
    const unique = new Set(doc);
    for (const w of unique) {
      docFreq[w] = (docFreq[w] || 0) + 1;
    }
  }

  const idf = {};
  for (const [w, count] of Object.entries(docFreq)) {
    idf[w] = Math.log((totalDocs + 1) / (count + 1)) + 1;
  }

  const queryTF = computeTF(queryTokens);
  const scored = [];

  for (let i = 0; i < existingComplaints.length; i++) {
    const docTF = computeTF(docs[i]);
    const score = computeCosineSimilarity(queryTF, docTF, idf);
    if (score > 0.25) {
      const c = existingComplaints[i];
      scored.push({
        id: c.id || '',
        title: c.title || (c.text ? c.text.slice(0, 60) : ''),
        department: c.department || '',
        status: c.status || '',
        similarity_score: Math.round(score * 1000) / 1000,
        similarity_label: similarityLabel(score),
      });
    }
  }

  scored.sort((a, b) => b.similarity_score - a.similarity_score);
  return scored.slice(0, topK);
}

// ─── Full Pipeline ────────────────────────────────────────────────────────────

function analyze(text) {
  const { cleaned, tokens } = preprocessText(text);
  const { department, matchedKeywords } = classifyDepartment(cleaned);
  const { sentiment, sentimentIndicators } = analyzeSentiment(cleaned);
  const { priority, priorityIndicators } = predictPriority(cleaned, sentiment);
  const summary = generateSummary(text);

  return {
    department,
    sentiment,
    priority,
    summary,
    tokens,
    matchedKeywords,
    sentimentIndicators,
    priorityIndicators,
    // snake_case aliases for compatibility with Python Flask contracts
    matched_keywords: matchedKeywords,
    sentiment_indicators: sentimentIndicators,
    priority_indicators: priorityIndicators,
  };
}

module.exports = {
  preprocessText,
  classifyDepartment,
  analyzeSentiment,
  predictPriority,
  generateSummary,
  findDuplicates,
  analyze,
};
