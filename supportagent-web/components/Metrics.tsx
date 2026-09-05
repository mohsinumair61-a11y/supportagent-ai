import { humanCostUsd, HUMAN_BASELINE } from "@/lib/cost";
import type { Usage } from "@/types/agent";

/**
 * Cost per resolution, shown next to the answer.
 *
 * The comparison is against a stated assumption, not a measured figure — an
 * agent that claims a saving should say what it is comparing against, which is
 * why the baseline is spelled out rather than implied.
 */
export default function Metrics({ usage }: { usage: Usage }) {
  const human = humanCostUsd();
  const saving = human - usage.costUsd;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-edge pt-3">
      <Stat label="resolved in" value={`${(usage.durationMs / 1000).toFixed(1)}s`} />
      <Stat label="tokens" value={usage.totalTokens.toLocaleString()} />
      <Stat
        label="model calls"
        value={String(usage.llmCalls)}
      />
      <Stat label="cost" value={`$${usage.costUsd.toFixed(4)}`} tone="text-amber" />

      <span
        className="ml-auto font-mono text-[0.6875rem] text-mint"
        title={`Assumes ${HUMAN_BASELINE.minutes} min at $${HUMAN_BASELINE.hourlyUsd}/hr — set HUMAN_MINUTES_PER_TICKET and HUMAN_HOURLY_USD to change`}
      >
        ~${saving.toFixed(2)} vs {HUMAN_BASELINE.minutes} min of human time
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-dim",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <span className="font-mono text-[0.6875rem] text-faint">
      {label} <span className={tone}>{value}</span>
    </span>
  );
}
