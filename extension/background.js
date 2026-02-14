// Better Boss — DocFill v3.0 Background Service Worker

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
    return false;
  }
  if (msg.action === 'getData') {
    chrome.storage.local.get(null, (items) => reply(items));
    return true;
  }
  if (msg.action === 'saveData') {
    chrome.storage.local.set(msg.data, () => reply({ ok: true }));
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete' && tab.url && tab.url.includes('app.jobtread.com')) {
    chrome.tabs.sendMessage(tabId, { action: 'pageLoaded' }).catch(() => {});
  }
});
