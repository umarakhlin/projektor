import type { ReactNode } from "react";

type BionicTextProps = {
  text: string | null | undefined;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div" | "li";
};

/**
 * Always emits the bionic split spans. Visual emphasis (bold head, lighter
 * tail) is applied only when `html.a11y-bionic` is present — purely via
 * CSS in globals.css. This means BionicText behaves identically during SSR,
 * hydration, and on RSC pages: no React Context, no useSyncExternalStore,
 * no DOM mutations.
 */
export function BionicText({
  text,
  className,
  as: Comp = "span"
}: BionicTextProps) {
  if (!text) {
    return <Comp className={className}>{text ?? ""}</Comp>;
  }

  const parts = text.split(/(\s+)/);
  const children: ReactNode[] = [];

  parts.forEach((part, i) => {
    if (part.length === 0) return;
    if (/^\s+$/.test(part)) {
      children.push(part);
      return;
    }
    if (part.length <= 1) {
      children.push(
        <span key={i} className="a11y-bionic-head">
          {part}
        </span>
      );
      return;
    }
    const n = Math.max(1, Math.ceil(part.length * 0.4));
    children.push(
      <span key={i} className="a11y-bionic-word">
        <span className="a11y-bionic-head">{part.slice(0, n)}</span>
        <span className="a11y-bionic-tail">{part.slice(n)}</span>
      </span>
    );
  });

  return (
    <Comp className={className}>
      <span className="a11y-bionic-words">{children}</span>
    </Comp>
  );
}
