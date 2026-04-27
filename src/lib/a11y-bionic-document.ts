"use client";

/**
 * Single MutationObserver + shared subscription for `html.a11y-bionic`.
 * Used by BionicText via useSyncExternalStore so every instance stays in
 * sync without React Context (which can be unreliable across RSC boundaries).
 */
let observer: MutationObserver | null = null;
const listeners = new Set<() => void>();

export function getA11yBionicSnapshot(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("a11y-bionic");
}

export function subscribeA11yBionicClass(onChange: () => void) {
  if (typeof document === "undefined") return () => {};

  if (!observer) {
    observer = new MutationObserver(() => {
      listeners.forEach((l) => l());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}
