"use client";

import type { ReactNode } from "react";
import { useA11yBionicEnabled } from "./a11y-bionic-context";

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

/**
 * Renders `text` with bionic-style emphasis on the first ~40% of each
 * word when the accessibility "Bionic reading" mode is on. When off, plain
 * text. Safe for React (no post-render DOM walking).
 */
export function BionicText({
  text,
  className,
  as: Comp = "span"
}: BionicTextProps) {
  const bionic = useA11yBionicEnabled();

  if (!bionic) {
    return <Comp className={className}>{text}</Comp>;
  }

  return (
    <Comp className={className}>
      <span className="a11y-bionic-words inline">{splitBionic(text)}</span>
    </Comp>
  );
}
