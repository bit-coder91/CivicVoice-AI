# CivicVoice AI

**AI-Assisted Public Grievance Management System**

CivicVoice AI is an intelligent civic tech platform that automates the categorization, prioritization, and routing of citizen complaints. By combining a modern web frontend with a Java Spring Boot backend and a Python Flask NLP engine, it drastically reduces manual sorting efforts and highlights urgent civic issues instantly.

---

## 🎯 Objectives
- **Automated Routing:** Automatically route issues to correct departments (Roads, Water Supply, Electricity, etc.).
- **Urgency Detection:** Identify and flag high-priority hazards (e.g., exposed wires, open manholes).
- **Explainable AI:** Provide transparent reasoning (matched keywords, sentiment indicators) for every classification.
- **Analytics:** Offer real-time insights into departmental performance and civic issue trends.

---

## 🚀 Features
- **Explainable NLP Pipeline:** Transparent keyword and sentiment analysis (No black-box ML).
- **Professional Dashboard:** Real-time analytics with Chart.js.
- **Modern UI/UX:** Semantic CSS variables, responsive design, dark mode, toast notifications, accessible forms.
- **Admin Workflow:** Complaint tracking with chronological timelines and status updates.

---

## 🏗️ Architecture & Tech Stack

- **Frontend:** Vanilla HTML5, CSS3 (Custom Design System), JavaScript (Modular). Vercel-ready.
- **Backend:** Java 21, Spring Boot 3 (REST API, Data Validation, Services).
- **NLP Service:** Python 3.13, Flask, scikit-learn (TF-IDF), NLTK (Tokenization, Sentiment, Classification).

---

## 📂 Project Structure

```text
CivicVoice-AI/
├── frontend/             # Vanilla JS, CSS, HTML UI
│   ├── css/style.css     # Semantic Design System
│   ├── js/               # Modular logic (api.js, app.js, dashboard.js, etc.)
│   └── index.html        # Single Page Application
├── spring-backend/       # Java Spring Boot API
│   └── src/main/java/com/civicvoice/
│       ├── controller/   # REST Endpoints
│       ├── model/        # Complaint entity
│       ├── dto/          # Data Transfer Objects
│       └── service/      # Business logic & external NLP calls
├── flask-nlp/            # Python Flask NLP microservice
│   ├── app.py            # Preprocessing, classification, sentiment
│   └── requirements.txt  # Python dependencies
└── docs/                 # Documentation & Guides
```

---

## ⚙️ Local Setup

### 1. Flask NLP Service
```bash
cd flask-nlp
python -m venv .venv
# Activate venv:
# Windows: .venv\Scripts\activate
# Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```
*Runs on `http://localhost:5001`*

### 2. Spring Boot Backend
```bash
cd spring-backend
# If maven wrapper exists:
./mvnw spring-boot:run
# Or use standard maven:
mvn spring-boot:run
```
*Runs on `http://localhost:8080`*

### 3. Frontend
```bash
cd frontend
# Run a local HTTP server
python -m http.server 5500
```
*Access at `http://localhost:5500`*

---

## ☁️ Deployment (Vercel)

The frontend is pre-configured for Vercel deployment via `vercel.json`.
1. Push this repository to GitHub.
2. Import the project in Vercel.
3. Set the **Root Directory** to `frontend`.
4. Override the **Build Command** to empty (or `echo 'No build'`).
5. Configure `vercel.json` rewrites to point `/api/*` to your production Spring Boot URL.

---

## 📚 Documentation
For detailed explanations, check the `docs/` folder:
- [Project Explanation & Architecture](./docs/PROJECT_EXPLANATION.md)
- [Testing Guide](./docs/TESTING.md)

---

## 🔮 Future Scope
- **PostgreSQL/MongoDB Integration:** Replace current in-memory/stubbed storage with a production relational database.
- **Citizen Accounts:** JWT authentication for citizens to track their own complaints.
- **Image Recognition (Computer Vision):** Validate uploaded complaint photos (e.g., verifying a pothole image).
- **Advanced Duplicate Detection:** Use Sentence Transformers instead of TF-IDF for deep semantic matching.
