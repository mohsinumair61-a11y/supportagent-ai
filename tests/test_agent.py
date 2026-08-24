"""
Unit tests for SupportAgent AI's tools and agent construction.
"""
import pytest
from unittest.mock import Mock, patch
from src.tools import check_order_status, create_support_ticket, SUPPORT_TICKETS


def test_check_order_status_found():
    """Looking up a real order returns its details."""
    result = check_order_status.invoke({"order_id": "ORD-1001"})
    assert "shipped" in result
    assert "Ayesha Khan" in result


def test_check_order_status_not_found():
    """Looking up a nonexistent order returns a clear message, not an error."""
    result = check_order_status.invoke({"order_id": "ORD-9999"})
    assert "No order found" in result


def test_check_order_status_case_insensitive():
    """Order IDs should match regardless of case."""
    result = check_order_status.invoke({"order_id": "ord-1001"})
    assert "Ayesha Khan" in result


def test_create_support_ticket():
    """Creating a ticket returns a ticket ID and stores it."""
    initial_count = len(SUPPORT_TICKETS)
    result = create_support_ticket.invoke({
        "issue": "Customer received wrong item",
        "priority": "high"
    })
    assert "TICKET-" in result
    assert len(SUPPORT_TICKETS) == initial_count + 1
    assert SUPPORT_TICKETS[-1]["priority"] == "high"


def test_health_endpoint():
    """The health check reports status without requiring a live agent call."""
    from fastapi.testclient import TestClient
    from src.main import app

    with patch('src.main.build_agent_executor'), patch('src.main.init_policy_store'):
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        assert "status" in response.json()


def test_agent_prompt_includes_tool_guidance():
    """The system prompt should tell the agent to use tools rather than guess."""
    from src.agent import SYSTEM_PROMPT
    assert "tools" in SYSTEM_PROMPT.lower()
    assert "support ticket" in SYSTEM_PROMPT.lower()
