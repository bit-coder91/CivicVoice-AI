window.CivicDigilocker = {
  isVerified: false,

  init() {
    this.isVerified = localStorage.getItem('cv_digilocker_verified') === 'true';
    this.renderProfileStatus();
  },

  renderBadge(isVerified) {
    if (!isVerified) return '';
    return `
      <span class="digilocker-badge" title="DigiLocker Verified Citizen">
        <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
      </span>
    `;
  },

  renderProfileStatus() {
    const container = document.getElementById('digilocker-status-container');
    if (!container) return;

    if (this.isVerified) {
      container.innerHTML = `
        <div style="width:3rem;height:3rem;border-radius:50%;background:rgba(13,110,253,0.1);display:flex;align-items:center;justify-content:center;color:#0D6EFD">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
        </div>
        <div style="flex:1">
          <div style="font-weight:700;color:var(--text-primary);display:flex;align-items:center">
            Verified Citizen ${this.renderBadge(true)}
          </div>
          <div style="font-size:0.875rem;color:var(--text-secondary)">Your identity is securely verified with DigiLocker.</div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="CivicDigilocker.revoke()">Revoke</button>
      `;
    } else {
      container.innerHTML = `
        <div style="width:3rem;height:3rem;border-radius:50%;background:rgba(96,96,96,0.1);display:flex;align-items:center;justify-content:center;color:var(--text-muted)">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 11c0 3.532 2.156 6.643 5.342 7.858a1 1 0 001.316-1.316 8.002 8.002 0 01-11.316 0 1 1 0 00-1.316 1.316C9.844 17.643 12 14.532 12 11V5.5l5.5-2.5v4"/></svg>
        </div>
        <div style="flex:1">
          <div style="font-weight:700;color:var(--text-primary)">Unverified</div>
          <div style="font-size:0.875rem;color:var(--text-secondary)">Link your DigiLocker account to verify your civic identity.</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="CivicDigilocker.startFlow()">Verify Now</button>
      `;
    }
  },

  startFlow() {
    const container = document.getElementById('digilocker-status-container');
    container.innerHTML = `
      <div style="width:3rem;height:3rem;display:flex;align-items:center;justify-content:center;color:var(--color-brand)">
        <span class="spinner" style="width:1.5rem;height:1.5rem"></span>
      </div>
      <div style="flex:1">
        <div style="font-weight:700;color:var(--text-primary)">Verification in Progress...</div>
        <div style="font-size:0.875rem;color:var(--text-secondary)">Connecting to DigiLocker OAuth...</div>
      </div>
    `;

    // Simulate OAuth flow securely
    setTimeout(() => {
      this.isVerified = true;
      localStorage.setItem('cv_digilocker_verified', 'true');
      this.renderProfileStatus();
      if (window.CivicToast) CivicToast.show('Successfully verified with DigiLocker.', 'success');
    }, 2000);
  },

  revoke() {
    this.isVerified = false;
    localStorage.removeItem('cv_digilocker_verified');
    this.renderProfileStatus();
    if (window.CivicToast) CivicToast.show('Verification revoked.', 'info');
  }
};

document.addEventListener('DOMContentLoaded', () => CivicDigilocker.init());
