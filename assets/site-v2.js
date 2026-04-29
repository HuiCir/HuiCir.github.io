(function () {
  const CHINESE_PREFIX = '';
  const ENGLISH_PREFIX = '/en';

  function currentLang() {
    const path = window.location.pathname;
    if (path.startsWith('/en/') || path === '/en' || path === '/en/') return 'en';
    return 'zh';
  }

  function toPath(lang) {
    const path = window.location.pathname;
    if (lang === 'en') {
      if (path.startsWith('/en/') || path === '/en' || path === '/en/') return path;
      if (path === '/') return '/en/';
      return '/en' + (path.startsWith('/') ? path : '/' + path);
    }
    // zh: strip /en prefix
    if (path.startsWith('/en/')) {
      const stripped = path.slice(3);
      return stripped || '/';
    }
    if (path === '/en' || path === '/en/') return '/';
    return path;
  }

  function buildSwitcher() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;

    const lang = currentLang();

    const div = document.createElement('div');
    div.className = 'lang-switcher';

    const zhBtn = document.createElement('button');
    zhBtn.textContent = 'ZH';
    zhBtn.setAttribute('aria-label', 'Switch to Chinese');
    if (lang === 'zh') zhBtn.setAttribute('aria-current', 'true');

    const enBtn = document.createElement('button');
    enBtn.textContent = 'EN';
    enBtn.setAttribute('aria-label', 'Switch to English');
    if (lang === 'en') enBtn.setAttribute('aria-current', 'true');

    zhBtn.addEventListener('click', function () {
      if (lang === 'zh') return;
      try { localStorage.setItem('tns-lang', 'zh'); } catch (_) {}
      window.location.href = toPath('zh') + window.location.search + window.location.hash;
    });

    enBtn.addEventListener('click', function () {
      if (lang === 'en') return;
      try { localStorage.setItem('tns-lang', 'en'); } catch (_) {}
      window.location.href = toPath('en') + window.location.search + window.location.hash;
    });

    div.appendChild(zhBtn);
    div.appendChild(enBtn);
    nav.appendChild(div);
  }

  // Auto-redirect on root path based on saved preference
  function autoRedirect() {
    const path = window.location.pathname;
    // Only redirect at the root index
    if (path !== '/' && path !== '/index.html') return;
    try {
      const saved = localStorage.getItem('tns-lang');
      if (saved === 'en') {
        // Check we haven't already redirected in this session
        if (!window.location.search.includes('_tns_redirect')) {
          window.location.replace('/en/' + window.location.search + (window.location.search ? '&' : '?') + '_tns_redirect');
        }
        return;
      }
    } catch (_) {}
    // Navigate by browser language for first-time visitors
    if (navigator.language && navigator.language.startsWith('en') && !navigator.language.startsWith('en-US-u-')) {
      // Only redirect if it looks like a genuine English preference
      const englishLocales = ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU', 'en-NZ', 'en-IE'];
      if (englishLocales.includes(navigator.language)) {
        window.location.replace('/en/' + window.location.search + (window.location.search ? '&' : '?') + '_tns_redirect');
        return;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      buildSwitcher();
      autoRedirect();
    });
  } else {
    buildSwitcher();
    autoRedirect();
  }
})();
