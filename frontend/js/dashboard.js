let _charts = {};

window.CivicDashboard = {
  _stats: null,
  _complaints: [],

  async load() {
    const el = document.getElementById('view-dashboard');
    if (!el) return;

    document.getElementById('kpi-grid').innerHTML = Array(5).fill(
      `<div class="card" style="height:90px">${CivicLoading.skeleton(2)}</div>`
    ).join('');

    try {
      const [stats, complaints] = await Promise.all([
        CivicAPI.getDashboardStats(),
        CivicAPI.getComplaints(),
      ]);
      this._stats = stats;
      this._complaints = complaints;
    } catch (e) {
      this._complaints = window.DEMO_COMPLAINTS || [];
      this._stats = this._computeStats(this._complaints);
      document.getElementById('dashboard-mode-banner')?.classList.remove('hidden');
    }

    this.renderKPIs();
    this.renderCharts();
    this.renderRecent();
    this.renderInsights();
  },

  _computeStats(list) {
    const byDepartment = {}, bySentiment = {}, byPriority = {}, byStatus = {};
    list.forEach(c => {
      byDepartment[c.department || 'Other'] = (byDepartment[c.department || 'Other'] || 0) + 1;
      bySentiment[c.sentiment || 'Neutral'] = (bySentiment[c.sentiment || 'Neutral'] || 0) + 1;
      byPriority[c.priority || 'Low']       = (byPriority[c.priority || 'Low'] || 0) + 1;
      byStatus[c.status || 'Pending']       = (byStatus[c.status || 'Pending'] || 0) + 1;
    });
    return {
      total: list.length,
      pending: list.filter(c => c.status === 'Pending').length,
      inProgress: list.filter(c => c.status === 'In Progress').length,
      resolved: list.filter(c => c.status === 'Resolved').length,
      highPriority: list.filter(c => c.priority === 'High').length,
      byDepartment, bySentiment, byPriority, byStatus,
      recent: list.slice(0, 5),
    };
  },

  renderKPIs() {
    const s = this._stats;
    const kpis = [
      { label: 'Total Complaints', value: s.total,           icon: 'clipboard', color: '#005ea2', bg: 'rgba(0,94,162,.10)' },
      { label: 'Pending',          value: s.pending,          icon: 'clock',     color: '#a66100', bg: 'rgba(255,190,46,.15)' },
      { label: 'In Progress',      value: s.inProgress ?? 0, icon: 'refresh',   color: '#0076d6', bg: 'rgba(0,118,214,.10)' },
      { label: 'Resolved',         value: s.resolved,         icon: 'check',     color: '#538200', bg: 'rgba(83,130,0,.10)' },
      { label: 'High Priority',    value: s.highPriority,     icon: 'alert',     color: '#d83933', bg: 'rgba(216,57,51,.10)' },
    ];

    const ICONS_SVG = {
      clipboard: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>`,
      clock:     `<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
      refresh:   `<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>`,
      check:     `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
      alert:     `<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>`,
    };

    document.getElementById('kpi-grid').innerHTML = kpis.map(k => `
      <div class="kpi-card" style="display:flex; align-items:center; gap:1rem; padding:1.5rem; background:var(--bg-surface); border:1px solid var(--border-default); border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04); transition: transform 0.2s ease, box-shadow 0.2s ease;">
        <div class="kpi-icon" style="background:${k.bg}; flex-shrink:0; width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="${k.color}" aria-hidden="true">${ICONS_SVG[k.icon]}</svg>
        </div>
        <div style="display:flex; flex-direction:column;">
          <div class="kpi-label" style="font-size:0.875rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">${k.label}</div>
          <div class="kpi-value" style="font-size:1.75rem; font-weight:800; color:${k.color}; line-height:1.2; margin-top:0.25rem;">${k.value}</div>
        </div>
      </div>
    `).join('');
  },

  renderCharts() {
    const s = this._stats;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#d6d7d9' : '#4a4a4a';
    const gridColor = isDark ? '#2b2b2b' : '#e6e6e6';

    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = gridColor;

    const makeBar = (id, labels, data, color) => {
      const ctx = document.getElementById(id);
      if (!ctx) return;
      if (_charts[id]) _charts[id].destroy();
      _charts[id] = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Count', data, backgroundColor: color, borderRadius: 4 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { padding: 8, cornerRadius: 4 } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: gridColor } },
            x: { grid: { display: false } }
          }
        }
      });
    };

    const makeDoughnut = (id, labels, data, colors) => {
      const ctx = document.getElementById(id);
      if (!ctx) return;
      if (_charts[id]) _charts[id].destroy();
      _charts[id] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: isDark ? '#1b1b1b' : '#ffffff', hoverOffset: 4 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { 
            legend: { position: 'right', labels: { padding: 12, usePointStyle: true, font: { family: "'Inter', sans-serif", size: 12 } } }, 
            tooltip: { padding: 10, cornerRadius: 6, titleFont: { family: "'Inter', sans-serif", size: 13 }, bodyFont: { family: "'Inter', sans-serif", size: 12 } }
          },
          cutout: '70%',
        }
      });
    };

    const dept      = s.byDepartment || {};
    const sentiment = s.bySentiment  || {};
    const priority  = s.byPriority   || {};
    const status    = s.byStatus     || {};

    makeBar('chart-dept', Object.keys(dept), Object.values(dept), '#005ea2');
    makeDoughnut('chart-sentiment', Object.keys(sentiment), Object.values(sentiment),
      ['#538200', '#757575', '#d83933']);
    makeDoughnut('chart-priority', Object.keys(priority), Object.values(priority),
      ['#d83933', '#ffbe2e', '#538200']);
    makeDoughnut('chart-status', Object.keys(status), Object.values(status),
      ['#757575', '#0076d6', '#538200']);
  },

  renderRecent() {
    const list = (this._stats?.recent || this._complaints.slice(0, 5));
    const tbody = document.getElementById('recent-table');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5">${CivicEmpty.render({ title: 'No complaints yet' })}</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(c => `
      <tr>
        <td><span class="td-id">${c.id}</span></td>
        <td class="truncate" style="max-width:220px" title="${c.title || c.text}">${c.title || c.text?.slice(0, 50)}</td>
        <td>${c.department || '—'}</td>
        <td>${CivicBadge.render(c.priority)}</td>
        <td>${CivicBadge.render(c.status)}</td>
      </tr>
    `).join('');
  },

  renderInsights() {
    const list = this._complaints;
    if (!list.length) return;
    const el = document.getElementById('insights-panel');
    if (!el) return;

    const dept = {};
    list.forEach(c => dept[c.department] = (dept[c.department] || 0) + 1);
    const topDept   = Object.entries(dept).sort((a, b) => b[1] - a[1])[0];
    const negCount  = list.filter(c => c.sentiment === 'Negative').length;
    const highCount = list.filter(c => c.priority === 'High').length;
    const unresolved = list.filter(c => c.status !== 'Resolved').length;
    const negPct = Math.round(negCount / list.length * 100);

    const insights = [
      topDept && `<strong>${topDept[0]}</strong> is the most reported department with ${topDept[1]} complaint${topDept[1]>1?'s':''}.`,
      `${unresolved} of ${list.length} complaint${list.length>1?'s':''} remain${unresolved===1?'s':''} unresolved.`,
      highCount > 0 && `${highCount} complaint${highCount>1?'s are':' is'} marked <strong>High Priority</strong> and require attention.`,
      `${negPct}% of complaints carry negative sentiment, indicating active civic issues.`,
    ].filter(Boolean);

    el.innerHTML = insights.map(i =>
      `<div class="alert alert-info" style="margin-bottom:.5rem;font-size:.875rem"><svg style="width:1rem;height:1rem;flex-shrink:0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>${i}</span></div>`
    ).join('');
  },

  refreshCharts() {
    if (this._stats) this.renderCharts();
  }
};
