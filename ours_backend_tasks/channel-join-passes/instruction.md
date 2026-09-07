We need one-time admit tokens for private channels that are not nickname holds. Issue a short-lived pass, consume it once, or let the issuer revoke it.

Export `JoinPassService`, `createJoinPassService`, `MemoryJoinPassStore`, `issueJoinPass`, `consumeJoinPass`, `revokeJoinPass`, `getJoinPass`, `listJoinPasses`, and `sweepExpiredJoinPasses` from `packages/backend/src/services/join_passes.ts`. Optional store, memory by default. Store surface: `getPass`, `putPass`, `deletePass`, `listPasses`, `compareAndSetPass`. Helpers take the same options plus an optional store last.

Channel ids are trimmed and keep case (colons ok). Empty channel is invalid. Issuer and consumer ids are trimmed and required; leave their case alone. `now` is epoch ms.

`issueJoinPass(channelId, issuerId, options?)`: `ttlSeconds` defaults to 120 when missing or non-finite, truncated, clamped 30–600. Default `passId` is `pass_` plus 16 lowercase hex digits (injectable `createPassId` for tests). Optional `note` trimmed, dropped if blank, cut to 80. Success: `{ok:true, passId, channelId, issuerId, createdAt, expiresAt, remainingSeconds, note?}`. Failures: `invalid_channel`, `invalid_issuer`.

`consumeJoinPass(passId, consumerId, options?)` is one-winner CAS. Live issued → consume. Failures: `not_found`, `expired`, `already_consumed`, `invalid_pass`, `invalid_consumer`. Revoked passes look like `not_found` to consumers.

`revokeJoinPass` is issuer-only (`issuer_mismatch` otherwise). Already consumed → `already_consumed`; expired → `expired`. `getJoinPass` returns a view with status `issued|consumed|revoked|expired`. `listJoinPasses` is per channel, sorted by pass id, and includes consumed/revoked/expired rows still in the store. `sweepExpiredJoinPasses(channelId?)` deletes only expired rows that were never consumed or revoked and returns `{removed, passIds}` (sorted unique). Floor remaining time; never go negative. Two consumers racing the same live pass: exactly one wins via CAS.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
