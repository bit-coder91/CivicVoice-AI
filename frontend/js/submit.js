window.CivicSubmit = {
  async handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const resultBox = document.getElementById('analysis-result');
    const formData = new FormData(form);

    const payload = {
      title: formData.get('title'),
      text: formData.get('text'),
      location: formData.get('location'),
      citizenName: formData.get('citizenName') || undefined,
      contact: formData.get('contact') || undefined
    };

    btn.disabled = true;
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner" style="width:1rem;height:1rem;border-width:2px;border-top-color:#fff" role="status"></span> Processing with AI...`;
    resultBox.classList.add('hidden');

    try {
      const result = await CivicAPI.createComplaint(payload);

      if (window.CivicComplaints) CivicComplaints._complaints.unshift(result);
      if (window.CivicDashboard) window.CivicDashboard._complaints.unshift(result);

      CivicToast.show('Complaint submitted successfully', 'success');
      form.reset();
      this.updateCharCount();
      this._renderAiResult(result, resultBox);

    } catch (err) {
      CivicToast.show(err.message || 'Submission failed. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalBtnText;
    }
  },

  updateCharCount() {
    const textarea = document.getElementById('submit-text');
    const counter = document.getElementById('char-count');
    if (!textarea || !counter) return;

    const len = textarea.value.length;
    counter.textContent = `${len}/2000`;
    counter.className = 'char-count';
    if (len > 1900) counter.classList.add('danger');
    else if (len > 1500) counter.classList.add('warn');
  },

  _renderAiResult(c, container) {
    container.classList.remove('hidden');

    const renderTags = (tags) => {
      if (!tags || !tags.length) return '<span class="text-xs text-muted">None detected</span>';
      return tags.map(t => `<span class="keyword-tag">${t}</span>`).join('');
    };

    let mismatchAlert = '';
    if (c.department && c.aiDepartment && c.department !== c.aiDepartment && c.aiDepartment !== 'Other') {
      mismatchAlert = `<div class="alert alert-warning" style="margin-bottom:1rem">
        <svg style="width:1.25rem;height:1.25rem;flex-shrink:0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <div><strong>AI mismatch:</strong> You selected ${c.department}, but AI suggests <strong>${c.aiDepartment}</strong> based on content.</div>
      </div>`;
    }

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
        <h3 class="card-title" style="margin:0;display:flex;align-items:center;gap:0.5rem">
          <svg style="width:1.25rem;height:1.25rem;color:var(--color-brand)" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
          AI Analysis Complete
        </h3>
        <span class="text-xs font-mono font-bold" style="color:var(--color-brand)">ID: ${c.id}</span>
      </div>

      ${mismatchAlert}

      <div class="grid sm:grid-cols-2 gap-4">
        <div class="analysis-panel">
          <div class="text-xs font-bold text-muted uppercase tracking-wider mb-2">Categorization</div>

          <div class="analysis-row">
            <span class="analysis-key">Department</span>
            <span class="analysis-val font-semibold">${c.department}</span>
          </div>
          <div class="keywords-list mb-3">${renderTags(c.matchedKeywords)}</div>

          <div class="analysis-row">
            <span class="analysis-key">Priority</span>
            <span class="analysis-val">${CivicBadge.render(c.priority)}</span>
          </div>
          <div class="keywords-list mb-3">${renderTags(c.priorityIndicators)}</div>

          <div class="analysis-row">
            <span class="analysis-key">Sentiment</span>
            <span class="analysis-val">${CivicBadge.render(c.sentiment)}</span>
          </div>
          <div class="keywords-list">${renderTags(c.sentimentIndicators)}</div>
        </div>

        <div class="analysis-panel" style="display:flex;flex-direction:column">
          <div class="text-xs font-bold text-muted uppercase tracking-wider mb-2">AI Summary</div>
          <p class="text-sm" style="font-style:italic;margin-top:0;flex:1">"${c.summary || c.text}"</p>
          <div class="divider" style="margin:1rem 0"></div>
          <button type="button" class="btn btn-secondary w-full" onclick="CivicApp.viewComplaint('${c.id}')">
            View Full Details
          </button>
        </div>
      </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};
