The process of reviewing candidate restaurants must be improved to prevent conflicts caused by concurrent reviewers and errors in data handling. 

At the moment, reviewing candidate restaurants does not benefit from strict processing orders, which leads to cases when reviews for the same candidate restaurant occur simultaneously or inconsistently.

We need to revise the candidate restaurant review process according to the following principles:

- Each review should be executed without deviations from its original states (e.g. transitions from Pending to Approved or Pending to Rejected). In case a review happens once, all further attempts should return 409 Conflict because they would refer to a previously reviewed candidate restaurant.

- When a candidate restaurant is approved, a Restaurant record should be created and linked to an existing record in the same database transaction. 

- Super-admin notifications regarding review results should be sent to inform administrators that new restaurants have been activated.

- A batch review API with a  PUT request should process candidate restaurant reviews in the order of their arrival.

- The system should respond with 400 Bad Request for invalid applications, unknown actions or duplicate IDs.

- If an approval of a restaurant fails for some reason, all operations are to be rolled back.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.

