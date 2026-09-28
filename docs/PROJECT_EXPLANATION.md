# CivicVoice AI - Project Explanation

This document provides a detailed breakdown of the CivicVoice AI architecture, design decisions, and NLP implementation. It is designed to help explain the project during evaluations or interviews.

## 1. System Architecture

CivicVoice AI uses a modern, loosely-coupled microservices architecture:

1.  **Client (Frontend):** A Single Page Application (SPA) built with Vanilla JavaScript, HTML5, and custom CSS. It communicates exclusively via REST APIs.
2.  **API Gateway & Business Logic (Spring Boot):** The Java Spring Boot application acts as the primary backend. It handles:
    *   Data Validation (DTOs)
    *   Persistence (Storage)
    *   Orchestration (Calling the NLP service)
    *   Exception Handling
3.  **AI Engine (Flask NLP):** A dedicated Python microservice handling text analysis. It exposes a single `/analyze` endpoint for text processing and a `/duplicates` endpoint for TF-IDF similarity checking.

### Why this architecture?
*   **Separation of Concerns:** Java excels at robust enterprise business logic and data management, while Python is the industry standard for NLP and Machine Learning. By separating them, each service uses the best tool for the job.
*   **Scalability:** The NLP service (which is computationally heavier) can be scaled independently of the main API server.

---

## 2. The NLP Pipeline

We deliberately avoided "black-box" LLMs (like OpenAI GPT) in favor of an **Explainable AI (XAI)** pipeline. This ensures that every routing decision can be audited, which is critical for government and civic tech.

The pipeline in `flask-nlp/app.py` consists of the following steps:

1.  **Text Cleaning (`preprocess_text`):** 
    *   Lowercasing.
    *   URL and special character removal (Regex).
    *   Stopword filtration (removing "the", "a", "is", etc., using a custom set to keep dependencies light).
2.  **Department Classification (`classify_department`):**
    *   Uses a curated keyword lexicon (e.g., "pothole", "crack" -> Roads; "pipe", "leak" -> Water Supply).
3.  **Sentiment Analysis (`analyze_sentiment`):**
    *   Lexicon-based approach. Scans for positive ("resolved", "good") or negative ("broken", "negligence") indicators.
4.  **Priority Prediction (`predict_priority`):**
    *   Rule-based logic. High priority is triggered by hazard keywords ("accident", "danger", "emergency"). Medium is assigned to general negative sentiment.
5.  **Summarization (`generate_summary`):**
    *   Extractive truncation.
6.  **Duplicate Detection (`find_duplicates`):**
    *   Uses `scikit-learn` to vectorize complaints using **TF-IDF** (Term Frequency-Inverse Document Frequency) and calculates **Cosine Similarity**. Matches above a 0.25 threshold are flagged as potential duplicates.

---

## 3. Frontend Design System

The frontend was built without frameworks (no React/Vue) to demonstrate a strong foundational understanding of the DOM and CSS.

*   **Semantic CSS Variables:** Supports instant light/dark mode toggling.
*   **Modular JS:** Split into logical domains (`api.js`, `ui.js`, `complaints.js`, `submit.js`, `app.js`).
*   **Accessibility (A11y):** Uses ARIA labels, semantic HTML tags (`<nav>`, `<main>`, `<aside>`), and proper focus states.
*   **Resilience:** If the backend is unreachable, the dashboard gracefully falls back to offline "Demo Mode" with realistic data, ensuring the UI can always be demonstrated.
