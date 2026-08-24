"""
Mock Order Database

In a real system this would query an actual database or an ERP/order
management API. For this project it's an in-memory dict so the agent's
tool-calling behavior can be demonstrated and tested without external
dependencies.
"""

ORDERS = {
    "ORD-1001": {
        "order_id": "ORD-1001",
        "customer": "Ayesha Khan",
        "status": "shipped",
        "items": ["Wireless Mouse", "USB-C Hub"],
        "total": "$47.98",
        "estimated_delivery": "2026-08-27",
        "tracking_number": "TRK-88291"
    },
    "ORD-1002": {
        "order_id": "ORD-1002",
        "customer": "Bilal Ahmed",
        "status": "processing",
        "items": ["Mechanical Keyboard"],
        "total": "$89.99",
        "estimated_delivery": "2026-08-30",
        "tracking_number": None
    },
    "ORD-1003": {
        "order_id": "ORD-1003",
        "customer": "Sara Malik",
        "status": "delivered",
        "items": ["Laptop Stand", "Webcam"],
        "total": "$64.50",
        "estimated_delivery": "2026-08-20",
        "tracking_number": "TRK-77120"
    },
}


def get_order(order_id: str) -> dict | None:
    """Look up a single order by ID. Returns None if it doesn't exist."""
    return ORDERS.get(order_id.strip().upper())
