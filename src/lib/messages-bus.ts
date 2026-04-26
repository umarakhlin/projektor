"use client";

const CHANNEL_NAME = "projektor-messages";

export type MessagesEvent =
  | { type: "messages-read"; partnerId: string }
  | { type: "messages-changed" }
  | { type: "messages-sent" };

type Listener = (event: MessagesEvent) => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<Listener>();

function ensureChannel() {
  if (typeof window === "undefined") return null;
  if (channel) return channel;
  if (typeof BroadcastChannel === "undefined") return null;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (e: MessageEvent<MessagesEvent>) => {
    listeners.forEach((listener) => {
      try {
        listener(e.data);
      } catch {
        /* ignore listener errors */
      }
    });
  };
  return channel;
}

export function broadcastMessagesEvent(event: MessagesEvent) {
  const c = ensureChannel();
  c?.postMessage(event);
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeMessagesBus(listener: Listener): () => void {
  ensureChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
