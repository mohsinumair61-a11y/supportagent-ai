"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import Console from "@/components/Console";
import Inspector from "@/components/Inspector";
import { ORDERS, POLICIES, type Order, type Policy } from "@/lib/data";

const TOOLS_INFO = [
  {
    name: "check_order_status",
    kind: "read" as const,
    description:
      "Look up status, items, total and delivery estimate for an order. Called whenever the customer mentions an order number or asks where their package is.",
  },
  {
    name: "search_return_policy",
    kind: "read" as const,
    description:
      "Search return, refund, shipping and cancellation policy. The agent is told never to guess policy detail — it checks here first.",
  },
  {
    name: "issue_refund",
    kind: "approval" as const,
    description:
      "Issues a refund against an order. Moves real money, so the run stops and waits for a person before this runs at all.",
  },
  {
    name: "cancel_order",
    kind: "approval" as const,
    description:
      "Cancels an order that has not shipped. Changes order state, so it also waits for approval.",
  },
  {
    name: "create_support_ticket",
    kind: "write" as const,
    description:
      "Escalates to a human. Used when the other tools cannot resolve the issue — a complaint, something outside policy, anything needing judgement.",
  },
];

export default function Page({
  configured,
  model,
}: {
  configured: boolean;
  model: string;
}) {
  const [prefill, setPrefill] = useState<{ text: string; nonce: number }>();

  const orders = Object.values(ORDERS) as Order[];
  const policies = POLICIES as Policy[];

  return (
    <div className="mx-auto w-full max-w-[70rem] px-5 py-8 sm:px-8 sm:py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-dk bg-amber-bg">
            <Bot className="h-4.5 w-4.5 text-amber" strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-[1.0625rem] font-semibold tracking-tight text-white">
              SupportAgent
            </h1>
            <p className="text-[0.8125rem] text-dim">
              Takes actions — and asks before the ones that cost money
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-edge bg-panel px-2.5 py-1.5 font-mono text-[0.6875rem] text-faint">
            {model}
          </span>
          <span
            title={
              configured
                ? "Calls the live Gemini API"
                : "Scripted model — the tool loop, approval gate and token accounting are real. Add GOOGLE_API_KEY to .env.local for live Gemini."
            }
            className={`inline-flex cursor-help items-center gap-2 rounded-md px-2.5 py-1.5 font-mono text-[0.6875rem] ${
              configured ? "bg-mint-bg text-mint" : "bg-amber-bg text-amber"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${configured ? "bg-mint" : "bg-amber"}`}
            />
            {configured ? "live model" : "demo mode"}
          </span>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <Console prefill={prefill} />
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <Inspector
            tools={TOOLS_INFO}
            orders={orders}
            policies={policies}
            onAsk={(text) => setPrefill({ text, nonce: Date.now() })}
          />
        </aside>
      </div>
    </div>
  );
}
