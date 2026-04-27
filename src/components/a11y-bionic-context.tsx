"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode
} from "react";

type A11yBionicValue = {
  bionic: boolean;
  reportBionic: (enabled: boolean) => void;
};

const A11yBionicContext = createContext<A11yBionicValue | null>(null);

/**
 * `bionic` is the single source of truth for word-level bionic in React.
 * The accessibility widget must call `reportBionic` whenever local settings
 * or localStorage state changes — do not rely only on a class on <html> +
 * MutationObserver (race: child useEffect can add the class before the
 * parent observer is attached, so React never re-renders with bionic: true).
 */
export function A11yBionicProvider({ children }: { children: ReactNode }) {
  const [bionic, setBionic] = useState(false);

  const reportBionic = useCallback((enabled: boolean) => {
    setBionic(Boolean(enabled));
  }, []);

  return (
    <A11yBionicContext.Provider value={{ bionic, reportBionic }}>
      {children}
    </A11yBionicContext.Provider>
  );
}

export function useA11yBionicEnabled() {
  return useContext(A11yBionicContext)?.bionic ?? false;
}

/** Used by the accessibility widget; safe no-op if tree is ever wrong in tests. */
export function useReportA11yBionic() {
  return useContext(A11yBionicContext)?.reportBionic ?? (() => {});
}
