Make the sponsored listing rules work the same for the feed, impression tracking, and expiration job.

For GET /api/v1/sponsored-listing, only return listing that is actually active at that time. The listing need to be Active, start_date should already be reached, end_date should still be in future, and impressions should be less than max_impressions.

Please don't change the current feed response format. The restaurant image fallback should also keep working the same way it works now.

The impression endpoint should follow same rules. If listing doesn't exist, return 404 with Sponsored listing not found. If the listing did not start yet, return 409 with Sponsored listing has not started yet.

If the listing already ended, is Expired, or already used all the impressions, don't add another impression. If it is still Active, change the status to Expired. Then return 200 with Listing expired and include the listing in data.

There is also concurrency issue with impression count. If a listing is at 9/10 and two requests comes at the same time, the count should never become 11. Only one request should add the last impression. The other request should get Listing expired without increasing the count.

An impression exactly at start_date should be valid. Also the last allowed impression need to be saved before changing the listing to Expired.

The expiration job should expire any Active listing when end_date <= now or impressions >= max_impressions.

Please don't change the model, migrations, database schema, or other unrelated sponsored listing behavior.
IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.