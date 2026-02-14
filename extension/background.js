// =============================================================================
// Better Boss — DocFill v2.0 Background Service Worker
// https://better-boss.ai
//
// Connectors:
//   1. Version check — polls better-boss.ai/api/extension/version
//   2. Cloud sync — push/pull data to better-boss.ai/api/extension/sync
//   3. External messaging — lets better-boss.ai pages talk to the extension
//   4. Internal messaging — popup/options/content script communication
// =============================================================================

const API_BASE = 'https://better-boss.ai';
const VERSION = '2.0.0';

// ==========================================================================
// INSTALL & UPDATE
// ==========================================================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
    console.log('[Better Boss] Extension installed — opening setup.');
    // Set up periodic version check (every 6 hours)
    chrome.alarms.create('bb-version-check', { periodInMinutes: 360 });
  } else if (details.reason === 'update') {
    console.log('[Better Boss] Extension updated to v' + VERSION);
    // Migrate v1 data from sync to local if needed
    chrome.storage.sync.get(null, (syncData) => {
      if (syncData && syncData.profile && syncData.profile.ownerName) {
        chrome.storage.local.get(null, (localData) => {
          if (!localData || !localData.descTemplates) {
            console.log('[Better Boss] v1 data detected — will migrate on next page load.');
          }
        });
      }
    });
    chrome.alarms.create('bb-version-check', { periodInMinutes: 360 });
  }
});

// ==========================================================================
// VERSION CHECK CONNECTOR
// ==========================================================================

async function checkForUpdates() {
  try {
    const resp = await fetch(`${API_BASE}/api/extension/version`, {
      headers: { 'X-Extension-Version': VERSION },
    });
    if (!resp.ok) return;
    const info = await resp.json();
    if (info.version && info.version !== VERSION) {
      // Store update info — content script / popup will show notification
      chrome.storage.local.set({
        _updateAvailable: {
          version: info.version,
          downloadUrl: info.downloadUrl,
          changelog: info.changelog,
          checkedAt: new Date().toISOString(),
        },
      });
      console.log(`[Better Boss] Update available: v${info.version}`);
    } else {
      // Clear any stale update notice
      chrome.storage.local.remove('_updateAvailable');
    }
  } catch (e) {
    console.log('[Better Boss] Version check failed:', e.message);
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'bb-version-check') {
    checkForUpdates();
  }
  if (alarm.name === 'bb-auto-sync') {
    autoSync();
  }
});

// ==========================================================================
// CLOUD SYNC CONNECTOR
// ==========================================================================

async function pushSync(token) {
  if (!token) return { error: 'No sync token' };
  try {
    const data = await new Promise((resolve) => {
      chrome.storage.local.get(null, resolve);
    });
    // Strip internal keys
    const { _updateAvailable, _syncToken, _lastSynced, ...syncData } = data;
    const resp = await fetch(`${API_BASE}/api/extension/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, data: syncData }),
    });
    const result = await resp.json();
    if (result.success) {
      chrome.storage.local.set({ _lastSynced: new Date().toISOString() });
    }
    return result;
  } catch (e) {
    return { error: e.message };
  }
}

async function pullSync(token) {
  if (!token) return { error: 'No sync token' };
  try {
    const resp = await fetch(`${API_BASE}/api/extension/sync?token=${encodeURIComponent(token)}`);
    const result = await resp.json();
    if (result.success && result.data) {
      const { _syncedAt, _token, ...cleanData } = result.data;
      await new Promise((resolve) => {
        chrome.storage.local.set(cleanData, resolve);
      });
      chrome.storage.local.set({ _lastSynced: new Date().toISOString() });
      return { success: true, syncedAt: _syncedAt };
    }
    return result;
  } catch (e) {
    return { error: e.message };
  }
}

async function generateSyncToken() {
  try {
    const resp = await fetch(`${API_BASE}/api/extension/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generateToken: true }),
    });
    const result = await resp.json();
    if (result.token) {
      chrome.storage.local.set({ _syncToken: result.token });
    }
    return result;
  } catch (e) {
    return { error: e.message };
  }
}

async function autoSync() {
  const data = await new Promise((resolve) => {
    chrome.storage.local.get(['_syncToken', 'prefs'], resolve);
  });
  if (data._syncToken && data.prefs && data.prefs.cloudSync) {
    await pushSync(data._syncToken);
    console.log('[Better Boss] Auto-sync completed');
  }
}

// ==========================================================================
// TAB EVENTS
// ==========================================================================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('app.jobtread.com')
  ) {
    chrome.tabs.sendMessage(tabId, { action: 'pageLoaded' }).catch(() => {});
  }
});

// ==========================================================================
// INTERNAL MESSAGING (popup, options, content scripts)
// ==========================================================================

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

  // Version check
  if (message.action === 'checkForUpdates') {
    checkForUpdates().then(() => sendResponse({ success: true }));
    return true;
  }

  // Sync connectors
  if (message.action === 'generateSyncToken') {
    generateSyncToken().then(sendResponse);
    return true;
  }

  if (message.action === 'pushSync') {
    pushSync(message.token).then(sendResponse);
    return true;
  }

  if (message.action === 'pullSync') {
    pullSync(message.token).then(sendResponse);
    return true;
  }
});

// ==========================================================================
// EXTERNAL MESSAGING (better-boss.ai pages)
// ==========================================================================

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // Only accept messages from our domains
  const allowed = ['https://better-boss.ai', 'http://localhost:3000'];
  const origin = sender.url ? new URL(sender.url).origin : '';
  if (!allowed.some(a => origin.startsWith(a))) {
    sendResponse({ error: 'Unauthorized origin' });
    return false;
  }

  // Connector: detect extension
  if (message.action === 'ping') {
    sendResponse({
      installed: true,
      version: VERSION,
      brand: 'Better Boss DocFill',
    });
    return false;
  }

  // Connector: get extension status
  if (message.action === 'getStatus') {
    chrome.storage.local.get(['profile', 'prefs', '_lastSynced'], (data) => {
      sendResponse({
        installed: true,
        version: VERSION,
        hasProfile: !!(data.profile && data.profile.ownerName),
        profileName: data.profile?.ownerName || null,
        company: data.profile?.bizName || null,
        lastSynced: data._lastSynced || null,
      });
    });
    return true;
  }

  // Connector: push profile from web app to extension
  if (message.action === 'setProfile') {
    if (message.profile && typeof message.profile === 'object') {
      chrome.storage.local.set({ profile: message.profile }, () => {
        sendResponse({ success: true });
      });
      return true;
    }
    sendResponse({ error: 'Invalid profile data' });
    return false;
  }

  // Connector: open DocFill panel on current JT tab
  if (message.action === 'openPanel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('app.jobtread.com')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' }, (resp) => {
          sendResponse(resp || { error: 'Content script not loaded' });
        });
      } else {
        sendResponse({ error: 'Not on a JobTread page' });
      }
    });
    return true;
  }

  sendResponse({ error: 'Unknown action: ' + message.action });
  return false;
});

// Run initial version check on worker startup
checkForUpdates();
