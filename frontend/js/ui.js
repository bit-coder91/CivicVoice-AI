window.CivicTheme = {
  init() {
    document.body.classList.add('no-transition');
    const stored = localStorage.getItem('cv-theme');
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = stored || preferred;
    document.documentElement.setAttribute('data-theme', theme);
    setTimeout(() => document.body.classList.remove('no-transition'), 50);
    this.updateIcon(theme);
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cv-theme', next);
    this.updateIcon(next);
  },

  updateIcon(theme) {
    const sun = document.getElementById('icon-sun');
    const moon = document.getElementById('icon-moon');
    if (!sun || !moon) return;
    if (theme === 'dark') { sun.classList.remove('hidden'); moon.classList.add('hidden'); }
    else                  { moon.classList.remove('hidden'); sun.classList.add('hidden'); }
  }
};

const ICONS = {
  success: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
  error:   `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
  warning: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
  info:    `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
};

window.CivicToast = {
  show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${ICONS[type] || ICONS.info}</span>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" aria-label="Dismiss notification">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;
    toast.querySelector('.toast-close').addEventListener('click', () => this.dismiss(toast));
    container.appendChild(toast);
    if (duration > 0) setTimeout(() => this.dismiss(toast), duration);
    return toast;
  },
  dismiss(toast) {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 250);
  }
};

window.CivicBadge = {
  render(value) {
    if (!value) return '<span class="badge badge-neutral">—</span>';
    const map = {
      'High':        'badge-high',
      'Medium':      'badge-medium',
      'Low':         'badge-low',
      'Positive':    'badge-positive',
      'Negative':    'badge-negative',
      'Neutral':     'badge-neutral',
      'Pending':     'badge-pending',
      'In Progress': 'badge-inprogress',
      'Resolved':    'badge-resolved',
    };
    const cls = map[value] || 'badge-neutral';
    return `<span class="badge ${cls}"><span class="badge-dot" aria-hidden="true"></span>${value}</span>`;
  }
};

window.CivicLoading = {
  skeleton(lines = 3) {
    return Array.from({ length: lines }, (_, i) =>
      `<div class="skeleton skeleton-line" style="width:${i === lines-1 ? '60' : 85 + Math.random()*15|0}%"></div>`
    ).join('');
  },
  spinner(label = 'Loading…') {
    return `<div class="flex-center" style="padding:2rem;gap:.75rem;color:var(--text-muted)"><span class="spinner" role="status"></span><span>${label}</span></div>`;
  },
  skeletonCard(rows = 4) {
    return `<div class="card" aria-busy="true" aria-label="Loading…">${this.skeleton(rows)}</div>`;
  }
};

window.CivicEmpty = {
  render({ title = 'No data found', desc = '', cta = null } = {}) {
    return `
      <div class="empty-state" role="status">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        <p class="empty-title">${title}</p>
        ${desc ? `<p class="empty-desc">${desc}</p>` : ''}
        ${cta ? `<div style="margin-top:.75rem">${cta}</div>` : ''}
      </div>`;
  }
};

window.CivicModal = {
  _current: null,
  open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    this._current = id;
    const first = el.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (first) setTimeout(() => first.focus(), 50);
  },
  close(id) {
    const el = document.getElementById(id || this._current);
    if (!el) return;
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this._current = null;
  }
};

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-backdrop')) window.CivicModal.close();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && window.CivicModal._current) window.CivicModal.close();
});

window.debounce = function(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
};

window.CivicDate = {
  age(dateStr) {
    if (!dateStr) return null;
    return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  },
  ageLabel(dateStr) {
    const d = this.age(dateStr);
    if (d === null) return '';
    if (d === 0) return 'Today';
    if (d === 1) return '1 day ago';
    if (d < 7)  return `${d} days ago`;
    if (d < 30) return `${Math.floor(d/7)} week${Math.floor(d/7)>1?'s':''} ago`;
    return `${Math.floor(d/30)} month${Math.floor(d/30)>1?'s':''} ago`;
  },
  agingStatus(dateStr, status) {
    const d = this.age(dateStr);
    if (status === 'Resolved') return null;
    if (d <= 2)  return { label: 'New',     cls: 'badge-low' };
    if (d <= 7)  return { label: 'Aging',   cls: 'badge-medium' };
    return             { label: 'Overdue',  cls: 'badge-high' };
  }
};
