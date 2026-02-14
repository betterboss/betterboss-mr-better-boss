// Better Boss DocFill — Bookmarklet Loader
// This file is loaded when users click the bookmarklet.
// It sets a flag so the main script knows to auto-open the panel,
// then loads the latest DocFill userscript from the server.
(function(){
  window.__bbDocFillBookmarklet = true;
  var s=document.createElement('script');
  s.src='https://mybetterboss.ai/betterboss-docfill.user.js?t='+Date.now();
  s.onload=function(){console.log('[Better Boss] DocFill loaded via bookmarklet');};
  s.onerror=function(){alert('Failed to load Better Boss DocFill. Check your internet connection.');};
  document.head.appendChild(s);
})();
