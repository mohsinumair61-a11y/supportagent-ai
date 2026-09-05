"use client";

import { useState } from "react";
import {
  ChevronRight, FileSearch, Loader2, PackageSearch, ShieldAlert,
  TicketPlus, Undo2, XCircle,
} from "lucide-react";
import type { ToolCall } from "@/types/agent";

const META: Record<
  string,
  { icon: typeof PackageSearch; label: string; tone: string }
> = {
  check_order_status: { icon: PackageSearch, label: "Order lookup", tone: "sky" },
  search_return_policy: { icon: FileSearch, label: "Policy search", tone: "sky" },
  issue_refund: { icon: Undo2, label: "Issue refund", tone: "amber" },
  cancel_order: { icon: XCircle, label: "Cancel order", tone: "amber" },
  create_support_ticket: { icon: TicketPlus, label: "Escalate to human", tone: "mint" },
};

const TONE: Record<string, { text: string; bg: string; dot: string }> = {
  sky: { text: "text-sky", bg: "bg-sky-bg", dot: "bg-sky" },
  amber: { text: "text-amber", bg: "bg-amber-bg", dot: "bg-amber" },
  mint: { text: "text-mint", bg: "bg-mint-bg", dot: "bg-mint" },
};

/**
 * The run timeline.
 *
 * This is the point of the whole interface: what the agent decided to do, in
 * order, with what arguments and what came back. A support bot that only shows
 * its final answer asks you to take the reasoning on trust.
 */
export default function Trace({ calls }: { calls: ToolCall[] }) {
  if (calls.length === 0) return null;
  return (
    <ol className="rail space-y-1.5">
      {calls.map((c) => (
        <Step key={c.id} call={c} />
      ))}
    </ol>
  );
}

function Step({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(false);
  const meta = META[call.name] ?? {
    icon: ShieldAlert,
    label: call.name,
    tone: "sky",
  };
  const tone = TONE[meta.tone];
  const running = call.result === undefined && call.approval !== "denied";
  const denied = call.approval === "denied";

  return (
    <li className="step-in relative pl-8">
      <span
        className={`absolute left-1.5 top-2 flex h-5 w-5 items-center justify-center rounded-full border border-edge ${
          running ? "bg-panel" : denied ? "bg-rose-bg" : tone.bg
        }`}
      >
        {running ? (
          <Loader2 className="spin h-3 w-3 text-dim" strokeWidth={2.4} />
        ) : denied ? (
          <XCircle className="h-3 w-3 text-rose" strokeWidth={2.4} />
        ) : (
          <meta.icon className={`h-3 w-3 ${tone.text}`} strokeWidth={2.2} />
        )}
      </span>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={call.result === undefined}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-raised disabled:hover:bg-transparent"
      >
        <span className={`font-mono text-[0.75rem] ${denied ? "text-rose" : tone.text}`}>
          {meta.label}
        </span>

        <span className="truncate font-mono text-[0.6875rem] text-faint">
          {Object.entries(call.args)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(" ")}
        </span>

        <span className="ml-auto flex shrink-0 items-center gap-2">
          {call.approval === "approved" ? (
            <span className="font-mono text-[0.625rem] text-mint">approved</span>
          ) : null}
          {denied ? (
            <span className="font-mono text-[0.625rem] text-rose">declined</span>
          ) : null}
          {typeof call.durationMs === "number" ? (
            <span className="font-mono text-[0.625rem] text-faint">
              {call.durationMs}ms
            </span>
          ) : null}
          {call.result !== undefined ? (
            <ChevronRight
              className={`h-3.5 w-3.5 text-faint transition-transform ${open ? "rotate-90" : ""}`}
              strokeWidth={2.2}
            />
          ) : null}
        </span>
      </button>

      {open && call.result ? (
        <p className="ml-2 mt-1 rounded-md border border-edge bg-base px-3 py-2.5 font-mono text-[0.75rem] leading-relaxed text-dim">
          {call.result}
        </p>
      ) : null}
    </li>
  );
}
