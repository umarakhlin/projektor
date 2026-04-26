"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

const A11yBionicContext = createContext(false);

/**
 * Listens for `html` class `a11y-bionic` (toggled by AccessibilityWidget)
 * so bionic text can re-render with word-level emphasis without mutating
 * the live DOM.
 */
export function A11yBionicProvider({ children }: { children: ReactNode }) {
  const [bionic, setBionic] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (typeof document === "undefined") return;
      setBionic(document.documentElement.classList.contains("a11y-bionic"));
    };
    sync();
    const o = new MutationObserver(sync);
    o.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });
    return () => o.disconnect();
  }, []);

  return (
    <A11yBionicContext.Provider value={bionic}>
      {children}
    </A11yBionicContext.Provider>
  );
}

export function useA11yBionicEnabled() {
  return useContext(A11yBionicContext);
}
