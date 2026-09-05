/** A tool the model can choose to call. */
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  /** Filled once the tool has run. */
  result?: string;
  durationMs?: number;
  /** True for tools that change money or order state. */
  needsApproval?: boolean;
  approval?: "approved" | "denied";
  /** If the operator edited the arguments before approving. */
  editedArgs?: Record<string, unknown>;
}

export interface Usage {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  durationMs: number;
  llmCalls: number;
}

/** One turn of the conversation, as the console renders it. */
export interface Turn {
  id: string;
  role: "customer" | "agent";
  text: string;
  toolCalls?: ToolCall[];
  usage?: Usage;
  /** Set when the run stopped because a tool needs sign-off. */
  pending?: ToolCall;
  /** The conversation at the point it paused, held to hand back on resume.
   *  Opaque — the UI never reads into it. */
  pausedContents?: unknown;
  error?: string;
  createdAt: number;
}

/* ---------- Wire format between the browser and the agent route ---------- */

export interface HistoryTurn {
  role: "user" | "model";
  text: string;
}

export type AgentEvent =
  | { type: "thinking"; text: string }
  | { type: "tool_start"; call: ToolCall }
  | { type: "tool_end"; id: string; result: string; durationMs: number }
  | { type: "approval_required"; call: ToolCall; contents?: unknown }
  | { type: "token"; text: string }
  | { type: "usage"; usage: Usage }
  | { type: "done" }
  | { type: "error"; detail: string };
