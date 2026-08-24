"""
Support Agent - Tool-Calling Agent Logic

Unlike a plain RAG chatbot (retrieve context, answer), this agent
decides FOR ITSELF which of several tools to call, in what order, and
whether it needs more than one before it can answer - the model reads
the conversation, picks a tool based on the tool's docstring, reads
the tool's result, and either calls another tool or responds. This is
the "agentic" behavior that a single retrieval pipeline doesn't have.

Uses LangChain's create_agent (the current, LangGraph-backed agent
constructor) rather than the older create_tool_calling_agent +
AgentExecutor pattern. That older pattern doesn't forward Gemini's
"thought signature" - a value newer Gemini "thinking" models require
to be echoed back on every tool call - so it fails outright against
current Gemini models. create_agent's model integration handles this
automatically.
"""
import os
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from .tools import ALL_TOOLS

SYSTEM_PROMPT = """You are a helpful customer support agent for an online store.

You have tools to check order status, search store policies, and escalate
issues to a human via a support ticket. Use them whenever relevant instead
of guessing - never invent an order status or policy detail you haven't
actually looked up.

If a customer's issue can't be resolved with the tools you have (a complaint,
something outside policy, anything needing human judgment), create a support
ticket rather than trying to resolve it yourself.

Keep responses concise and friendly, like a real support agent would."""


def build_agent_executor():
    """Construct the tool-calling agent."""
    llm = ChatGoogleGenerativeAI(
        model=os.getenv("MODEL_NAME", "models/gemini-3.6-flash"),
        temperature=0.2
    )

    return create_agent(
        model=llm,
        tools=ALL_TOOLS,
        system_prompt=SYSTEM_PROMPT,
    )


def _extract_text(content) -> str:
    """Gemini 3.x models can return message content as either a plain
    string or a list of structured content blocks (e.g. [{"type":
    "text", "text": "..."}], sometimes alongside non-text blocks like
    thinking traces). This normalizes either shape into plain text for
    the API response."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
            elif isinstance(block, str):
                parts.append(block)
        return "".join(parts)
    return str(content)


def run_agent(executor, message: str) -> dict:
    """Run the agent on a single message and return the answer plus a
    clean summary of which tools it called - this is what powers the
    'tool calls' chips in the UI, so the user can see the agent's
    reasoning wasn't just a hallucinated answer."""
    result = executor.invoke({"messages": [HumanMessage(content=message)]})
    messages = result["messages"]

    # Walk the message list pairing each AIMessage's tool_calls with the
    # ToolMessage that carries that tool's actual output, matched by id.
    tool_outputs_by_id = {
        m.tool_call_id: _extract_text(m.content)
        for m in messages
        if isinstance(m, ToolMessage)
    }

    tool_calls = []
    for m in messages:
        if isinstance(m, AIMessage) and getattr(m, "tool_calls", None):
            for tc in m.tool_calls:
                tool_calls.append({
                    "tool": tc["name"],
                    "input": tc["args"],
                    "output": tool_outputs_by_id.get(tc["id"], "")[:200],
                })

    final_answer = _extract_text(messages[-1].content) if messages else ""

    return {
        "answer": final_answer,
        "tool_calls": tool_calls,
    }

