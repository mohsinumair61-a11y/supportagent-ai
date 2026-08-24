"""
Agent Tools

Each function decorated with @tool becomes something the agent can
choose to call on its own, based on the user's message and the tool's
docstring. The docstring IS the interface the LLM reads to decide
whether and how to use a tool - vague docstrings lead to the agent
picking the wrong tool or the wrong arguments, so these are written
deliberately specific.
"""
from langchain_core.tools import tool
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from .mock_orders import get_order
from .policies import POLICY_DOCUMENTS

# Support tickets created during this server's lifetime. In-memory by
# design (same reasoning as DocuChat AI's vector store) - no database
# setup required to run or demo this project.
SUPPORT_TICKETS: list[dict] = []

_policy_store: InMemoryVectorStore | None = None


def init_policy_store() -> InMemoryVectorStore:
    """Embed the policy documents once at startup so the policy search
    tool has something to search against."""
    global _policy_store
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
    _policy_store = InMemoryVectorStore(embeddings)
    for doc in POLICY_DOCUMENTS:
        _policy_store.add_texts(texts=[doc["text"]], metadatas=[{"id": doc["id"]}])
    return _policy_store


@tool
def check_order_status(order_id: str) -> str:
    """Look up the current status, items, and delivery estimate for a
    customer's order. Use this whenever the customer asks about an
    order they've already placed, mentions an order number (formatted
    like ORD-1001), or asks where their package is.

    Args:
        order_id: The order ID, e.g. "ORD-1001".
    """
    order = get_order(order_id)
    if not order:
        return f"No order found with ID {order_id}. Ask the customer to double-check the order number."

    lines = [
        f"Order {order['order_id']} for {order['customer']}: status is '{order['status']}'.",
        f"Items: {', '.join(order['items'])}. Total: {order['total']}.",
        f"Estimated delivery: {order['estimated_delivery']}.",
    ]
    if order["tracking_number"]:
        lines.append(f"Tracking number: {order['tracking_number']}.")
    return " ".join(lines)


@tool
def search_return_policy(query: str) -> str:
    """Search the store's return, refund, shipping, and cancellation
    policies for information relevant to the customer's question. Use
    this whenever the customer asks about returns, refunds, shipping
    times/costs, or cancelling an order - do NOT guess at policy
    details, always check this tool first.

    Args:
        query: What the customer wants to know, e.g. "can I return a defective item".
    """
    if _policy_store is None:
        return "Policy database is not available right now."

    results = _policy_store.similarity_search(query, k=2)
    if not results:
        return "No matching policy found for that question."

    return " ".join(doc.page_content for doc in results)


@tool
def create_support_ticket(issue: str, priority: str = "normal") -> str:
    """Escalate an issue to a human support agent by creating a support
    ticket. Use this ONLY when you can't resolve the customer's issue
    yourself with the other tools - for example a complaint, a request
    outside policy, or something that needs a human judgment call.

    Args:
        issue: A short, clear summary of the customer's problem.
        priority: "low", "normal", or "high" based on urgency.
    """
    ticket_id = f"TICKET-{len(SUPPORT_TICKETS) + 1001}"
    ticket = {"ticket_id": ticket_id, "issue": issue, "priority": priority}
    SUPPORT_TICKETS.append(ticket)
    return f"Created {ticket_id} (priority: {priority}). A human agent will follow up on: {issue}"


ALL_TOOLS = [check_order_status, search_return_policy, create_support_ticket]
