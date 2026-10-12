# CivicVoice AI

**AI-Assisted Public Grievance Management System — 100% Vercel-Native Serverless**

CivicVoice AI is an intelligent civic tech platform that automates the categorization, prioritization, and routing of citizen complaints. It can be deployed **entirely on Vercel** without needing any external servers or separate cloud providers for backend or NLP services.

---

## 🎯 Objectives
- **Automated Routing:** Automatically route issues to correct departments (Roads, Water Supply, Electricity, Garbage, Drainage, Streetlights, Sanitation).
- **Urgency Detection:** Identify and flag high-priority hazards (e.g., exposed wires, open manholes, accidents).
- **Explainable AI:** Provide transparent reasoning (matched keywords, sentiment indicators, priority reasons) for every classification.
- **Real-Time Redressal Workflow:** Seamlessly update complaint status (`Pending` ➔ `In Progress` ➔ `Resolved`) with instant persistence and dashboard sync.
- **Analytics:** Offer real-time insights into departmental performance and civic issue trends with Chart.js.

---

## 🏗️ Architecture & Tech Stack

### ⚡ 100% Vercel Deployment (Default & Recommended)
- **Frontend:** Vanilla HTML5, CSS3 (Semantic Design System), Modern Modular JavaScript.
- **Serverless API:** Node.js Vercel Serverless Functions (`/api/*`) with zero external dependencies for fast cold starts.
- **Built-in NLP Pipeline:** Pure JavaScript NLP engine (`api/_lib/nlp.js`) with keyword classification, lexicon sentiment analysis, urgency prediction, summarization, and TF-IDF duplicate search.
- **CORS & Status Updates:** Native preflight `OPTIONS` and `PUT` request handling with full CORS compliance.

### 🏛️ Legacy Multi-Tier Mode (Optional)
The repository also preserves the original microservice implementations for reference or enterprise multi-tier setups:
- **Backend:** Java 21, Spring Boot 3 (`spring-backend/`)
- **NLP Service:** Python 3.13, Flask, scikit-learn (`flask-nlp/`)

---

## 📂 Project Structure

```text
CivicVoice-AI/
├── api/                  # Vercel Serverless Functions (100% Vercel Deployment)
│   ├── _lib/
│   │   ├── nlp.js        # Pure JS NLP pipeline (classification, sentiment, priority, TF-IDF)
│   │   ├── router.js     # Unified API router & CORS handler
│   │   └── store.js      # In-memory complaint store with persistent /tmp cache
│   ├── complaints/       # /api/complaints & dynamic /api/complaints/[id]/status
│   ├── dashboard/        # /api/dashboard/stats
│   ├── nlp/              # /api/nlp/analyze & /api/nlp/duplicates
│   ├── health.js         # /api/health
│   └── index.js          # Master Serverless entrypoint
├── frontend/             # Single-Page Application (HTML5 / CSS / Vanilla JS)
│   ├── css/style.css     # Semantic Design System with Dark Mode
│   ├── js/               # Modular frontend scripts (api.js, app.js, dashboard.js, etc.)
│   └── index.html        # App UI
├── vercel.json           # Vercel routing, rewrites, and CORS headers
├── package.json          # Serverless scripts & testing
├── test-serverless.js    # Comprehensive serverless & NLP test suite
├── spring-backend/       # (Optional) Java Spring Boot backend
├── flask-nlp/            # (Optional) Python Flask NLP microservice
└── docs/                 # Documentation & Architecture Guides
```

---

## ☁️ Deploying to Vercel (One-Click / Zero Config)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Configure 100% Vercel serverless deployment"
   git push
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
   - Select this repository.
   - Leave the **Root Directory** as `./` (the root).
   - Click **Deploy**.

Everything runs seamlessly on Vercel:
- Static assets are served from `frontend/`.
- All API calls (`/api/complaints`, `/api/complaints/:id/status`, `/api/dashboard/stats`, `/api/health`) are handled directly by Vercel Serverless Functions in `/api/`.
- Preflight `OPTIONS` and `PUT` status transitions work with zero CORS errors on live servers.

---

## 🧪 Testing Locally

To verify all serverless endpoints, NLP algorithms, and status update transitions:

```bash
# Run the test suite
node test-serverless.js
```

To run the local development server:
```bash
# Using Vercel CLI
npx vercel dev

# Or run the serverless API directly
npm start
```
Access the application at `http://localhost:3000`.

---

## 🔄 Status Redressal Workflow
Administrators or citizens can update complaint statuses live:
- **Pending:** Default status when submitted.
- **In Progress:** Work order initiated or assigned to department.
- **Resolved:** Issue rectified with completion recorded.

All status transitions update in real time in both the complaints list and dashboard KPI counters.
