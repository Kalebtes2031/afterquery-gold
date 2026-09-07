People keep losing nicknames in the gap between "is this free?" and actually joining. I want a short hold so a client can park a name, confirm it once they connect, or just let it fall off.

Put `NicknameHoldService`, `createNicknameHoldService`, `MemoryNicknameHoldStore`, `claimNicknameHold`, `confirmNicknameHold`, `releaseNicknameHold`, `getNicknameHold`, and `listNicknameHolds` on `packages/backend/src/services/nickname_holds.ts`. You can inject a store; if you don't, keep it in memory. Store methods: `getHold`, `putHold`, `deleteHold`, `listHolds`, `compareAndSetHold`. The helper functions take the same options object and an optional store at the end.

Trim the nickname, NFC-normalize it, then run the usual 3–24 character rules. Compare case-insensitively and persist lowercase. Holder ids get trimmed and have to be non-empty; leave their case alone.

`claimNicknameHold(nickname, holderId, options?)` starts the hold. `ttlSeconds` is 45 when missing or not finite, truncated toward zero, then clamped to 5–120. Pass `now` as epoch ms when you need a frozen clock. First claim: `{ok:true, status:"held", nickname, holderId, expiresAt, remainingSeconds}`. Same holder again refreshes the expiry and comes back `"refreshed"`. Someone else hitting a live hold gets `{ok:false, reason:"held"}` with the current holder and expiry. Expired holds are free to take. Junk input is `invalid_nickname` or `invalid_holder`.

Confirming a live hold turns it into an 1800s lease. Same holder confirming again just restarts that 1800s. Failures: `not_found`, `holder_mismatch`, `expired`, plus the invalid reasons. `releaseNicknameHold` only works for the current holder of a live row and also takes `now`; once it's expired it looks like `not_found`.

`getNicknameHold` returns `{nickname, holderId, status:"held"|"confirmed", expiresAt, remainingSeconds}` or `null`. `listNicknameHolds` drops expired rows, sorts by nickname, and can filter by `holderId`. `remainingSeconds` is floored and never negative. Two people grabbing the same free name at once: one wins.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
