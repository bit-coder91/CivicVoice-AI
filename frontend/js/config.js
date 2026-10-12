// CivicVoice AI — API Configuration
// Automatically points to /api on Vercel deployments and modern local dev.
// Only uses localhost:8080 if explicitly running legacy Spring Boot on port 8080.
const isLegacySpring = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '8080';
window.CIVIC_API_BASE = window.CIVIC_API_BASE || (isLegacySpring ? 'http://localhost:8080/api' : '/api');
