Add soft stock reservations for sale drafts so users cannot promise the same branch inventory to multiple in-progress sales.

Expose reservation operations under `/api/v1/sales/stock-reservations`. A reservation is scoped by company and a client-provided `draftKey`, belongs to one branch, and contains unique product/quantity lines. Creating the same active draft again replaces its complete reservation atomically. Availability is physical branch on-hand minus quantities held by other active, unexpired reservations; a request that exceeds availability must return the existing 409 conflict response and leave the previous reservation unchanged. Missing balance rows count as zero stock.

Reservations are temporary. Accept `ttlMinutes` from 1 through 120, defaulting to 15. Provide read, release, refresh, and availability operations. Release must be idempotent. Expired reservations must stop reducing availability, and normal reservation/read/release/refresh/availability activity must sweep due reservations so their status becomes `EXPIRED` without requiring a background worker. Refresh is allowed only for active reservations.

Keep an ordered event ledger for each draft with `RESERVED`, `REPLACED`, `REFRESHED`, `RELEASED`, and `EXPIRED` events. Reusing a released or expired draft key creates a new active hold and records `RESERVED` again.

This is a soft hold only: reservation actions must not change physical inventory balances, inventory pending quantities, inventory transactions, sale orders, or finance records. Validate company ownership, active branch/product state, positive quantities, unique products, and a maximum of 100 lines.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
