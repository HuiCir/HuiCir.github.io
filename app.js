(() => {
  "use strict";

  const storageKey = "academic-homepage-language";
  const supportedLanguages = new Set(["en", "zh"]);

  function readPreference() {
    try {
      const stored = localStorage.getItem(storageKey);
      return supportedLanguages.has(stored) ? stored : "en";
    } catch {
      return "en";
    }
  }

  function start() {
    const translations = window.SITE_COPY || {};
    const languageButton = document.querySelector(".language-toggle");
    let language = readPreference();

    function applyLanguage(nextLanguage, persist = true) {
      if (!supportedLanguages.has(nextLanguage)) return;
      language = nextLanguage;
      const copy = translations[language] || {};

      document.documentElement.lang = language === "zh" ? "zh-Hans" : "en";
      document.documentElement.dataset.language = language;
      document.querySelectorAll("[data-i18n]").forEach((element) => {
        const key = element.dataset.i18n;
        if (typeof copy[key] === "string") element.textContent = copy[key];
      });

      [
        ["data-i18n-aria-label", "aria-label"],
        ["data-i18n-title", "title"],
      ].forEach(([translationAttribute, targetAttribute]) => {
        document.querySelectorAll(`[${translationAttribute}]`).forEach((element) => {
          const value = copy[element.getAttribute(translationAttribute)];
          if (typeof value === "string") element.setAttribute(targetAttribute, value);
        });
      });

      if (typeof copy.documentTitle === "string") document.title = copy.documentTitle;
      if (languageButton) {
        languageButton.textContent = language === "en" ? "中文" : "English";
        languageButton.lang = language === "en" ? "zh-Hans" : "en";
        languageButton.setAttribute("aria-label", language === "en" ? "Switch to Chinese" : "切换为英文");
      }

      if (persist) {
        try {
          localStorage.setItem(storageKey, language);
        } catch {
          // Language switching also works when browser storage is unavailable.
        }
      }
    }

    languageButton?.addEventListener("click", () => applyLanguage(language === "en" ? "zh" : "en"));
    applyLanguage(language, false);
    if (languageButton && translations.en && translations.zh) languageButton.hidden = false;

    const navigationLinks = [...document.querySelectorAll('.site-header nav a[href^="#"]')];
    const sectionLinks = new Map();
    navigationLinks.forEach((link) => {
      const id = link.getAttribute("href").slice(1);
      const section = document.getElementById(id);
      if (section) sectionLinks.set(section, link);
    });

    function markCurrentSection(link) {
      navigationLinks.forEach((candidate) => {
        if (candidate === link) candidate.setAttribute("aria-current", "location");
        else candidate.removeAttribute("aria-current");
      });
    }

    navigationLinks.forEach((link) => {
      link.addEventListener("click", () => markCurrentSection(link));
    });

    if ("IntersectionObserver" in window && sectionLinks.size) {
      const visibleSections = new Map();
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleSections.set(entry.target, entry.boundingClientRect.top);
          else visibleSections.delete(entry.target);
        });
        if (!visibleSections.size) return;
        const firstSection = [...visibleSections].sort((a, b) => a[1] - b[1])[0][0];
        markCurrentSection(sectionLinks.get(firstSection));
      }, { rootMargin: "-110px 0px -45% 0px", threshold: 0 });
      sectionLinks.forEach((_link, section) => observer.observe(section));
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
