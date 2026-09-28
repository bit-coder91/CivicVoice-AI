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
          <button class="btn btn-secondary btn-sm" onclick="CivicApp.viewComplaint('${c.id}')">View</button>
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
          <button class="btn btn-secondary btn-sm" onclick="CivicApp.viewComplaint('${c.id}')">Details</button>
        </div>
      </div>
    `).join('');
  },

  _renderPagination() {
    const container = document.getElementById('pagination-container');
    if (!container) return;

    const totalPages = Math.ceil(this._filtered.length / this._pageSize);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = `<div class="pagination">`;
    html += `<button class="page-btn" onclick="CivicComplaints.goToPage(${this._page - 1})" ${this._page === 1 ? 'disabled' : ''}>&laquo;</button>`;

    for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 5 && (i < this._page - 2 || i > this._page + 2)) {
        if (i === 1 || i === totalPages) {
        } else if (i === this._page - 3 || i === this._page + 3) {
          html += `<span style="padding: 0 0.25rem; color: var(--text-muted)">...</span>`;
          continue;
        } else {
          continue;
        }
      }
      html += `<button class="page-btn ${this._page === i ? 'active' : ''}" onclick="CivicComplaints.goToPage(${i})">${i}</button>`;
    }

    html += `<button class="page-btn" onclick="CivicComplaints.goToPage(${this._page + 1})" ${this._page === totalPages ? 'disabled' : ''}>&raquo;</button>`;
    html += `</div>`;
    html += `<div class="text-xs text-muted mt-4">Showing ${((this._page - 1) * this._pageSize) + 1} to ${Math.min(this._page * this._pageSize, this._filtered.length)} of ${this._filtered.length} entries</div>`;

    container.innerHTML = html;
  },

  goToPage(p) {
    const totalPages = Math.ceil(this._filtered.length / this._pageSize);
    if (p < 1 || p > totalPages) return;
    this._page = p;
    this.render();
  },

  clearFilters() {
    ['search', 'filter-dept', 'filter-priority', 'filter-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this.applyFilters();
  }
};
