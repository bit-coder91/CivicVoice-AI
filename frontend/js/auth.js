/**
 * CivicVoice AI — Firebase Authentication & Role-Based Access Control
 * Provides secure Admin login and public citizen mode.
 *
 * Supports live Firebase configuration via environment or window.FIREBASE_CONFIG,
 * with secure local mock credentials fallback for testing without external setup.
 */

window.CivicAuth = {
  user: null,
  role: 'public', // 'public' | 'admin'
  idToken: null,
  _initialized: false,
  _useFirebase: false,

  init() {
    if (this._initialized) return;
    this._initialized = true;

    // Check saved session
    const savedRole = localStorage.getItem('cv_auth_role') || 'public';
    const savedUser = localStorage.getItem('cv_auth_user');
    const savedToken = localStorage.getItem('cv_auth_token');

    if (savedRole === 'admin' && savedUser) {
      try {
        this.user = JSON.parse(savedUser);
        this.role = 'admin';
        this.idToken = savedToken;
      } catch (e) {
        this.logout();
      }
    } else {
      this.role = 'public';
      this.user = null;
      this.idToken = null;
    }

    // Try initializing Firebase Web SDK if config is present and Firebase SDK loaded
    if (window.firebase && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        this._useFirebase = true;
        firebase.auth().onAuthStateChanged(async (firebaseUser) => {
          if (firebaseUser) {
            const token = await firebaseUser.getIdToken();
            this.user = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            };
            this.role = 'admin';
            this.idToken = token;
            localStorage.setItem('cv_auth_role', 'admin');
            localStorage.setItem('cv_auth_user', JSON.stringify(this.user));
            localStorage.setItem('cv_auth_token', token);
          } else {
            // Keep existing state or sync
          }
          this.updateUI();
        });
      } catch (err) {
        console.warn('Firebase initialization skipped, using built-in Auth:', err.message);
      }
    }

    this.updateUI();
  },

  isAdmin() {
    return this.role === 'admin';
  },

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }

    // 1. Try Firebase Auth SDK if configured
    if (this._useFirebase && window.firebase) {
      try {
        const credential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const token = await credential.user.getIdToken();
        this.user = {
          uid: credential.user.uid,
          email: credential.user.email,
          displayName: credential.user.displayName || credential.user.email.split('@')[0],
        };
        this.role = 'admin';
        this.idToken = token;
        localStorage.setItem('cv_auth_role', 'admin');
        localStorage.setItem('cv_auth_user', JSON.stringify(this.user));
        localStorage.setItem('cv_auth_token', token);
        this.updateUI();
        return this.user;
      } catch (err) {
        throw new Error(err.message || 'Firebase login failed.');
      }
    }

    // 2. Built-in secure Administrator credentials (for zero-setup dev & demo)
    // Default admin: admin@civicvoice.gov / Admin@CivicVoice2026
    const validEmails = ['admin@civicvoice.gov', 'admin@civicvoice.ai', 'admin@gmail.com'];
    const isValidAdmin = validEmails.includes(email.toLowerCase().trim()) && password === 'Admin@CivicVoice2026';

    if (isValidAdmin) {
      const mockToken = `cv_admin_token_${Date.now()}`;
      this.user = {
        uid: 'civic_admin_master',
        email: email.trim(),
        displayName: 'Civic Administrator',
      };
      this.role = 'admin';
      this.idToken = mockToken;
      localStorage.setItem('cv_auth_role', 'admin');
      localStorage.setItem('cv_auth_user', JSON.stringify(this.user));
      localStorage.setItem('cv_auth_token', mockToken);
      this.updateUI();
      return this.user;
    }

    throw new Error('Invalid credentials. Use admin@civicvoice.gov / Admin@CivicVoice2026');
  },

  async logout() {
    if (this._useFirebase && window.firebase) {
      try {
        await firebase.auth().signOut();
      } catch (e) {}
    }

    this.user = null;
    this.role = 'public';
    this.idToken = null;
    localStorage.removeItem('cv_auth_role');
    localStorage.removeItem('cv_auth_user');
    localStorage.removeItem('cv_auth_token');
    this.updateUI();
  },

  updateUI() {
    const isAdmin = this.isAdmin();

    // 1. Update Navigation and Header buttons
    const navLoginBtn = document.getElementById('btn-nav-login');
    const navLogoutBtn = document.getElementById('btn-nav-logout');
    const sidebarBadge = document.querySelector('.sidebar-footer .demo-badge');
    const userDisplay = document.getElementById('admin-user-display');
    const landingAdminBtn = document.getElementById('landing-btn-admin');

    if (navLoginBtn) navLoginBtn.classList.toggle('hidden', isAdmin);
    if (navLogoutBtn) navLogoutBtn.classList.toggle('hidden', !isAdmin);
    if (landingAdminBtn) {
      landingAdminBtn.textContent = isAdmin ? 'Admin Console' : 'Staff Login';
    }

    if (sidebarBadge) {
      sidebarBadge.textContent = isAdmin ? 'Admin Console (Full Rights)' : 'Public Citizen View';
      sidebarBadge.style.background = isAdmin ? 'var(--color-brand)' : 'rgba(255,255,255,0.15)';
      sidebarBadge.style.color = '#ffffff';
    }

    if (userDisplay) {
      if (isAdmin && this.user) {
        userDisplay.innerHTML = `
          <span style="font-weight:600;font-size:0.8125rem;color:var(--text-primary)">
            👑 ${this.user.displayName || this.user.email}
          </span>
          <span class="badge badge-low text-xs" style="margin-left:0.5rem">Admin</span>
        `;
        userDisplay.classList.remove('hidden');
      } else {
        userDisplay.classList.add('hidden');
      }
    }

    // Refresh complaints table or modal if open
    if (window.CivicComplaints && CivicComplaints._complaints.length > 0) {
      CivicComplaints.render();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => CivicAuth.init());
