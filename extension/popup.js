// =============================================================================
// BetterBoss Auto-Populate — Popup Script
// Controls the extension popup interface
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const autoToggle = document.getElementById('auto-toggle');
  const btnPopulate = document.getElementById('btn-populate');
  const btnDescOnly = document.getElementById('btn-desc-only');
  const btnFooterOnly = document.getElementById('btn-footer-only');
  const btnOptions = document.getElementById('btn-options');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const pageInfoSection = document.getElementById('page-info-section');
  const infoGrid = document.getElementById('info-grid');

  // ---- Load Settings ----

  chrome.storage.sync.get(['autoPopulateEnabled'], (result) => {
    autoToggle.checked = result.autoPopulateEnabled !== false;
  });

  // ---- Save Toggle State ----

  autoToggle.addEventListener('change', () => {
    chrome.storage.sync.set({ autoPopulateEnabled: autoToggle.checked });
  });

  // ---- Query Active Tab ----

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];

    if (!tab || !tab.url || !tab.url.includes('app.jobtread.com')) {
      statusDot.className = 'status-dot status-dot--inactive';
      statusText.textContent = 'Not on a JobTread page';
      btnPopulate.disabled = true;
      btnDescOnly.disabled = true;
      btnFooterOnly.disabled = true;
      return;
    }

    // Ask content script for page info
    chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        statusDot.className = 'status-dot status-dot--warning';
        statusText.textContent = 'Extension loading... try refreshing';
        return;
      }

      // Update status
      if (response.isDocumentPage) {
        statusDot.className = 'status-dot status-dot--active';
        statusText.textContent = `Document page — ${response.editableFieldCount} editable field(s) found`;
      } else if (response.isJobPage) {
        statusDot.className = 'status-dot status-dot--active';
        statusText.textContent = `Job page — ${response.editableFieldCount} editable field(s)`;
      } else {
        statusDot.className = 'status-dot status-dot--warning';
        statusText.textContent = 'Navigate to a document to auto-populate';
      }

      // Show detected info
      if (response.jobInfo || response.customerInfo) {
        pageInfoSection.style.display = 'block';
        const rows = [];

        if (response.jobInfo.jobName) {
          rows.push({ label: 'Job', value: response.jobInfo.jobName });
        }
        if (response.jobInfo.jobNumber) {
          rows.push({ label: 'Job #', value: response.jobInfo.jobNumber });
        }
        if (response.jobInfo.jobAddress) {
          rows.push({ label: 'Address', value: response.jobInfo.jobAddress });
        }
        if (response.customerInfo.customerName) {
          rows.push({ label: 'Customer', value: response.customerInfo.customerName });
        }
        if (response.customerInfo.company) {
          rows.push({ label: 'Company', value: response.customerInfo.company });
        }
        if (response.customerInfo.email) {
          rows.push({ label: 'Email', value: response.customerInfo.email });
        }
        if (response.customerInfo.phone) {
          rows.push({ label: 'Phone', value: response.customerInfo.phone });
        }

        if (rows.length === 0) {
          rows.push({ label: 'Info', value: '', empty: true });
        }

        infoGrid.innerHTML = rows
          .map(
            (r) => `
            <div class="info-row">
              <span class="info-row__label">${r.label}</span>
              <span class="info-row__value ${r.empty ? 'info-row__value--empty' : ''}">
                ${r.empty ? 'No info detected — click the panel on page to enter manually' : escapeHtml(r.value)}
              </span>
            </div>
          `
          )
          .join('');
      }
    });
  });

  // ---- Populate Actions ----

  btnPopulate.addEventListener('click', () => {
    sendPopulateMessage('both');
  });

  btnDescOnly.addEventListener('click', () => {
    sendPopulateMessage('description');
  });

  btnFooterOnly.addEventListener('click', () => {
    sendPopulateMessage('footer');
  });

  function sendPopulateMessage(mode) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      chrome.tabs.sendMessage(tab.id, { action: 'populate', mode }, (response) => {
        if (chrome.runtime.lastError) {
          statusDot.className = 'status-dot status-dot--warning';
          statusText.textContent = 'Could not reach page — try refreshing';
          return;
        }

        if (response && response.success) {
          statusDot.className = 'status-dot status-dot--active';
          statusText.textContent = 'Fields populated successfully!';
        }
      });
    });
  }

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
