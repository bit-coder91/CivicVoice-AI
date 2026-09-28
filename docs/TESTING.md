# CivicVoice AI - Testing Guide

This document outlines the tests performed during the project's development to ensure production readiness.

## 1. UI & Accessibility (A11y)
*   **Responsiveness:** Tested on mobile (iPhone SE, Pixel 5), Tablet (iPad), and Desktop breakpoints. The sidebar correctly transitions to an overlay drawer on mobile.
*   **Theme Toggle:** Swapped between Light and Dark mode. Verified that CSS variables update seamlessly without full page reloads and that `localStorage` persists the choice.
*   **Contrast:** Verified WCAG AA compliance for text colors against backgrounds in both themes.
*   **Keyboard Navigation:** Verified that Modals trap focus and can be closed with the `Escape` key.
*   **States:** Verified Skeleton loaders on initial dashboard load, and Empty States when filtering yields no results.

## 2. NLP Pipeline Accuracy
*   **Categorization:** 
    *   *Input:* "Huge pothole on main street" -> *Result:* Roads
    *   *Input:* "Water leaking from main pipe" -> *Result:* Water Supply
    *   *Input:* "Garbage overflowing" -> *Result:* Garbage/Waste Management
*   **Priority:**
    *   *Input:* "Exposed electric wire, extreme danger for kids" -> *Result:* High Priority
    *   *Input:* "Road is slightly bumpy" -> *Result:* Medium Priority (due to negative sentiment but no hazard words).

## 3. Spring Boot Backend
*   **Validation:** Sent an empty POST request. Verified `GlobalExceptionHandler` caught it and returned a structured 400 Bad Request JSON instead of a generic Spring HTML error page.
*   **CORS:** Verified frontend on `localhost:5500` can securely talk to `localhost:8080`.
*   **Integration:** Verified Spring Boot successfully calls the Flask API (`localhost:5001/analyze`) over HTTP and maps the JSON response to the `Complaint` model.

## 4. Frontend-Backend Contract
*   Submitted a new complaint via the UI.
*   Verified the button showed a loading spinner.
*   Verified the API call succeeded (201 Created).
*   Verified the "AI Analysis Complete" panel rendered the explainable NLP indicators immediately after submission.
*   Verified the Dashboard statistics instantly updated to reflect the new submission.

## 5. Deployment Checks
*   Verified `vercel.json` contains rewrites for `/api` and `/nlp` to solve cross-origin production issues.
*   Verified no hardcoded API keys exist in the JS bundle.
