// Better Boss DocFill v3.0 — Popup
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  function initials(n) {
    if (!n) return 'BB';
    const p = n.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
  }

  chrome.storage.local.get(['profile'], (r) => {
    const p = r.profile;
    if (p && p.ownerName) {
      $('avatar').textContent = initials(p.ownerName);
      $('name').textContent = p.ownerName;
      $('company').textContent = p.bizName || '';
    } else {
      $('cta').style.display = 'block';
    }
    checkTab();
  });

  function checkTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url || !tab.url.includes('app.jobtread.com')) {
        $('dot').className = 'dot dot--off';
        $('status').textContent = 'Not on JobTread';
        return;
      }
      chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' }, (resp) => {
        if (chrome.runtime.lastError || !resp) {
          $('dot').className = 'dot dot--warn';
          $('status').textContent = 'Loading… refresh if stuck';
          return;
        }
        if (resp.isDocPage) {
          $('dot').className = 'dot dot--on';
          $('status').textContent = 'Ready';
          $('open').style.display = 'flex';
        } else {
          $('dot').className = 'dot dot--warn';
          $('status').textContent = 'Navigate to a document';
        }
      });
    });
  }

  $('open').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' }, () => {
        if (!chrome.runtime.lastError) window.close();
      });
    });
  });

  $('setup').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('opts').addEventListener('click', () => chrome.runtime.openOptionsPage());
});
