# How we stay organized across chats

Problem: in a long single chat with the agent, tasks pile up and
important decisions get buried. When we open a new chat, context is
gone.

## The rule
All shared state lives in the repo, not in chat.

## Where things live
- `TASKS.md` — the **single source of truth** for what's pending,
  grouped by priority. Every new chat should start by reading this.
- `docs/*.md` — deep thinking that doesn't fit in a line item.
  Examples: `monetization.md`, `ip-protection.md`.
- Git history — decisions that are already implemented.
- GitHub Issues (optional, later) — bugs and feature requests from
  users, not from us.

## The agent's rhythm
At the start of a chat, the agent should:
1. Read `TASKS.md` and the most relevant `docs/` file.
2. Ask Uma which item to work on (or suggest based on priority).
3. When done, update `TASKS.md` (move the line to "Recently done").

Before ending a chat, the agent should:
1. Update `TASKS.md` with any new items that came up.
2. Note any blockers or decisions in the relevant `docs/` file.

## When to split into multiple agents
Rules of thumb:
- One chat = one theme (e.g. "accessibility week", "billing week").
- If a task takes more than a day, give it its own `docs/` file.
- For pure research (monetization, legal questions) — do research
  in a separate chat and drop the result into `docs/`.
- Keep day-to-day coding in a main chat that references `TASKS.md`.

## What NOT to put here
- Secrets (API keys, passwords) — use Vercel / GitHub secrets.
- Production data.
- Private user info.
