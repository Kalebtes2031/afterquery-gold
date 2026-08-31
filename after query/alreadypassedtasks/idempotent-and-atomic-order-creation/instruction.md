Please make `POST /api/v1/orders` safe to retry without creating duplicate orders.

The endpoint should accept an optional `Idempotency-Key` header scoped to the authenticated user. The first successful request with a new key should create the order normally, return the existing `201` response, and include `Idempotency-Replayed: false`. If the same user sends the key again with an equivalent payload, return the original order with the same status and response shape, set `Idempotency-Replayed: true`, and do not create duplicate order items.

Trim whitespace around the key before using it. After trimming, it must be 1–128 printable ASCII characters. Reusing a key for a different order should return `409` without creating anything. The same key used by another user should be independent. When comparing payloads, ignore JSON property order and the order of entries in `items`. Changes to restaurant, order type, waiting time, message, item IDs, or quantities should count as different requests.

Order creation should also be atomic, even without an idempotency key. The order, its items, and any idempotency state must either commit together or all roll back. A failed keyed request must remain retryable with the same key.

Keep the current response format and behavior for requests without a key. Socket events and manager notifications should happen only after a successful commit, never after rollback, and never again when a successful keyed request is replayed.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.