"use client";

import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import {
  getA11yBionicSnapshot,
  subscribeA11yBionicClass
} from "@/lib/a11y-bionic-document";

function splitBionic(text: string): ReactNode {
  if (!text) return null;
  return text.split(/(\s+)/).map((part, i) => {
    if (part.length === 0) return null;
    if (/^\s+$/.test(part)) {
      return <span key={i}>{part}</span>;
    }
    if (part.length <= 1) {
      return <span key={i}>{part}</span>;
    }
    const n = Math.max(1, Math.ceil(part.length * 0.4));
    return (
      <span key={i} className="inline">
        <span className="a11y-bionic-head font-bold">{part.slice(0, n)}</span>
        <span className="a11y-bionic-tail font-normal">{part.slice(n)}</span>
      </span>
    );
  });
}

type BionicTextProps = {
  text: string;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
};

function useA11yBionicFromDocument() {
  return useSyncExternalStore(
    subscribeA11yBionicClass,
    getA11yBionicSnapshot,
    () => false
  );
}

/**
 * Renders `text` with bionic-style emphasis on the first ~40% of each
 * word when `html` has `a11y-bionic` (toggled by the accessibility
 * widget). Subscribes to the class via useSyncExternalStore so this
 * works the same in the feed, Explore, and RSC-backed project pages.
 */
export function BionicText({
  text,
  className,
  as: Comp = "span"
}: BionicTextProps) {
  const bionic = useA11yBionicFromDocument();

  if (!bionic) {
    return <Comp className={className}>{text}</Comp>;
  }

  return (
    <Comp className={className}>
      <span className="a11y-bionic-words inline">{splitBionic(text)}</span>
    </Comp>
  );
}
