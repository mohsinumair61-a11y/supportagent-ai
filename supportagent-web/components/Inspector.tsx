"use client";

import { useState } from "react";
import { ChevronRight, FileText, Package, Wrench } from "lucide-react";
import type { Order, Policy } from "@/lib/data";

type Tab = "tools" | "orders" | "policy";

interface ToolInfo {
  name: string;
  kind: "read" | "write" | "approval";
  description: string;
}

const KIND = {
  read: { label: "read", cls: "text-sky bg-sky-bg" },
  write: { label: "write", cls: "text-mint bg-mint-bg" },
  approval: { label: "approval", cls: "text-amber bg-amber-bg" },
};

/**
 * The right-hand panel.
 *
 * Everything in here does something. Tools expand to show the description the
 * model actually reads when deciding what to call; orders and policies drop a
 * matching question into the composer. A panel of cards that only sit there
 * is worse than no panel — it reads as interactive and isn't.
 */
export default function Inspector({
  tools,
  orders,
  policies,
  onAsk,
}: {
  tools: ToolInfo[];
  orders: Order[];
  policies: Policy[];
  onAsk: (question: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("tools");
  const [open, setOpen] = useState<string | null>(null);

  const tabs: { id: Tab; label: string; icon: typeof Wrench; count: number }[] = [
    { id: "tools", label: "Tools", icon: Wrench, count: tools.length },
    { id: "orders", label: "Orders", icon: Package, count: orders.length },
    { id: "policy", label: "Policy", icon: FileText, count: policies.length },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-panel">
      <div className="flex border-b border-edge">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setOpen(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 font-mono text-[0.6875rem] transition-colors ${
              tab === t.id
                ? "bg-raised text-amber"
                : "text-faint hover:text-dim"
            }`}
          >
            <t.icon className="h-3 w-3" strokeWidth={2.2} />
            {t.label}
            <span className="text-[0.5625rem] opacity-60">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="max-h-[26rem] space-y-1 overflow-y-auto p-2.5 scroll-thin">
        {tab === "tools"
          ? tools.map((t) => (
              <Row
                key={t.name}
                open={open === t.name}
                onToggle={() => setOpen(open === t.name ? null : t.name)}
                title={<span className="font-mono text-[0.75rem]">{t.name}</span>}
                badge={
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[0.5625rem] ${KIND[t.kind].cls}`}
                  >
                    {KIND[t.kind].label}
                  </span>
                }
                body={
                  <p className="text-[0.75rem] leading-relaxed text-faint">
                    {t.description}
                  </p>
                }
              />
            ))
          : null}

        {tab === "orders"
          ? orders.map((o) => (
              <Row
                key={o.order_id}
                open={open === o.order_id}
                onToggle={() => setOpen(open === o.order_id ? null : o.order_id)}
                title={<span className="font-mono text-[0.75rem]">{o.order_id}</span>}
                badge={
                  <span className="font-mono text-[0.5625rem] text-faint">{o.status}</span>
                }
                body={
                  <div className="space-y-2.5">
                    <dl className="space-y-1 font-mono text-[0.6875rem] text-faint">
                      <Line k="customer" v={o.customer} />
                      <Line k="items" v={o.items.join(", ")} />
                      <Line k="total" v={`$${o.total.toFixed(2)}`} />
                      <Line k="placed" v={o.placed} />
                      {o.tracking_number ? <Line k="tracking" v={o.tracking_number} /> : null}
                    </dl>
                    <button
                      type="button"
                      onClick={() => onAsk(`Where is my order ${o.order_id}?`)}
                      className="w-full rounded-md border border-edge-lit px-2.5 py-1.5 text-left font-mono text-[0.6875rem] text-dim transition-colors hover:border-amber hover:text-amber"
                    >
                      ask about this order →
                    </button>
                  </div>
                }
              />
            ))
          : null}

        {tab === "policy"
          ? policies.map((p) => (
              <Row
                key={p.id}
                open={open === p.id}
                onToggle={() => setOpen(open === p.id ? null : p.id)}
                title={<span className="text-[0.75rem]">{p.title}</span>}
                body={
                  <p className="text-[0.75rem] leading-relaxed text-faint">{p.text}</p>
                }
              />
            ))
          : null}
      </div>
    </div>
  );
}

function Row({
  title,
  badge,
  body,
  open,
  onToggle,
}: {
  title: React.ReactNode;
  badge?: React.ReactNode;
  body: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-md border border-edge bg-base">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-raised"
      >
        <ChevronRight
          className={`h-3 w-3 shrink-0 text-faint transition-transform ${open ? "rotate-90" : ""}`}
          strokeWidth={2.4}
        />
        <span className="min-w-0 flex-1 truncate text-dim">{title}</span>
        {badge}
      </button>
      {open ? <div className="border-t border-edge px-3 py-2.5">{body}</div> : null}
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 opacity-60">{k}</dt>
      <dd className="min-w-0 flex-1 text-dim">{v}</dd>
    </div>
  );
}
