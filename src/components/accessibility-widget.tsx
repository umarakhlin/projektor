"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FontScale = "normal" | "large" | "xlarge";

type Settings = {
  fontScale: FontScale;
  dyslexiaFont: boolean;
  bionicReading: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  underlineLinks: boolean;
  readableSpacing: boolean;
};

const DEFAULTS: Settings = {
  fontScale: "normal",
  dyslexiaFont: false,
  bionicReading: false,
  highContrast: false,
  reducedMotion: false,
  underlineLinks: false,
  readableSpacing: false
};

const STORAGE_KEY = "projektor.a11y.settings.v1";

function applySettings(s: Settings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  root.classList.toggle("a11y-font-large", s.fontScale === "large");
  root.classList.toggle("a11y-font-xlarge", s.fontScale === "xlarge");
  root.classList.toggle("a11y-dyslexia", s.dyslexiaFont);
  root.classList.toggle("a11y-high-contrast", s.highContrast);
  root.classList.toggle("a11y-reduced-motion", s.reducedMotion);
  root.classList.toggle("a11y-underline-links", s.underlineLinks);
  root.classList.toggle("a11y-readable-spacing", s.readableSpacing);
  root.classList.toggle("a11y-bionic", s.bionicReading);
}

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CODE",
  "PRE",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "BUTTON",
  "LABEL",
  "OPTION",
  "SVG",
  "PATH"
]);

function bionifyWord(word: string): string {
  if (word.length <= 1) return word;
  const boldCount = Math.max(1, Math.ceil(word.length * 0.4));
  const head = word.slice(0, boldCount);
  const tail = word.slice(boldCount);
  return `<b class="a11y-bionic-head">${head}</b>${tail}`;
}

function bionifyText(text: string): string {
  return text.replace(/(\S+)/g, (match) => bionifyWord(match));
}

function walkAndBionify(node: Node, transformed: WeakSet<Node>) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text.trim()) return;
    const parent = node.parentElement;
    if (!parent) return;
    if (SKIP_TAGS.has(parent.tagName)) return;
    if (parent.closest("[data-a11y-skip]")) return;
    if (transformed.has(node)) return;

    const span = document.createElement("span");
    span.className = "a11y-bionic-group";
    span.setAttribute("data-a11y-original", text);
    span.innerHTML = bionifyText(text);
    parent.replaceChild(span, node);
    transformed.add(span);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (SKIP_TAGS.has(el.tagName)) return;
  if (el.hasAttribute("data-a11y-skip")) return;
  if (el.classList.contains("a11y-bionic-group")) return;

  const children = Array.from(el.childNodes);
  for (const child of children) {
    walkAndBionify(child, transformed);
  }
}

function removeBionicFormatting() {
  const groups = document.querySelectorAll(".a11y-bionic-group");
  groups.forEach((group) => {
    const original = group.getAttribute("data-a11y-original") ?? "";
    const textNode = document.createTextNode(original);
    group.parentNode?.replaceChild(textNode, group);
  });
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const bionicObserverRef = useRef<MutationObserver | null>(null);
  const transformedRef = useRef<WeakSet<Node>>(new WeakSet());

  useEffect(() => {
    setMounted(true);
    const loaded = loadSettings();
    setSettings(loaded);
    applySettings(loaded);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applySettings(settings);
    saveSettings(settings);
  }, [settings, mounted]);

  useEffect(() => {
    if (!mounted) return;

    if (!settings.bionicReading) {
      bionicObserverRef.current?.disconnect();
      bionicObserverRef.current = null;
      removeBionicFormatting();
      transformedRef.current = new WeakSet();
      return;
    }

    const run = () => {
      walkAndBionify(document.body, transformedRef.current);
    };
    run();

    const observer = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => walkAndBionify(n, transformedRef.current));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    bionicObserverRef.current = observer;

    return () => {
      observer.disconnect();
      bionicObserverRef.current = null;
    };
  }, [settings.bionicReading, mounted]);

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetAll = useCallback(() => {
    setSettings(DEFAULTS);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close accessibility menu" : "Open accessibility menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-a11y-skip
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg ring-2 ring-brand/40 hover:bg-brand-light focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/60"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M12 2.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-7 6 7 1.5V13l-2.2 7.6a1 1 0 1 1-1.9-.6L9.5 14H8.2l-1.4 6a1 1 0 1 1-1.9-.4L6.3 13H4a1 1 0 1 1 0-2h3l-2-2.5Zm7 1.5 7-1.5-2 2.5h3a1 1 0 1 1 0 2h-2.3l1.4 6.6a1 1 0 1 1-1.9.4L15.8 14h-1.3l1.6 6a1 1 0 1 1-1.9.6L12 13Z" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Accessibility settings"
          data-a11y-skip
          className="fixed bottom-20 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-100 shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Accessibility</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Text size
              </p>
              <div className="flex gap-2">
                {(
                  [
                    { v: "normal", label: "A" },
                    { v: "large", label: "A+" },
                    { v: "xlarge", label: "A++" }
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => update("fontScale", opt.v)}
                    className={`flex-1 rounded-lg border px-3 py-2 ${
                      settings.fontScale === opt.v
                        ? "border-brand bg-brand/20 text-brand"
                        : "border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <ToggleRow
                label="Dyslexia-friendly font"
                description="Switches to a more readable typeface."
                checked={settings.dyslexiaFont}
                onChange={(v) => update("dyslexiaFont", v)}
              />
              <ToggleRow
                label="Bionic reading"
                description="Bolds the start of each word to guide the eye."
                checked={settings.bionicReading}
                onChange={(v) => update("bionicReading", v)}
              />
              <ToggleRow
                label="High contrast"
                description="Stronger borders and brighter text."
                checked={settings.highContrast}
                onChange={(v) => update("highContrast", v)}
              />
              <ToggleRow
                label="Reduce motion"
                description="Turns off animations and transitions."
                checked={settings.reducedMotion}
                onChange={(v) => update("reducedMotion", v)}
              />
              <ToggleRow
                label="Underline links"
                description="Makes all links clearly underlined."
                checked={settings.underlineLinks}
                onChange={(v) => update("underlineLinks", v)}
              />
              <ToggleRow
                label="Readable spacing"
                description="Bigger line height and letter spacing."
                checked={settings.readableSpacing}
                onChange={(v) => update("readableSpacing", v)}
              />
            </section>

            <div className="flex justify-end border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={resetAll}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
              >
                Reset all
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2 hover:border-slate-600">
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{label}</span>
        {description && (
          <span className="block text-xs text-slate-500">{description}</span>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-brand"
      />
    </label>
  );
}
