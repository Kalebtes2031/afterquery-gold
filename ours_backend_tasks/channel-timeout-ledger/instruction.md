We keep timing people out in chat and then losing track of it because nothing owns that state except whatever the client remembered. I need a timeout ledger that does not lean on presence sets or the reaction indexes.

Export `ChannelTimeoutLedger`, `createChannelTimeoutLedger`, `MemoryChannelTimeoutStore`, `applyChannelTimeout`, `liftChannelTimeout`, `isTimedOut`, `getTimeout`, `listChannelTimeouts`, `listTimedOutChannels`, `countActiveTimeouts`, and `sweepExpiredTimeouts` from `packages/backend/src/services/timeouts.ts`. Optional store, memory by default. Store surface: `getTimeout`, `putTimeout`, `deleteTimeout`, `listTimeouts`, `compareAndSetTimeout`. Helpers take the same options plus an optional store last.

Channel ids are trimmed and keep whatever case they arrived with, colons included. Empty channel is invalid. Nicknames go through the same trim / NFC / 3–24 rules as the rest of chat and are stored lowercase. `moderatorId` is trimmed and required.

`applyChannelTimeout(channelId, nickname, moderatorId, options?)`: `seconds` defaults to 300, ignores non-finite, truncates, clamps 10–86400. `reason` is optional, trimmed, dropped if blank, cut to 80 chars. `now` is epoch ms.

Fresh or already-expired row → `status: "applied"`. Still live and the new expiry is later → replace expiry, moderator, and reason (`"extended"`). Still live but the new expiry is not later → leave the row alone (`"kept"`). Success looks like `{ok:true, status, channelId, nickname, moderatorId, expiresAt, remainingSeconds, reason?}`. Failures: `invalid_channel`, `invalid_nickname`, `invalid_moderator`.

`liftChannelTimeout` deletes a live row and accepts `now`. Missing or expired is `not_found`. Doesn't matter who originally applied it.

`isTimedOut` is false / 0 remaining for bad input, missing rows, or expired rows. `getTimeout` returns the live view or `null`. `listChannelTimeouts` is live rows sorted by nickname unless `includeExpired` is true. `listTimedOutChannels` is the sorted channels that still have someone timed out. `countActiveTimeouts` counts live rows, optionally for one channel. `sweepExpiredTimeouts(channelId?)` deletes expired rows and returns `{removed, channelIds}` (sorted, unique, only channels that actually lost a row). Floor remaining time; don't go negative.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
