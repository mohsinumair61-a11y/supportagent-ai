"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CornerDownLeft, Loader2, Square, User } from "lucide-react";
import Answer from "@/components/Answer";
import Approval from "@/components/Approval";
import Metrics from "@/components/Metrics";
import Trace from "@/components/Trace";
import { readEvents } from "@/lib/stream";
import type { HistoryTurn, ToolCall, Turn, Usage } from "@/types/agent";

const SCENARIOS = [
  {
    label: "Order status",
    text: "Where is my order ORD-1001?",
    hint: "one read-only tool",
  },
  {
    label: "Policy question",
    text: "My laptop stand arrived cracked. Can I still return it? Order ORD-1003.",
    hint: "order lookup, then policy",
  },
  {
    label: "Refund request",
    text: "The monitor from ORD-1004 has a dead pixel line. I want a refund.",
    hint: "stops for approval",
  },
  {
    label: "Outside policy",
    text: "I lost the receipt for something I bought two years ago, refund me anyway.",
    hint: "escalates to a human",
  },
];

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Console({
  prefill,
}: {
  /** Question dropped in from the inspector. Bumped by a counter so asking
   *  the same thing twice still registers. */
  prefill?: { text: string; nonce: number };
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [running, setRunning] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  // A question sent over from the inspector goes straight into the composer,
  // so the operator can edit it before sending rather than it firing blind.
  useEffect(() => {
    if (!prefill?.text) return;
    setDraft(prefill.text);
    document.getElementById("msg")?.focus();
  }, [prefill]);

  // Follow the run, but stop following the moment the operator scrolls up.
  useEffect(() => {
    const el = pane.current;
    if (!el) return;
    const onScroll = () => {
      stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (stick.current) end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, running]);

  /** The transcript the model sees. Tool traffic stays out of it — the agent
   *  route replays tool calls itself when resuming. */
  const history = useCallback(
    (): HistoryTurn[] =>
      turns
        .filter((t) => t.text.trim().length > 0)
        .map((t) => ({
          role: t.role === "customer" ? ("user" as const) : ("model" as const),
          text: t.text,
        })),
    [turns],
  );

  const consume = useCallback(
    async (body: Record<string, unknown>, agentTurnId: string) => {
      const controller = new AbortController();
      abort.current = controller;
      setRunning(true);

      const patch = (fn: (t: Turn) => Turn) =>
        setTurns((prev) => prev.map((t) => (t.id === agentTurnId ? fn(t) : t)));

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const d = (await res.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(d?.detail ?? "The run failed");
        }

        let text = "";
        for await (const ev of readEvents(res.body, controller.signal)) {
          switch (ev.type) {
            case "tool_start":
              patch((t) => ({ ...t, toolCalls: [...(t.toolCalls ?? []), ev.call] }));
              break;
            case "tool_end":
              patch((t) => ({
                ...t,
                toolCalls: (t.toolCalls ?? []).map((c) =>
                  c.id === ev.id
                    ? { ...c, result: ev.result, durationMs: ev.durationMs }
                    : c,
                ),
              }));
              break;
            case "approval_required":
              // `contents` is the model's own conversation, held here only so
              // it can be handed straight back. The UI never reads into it.
              patch((t) => ({
                ...t,
                pending: ev.call,
                pausedContents: ev.contents,
                toolCalls: [...(t.toolCalls ?? []), ev.call],
              }));
              break;
            case "token":
              text += ev.text;
              patch((t) => ({ ...t, text }));
              break;
            case "usage":
              patch((t) => ({ ...t, usage: ev.usage as Usage }));
              break;
            case "error":
              patch((t) => ({ ...t, error: ev.detail }));
              break;
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          patch((t) => ({ ...t, text: t.text || "Stopped." }));
        } else {
          patch((t) => ({
            ...t,
            error: err instanceof Error ? err.message : "Something went wrong",
          }));
        }
      } finally {
        abort.current = null;
        setRunning(false);
      }
    },
    [],
  );

  const send = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || running) return;

      stick.current = true;
      setDraft("");

      const agentTurnId = newId();
      const priorHistory = history();

      setTurns((prev) => [
        ...prev,
        { id: newId(), role: "customer", text: trimmed, createdAt: Date.now() },
        { id: agentTurnId, role: "agent", text: "", createdAt: Date.now() },
      ]);

      await consume({ message: trimmed, history: priorHistory }, agentTurnId);
    },
    [running, history, consume],
  );

  const decide = useCallback(
    async (
      turnId: string,
      call: ToolCall,
      decision: "approved" | "denied",
      args?: Record<string, unknown>,
    ) => {
      // Mark the pending call resolved and clear the gate before resuming.
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? {
                ...t,
                pending: undefined,
                pausedContents: undefined,
                toolCalls: (t.toolCalls ?? []).map((c) =>
                  c.id === call.id
                    ? { ...c, approval: decision, args: args ?? c.args }
                    : c,
                ),
              }
            : t,
        ),
      );

      const paused = turns.find((t) => t.id === turnId)?.pausedContents;

      await consume(
        {
          message: "",
          history: history().filter((h) => h.text.trim().length > 0),
          resume: { call, decision, args, contents: paused },
        },
        turnId,
      );
    },
    [consume, history, turns],
  );

  const stop = () => {
    abort.current?.abort();
    abort.current = null;
  };

  return (
    <div className="flex min-h-[38rem] flex-col overflow-hidden rounded-xl border border-edge bg-panel">
      {/* Transcript */}
      <div ref={pane} className="scroll-thin flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
        {turns.length === 0 ? (
          <div className="flex h-full min-h-[26rem] flex-col justify-center">
            <p className="font-mono text-[0.6875rem] uppercase tracking-wide text-faint">
              Try a scenario
            </p>
            <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-dim">
              Each one exercises a different path — a single lookup, a lookup
              followed by a policy check, an action that stops for sign-off, and
              a request the agent refuses and escalates.
            </p>

            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => void send(s.text)}
                  className="group rounded-lg border border-edge bg-raised p-4 text-left transition-colors hover:border-edge-lit"
                >
                  <span className="font-mono text-[0.6875rem] text-amber">
                    {s.label}
                  </span>
                  <p className="mt-2 text-[0.875rem] leading-snug text-text">
                    {s.text}
                  </p>
                  <p className="mt-2 font-mono text-[0.625rem] text-faint">
                    {s.hint}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {turns.map((turn, i) =>
          turn.role === "customer" ? (
            <div key={turn.id} className="rise flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-edge bg-raised">
                <User className="h-3 w-3 text-dim" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[0.625rem] uppercase tracking-wide text-faint">
                  Customer
                </p>
                <p className="mt-1.5 text-[0.9375rem] text-text">{turn.text}</p>
              </div>
            </div>
          ) : (
            <div key={turn.id} className="rise space-y-4 border-l border-edge pl-5">
              <p className="font-mono text-[0.625rem] uppercase tracking-wide text-faint">
                Agent run
              </p>

              <Trace calls={turn.toolCalls ?? []} />

              {turn.pending ? (
                <Approval
                  call={turn.pending}
                  busy={running}
                  onDecide={(decision, args) =>
                    void decide(turn.id, turn.pending as ToolCall, decision, args)
                  }
                />
              ) : null}

              {turn.error ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-rose/30 bg-rose-bg px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose" strokeWidth={2} />
                  <p className="text-[0.875rem] text-dim">{turn.error}</p>
                </div>
              ) : null}

              {turn.text ? (
                <div className="rounded-lg border border-edge bg-raised p-4">
                  <Answer streaming={running && i === turns.length - 1 && !turn.pending}>
                    {turn.text}
                  </Answer>
                </div>
              ) : null}

              {turn.usage && !turn.pending ? <Metrics usage={turn.usage} /> : null}

              {running && i === turns.length - 1 && !turn.pending && !turn.text ? (
                <p className="flex items-center gap-2 font-mono text-[0.75rem] text-faint">
                  <Loader2 className="spin h-3 w-3" strokeWidth={2.4} />
                  deciding what this needs…
                </p>
              ) : null}
            </div>
          ),
        )}

        <div ref={end} />
      </div>

      {/* Composer */}
      <div className="border-t border-edge p-4 sm:p-5">
        <div className="flex items-end gap-2 rounded-lg border border-edge bg-base p-2 focus-within:border-edge-lit">
          <label htmlFor="msg" className="sr-only">
            Message as the customer
          </label>
          <textarea
            id="msg"
            rows={1}
            value={draft}
            disabled={running}
            placeholder="Write as the customer…"
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            className="max-h-36 flex-1 resize-none bg-transparent px-3 py-2 text-[0.9375rem] text-text outline-none placeholder:text-faint disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void send(draft)}
            disabled={running || !draft.trim()}
            aria-label="Send"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber text-base transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2.6} />
          </button>
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <p className="font-mono text-[0.625rem] text-faint">
            Refunds and cancellations stop for approval before they run
          </p>
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] text-faint transition-colors hover:text-text"
            >
              <Square className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
              stop
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
