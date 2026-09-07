Pinned messages keep getting reordered by whoever last touched the client cache. I need a real per-channel pin board with a hard cap and CAS on the board version.

Export `ChannelPinBoard`, `createChannelPinBoard`, `MemoryChannelPinStore`, `pinMessage`, `unpinMessage`, `reorderPins`, `listPins`, `getPin`, and `clearPins` from `packages/backend/src/services/pins.ts`. Optional store, memory by default. Store surface: `getBoard`, `putBoard`, `compareAndSetBoard` over an ordered pins list plus a monotonic `version`. Helpers take the same options plus an optional store last.

Channel ids are trimmed and keep case (colons ok). Empty channel is invalid. `messageId` and `pinnedBy` are trimmed, non-empty; keep `messageId` case as supplied. Optional `note` is trimmed, dropped if blank, cut to 120 chars. `now` is epoch ms.

`pinMessage(channelId, messageId, pinnedBy, options?)`: appends a new pin at the end with status `"pinned"` and its `position`. Already pinned → refresh `pinnedBy` / `pinnedAt` / `note` in place (`"refreshed"`) without changing position. At max 10 distinct pins → `pin_limit`. Success includes `version`. Failures: `invalid_channel`, `invalid_message`, `invalid_actor`, `pin_limit`.

`unpinMessage` removes a live pin or returns `not_found`. `reorderPins(channelId, messageIds)` must be an exact permutation of the current message ids (after trim) or `invalid_order`; empty board is `not_found`. All mutating writes CAS on `version` and retry on conflict. `listPins` returns ordered views with `position`. `getPin` returns one view or `null`. `clearPins` empties the board and reports `{cleared, version}` (zero cleared / version 0 when nothing was stored).

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
