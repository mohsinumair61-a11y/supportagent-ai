"""
SupportAgent AI - FastAPI Application

A customer support agent that can look up real order data, search
store policy, and escalate to a human via a support ticket - deciding
for itself which of those actions a given message needs.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

# Must run before any Gemini-related imports try to read env vars.
load_dotenv()

from .agent import build_agent_executor, run_agent
from .tools import init_policy_store, SUPPORT_TICKETS

agent_executor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Build the policy vector store and the agent once at startup."""
    global agent_executor
    init_policy_store()
    agent_executor = build_agent_executor()
    yield


app = FastAPI(
    title="SupportAgent AI",
    description="A tool-calling customer support agent",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ToolCall(BaseModel):
    tool: str
    input: dict
    output: str


class ChatResponse(BaseModel):
    answer: str
    tool_calls: list[ToolCall]


@app.get("/")
async def root():
    return {"message": "SupportAgent AI API", "docs": "/docs", "health": "/health"}


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model": os.getenv("MODEL_NAME", "models/gemini-3.6-flash"),
        "tickets_created": len(SUPPORT_TICKETS),
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to the agent. The agent decides on its own which
    tools (if any) it needs to call before answering."""
    if not agent_executor:
        raise HTTPException(status_code=500, detail="Agent not initialized")

    try:
        result = run_agent(agent_executor, request.message)
        return ChatResponse(answer=result["answer"], tool_calls=result["tool_calls"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent failed: {str(e)}")


@app.get("/tickets")
async def get_tickets():
    """View all support tickets created so far this session."""
    return {"tickets": SUPPORT_TICKETS}


# Serve the chat frontend at /app
app.mount("/app", StaticFiles(directory="frontend", html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
