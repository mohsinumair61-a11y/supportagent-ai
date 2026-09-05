# SupportAgent

A customer support agent that resolves queries by **doing things** — looking up
orders, checking policy, issuing refunds — and stops for a human before any
action that costs money.

```bash
npm install
cp .env.example .env.local     # optional: add a Gemini key
npm run dev                    # http://localhost:3000
```

One process. No separate backend to run.

## The two things this does that a support chatbot doesn't

### It asks before it acts

Tools are split by consequence. `check_order_status` and `search_return_policy`
read data and run immediately. `issue_refund` and `cancel_order` move money and
change order state, so the run **stops** and the operator sees exactly what the
agent proposes:

```
The agent wants to issue a refund
  order_id   ORD-1004
  amount     $329.00
  reason     Item arrived defective — covered by the 90-day defect policy

  [Approve]  [Decline]  [Edit first]
```

Nothing has run at that point. The tool has not executed and no money has
moved. Approving resumes the run, declining tells the agent to explain itself
to the customer, and editing lets the operator change the amount first.

This is the difference between an agent a store will deploy and one they will
not. Unsupervised refund authority is where most of these projects stop.

### It shows its cost

Every resolution reports what it actually took:

```
resolved in 1.3s   tokens 2,336   model calls 3   cost $0.0009   ~$2.20 vs 6 min of human time
```

The human baseline is a stated assumption, set in `.env` — an agent claiming a
saving should say what it is comparing against, so the figure is configurable
rather than asserted.

## How the loop works

`lib/agent.ts` is a plain function-calling loop:

1. Send the conversation and the tool declarations to Gemini
2. If it asks for a tool — run it, feed the result back, repeat
3. If it asks for a tool marked `needsApproval` — **stop** and emit
   `approval_required`
4. If it answers in text — stream it back with token accounting

The whole run streams as Server-Sent Events, so the timeline fills in as it
happens rather than appearing complete at the end.

### Resuming after approval, and thought signatures

The agent is stateless: when the operator decides, the browser sends the
conversation back.

It sends the conversation **exactly as the model produced it**, not a
reconstruction. Gemini 3.x thinking models attach a `thoughtSignature` to every
function call and reject the next request outright if it is missing —

```
[400] Function call is missing a thought_signature in functionCall parts.
```

So the loop pushes `response.candidates[0].content` straight onto the
conversation rather than rebuilding a `functionCall` part from the parsed
arguments, and the paused conversation is handed to the browser and back
untouched. The UI treats it as opaque and never reads into it.

## Demo mode

With no `GOOGLE_API_KEY`, the app runs on a scripted model in `lib/mock-model.ts`.
The tool loop, the approval gate, the streaming transport and the token
accounting are all the real ones — only the model is stood in for.

It exists so the project can be deployed and demonstrated without a key or
quota, and so the agent loop can be tested without depending on the network.
Add a key and it switches to live Gemini with no other change.

## The inspector

The right-hand panel is tabbed and everything in it opens. Tools expand to show
the description the model actually reads when deciding what to call — which is
the interface between prompt and behaviour, and usually invisible. Orders show
their record and drop a matching question into the composer. Policies show
their full text.

A panel of cards that only sit there is worse than no panel: it reads as
interactive and isn't.

## Architecture

```
app/
  page.tsx              server component — tool inventory, test data
  api/agent/route.ts    SSE stream of the run
components/
  Page.tsx              layout shell, inspector wiring
  Console.tsx           run state, approval decisions, transcript
  Inspector.tsx         tabbed tools / orders / policy panel
  Trace.tsx             the run timeline — expandable tool calls
  Approval.tsx          the approval gate
  Metrics.tsx           cost per resolution
  Answer.tsx            markdown rendering
lib/
  agent.ts              the tool-calling loop
  tools.ts              tool declarations + implementations
  data.ts               mock orders and policy documents
  cost.ts               token pricing and the human baseline
  mock-model.ts         scripted model for demo mode
  stream.ts             hand-written SSE reader
types/
  agent.ts
```

No `any` anywhere. The API key is read server-side only — it has no
`NEXT_PUBLIC_` prefix, so it never reaches the browser.

### Policy retrieval

`searchPolicies` scores term overlap rather than using embeddings. With six
short policies the ranking is identical either way, and it removes an API round
trip and a failure mode from every policy question. At a few hundred documents
this needs real embeddings — the function boundary is the same, so that is a
contained change.

## Known limits

- **State is in memory.** Orders, tickets and refunds reset when the process
  restarts. A real deployment would talk to an order-management API.
- **No auth.** Anyone who can reach the app can approve a refund. In production
  the approval step belongs behind a login with an audit trail.
- **Approval is per-call, not per-policy.** A rule engine — auto-approve under
  $50, always escalate above $500 — would be the next step, and the
  `needsApproval` flag is where it would hook in.
- **Answers are not streamed token by token from the model.** Gemini's
  non-streaming endpoint is used so tool calls and text arrive in one response;
  the text is emitted in one chunk. Switching to `generateContentStream` would
  make the answer type out.

## Deploying

```bash
npx vercel
```

Set `GOOGLE_API_KEY` in the project's environment variables. Without it, the
deployment still works in demo mode — which is the point.
