"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Message = {
  id: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  direction: "in" | "out";
};

type Partner = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export default function ChatPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const { status } = useSession();
  const partnerId = params?.userId ?? "";

  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError("");
    const res = await fetch(`/api/direct-messages/with/${partnerId}`);
    if (!res.ok) {
      if (res.status === 404) {
        setError("User not found.");
      } else if (res.status === 401) {
        router.push(`/auth/signin?callbackUrl=/messages/${partnerId}`);
        return;
      } else {
        setError("Could not load conversation.");
      }
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPartner(data.partner ?? null);
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    setLoading(false);
  }, [partnerId, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/signin?callbackUrl=/messages/${partnerId}`);
      return;
    }
    if (status !== "authenticated" || !partnerId) return;
    void load();
  }, [status, partnerId, router, load]);

  useEffect(() => {
    if (status !== "authenticated" || !partnerId) return;
    const interval = setInterval(() => void load(), 8000);
    return () => clearInterval(interval);
  }, [status, partnerId, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const value = content.trim();
    if (!value) return;
    setBusy(true);
    const res = await fetch(`/api/direct-messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: partnerId, content: value })
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not send message.");
      return;
    }
    setContent("");
    await load();
  }

  if (status === "loading" || loading) {
    return <div className="mx-auto max-w-2xl text-slate-400">Loading…</div>;
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <div className="flex items-center gap-3 rounded-t-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
        <Link
          href="/inbox"
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          ← Inbox
        </Link>
        <div className="flex items-center gap-2">
          {partner?.avatarUrl ? (
            <img
              src={partner.avatarUrl}
              alt="Avatar"
              className="h-8 w-8 rounded-full border border-slate-700 object-cover"
            />
          ) : (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs text-slate-300">
              {(partner?.name?.[0] ?? "U").toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <Link
              href={partner ? `/profile/${partner.id}` : "#"}
              className="font-medium text-slate-100 hover:underline"
            >
              {partner?.name ?? "User"}
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto border border-t-0 border-slate-800 bg-slate-950/40 px-4 py-4">
        {error && (
          <div className="rounded-lg border border-red-700/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-500">
            No messages yet. Say hi!
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  m.direction === "out"
                    ? "bg-brand text-white"
                    : "bg-slate-800 text-slate-100"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p
                  className={`mt-1 text-[10px] ${m.direction === "out" ? "text-white/70" : "text-slate-400"}`}
                >
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 rounded-b-lg border border-t-0 border-slate-800 bg-slate-900/60 px-3 py-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Write a message..."
          className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <button
          type="button"
          disabled={busy || !content.trim()}
          onClick={() => void send()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
