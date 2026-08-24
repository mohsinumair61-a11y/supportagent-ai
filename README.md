# SupportAgent AI

A customer support agent that doesn't just *answer* — it **decides what to do**. Given a message, it chooses which of several tools to call (check an order, search policy, file a ticket), calls them, and responds based on what it actually found — not from guessing.

This is the difference between a RAG chatbot (retrieve context → answer) and an **agent**: the model itself decides the sequence of actions needed to handle a request, based on the tools available to it.

## How it works

```
User: "Where's my order ORD-1001, and can I get a refund if it's late?"
                            │
                            ▼
                 ┌─────────────────────┐
                 │   Gemini (agent)     │  reads the message + each
                 │   decides which      │  tool's docstring, picks
                 │   tool(s) to call    │  which tool(s) it needs
                 └──────────┬──────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
      check_order_    search_return_  create_support_
      status()        policy()        ticket()
              │             │             │
              └─────────────┴─────────────┘
                            │
                            ▼
                 Gemini reads the tool results,
                 composes a final grounded answer
```

1. **User sends a message** to `/chat`.
2. **The agent (not fixed logic) decides** which tool(s) it needs — zero, one, or several — based on the tool docstrings in `tools.py`. This is LangChain's tool-calling agent pattern: the LLM outputs a structured "call this function with these arguments" decision, the code executes it, and the result goes back to the LLM.
3. **Tools execute** — `check_order_status` looks up a mock order DB, `search_return_policy` does a semantic search over embedded policy text, `create_support_ticket` logs an escalation.
4. **The agent composes a final answer** grounded in whatever the tools returned — and the API returns both the answer *and* a clean trail of which tools were used, so the UI can show it transparently (see the amber "tool call" chips in the chat).

## Tech stack

- **Backend:** FastAPI
- **Agent orchestration:** LangChain (`create_tool_calling_agent` + `AgentExecutor`)
- **LLM & embeddings:** Google Gemini (`gemini-3.6-flash` + `gemini-embedding-001`)
- **Vector store (for policy search tool):** LangChain `InMemoryVectorStore` — same reasoning as DocuChat AI: pure Python, no compiled dependencies, installs identically on any OS
- **Frontend:** vanilla JS chat UI showing the agent's tool-call trail per message

## The three tools

| Tool | What it does | When the agent uses it |
|---|---|---|
| `check_order_status` | Looks up order status/items/delivery from a mock order DB | Customer mentions an order ID or asks where a package is |
| `search_return_policy` | Semantic search over embedded return/shipping/cancellation policy text | Customer asks about returns, refunds, shipping, or cancellation |
| `create_support_ticket` | Logs an escalation with a priority level | The agent can't resolve the issue itself — a complaint, an edge case, anything needing human judgment |

## Running locally

```bash
git clone https://github.com/mohsinumair61-a11y/supportagent-ai.git
cd supportagent-ai

pip install -r requirements.txt

cp .env.example .env
# add your key from https://aistudio.google.com/apikey

uvicorn src.main:app --reload
# open http://localhost:8000/app
```

Try asking:
- *"What's the status of ORD-1001?"* → calls `check_order_status`
- *"Can I return a defective item?"* → calls `search_return_policy`
- *"I received the wrong item and I'm really unhappy"* → calls `create_support_ticket`
- *"Is ORD-1002 shipped yet, and what's your return window?"* → calls **two** tools in one turn

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Status + number of tickets created this session |
| POST | `/chat` | Send a message, get `{answer, tool_calls}` |
| GET | `/tickets` | View all tickets filed so far |

## Design notes

- **Tool docstrings are the interface the LLM reads**, not documentation for humans — vague docstrings cause the agent to pick the wrong tool or call it with bad arguments. Each tool here explicitly says *when* to use it, which is what actually drives correct tool selection.
- **`return_intermediate_steps=True`** on the `AgentExecutor` is what makes the tool-call trail visible in the UI — without it, you only get the final answer with no way to verify the agent didn't just hallucinate an order status.
- **In-memory vector store for policy search** — same trade-off as DocuChat AI: no persistence across restarts, but zero native build dependencies, which matters more for a demo/portfolio project meant to run on someone else's machine on the first try.
- **Mock data instead of a real order DB/ERP** — keeps the project runnable with zero external service dependencies beyond the Gemini API itself. Swapping `mock_orders.py` for a real database call is a contained change scoped to one file.

## Running tests

```bash
pytest tests/
```
