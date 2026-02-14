// =============================================================================
// Better Boss DocFill — Popup Script
// Shows profile status, page detection, and quick actions
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const btnOpenPanel = document.getElementById('btn-open-panel');
  const btnOptions = document.getElementById('btn-options');
  const btnSetup = document.getElementById('btn-setup');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const pageInfoSection = document.getElementById('page-info-section');
  const infoGrid = document.getElementById('info-grid');
  const setupCta = document.getElementById('setup-cta');
  const howItWorks = document.getElementById('how-it-works');
  const actionsSection = document.getElementById('actions-section');
  const popupAvatar = document.getElementById('popup-avatar');
  const popupName = document.getElementById('popup-name');
  const popupCompany = document.getElementById('popup-company');

  // ---- Helpers ----

  function getInitials(name) {
    if (!name) return 'BB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Load Profile ----

  let isLoggedIn = false;

  chrome.storage.sync.get(['profile'], (result) => {
    const profile = result.profile || null;

    if (profile && profile.ownerName) {
      isLoggedIn = true;
      popupAvatar.textContent = getInitials(profile.ownerName);
      popupName.textContent = profile.ownerName;
      popupCompany.textContent = profile.bizName || '';
      setupCta.style.display = 'none';
      howItWorks.style.display = 'block';
    } else {
      popupAvatar.textContent = 'BB';
      popupName.textContent = 'Not logged in';
      popupCompany.textContent = '';
      setupCta.style.display = 'block';
      howItWorks.style.display = 'none';
    }

    // Now check the active tab
    checkActiveTab();
  });

  // ---- Check Active Tab ----

  function checkActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];

      if (!tab || !tab.url || !tab.url.includes('app.jobtread.com')) {
        statusDot.className = 'status-dot status-dot--inactive';
        statusText.textContent = 'Not on a JobTread page';
        if (btnOpenPanel) btnOpenPanel.disabled = true;
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          statusDot.className = 'status-dot status-dot--warning';
          statusText.textContent = 'Extension loading... try refreshing';
          return;
        }

        if (response.isRelevantPage) {
          statusDot.className = 'status-dot status-dot--active';
          statusText.textContent = 'Ready — click the BB button on the page';
          if (isLoggedIn) {
            actionsSection.style.display = 'block';
          }
        } else {
          statusDot.className = 'status-dot status-dot--warning';
          statusText.textContent = 'Navigate to a document page to get started';
        }

        // Show detected info
        if (response.jobInfo || response.customerInfo) {
          const rows = [];

          if (response.jobInfo.jobName) {
            rows.push({ label: 'Job', value: response.jobInfo.jobName });
          }
          if (response.jobInfo.jobNumber) {
            rows.push({ label: 'Job #', value: response.jobInfo.jobNumber });
          }
          if (response.customerInfo.email) {
            rows.push({ label: 'Email', value: response.customerInfo.email });
          }
          if (response.customerInfo.phone) {
            rows.push({ label: 'Phone', value: response.customerInfo.phone });
          }

          if (rows.length > 0) {
            pageInfoSection.style.display = 'block';
            infoGrid.innerHTML = rows
              .map(
                (r) => `
                <div class="info-row">
                  <span class="info-row__label">${r.label}</span>
                  <span class="info-row__value">${escapeHtml(r.value)}</span>
                </div>
              `
              )
              .join('');
          }
        }
      });
    });
  }

  // ---- Open Side Panel ----

  btnOpenPanel.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' }, () => {
        if (chrome.runtime.lastError) {
          statusDot.className = 'status-dot status-dot--warning';
          statusText.textContent = 'Could not reach page — try refreshing';
          return;
        }
        window.close();
      });
    });
  });

  // ---- Set Up Profile ----

  btnSetup.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ---- Settings ----

  btnOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
