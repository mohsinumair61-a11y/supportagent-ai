"use client";

import { useState } from "react";
import { Check, Pencil, ShieldAlert, X } from "lucide-react";
import type { ToolCall } from "@/types/agent";

const TITLES: Record<string, string> = {
  issue_refund: "Issue a refund",
  cancel_order: "Cancel an order",
};

/**
 * The approval gate.
 *
 * The agent has decided a refund or cancellation is warranted, and stopped.
 * Nothing has happened yet — the tool has not run, no money has moved. An
 * operator approves, edits the arguments, or declines, and only then does the
 * run continue.
 *
 * This is the difference between an agent a store will actually deploy and a
 * demo they will not.
 */
export default function Approval({
  call,
  busy,
  onDecide,
}: {
  call: ToolCall;
  busy: boolean;
  onDecide: (
    decision: "approved" | "denied",
    args?: Record<string, unknown>,
  ) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [args, setArgs] = useState<Record<string, unknown>>(call.args);

  return (
    <div className="rise overflow-hidden rounded-lg border border-amber-dk bg-amber-bg">
      <div className="flex items-center gap-2.5 border-b border-amber-dk/50 px-4 py-3">
        <span className="ring flex h-6 w-6 items-center justify-center rounded-full bg-amber/15">
          <ShieldAlert className="h-3.5 w-3.5 text-amber" strokeWidth={2.2} />
        </span>
        <span className="font-mono text-[0.6875rem] uppercase tracking-wide text-amber">
          Approval required
        </span>
        <span className="ml-auto font-mono text-[0.625rem] text-amber/60">
          nothing has run yet
        </span>
      </div>

      <div className="px-4 py-4">
        <p className="text-[0.9375rem] font-medium text-text">
          The agent wants to {TITLES[call.name] ?? call.name.replace(/_/g, " ")}
        </p>

        <dl className="mt-4 space-y-2.5">
          {Object.entries(args).map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-3">
              <dt className="w-24 shrink-0 font-mono text-[0.6875rem] text-amber/70">
                {k}
              </dt>
              <dd className="min-w-0 flex-1">
                {editing ? (
                  <input
                    value={String(v)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const next =
                        typeof v === "number" && raw !== "" && !isNaN(Number(raw))
                          ? Number(raw)
                          : raw;
                      setArgs((a) => ({ ...a, [k]: next }));
                    }}
                    className="w-full rounded border border-amber-dk bg-base px-2.5 py-1.5 font-mono text-[0.8125rem] text-text outline-none focus:border-amber"
                  />
                ) : (
                  <span className="font-mono text-[0.8125rem] text-text">
                    {typeof v === "number" && k.includes("amount")
                      ? `$${v.toFixed(2)}`
                      : String(v)}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide("approved", editing ? args : undefined)}
            className="inline-flex items-center gap-2 rounded-md bg-mint px-4 py-2 text-[0.8125rem] font-medium text-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
            Approve
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide("denied")}
            className="inline-flex items-center gap-2 rounded-md border border-edge-lit px-4 py-2 text-[0.8125rem] font-medium text-dim transition-colors hover:border-rose hover:text-rose disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.6} />
            Decline
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-[0.8125rem] text-faint transition-colors hover:text-text disabled:opacity-50"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
            {editing ? "Done editing" : "Edit first"}
          </button>
        </div>
      </div>
    </div>
  );
}
