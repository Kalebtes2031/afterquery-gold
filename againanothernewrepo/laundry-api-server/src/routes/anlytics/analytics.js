// src/routes/anlytics/analytics.js
const express = require("express");
const router = express.Router();
const { ChatGroq } = require("@langchain/groq");

const pool = require('../../config/db');

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0.1,
  maxTokens: 1200,
});

router.post("/analytics-query", async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    // Step 1: Generate initial SQL
    const sqlPrompt = `
You are an expert SQL writer for a Kenyan laundry business. All money is in KSh.

Tables:
- laundry_orders (order_id, laundry_id, booked_at, customer_id, customer_name, branch_name, main_service_name, package_name, status, quantity, is_per_kg)
- users (uid, name)
- invoices (invoice_number, customer_id, total_bill, paid_amount, balance, status, created_at)

Rules:
- ONLY SELECT queries.
- Revenue = invoices.total_bill or invoices.paid_amount
- To link customers to revenue: JOIN invoices ON invoices.customer_id = laundry_orders.customer_id
- For top N customers: GROUP BY customer_name, SUM(invoices.total_bill) ORDER BY SUM DESC LIMIT N
- For time filters: use DATE_TRUNC for week/month
- Return ONLY the SQL query inside \`\`\`sql ... \`\`\`

User Question: "${query}"

Write the SQL:
`;

    const sqlResponse = await llm.invoke(sqlPrompt);
    const sqlText = sqlResponse.content || sqlResponse.text || "";

    const match = sqlText.match(/```sql\s*([\s\S]*?)\s*```/i);
    let sqlQuery = match ? match[1].trim() : sqlText.trim();

    if (!sqlQuery.toLowerCase().startsWith("select")) {
      sqlQuery = "SELECT COUNT(*) as total_orders FROM laundry_orders LIMIT 1";
    }

    // Step 2: Execute SQL
    const dbResult = await pool.query(sqlQuery);
    const rows = dbResult.rows;

    // Step 3: Clean Final Analysis (No SQL shown to user)
    const analysisPrompt = `
You are a senior business intelligence analyst for a Kenyan laundry company.

User Question: "${query}"

Real data from database:
${JSON.stringify(rows, null, 2)}

All amounts are in KSh.

Provide a clear, professional, and useful business answer in bullet points only.
- Use exact numbers and percentages.
- Always show money as "KSh XXX"
- Never mention SQL, queries, or technical details.
- If data is missing, say so honestly and give the best answer possible.
- Suggest 1-2 useful follow-up questions at the end.
`;

    const finalResponse = await llm.invoke(analysisPrompt);

    res.json({ 
      response: finalResponse.content || finalResponse.text 
    });

  } catch (error) {
    console.error("[ANALYTICS ERROR]", error.message);
    res.status(500).json({ 
      response: "Sorry, I had trouble analyzing that question. Could you please rephrase it?" 
    });
  }
});

module.exports = router;