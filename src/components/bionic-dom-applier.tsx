"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { textToBionicDocumentFragment } from "@/lib/bionic-split";

const SKIP_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "iframe",
  "template",
  "code",
  "pre",
  "textarea",
  "input",
  "select",
  "option",
  "svg",
  "path",
  "canvas",
  "head",
  "title",
  "meta",
  "link",
  "kbd",
  "samp"
]);

function shouldIgnoreElement(el: Element | null): boolean {
  if (!el) return true;
  if (el.nodeType !== Node.ELEMENT_NODE) return true;
  const t = (el as HTMLElement).localName;
  if (SKIP_TAGS.has(t)) return true;
  if (el.hasAttribute("data-bionic-skip") || el.hasAttribute("data-a11y-skip")) {
    return true;
  }
  if (el.classList?.contains("a11y-bionic-words")) return true;
  return false;
}

function bionifyTextNode(textNode: Text, doc: Document) {
  const parent = textNode.parentNode;
  if (!parent) return;
  if (!(parent instanceof Element)) return;
  if (parent.closest("[data-a11y-skip]") || parent.closest("[data-bionic-skip]")) {
    return;
  }
  if (shouldIgnoreElement(parent)) return;
  if (textNode.data.length === 0) return;
  if (/^\s+$/.test(textNode.data)) return;

  const frag = textToBionicDocumentFragment(textNode.data, doc, true);
  parent.insertBefore(frag, textNode);
  textNode.remove();
}

function walk(node: Node, doc: Document) {
  if (node.nodeType === Node.TEXT_NODE) {
    bionifyTextNode(node as Text, doc);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (shouldIgnoreElement(el)) return;
  for (const child of Array.from(el.childNodes)) {
    walk(child, doc);
  }
}

function stripDomBionic(root: HTMLElement) {
  const toStrip = root.querySelectorAll<HTMLElement>(
    'span.a11y-bionic-words[data-bionic-dom="1"]'
  );
  toStrip.forEach((span) => {
    const t = document.createTextNode(span.textContent ?? "");
    if (span.parentNode) {
      span.parentNode.replaceChild(t, span);
    }
  });
}

function runBionicOnRoot(root: HTMLElement) {
  if (!root.isConnected) return;
  if (!document.documentElement.classList.contains("a11y-bionic")) {
    try {
      stripDomBionic(root);
    } catch {
      /* ignore */
    }
    return;
  }
  const doc = root.ownerDocument ?? document;
  walk(root, doc);
}

type Props = { children: ReactNode };

/**
 * When `html.a11y-bionic` is on, walks text in this subtree and wraps
 * words. Skips pre/code/svg, [data-a11y-skip], and existing
 * .a11y-bionic-words (React BionicText). Injected spans use
 * [data-bionic-dom] and are removed when bionic is toggled off.
 */
export function BionicDomApplier({ children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const applying = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;

    const run = () => {
      if (applying.current) return;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        if (applying.current) return;
        applying.current = true;
        try {
          requestAnimationFrame(() => {
            try {
              runBionicOnRoot(root);
            } finally {
              applying.current = false;
            }
          });
        } catch {
          applying.current = false;
        }
      }, 64);
    };

    const obsRoot = new MutationObserver(() => {
      if (applying.current) return;
      run();
    });
    const obsHtml = new MutationObserver(() => {
      run();
    });
    obsRoot.observe(root, { subtree: true, childList: true, characterData: true });
    obsHtml.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });
    run();

    return () => {
      obsRoot.disconnect();
      obsHtml.disconnect();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
