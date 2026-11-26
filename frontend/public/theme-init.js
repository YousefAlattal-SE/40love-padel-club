// Match the first paint to the saved preferences while the app loads.
// Loaded synchronously from <head> (not inline) so a strict CSP can use script-src 'self'.
(function () {
  try {
    var root = document.documentElement;
    var dark = localStorage.getItem('serva-theme-v2') === 'dark';
    var canvas = dark ? '#142522' : '#f6f4ea';
    root.lang = localStorage.getItem('serva-locale') === 'ar' ? 'ar' : 'en';
    root.dir = root.lang === 'ar' ? 'rtl' : 'ltr';
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.setProperty('--initial-canvas', canvas);
    document.querySelector('meta[name="theme-color"]').content = canvas;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the app applies defaults after load.
  }
})();
