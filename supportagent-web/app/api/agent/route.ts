import { runAgent, type RunInput } from "@/lib/agent";
import type { AgentEvent } from "@/types/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streams the agent run as Server-Sent Events.
 *
 * The API key is read inside lib/agent on the server and never reaches the
 * browser. The client sends the whole transcript back on each turn, because
 * the agent is stateless by design — there is no session to lose and nothing
 * to clean up.
 */
export async function POST(req: Request) {
  let body: Partial<RunInput>;

  try {
    body = (await req.json()) as Partial<RunInput>;
  } catch {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message && !body.resume) {
    return Response.json({ detail: "A message is required" }, { status: 400 });
  }
  if (message.length > 2000) {
    return Response.json({ detail: "Message is too long" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      try {
        for await (const event of runAgent({
          message,
          history: Array.isArray(body.history) ? body.history.slice(-10) : [],
          resume: body.resume,
        })) {
          send(event);
        }
      } catch (err) {
        send({
          type: "error",
          detail: err instanceof Error ? err.message : "The run failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // nginx otherwise buffers the whole stream into one lump on deploy
      "X-Accel-Buffering": "no",
    },
  });
}
