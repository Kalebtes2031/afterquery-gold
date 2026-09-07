We keep muting people in chat and then losing that state because timeouts and slow-mode are the wrong model. I need a mute ledger that is distinct from both.

Export `ChannelMuteLedger`, `createChannelMuteLedger`, `MemoryChannelMuteStore`, `muteUser`, `unmuteUser`, `isMuted`, `getMute`, `listChannelMutes`, `listMutedChannels`, `countActiveMutes`, and `sweepExpiredMutes` from `packages/backend/src/services/mutes.ts`. Optional store, memory by default. Store surface: `getMute`, `putMute`, `deleteMute`, `listMutes`, `compareAndSetMute`. Helpers take the same options plus an optional store last.

Channel ids are trimmed and keep case (colons ok). Empty channel is invalid. Nicknames go through the shared trim / NFC / 3–24 rules and are stored lowercase. `moderatorId` is trimmed and required.

`muteUser(channelId, nickname, moderatorId, options?)`: `durationSeconds` omitted or non-finite → permanent mute (`expiresAt: null`). Finite values are truncated and clamped 10–86400. `reason` is optional, trimmed, dropped if blank, cut to 80 chars. `now` is epoch ms.

Fresh or already-expired row → `status: "applied"`. Still live and the new expiry ranks later (permanent outranks any timed) → replace (`"extended"`). Still live but not later → leave alone (`"kept"`). Success: `{ok:true, status, channelId, nickname, moderatorId, expiresAt, remainingSeconds, permanent, reason?}`. Failures: `invalid_channel`, `invalid_nickname`, `invalid_moderator`.

`unmuteUser` lifts a live mute (permanent or timed) and accepts `now`. Missing or expired is `not_found`. `isMuted` is true for permanent or live timed. `getMute` returns the live view or `null`. `listChannelMutes` is live rows sorted by nickname unless `includeExpired`. `listMutedChannels` / `countActiveMutes` ignore expired timed rows. `sweepExpiredMutes` removes only timed expired rows — never permanent — and returns `{removed, channelIds}`. Floor remaining time; permanent remaining is `null`.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
