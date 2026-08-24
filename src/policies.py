"""
Store Policies

Source text for the return/shipping policy search tool. In production
this would come from a CMS, help-center API, or document store — kept
as plain strings here so the project has no external dependency beyond
the Gemini API itself.
"""

POLICY_DOCUMENTS = [
    {
        "id": "returns-30-day",
        "text": (
            "Returns are accepted within 30 days of delivery for a full refund, "
            "provided the item is unused and in its original packaging. "
            "Refunds are issued to the original payment method within 5-7 "
            "business days of us receiving the returned item."
        ),
    },
    {
        "id": "returns-defective",
        "text": (
            "Defective or damaged items can be returned at any time within 90 "
            "days of delivery for a full refund or free replacement, whichever "
            "the customer prefers. No restocking fee applies to defective returns."
        ),
    },
    {
        "id": "shipping-standard",
        "text": (
            "Standard shipping takes 5-7 business days and is free on orders "
            "over $50. Orders under $50 have a flat shipping fee of $4.99."
        ),
    },
    {
        "id": "shipping-express",
        "text": (
            "Express shipping takes 1-2 business days and costs $14.99 regardless "
            "of order size. Express orders placed before 2 PM ship the same day."
        ),
    },
    {
        "id": "cancellation",
        "text": (
            "Orders can be cancelled for a full refund as long as they haven't "
            "entered the 'processing' status yet. Once an order is processing "
            "or shipped, it can no longer be cancelled and must go through the "
            "standard return process instead."
        ),
    },
]
