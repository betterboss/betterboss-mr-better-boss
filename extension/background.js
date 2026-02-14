// =============================================================================
// Better Boss — DocFill Background Service Worker
// https://mybetterboss.ai
// =============================================================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({ descriptionTemplate: '', footerTemplate: '' }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Better Boss] Install storage error:', chrome.runtime.lastError);
      }
    });
    // Open options on first install so user sets up profile
    chrome.runtime.openOptionsPage();
    console.log('[Better Boss] Extension installed — opening setup.');
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('app.jobtread.com')
  ) {
    chrome.tabs.sendMessage(tabId, { action: 'pageLoaded' }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSettings') {
    chrome.storage.sync.get(null, (items) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse(items);
      }
    });
    return true;
  }

  if (message.action === 'saveSettings') {
    chrome.storage.sync.set(message.settings, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (message.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
    return false;
  }

  if (message.action === 'exportData') {
    chrome.storage.sync.get(null, (items) => {
      sendResponse(items);
    });
    return true;
  }
});
