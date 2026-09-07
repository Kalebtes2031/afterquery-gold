Session connection state drifts when heartbeats stop — clients still look "active" long after they went quiet. Fix it with idle and disconnected leases keyed by channel plus nickname.

Export `SessionLeaseService`, `createSessionLeaseService`, `MemorySessionLeaseStore`, `touchActivity`, `markIdle`, `markDisconnected`, `getLease`, `listChannelLeases`, `listIdleNicknames`, `sweepIdleLeases`, and `sweepDisconnectedLeases` from `packages/backend/src/services/session_leases.ts`. Optional store, memory by default. Store surface: `getLease`, `putLease`, `deleteLease`, `listLeases`, `compareAndSetLease` on a monotonic `version`. Helpers take the same options plus an optional store last.

Channel ids are trimmed and keep case (colons ok). Nicknames use the shared trim / NFC / 3–24 rules and are stored lowercase. `connectionId` is trimmed and required. `now` is epoch ms.

States are `active|idle|disconnected`. `touchActivity(channelId, nickname, connectionId, options?)` creates or refreshes an active lease, clearing idle/disconnected stamps. `idleAfterSeconds` defaults to 300 (clamp 30–3600). `disconnectAfterSeconds` defaults to 900 (clamp 60–7200). Non-finite values fall back to those defaults.

`markIdle` / `markDisconnected` transition a stored lease (idempotent when already in that state). Missing rows are `not_found`; marking idle on a disconnected lease is also `not_found`. Failures: `invalid_channel`, `invalid_nickname`, `invalid_connection`, `not_found`.

`sweepIdleLeases` moves qualifying `active` rows to `idle` when `now - lastActiveAt` meets the idle threshold. `sweepDisconnectedLeases` moves qualifying `idle` rows to `disconnected` when `now - idleAt` meets the disconnect threshold; active rows are left alone. Both return `{transitioned, nicknames}` (sorted unique) and CAS on version. `listChannelLeases` sorts by nickname. `listIdleNicknames` is idle-only, sorted. Floor idle/disconnected durations; never negative.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
