/**
 * Inline in root layout <head>. Applies the same classes as
 * AccessibilityWidget.applySettings from localStorage before paint, so
 * bionic (and other a11y toggles) match the first frame and SSR markup.
 */
export const A11Y_BOOT_INLINE_SCRIPT = `(function(){try{var k="projektor.a11y.settings.v1";var raw=localStorage.getItem(k);if(!raw)return;var s=JSON.parse(raw);var el=document.documentElement;el.classList.toggle("a11y-font-large",s.fontScale==="large");el.classList.toggle("a11y-font-xlarge",s.fontScale==="xlarge");el.classList.toggle("a11y-dyslexia",!!s.dyslexiaFont);el.classList.toggle("a11y-high-contrast",!!s.highContrast);el.classList.toggle("a11y-reduced-motion",!!s.reducedMotion);el.classList.toggle("a11y-underline-links",!!s.underlineLinks);el.classList.toggle("a11y-readable-spacing",!!s.readableSpacing);el.classList.toggle("a11y-bionic",!!s.bionicReading);}catch(e){}})();`;
