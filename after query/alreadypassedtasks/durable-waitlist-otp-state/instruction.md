The waitlist OTP flow still relies too much on process-local state and becomes unreliable when requests overlap. Make PostgreSQL the source of truth for resend and verification limits.

Keep `/api/v1/waitlist/send-otp` and `/api/v1/waitlist/verify-otp` compatible with their current responses. Successful development sends still return 200 with `OTP sent` and the generated code, and successful verification still returns 200 with `Phone verified`. Existing missing-input, missing-registration, bad-code, expired-code, resend-limit, and verification-limit responses should remain unchanged.

Use the tracking columns already on `phone_otps`. A successful send stores the new code, expiry, method, send time, resend count, and resets verification attempts. Stop after three sends during one active OTP cycle. An expired OTP starts a fresh cycle, so the next successful send begins with resend count one and zero verification attempts. Wrong codes must persist their attempt count. Keep both counters between zero and three at the database boundary.

Treat one phone as one consistency boundary across send, verify, and active registration checks. Same-phone operations must serialize even when resend and verification overlap. After a successful replacement, the old code must fail. If delivery of the replacement fails, the old code and counters must remain usable. Registration responses must reflect one committed OTP state, while different phones remain independent.

Provider delivery is part of send success. Verification must atomically mark the waitlist entry verified and consume its OTP.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.