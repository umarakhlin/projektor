import type { ReactNode } from "react";
import { graphemeCount, takeGraphemePrefix } from "@/lib/bionic-split";

type BionicTextProps = {
  text: string | null | undefined;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div" | "li";
  /** Helps RTL / mixed-content messages (e.g. Hebrew) align correctly. */
  dir?: "auto" | "ltr" | "rtl";
};

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
