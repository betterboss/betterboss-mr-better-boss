// Better Boss DocFill — Bookmarklet Loader
// This file is loaded when users click the bookmarklet.
// It fetches the latest DocFill userscript from the server and runs it.
(function(){
  if(window.__bbDocFillLoaded){console.log('[Better Boss] DocFill already loaded');return;}
  window.__bbDocFillLoaded=true;
  var s=document.createElement('script');
  s.src='https://mybetterboss.ai/betterboss-docfill.user.js?t='+Date.now();
  s.onload=function(){console.log('[Better Boss] DocFill loaded via bookmarklet');};
  s.onerror=function(){alert('Failed to load Better Boss DocFill. Check your internet connection.');window.__bbDocFillLoaded=false;};
  document.head.appendChild(s);
})();
