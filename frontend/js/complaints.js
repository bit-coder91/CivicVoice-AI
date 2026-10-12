window.CivicComplaints = {
  _complaints: [],
  _filtered: [],
  _page: 1,
  _pageSize: 10,

  async load() {
    const el = document.getElementById('view-complaints');
    if (!el) return;

    this.showLoading();

    try {
      this._complaints = await CivicAPI.getComplaints();
    } catch (e) {
      this._complaints = window.DEMO_COMPLAINTS || window.CivicDashboard?._complaints || [];
      if (!this._complaints.length) CivicToast.show('Failed to load complaints. Showing offline demo mode.', 'warning');
    }

    this._populateFilters();
    this.applyFilters();
  },

  showLoading() {
    const tbody = document.getElementById('complaints-table');
    const mobileContainer = document.getElementById('complaints-mobile');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8">${CivicLoading.skeleton(5)}</td></tr>`;
    if (mobileContainer) mobileContainer.innerHTML = CivicLoading.skeletonCard(4);
  },

  _populateFilters() {
    const depts = [...new Set(this._complaints.map(c => c.department || 'Other'))].sort();
    const select = document.getElementById('filter-dept');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">All Departments</option>' + depts.map(d => `<option value="${d}">${d}</option>`).join('');
    select.value = current;
  },

  applyFilters() {
    const q = (document.getElementById('search')?.value || '').toLowerCase();
    const dept = document.getElementById('filter-dept')?.value;
    const priority = document.getElementById('filter-priority')?.value;
    const status = document.getElementById('filter-status')?.value;

    this._filtered = this._complaints.filter(c => {
      const matchQ = !q || `${c.id} ${c.title} ${c.text} ${c.department}`.toLowerCase().includes(q);
      const matchDept = !dept || c.department === dept;
      const matchPriority = !priority || c.priority === priority;
      const matchStatus = !status || c.status === status;
      return matchQ && matchDept && matchPriority && matchStatus;
    });

    this._page = 1;
    this.render();
  },

  render() {
    this._renderTable();
    this._renderMobile();
    this._renderPagination();
  },

  _renderTable() {
    const tbody = document.getElementById('complaints-table');
    if (!tbody) return;

    if (!this._filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8">${CivicEmpty.render({ title: 'No complaints found', desc: 'Try adjusting your filters or search query.', cta: `<button class="btn btn-secondary btn-sm" onclick="CivicComplaints.clearFilters()">Clear Filters</button>` })}</td></tr>`;
      return;
    }

    const start = (this._page - 1) * this._pageSize;
    const pageData = this._filtered.slice(start, start + this._pageSize);
    const isAdmin = window.CivicAuth ? CivicAuth.isAdmin() : false;

    tbody.innerHTML = pageData.map(c => `
      <tr>
        <td><span class="td-id">${c.id}</span></td>
        <td class="truncate" style="max-width:250px" title="${c.title || c.text}">${c.title || c.text?.slice(0, 50)}</td>
        <td>${c.department || '—'}</td>
        <td>${CivicBadge.render(c.priority)}</td>
        <td>${CivicBadge.render(c.sentiment)}</td>
        <td>${CivicBadge.render(c.status)}</td>
        <td class="text-muted text-xs">${c.createdAt || '—'}</td>
        <td>
          <button class="btn ${isAdmin ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="CivicApp.viewComplaint('${c.id}')">
            ${isAdmin ? 'Manage' : 'View'}
          </button>
        </td>
      </tr>
    `).join('');
  },

  _renderMobile() {
    const container = document.getElementById('complaints-mobile');
    if (!container) return;

    if (!this._filtered.length) {
      container.innerHTML = CivicEmpty.render({ title: 'No complaints found' });
      return;
    }

    const start = (this._page - 1) * this._pageSize;
    const pageData = this._filtered.slice(start, start + this._pageSize);
    const isAdmin = window.CivicAuth ? CivicAuth.isAdmin() : false;

    container.innerHTML = pageData.map(c => `
      <div class="complaint-card-mobile">
        <div class="flex" style="justify-content:space-between;align-items:center">
          <span class="td-id">${c.id}</span>
          ${CivicBadge.render(c.status)}
        </div>
        <div style="font-weight:600;font-size:0.9375rem;margin:0.25rem 0">${c.title || 'Complaint'}</div>
        <div class="text-sm text-secondary truncate mb-4">${c.text?.slice(0, 80) || ''}...</div>
        <div class="flex" style="gap:0.5rem;flex-wrap:wrap">
          ${CivicBadge.render(c.priority)}
          ${CivicBadge.render(c.department)}
        </div>
        <div class="divider"></div>
        <div class="flex" style="justify-content:space-between;align-items:center">
          <span class="text-xs text-muted">${c.createdAt || ''}</span>
          <button class="btn ${isAdmin ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="CivicApp.viewComplaint('${c.id}')">
            ${isAdmin ? 'Manage Status' : 'Details'}
          </button>
        </div>
      </div>
    `).join('');
  },

  _renderPagination() {
    const container = document.getElementById('pagination-container');
    if (!container) return;

    const totalPages = Math.ceil(this._filtered.length / this._pageSize);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    const start = (this._page - 1) * this._pageSize + 1;
    const end = Math.min(this._page * this._pageSize, this._filtered.length);

    container.innerHTML = `
      <span class="text-sm text-secondary">Showing ${start}–${end} of ${this._filtered.length} complaints</span>
      <div class="pagination">
        <button class="btn btn-secondary btn-sm" ${this._page === 1 ? 'disabled' : ''} onclick="CivicComplaints.prevPage()">Previous</button>
        <span class="page-indicator">Page ${this._page} of ${totalPages}</span>
        <button class="btn btn-secondary btn-sm" ${this._page === totalPages ? 'disabled' : ''} onclick="CivicComplaints.nextPage()">Next</button>
      </div>
    `;
  },

  prevPage() {
    if (this._page > 1) {
      this._page--;
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  nextPage() {
    const totalPages = Math.ceil(this._filtered.length / this._pageSize);
    if (this._page < totalPages) {
      this._page++;
      this.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  clearFilters() {
    const search = document.getElementById('search');
    const dept = document.getElementById('filter-dept');
    const priority = document.getElementById('filter-priority');
    const status = document.getElementById('filter-status');
    if (search) search.value = '';
    if (dept) dept.value = '';
    if (priority) priority.value = '';
    if (status) status.value = '';
    this.applyFilters();
  }
};
