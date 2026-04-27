/**
 * Shared word / grapheme splitting for Bionic (React + DOM applier).
 */

export function graphemeCount(s: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...seg.segment(s)].length;
  }
  return [...s].length;
}

export function takeGraphemePrefix(
  s: string,
  n: number
): { head: string; tail: string } {
  if (n <= 0) return { head: "", tail: s };
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const parts: string[] = [];
    for (const { segment } of seg.segment(s)) {
      parts.push(segment);
    }
    return {
      head: parts.slice(0, n).join(""),
      tail: parts.slice(n).join("")
    };
  }
  const g = [...s];
  return { head: g.slice(0, n).join(""), tail: g.slice(n).join("") };
}

/** One outer span .a11y-bionic-words; markDom = true adds data-bionic-dom for strip. */
export function textToBionicDocumentFragment(
  text: string,
  doc: Document,
  markDom: boolean
): DocumentFragment {
  const frag = doc.createDocumentFragment();
  const wrap = doc.createElement("span");
  wrap.className = "a11y-bionic-words";
  if (markDom) wrap.setAttribute("data-bionic-dom", "1");
  wrap.appendChild(buildInner(doc, text));
  frag.appendChild(wrap);
  return frag;
}

function buildInner(doc: Document, text: string): DocumentFragment {
  const inner = doc.createDocumentFragment();
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const wordSeg = new Intl.Segmenter(undefined, { granularity: "word" });
    for (const { segment, isWordLike } of wordSeg.segment(text)) {
      if (!isWordLike) {
        if (segment) inner.appendChild(doc.createTextNode(segment));
        continue;
      }
      const word = segment;
      if (word.length === 0) continue;
      const len = graphemeCount(word);
      if (len <= 1) {
        const h = doc.createElement("span");
        h.className = "a11y-bionic-head";
        h.appendChild(doc.createTextNode(word));
        inner.appendChild(h);
      } else {
        const n = Math.max(1, Math.ceil(len * 0.4));
        const { head, tail } = takeGraphemePrefix(word, n);
        const w = doc.createElement("span");
        w.className = "a11y-bionic-word";
        const hs = doc.createElement("span");
        hs.className = "a11y-bionic-head";
        hs.appendChild(doc.createTextNode(head));
        const ts = doc.createElement("span");
        ts.className = "a11y-bionic-tail";
        ts.appendChild(doc.createTextNode(tail));
        w.appendChild(hs);
        w.appendChild(ts);
        inner.appendChild(w);
      }
    }
    return inner;
  }

  const parts = text.split(/(\s+)/);
  for (const part of parts) {
    if (part.length === 0) continue;
    if (/^\s+$/.test(part)) {
      inner.appendChild(doc.createTextNode(part));
      continue;
    }
    if (graphemeCount(part) <= 1) {
      const h = doc.createElement("span");
      h.className = "a11y-bionic-head";
      h.appendChild(doc.createTextNode(part));
      inner.appendChild(h);
      continue;
    }
    const len = graphemeCount(part);
    const n = Math.max(1, Math.ceil(len * 0.4));
    const { head, tail } = takeGraphemePrefix(part, n);
    const w = doc.createElement("span");
    w.className = "a11y-bionic-word";
    const hs = doc.createElement("span");
    hs.className = "a11y-bionic-head";
    hs.appendChild(doc.createTextNode(head));
    const ts = doc.createElement("span");
    ts.className = "a11y-bionic-tail";
    ts.appendChild(doc.createTextNode(tail));
    w.appendChild(hs);
    w.appendChild(ts);
    inner.appendChild(w);
  }
  return inner;
}
