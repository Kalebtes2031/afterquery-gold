Featured listings should stay stable while restaurant availability stays live

GET /api/v1/sponsored-listings accepts availability and limit. availability defaults to browse; orderable requires ordering enabled and online. Permanently closed restaurants never appear. Invalid/repeated availability returns {"success":false,"message":"availability must be browse or orderable"}.

limit must be a whole number from 1 through 20. Invalid/repeated limit returns {"success":false,"message":"limit must be a whole number from 1 to 20"}. Filter availability before limiting. Deduplicate by restaurant; sort globally by priority descending, end date ascending, then listing id.

Every limited request requires a UUID requestId. Invalid/repeated requestId returns {"success":false,"message":"requestId is invalid"}. requestId without limit returns {"success":false,"message":"requestId requires limit"}. limit without requestId returns {"success":false,"message":"limit requires requestId"}. cursor without limit returns {"success":false,"message":"cursor requires limit"}.

Limited success is {"success":true,"data":[...],"nextCursor":"<opaque cursor>"}; terminal pages use "nextCursor":null.

Page one fixes membership/order. Later pages use live availability; deleted, inactive, or unavailable entries are skipped and permanently passed.