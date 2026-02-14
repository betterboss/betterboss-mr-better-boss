// =============================================================================
// Better Boss — DocFill v2.0 Background Service Worker
// https://better-boss.ai
// =============================================================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open options on first install so user sets up profile
    chrome.runtime.openOptionsPage();
    console.log('[Better Boss] Extension installed — opening setup.');
  } else if (details.reason === 'update') {
    // Migrate v1 data from sync to local if needed
    chrome.storage.sync.get(null, (syncData) => {
      if (syncData && syncData.profile && syncData.profile.ownerName) {
        chrome.storage.local.get(null, (localData) => {
          if (!localData || !localData.descTemplates) {
            // v1 data exists in sync but not in local — migration needed
            // The content script handles the actual migration on next load
            console.log('[Better Boss] v1 data detected in sync storage — will migrate on next page load.');
          }
        });
      }
    });
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
  if (message.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
    return false;
  }

  if (message.action === 'getData') {
    chrome.storage.local.get(null, (items) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse(items);
      }
    });
    return true;
  }

  if (message.action === 'saveData') {
    chrome.storage.local.set(message.data, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }
});
