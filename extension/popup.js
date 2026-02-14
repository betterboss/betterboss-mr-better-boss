// Better Boss — DocFill v2.0 Popup
// https://better-boss.ai

document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const dot = $('dot');
  const statusTxt = $('status-text');
  const setupCta = $('setup-cta');
  const infoSec = $('info-section');
  const infoGrid = $('info-grid');
  const actionSec = $('actions-section');
  const avatar = $('popup-avatar');
  const name = $('popup-name');
  const company = $('popup-company');

  let loggedIn = false;

  function initials(n) {
    if (!n) return 'BB';
    const p = n.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].substring(0, 2).toUpperCase();
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // Load profile from local storage
  chrome.storage.local.get(['profile'], (r) => {
    if (chrome.runtime.lastError) {
      statusTxt.textContent = 'Storage error — try reloading';
      return;
    }
    const p = r.profile;
    if (p && p.ownerName) {
      loggedIn = true;
      avatar.textContent = initials(p.ownerName);
      name.textContent = p.ownerName;
      company.textContent = p.bizName || '';
      setupCta.style.display = 'none';
    } else {
      setupCta.style.display = 'block';
    }
    checkTab();
  });

  function checkTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url || !tab.url.includes('app.jobtread.com')) {
        dot.className = 'dot dot--off';
        statusTxt.textContent = 'Not on a JobTread page';
        return;
      }
      chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' }, (resp) => {
        if (chrome.runtime.lastError || !resp) {
          dot.className = 'dot dot--warn';
          statusTxt.textContent = 'Loading... refresh the page if stuck';
          return;
        }
        if (resp.isRelevantPage) {
          dot.className = 'dot dot--on';
          statusTxt.textContent = 'Ready — click the DocFill button on the page';
          if (loggedIn) actionSec.style.display = 'block';
        } else {
          dot.className = 'dot dot--warn';
          statusTxt.textContent = 'Navigate to a document page';
        }
        const rows = [];
        if (resp.jobInfo?.jobName) rows.push(['Job', resp.jobInfo.jobName]);
        if (resp.jobInfo?.jobNumber) rows.push(['Job #', resp.jobInfo.jobNumber]);
        if (resp.customerInfo?.email) rows.push(['Email', resp.customerInfo.email]);
        if (resp.customerInfo?.phone) rows.push(['Phone', resp.customerInfo.phone]);
        if (rows.length) {
          infoSec.style.display = 'block';
          infoGrid.innerHTML = rows.map(([l, v]) =>
            `<div class="info-row"><span class="info-l">${l}</span><span class="info-v">${escHtml(v)}</span></div>`
          ).join('');
        }
      });
    });
  }

  $('btn-panel').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' }, () => {
        if (!chrome.runtime.lastError) window.close();
      });
    });
  });

  $('btn-setup').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('btn-options').addEventListener('click', () => chrome.runtime.openOptionsPage());
});
