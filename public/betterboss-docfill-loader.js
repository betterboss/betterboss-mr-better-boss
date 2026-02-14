// Better Boss DocFill — Bookmarklet Loader
// This file is loaded when users click the bookmarklet.
// It fetches the latest DocFill userscript from the server and runs it.
// Note: The bookmarklet itself handles the __bbDocFillLoaded guard to prevent
// double-loading, so we skip the check here and just load the userscript.
(function(){
  var s=document.createElement('script');
  s.src='https://mybetterboss.ai/betterboss-docfill.user.js?t='+Date.now();
  s.onload=function(){console.log('[Better Boss] DocFill loaded via bookmarklet');};
  s.onerror=function(){alert('Failed to load Better Boss DocFill. Check your internet connection.');window.__bbDocFillLoaded=false;};
  document.head.appendChild(s);
})();
