// // functions/src/index.ts
// import * as functions from "firebase-functions";
// import fetch from "node-fetch";

// export const sendSMS = functions.https.onCall(async (data, context) => {
//   if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Login required");

//   const  to = data.to;
//   const message = data.message;

//   const username = functions.config().at.username;
//   const apiKey = functions.config().at.apikey;

//   const res = await fetch("https://api.africastalking.com/version1/messaging", {
//     method: "POST",
//     headers: {
//       "apiKey": apiKey,
//       "Content-Type": "application/json",
//       "Accept": "application/json"
//     },
//     body: JSON.stringify({
//       username,
//       to,
//       message,
//       from: "LAUNDRYROOM"
//     })
//   });

//   const result = await res.json();
//   return { success: true, data: result };
// });