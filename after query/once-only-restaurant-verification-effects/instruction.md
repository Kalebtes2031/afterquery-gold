Our goal is ensuring that verification process of reviews in restaurants shall be done only once and repeated attempts shall not have any impact on results.

Presently, approving or disapproving candidates’ reviews may lead to multiple monetary awards being paid, simultaneous notifications being issued or monetary balance being ruined when the duplicates arise or reviews are processed simultaneously.

Amend the procedure of verifying candidate reviews:

- Apply the principle of monetary rewards payment only once. Approving the review will lead to the payment; however any repeated attempts of approval or simultaneous applications shall not cause any payment.

- Deduct the payments already made in case the review approved in advance is rejected. Update the terminal status properly.

- Check the approval status for each review. It should return 400 Bad Request status in case the item is not approved yet.

- Provide an opportunity to process reviews in batches using the endpoint PUT /api/v1/candidate-item-reviews/batch-manage with payload { reviews: [{ reviewId, isApproved }] }.

- Validate the incoming request to return 400 Bad Request in case of missing array, empty array or duplicate IDs.

- Database updates, media synchronization and payment operations shall happen in an atomic manner.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.