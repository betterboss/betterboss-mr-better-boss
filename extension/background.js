// =============================================================================
// BetterBoss Auto-Populate — Background Service Worker
// Handles extension lifecycle events and cross-tab coordination
// =============================================================================

// Set default settings on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      autoPopulateEnabled: true,
      descriptionTemplate: '',
      footerTemplate: '',
    });
    console.log('[BetterBoss] Extension installed, defaults set.');
  }
});

// Listen for tab updates to re-inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('app.jobtread.com')
  ) {
    // Notify the content script that the page finished loading
    chrome.tabs.sendMessage(tabId, { action: 'pageLoaded' }).catch(() => {
      // Content script not yet loaded, that's fine
    });
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSettings') {
    chrome.storage.sync.get(null, (items) => {
      sendResponse(items);
    });
    return true;
  }

  if (message.action === 'saveSettings') {
    chrome.storage.sync.set(message.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
