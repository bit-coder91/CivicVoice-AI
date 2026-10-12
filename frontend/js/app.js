window.CivicApp = {
  init() {
    CivicTheme.init();

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        if (view) this.showView(view);
      });
    });

    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileToggle && sidebar && overlay) {
      const toggleSidebar = () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('visible');
      };
      mobileToggle.addEventListener('click', toggleSidebar);
      overlay.addEventListener('click', toggleSidebar);
      document.querySelectorAll('.sidebar .nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (window.innerWidth <= 1023) {
            sidebar.classList.remove('open');
            overlay.classList.remove('visible');
          }
        });
      });
    }

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', () => CivicTheme.toggle());

    const submitForm = document.getElementById('complaint-form');
    if (submitForm) {
      submitForm.addEventListener('submit', (e) => CivicSubmit.handleSubmit(e));
      const textarea = document.getElementById('submit-text');
      if (textarea) textarea.addEventListener('input', () => CivicSubmit.updateCharCount());
    }

    const searchInput = document.getElementById('search');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        if (window.CivicComplaints) CivicComplaints.applyFilters();
      }, 300));
    }

    ['filter-dept', 'filter-priority', 'filter-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => {
        if (window.CivicComplaints) CivicComplaints.applyFilters();
      });
    });

    // Login Form Submit handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email')?.value;
        const pass = document.getElementById('login-password')?.value;
        const errBox = document.getElementById('login-error');
        const submitBtn = document.getElementById('btn-login-submit');

        if (errBox) errBox.classList.add('hidden');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner" style="width:1rem;height:1rem"></span> Signing in...';
        }

        try {
          await CivicAuth.login(email, pass);
          CivicModal.close('modal-login');
          CivicToast.show('Welcome, Administrator! Full update access granted.', 'success');
          loginForm.reset();
        } catch (err) {
          if (errBox) {
            errBox.textContent = err.message || 'Login failed';
            errBox.classList.remove('hidden');
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In to Console';
          }
        }
      });
    }

    this.showView('landing');
  },

  showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(`view-${name}`);
    if (target) {
      target.classList.remove('hidden');
      const landingNav = document.getElementById('landing-nav');
      if (landingNav) landingNav.classList.toggle('hidden', name !== 'landing');
      const appShell = document.getElementById('app-shell');
      if (appShell) appShell.classList.toggle('hidden', name === 'landing');
    }

    document.querySelectorAll('.nav-btn').forEach(b => {
      if (b.dataset.view) b.classList.toggle('active', b.dataset.view === name);
    });

    if (name === 'dashboard' && window.CivicDashboard) CivicDashboard.load();
    if (name === 'complaints' && window.CivicComplaints) CivicComplaints.load();

    window.scrollTo(0, 0);
  },

  openLoginModal() {
    const errBox = document.getElementById('login-error');
    if (errBox) errBox.classList.add('hidden');
    CivicModal.open('modal-login');
  },

  handleLogout() {
    CivicAuth.logout();
    CivicToast.show('Switched back to Public Citizen View.', 'info');
  },

  async viewComplaint(id) {
    CivicModal.open('modal-complaint');
    const content = document.getElementById('modal-complaint-content');
    content.innerHTML = CivicLoading.spinner('Loading complaint details...');

    try {
      const c = await CivicAPI.getComplaint(id);
      this._renderComplaintDetails(c, content);
    } catch (err) {
      let c = null;
      if (window.CivicComplaints && CivicComplaints._complaints) {
        c = CivicComplaints._complaints.find(x => x.id === id);
      }
      if (c) {
        this._renderComplaintDetails(c, content);
      } else {
        content.innerHTML = CivicEmpty.render({ title: 'Error', desc: 'Failed to load complaint details.', cta: `<button class="btn btn-secondary" onclick="CivicModal.close()">Close</button>`});
      }
    }
  },

  async updateComplaintStatus(id, selectId) {
    if (!CivicAuth.isAdmin()) {
      CivicToast.show('Admin login required to update complaint status.', 'warning');
      this.openLoginModal();
      return;
    }

    const select = document.getElementById(selectId);
    if (!select) return;
    const status = select.value;

    const btn = document.getElementById('btn-update-status');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width:1rem;height:1rem" role="status"></span>`;
    }

    try {
      await CivicAPI.updateStatus(id, status);
      CivicToast.show(`Complaint status updated to ${status}`, 'success');
      if (window.CivicComplaints) {
        const c = CivicComplaints._complaints.find(x => x.id === id);
        if (c) c.status = status;
        CivicComplaints.render();
      }
      if (window.CivicDashboard) {
        const c = CivicDashboard._complaints.find(x => x.id === id);
        if (c) {
          c.status = status;
          CivicDashboard._stats = CivicDashboard._computeStats(CivicDashboard._complaints);
          CivicDashboard.renderKPIs();
          CivicDashboard.renderCharts();
        }
      }
      this.viewComplaint(id);
    } catch (err) {
      if (err.status === 401 || err.requiresLogin) {
        CivicToast.show('Session expired or unauthorized. Please sign in as admin.', 'error');
        this.openLoginModal();
      } else {
        CivicToast.show(err.message || 'Failed to update status', 'error');
      }
      if (btn) { btn.disabled = false; btn.innerHTML = 'Update'; }
    }
  },

  _renderComplaintDetails(c, container) {
    const renderTags = (tags) => {
      if (!tags || !tags.length) return '<span class="text-xs text-muted">—</span>';
      return tags.map(t => `<span class="keyword-tag">${t}</span>`).join('');
    };

    const aging = CivicDate.agingStatus(c.createdAt, c.status);
    const agingHtml = aging ? `<span class="badge ${aging.cls}">${aging.label}</span>` : '';
    const isAdmin = CivicAuth.isAdmin();

    // Differentiate Public View vs Admin View
    const actionPanelHtml = isAdmin ? `
      <div class="card" style="border:1.5px solid var(--color-brand)">
        <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:0.75rem">
          <div class="text-xs font-bold uppercase tracking-wider" style="color:var(--color-brand)">👑 Admin Actions</div>
          <span class="badge badge-low text-xs">Full Access</span>
        </div>
        <label class="form-label mb-1" for="status-update-${c.id}">Change Status</label>
        <div class="flex gap-2">
          <select id="status-update-${c.id}" class="form-field" style="flex:1;padding:0.375rem 0.5rem">
            <option value="Pending" ${c.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="In Progress" ${c.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Resolved" ${c.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
          </select>
          <button id="btn-update-status" class="btn btn-primary btn-sm" onclick="CivicApp.updateComplaintStatus('${c.id}', 'status-update-${c.id}')">Update</button>
        </div>
        <p class="text-xs text-muted mt-2" style="margin-bottom:0">Status updates instantly sync with the public registry and analytics dashboard.</p>
      </div>
    ` : `
      <div class="card bg-elevated" style="border:1px dashed var(--border-default)">
        <div class="flex" style="justify-content:space-between;align-items:center;margin-bottom:0.5rem">
          <div class="text-xs font-bold text-muted uppercase tracking-wider">Citizen View Mode</div>
          <span class="badge text-xs" style="background:var(--bg-surface);color:var(--text-secondary)">Read-Only</span>
        </div>
        <div class="text-sm text-secondary mb-3">
          Status transitions can only be authorized by municipal officers.
        </div>
        <button class="btn btn-secondary btn-sm w-full" onclick="CivicApp.openLoginModal()">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
          Admin Login to Update
        </button>
      </div>
    `;

    container.innerHTML = `
      <div class="grid sm:grid-cols-3 gap-6">
        <div class="sm:col-span-2 space-y-6">
          <div>
            <h2 style="font-size:1.25rem;font-weight:700;margin:0 0 0.5rem;color:var(--text-primary)">${c.title || 'Untitled Complaint'}</h2>
            <div class="flex" style="gap:0.75rem;align-items:center;flex-wrap:wrap">
              ${CivicBadge.render(c.status)}
              ${CivicBadge.render(c.priority)}
              ${agingHtml}
            </div>
          </div>

          <div>
            <div class="text-xs font-bold text-muted uppercase tracking-wider mb-2">Description</div>
            <p style="font-size:0.9375rem;line-height:1.6;margin:0;color:var(--text-primary)">${c.text}</p>
          </div>

          <div class="grid grid-2 gap-4">
            <div>
              <div class="text-xs font-bold text-muted uppercase tracking-wider mb-1">Location</div>
              <div class="font-medium text-sm">${c.location || '—'}</div>
            </div>
            <div>
              <div class="text-xs font-bold text-muted uppercase tracking-wider mb-1">Citizen Info</div>
              <div class="font-medium text-sm flex items-center" style="display:flex;align-items:center;">
                ${c.citizenName || 'Anonymous'}
                ${window.CivicDigilocker ? CivicDigilocker.renderBadge(c.verified) : ''}
              </div>
              ${c.contact ? `<div class="text-xs text-muted mt-1">${c.contact}</div>` : ''}
            </div>
          </div>

          <div class="divider"></div>

          <div>
            <div class="text-xs font-bold text-muted uppercase tracking-wider mb-3">AI Analysis &amp; Explanation</div>
            <div class="analysis-panel">
              <div class="analysis-row">
                <span class="analysis-key" style="min-width:120px">Department</span>
                <div style="flex:1">
                  <div class="font-semibold text-sm">${c.aiDepartment || c.department || '—'}</div>
                  <div class="keywords-list mt-1">${renderTags(c.matchedKeywords)}</div>
                </div>
              </div>
              <div class="analysis-row">
                <span class="analysis-key" style="min-width:120px">Priority</span>
                <div style="flex:1">
                  <div class="font-semibold text-sm">${CivicBadge.render(c.priority)}</div>
                  <div class="keywords-list mt-1">${renderTags(c.priorityIndicators)}</div>
                </div>
              </div>
              <div class="analysis-row">
                <span class="analysis-key" style="min-width:120px">Sentiment</span>
                <div style="flex:1">
                  <div class="font-semibold text-sm">${CivicBadge.render(c.sentiment)}</div>
                  <div class="keywords-list mt-1">${renderTags(c.sentimentIndicators)}</div>
                </div>
              </div>
              <div class="analysis-row" style="align-items:flex-start">
                <span class="analysis-key" style="min-width:120px">Summary</span>
                <div class="text-sm italic" style="flex:1">"${c.summary || '—'}"</div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="card bg-elevated">
            <div class="text-xs font-bold text-muted uppercase tracking-wider mb-4">Processing Timeline</div>
            <div class="timeline">
              <div class="timeline-item">
                <div class="timeline-dot done"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></div>
                <div class="timeline-body">
                  <div class="timeline-label">Submitted</div>
                  <div class="timeline-date">${c.createdAt || '—'}</div>
                </div>
              </div>
              <div class="timeline-item">
                <div class="timeline-dot ${c.status !== 'Pending' ? 'done' : 'active'}">
                  ${c.status !== 'Pending' ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>` : `<div style="width:8px;height:8px;border-radius:50%;background:currentColor"></div>`}
                </div>
                <div class="timeline-body">
                  <div class="timeline-label">Analyzed by AI</div>
                  <div class="timeline-date">NLP Pipeline Complete</div>
                </div>
              </div>
              <div class="timeline-item">
                <div class="timeline-dot ${c.status === 'Resolved' ? 'done' : (c.status === 'In Progress' ? 'active' : '')}">
                  ${c.status === 'Resolved' ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>` : (c.status === 'In Progress' ? `<div style="width:8px;height:8px;border-radius:50%;background:currentColor"></div>` : '')}
                </div>
                <div class="timeline-body">
                  <div class="timeline-label">In Progress</div>
                  ${c.status === 'In Progress' && c.updatedAt ? `<div class="timeline-date">Since ${c.updatedAt}</div>` : ''}
                </div>
              </div>
              <div class="timeline-item">
                <div class="timeline-dot ${c.status === 'Resolved' ? 'active' : ''}">
                  ${c.status === 'Resolved' ? `<div style="width:8px;height:8px;border-radius:50%;background:currentColor"></div>` : ''}
                </div>
                <div class="timeline-body">
                  <div class="timeline-label">Resolved</div>
                  ${c.status === 'Resolved' && c.updatedAt ? `<div class="timeline-date">${c.updatedAt}</div>` : ''}
                </div>
              </div>
            </div>
          </div>

          ${actionPanelHtml}
        </div>
      </div>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => CivicApp.init());
