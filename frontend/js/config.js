const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window.CIVIC_API_BASE = window.CIVIC_API_BASE || (isLocalhost ? 'http://localhost:8080/api' : '/api');
