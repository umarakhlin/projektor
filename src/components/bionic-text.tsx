import type { ReactNode } from "react";

type BionicTextProps = {
  text: string | null | undefined;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div" | "li";
  /** Helps RTL / mixed-content messages (e.g. Hebrew) align correctly. */
  dir?: "auto" | "ltr" | "rtl";
};

function graphemeCount(s: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...seg.segment(s)].length;
  }
  return [...s].length;
}

function takeGraphemePrefix(s: string, n: number): { head: string; tail: string } {
  if (n <= 0) return { head: "", tail: s };
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const parts: string[] = [];
    for (const { segment } of seg.segment(s)) {
      parts.push(segment);
    }
    const head = parts.slice(0, n).join("");
    const tail = parts.slice(n).join("");
    return { head, tail };
  }
  const g = [...s];
  return { head: g.slice(0, n).join(""), tail: g.slice(n).join("") };
}

function bionicNodesFromString(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let k = 0;

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const wordSeg = new Intl.Segmenter(undefined, { granularity: "word" });
    for (const { segment, isWordLike } of wordSeg.segment(text)) {
      if (!isWordLike) {
        if (segment) out.push(segment);
        continue;
      }
      const word = segment;
      if (word.length === 0) continue;
      const len = graphemeCount(word);
      if (len <= 1) {
        out.push(
          <span key={k++} className="a11y-bionic-head">
            {word}
          </span>
        );
      } else {
        const n = Math.max(1, Math.ceil(len * 0.4));
        const { head, tail } = takeGraphemePrefix(word, n);
        out.push(
          <span key={k++} className="a11y-bionic-word">
            <span className="a11y-bionic-head">{head}</span>
            <span className="a11y-bionic-tail">{tail}</span>
          </span>
        );
      }
    }
    return out;
  }

  const parts = text.split(/(\s+)/);
  parts.forEach((part) => {
    if (part.length === 0) return;
    if (/^\s+$/.test(part)) {
      out.push(part);
      return;
    }
    if (graphemeCount(part) <= 1) {
      out.push(
        <span key={k++} className="a11y-bionic-head">
          {part}
        </span>
      );
      return;
    }
    const len = graphemeCount(part);
    const n = Math.max(1, Math.ceil(len * 0.4));
    const { head, tail } = takeGraphemePrefix(part, n);
    out.push(
      <span key={k++} className="a11y-bionic-word">
        <span className="a11y-bionic-head">{head}</span>
        <span className="a11y-bionic-tail">{tail}</span>
      </span>
    );
  });
  return out;
}

/**
 * Renders bionic-style emphasis: always emits head/tail spans; CSS
 * (globals.css) applies font-weight when `html.a11y-bionic` is on.
 * Uses `Intl.Segmenter` for words when available (better for Hebrew, etc.).
 */
export function BionicText({
  text,
  className,
  as: Comp = "span",
  dir
}: BionicTextProps) {
  if (!text) {
    return (
      <Comp className={className} dir={dir}>
        {text ?? ""}
      </Comp>
    );
  }

  return (
    <Comp className={className} dir={dir}>
      <span className="a11y-bionic-words">{bionicNodesFromString(text)}</span>
    </Comp>
  );
}
