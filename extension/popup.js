// =============================================================================
// BetterBoss Auto-Populate — Popup Script
// Controls the extension popup interface
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const btnOpenPanel = document.getElementById('btn-open-panel');
  const btnOptions = document.getElementById('btn-options');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const pageInfoSection = document.getElementById('page-info-section');
  const infoGrid = document.getElementById('info-grid');

  // ---- Query Active Tab ----

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];

    if (!tab || !tab.url || !tab.url.includes('app.jobtread.com')) {
      statusDot.className = 'status-dot status-dot--inactive';
      statusText.textContent = 'Not on a JobTread page';
      btnOpenPanel.disabled = true;
      return;
    }

    // Ask content script for page info
    chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        statusDot.className = 'status-dot status-dot--warning';
        statusText.textContent = 'Extension loading... try refreshing';
        return;
      }

      if (response.isRelevantPage) {
        statusDot.className = 'status-dot status-dot--active';
        statusText.textContent = 'Ready — click the blue button on the page';
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

  // ---- Open Side Panel ----

  btnOpenPanel.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      // Send message to content script to toggle the panel open
      chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' }, () => {
        if (chrome.runtime.lastError) {
          statusDot.className = 'status-dot status-dot--warning';
          statusText.textContent = 'Could not reach page — try refreshing';
          return;
        }
        // Close the popup so user can interact with the page panel
        window.close();
      });
    });
  });

  // ---- Options Page ----

  btnOptions.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // ---- Helpers ----

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
