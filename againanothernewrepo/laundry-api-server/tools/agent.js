// tools/agent.js
// Analytics Agent for Laundry Orders — Aggregated + Optimized + Timed

require("dotenv").config({ path: "../.env" });

const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { HuggingFaceInference } = require("@langchain/community/llms/hf");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const readline = require("readline");

// ──────────────────────────────────────────────────────────
// 🔍 ENV DEBUG
// ──────────────────────────────────────────────────────────
console.log("[DEBUG] dotenv loaded from ../.env");
console.log(
  "[DEBUG] FIREBASE_SERVICE_ACCOUNT exists:",
  !!process.env.FIREBASE_SERVICE_ACCOUNT
);
console.log(
  "[DEBUG] Length:",
  process.env.FIREBASE_SERVICE_ACCOUNT?.length || "undefined"
);

// ──────────────────────────────────────────────────────────
// 🔥 FIREBASE INIT
// ──────────────────────────────────────────────────────────
try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not defined in .env");
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("Firebase Admin initialized successfully (from .env string)");
} catch (err) {
  console.error("Firebase Admin initialization failed:");
  console.error("Error:", err.message);
  console.error(
    "Fix: ensure FIREBASE_SERVICE_ACCOUNT is valid JSON on ONE LINE"
  );
  process.exit(1);
}

const db = getFirestore();

// ──────────────────────────────────────────────────────────
// 🤖 HUGGING FACE LLM
// ──────────────────────────────────────────────────────────
const { ChatGroq } = require("@langchain/groq");

const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile", // ✅ Current active model
  temperature: 0.4,
  maxTokens: 500,
});
// ──────────────────────────────────────────────────────────
// 🧠 PROMPT
// ──────────────────────────────────────────────────────────
const prompt = PromptTemplate.fromTemplate(`
You are a senior business intelligence analyst for a laundry booking platform.

You are given aggregated statistics from recent orders.

Use them to:
- identify the most popular services/packages
- detect trends
- highlight operational risks
- suggest revenue opportunities
- give concrete business actions

Data:
{data}

User Question:
{query}

Answer clearly and concisely in bullet points where helpful.
`);

const chain = prompt.pipe(llm).pipe(new StringOutputParser());

// ──────────────────────────────────────────────────────────
// 📊 FETCH + AGGREGATE FIRESTORE DATA
// ──────────────────────────────────────────────────────────
async function getRecentOrdersAnalytics() {
  try {
    console.log("[STEP 1] Querying Firestore for recent orders...");

    const snapshot = await db
      .collection("laundryOrders")
      .orderBy("bookedAt", "desc")
      .limit(40)
      .get();

    console.log(`[STEP 2] Fetched ${snapshot.size} orders`);

    const summary = {
      totalOrders: snapshot.size,
      serviceCounts: {},
      packageCounts: {},
      branchCounts: {},
      statusCounts: {},
      extraCounts: {},
      avgQuantity: 0,
      perKgOrders: 0,
    };

    let qtySum = 0;

    snapshot.docs.forEach((doc) => {
      const d = doc.data();

      if (d.mainServiceName) summary.serviceCounts[d.mainServiceName] = (summary.serviceCounts[d.mainServiceName] || 0) + 1;
      if (d.packageName) summary.packageCounts[d.packageName] = (summary.packageCounts[d.packageName] || 0) + 1;
      if (d.branchName) summary.branchCounts[d.branchName] = (summary.branchCounts[d.branchName] || 0) + 1;
      if (d.status) summary.statusCounts[d.status] = (summary.statusCounts[d.status] || 0) + 1;
      if (d.isPerKg) summary.perKgOrders++;
      qtySum += d.quantity || 0;
      d.extraServices?.forEach((e) => {
        summary.extraCounts[e.name] = (summary.extraCounts[e.name] || 0) + 1;
      });
    });

    summary.avgQuantity = snapshot.size > 0 ? (qtySum / snapshot.size).toFixed(1) : 0;

    const json = JSON.stringify(summary, null, 2);

    console.log("[STEP 2.5] Analytics payload size:", json.length, "chars");

    return json;
  } catch (err) {
    console.error("[DB ERROR]", err.message);
    return JSON.stringify({ error: err.message });
  }
}

// ──────────────────────────────────────────────────────────
// 🖥 CLI LOOP
// ──────────────────────────────────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function askQuestion() {
  rl.question("\nAsk the agent: ", async (query) => {
    if (query.toLowerCase() === "exit") {
      console.log("Goodbye 👋");
      rl.close();
      return;
    }

    console.log(`\n[QUERY] ${query}`);

    try {
      const data = await getRecentOrdersAnalytics();

      console.log("[STEP 3] Invoking LLM...");
      console.log("[STEP 3.5] Prompt size approx:", data.length + query.length + 300, "chars");

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("LLM request timed out after 30 seconds")), 30000)
      );

      const response = await Promise.race([
        chain.invoke({ data, query }),
        timeoutPromise,
      ]);

      console.log("[STEP 4] LLM response received");
      console.log("----------------------------------------");
      console.log(response);
      console.log("----------------------------------------");
    } catch (err) {
      console.error("[AGENT ERROR]");
      console.error("Message:", err.message);

      if (err.message.includes("timed out")) {
        console.error("Tip: HF free tier may be slow — retry or switch to Ollama locally.");
      }

      if (err.message.toLowerCase().includes("inference")) {
        console.error("Tip: Check HUGGINGFACEHUB_API_TOKEN is valid and has credits.");
      }
    }

    askQuestion();
  });
}

console.log("Analytics Agent ready (Firestore + Hugging Face).\nType your question or 'exit' to quit.\n");

askQuestion();



