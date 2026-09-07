Busy channels need a speak cooldown, not another moderator block list. After someone posts, they should wait before posting again in that channel.

Export `ChannelSlowModeService`, `createChannelSlowModeService`, `MemoryChannelSlowModeStore`, `setChannelSlowMode`, `getChannelSlowMode`, `clearChannelSlowMode`, `canSpeak`, `recordChannelSpeak`, `trySpeak`, `getCooldown`, `listActiveCooldowns`, and `sweepExpiredCooldowns` from `packages/backend/src/services/slow_mode.ts`. Optional store, memory by default. Store needs config get/put/delete, cooldown get/put/delete/list, and `compareAndSetCooldown`. Helpers take the same options plus an optional store last.

Channel ids are trimmed and keep case (colons ok). Empty channel is invalid. Nicknames use the shared trim / NFC / 3–24 rules and are stored lowercase.

`setChannelSlowMode(channelId, options?)` turns the channel on. `intervalSeconds` defaults to 20, rejects non-finite with `invalid_interval`, truncates, clamps 1–600. Success: `{ok:true, channelId, intervalSeconds, enabled:true}`. `getChannelSlowMode` returns `{channelId, intervalSeconds, enabled:true}` or `null`. `clearChannelSlowMode` removes the config and every cooldown for that channel; missing config is `not_enabled`.

With slow mode off, `canSpeak` always allows. With it on, the first speak is allowed; after `recordChannelSpeak`, later checks are denied until `availableAt`. Denial: `{ok:true, allowed:false, channelId, nickname, availableAt, remainingSeconds}`. Recording while still cooling down fails with `cooldown_active`. Recording with slow mode off fails with `not_enabled`. `trySpeak` is canSpeak then record on allow; if blocked it returns the denial and does not record.

`listActiveCooldowns` is live windows only, sorted by nickname. `getCooldown` returns the live view or `null`. `sweepExpiredCooldowns` deletes expired rows and returns `{removed, nicknames}` sorted unique. `remainingSeconds` is floored and never negative. Cooldowns are per channel and per nickname. `now` is an injectable epoch-ms clock.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
