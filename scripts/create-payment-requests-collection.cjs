const fs = require("fs");
const { Client, Databases, ID } = require("node-appwrite");

function env(name){
  const text = fs.readFileSync(".env.local","utf8");
  const line = text.split(/\r?\n/).find(l => l.startsWith(name+"="));
  return line ? line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g,"") : "";
}

const endpoint = env("APPWRITE_ENDPOINT");
const projectId = env("APPWRITE_PROJECT_ID");
const databaseId = env("APPWRITE_DATABASE_ID");
const apiKey = env("APPWRITE_API_KEY");

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const db = new Databases(client);
const collectionId = "payment_requests";

async function safe(label, fn){
  try { await fn(); console.log("OK:", label); }
  catch(e){
    const msg = String(e.message || e);
    if (e.code === 409 || msg.includes("already exists")) console.log("EXISTS:", label);
    else { console.error("FAIL:", label, msg); process.exit(1); }
  }
}

async function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

(async()=>{
  await safe("collection", () => db.createCollection({
    databaseId, collectionId, name: "Payment Requests",
    permissions: [], documentSecurity: false, enabled: true
  }));

  const strings = [
    ["client_id",64,true],["request_id",96,true],["source",40,true],
    ["customer_name",120,true],["status",40,true],["items_json",10000,true],
    ["gateway",40,false],["gateway_order_id",160,false],["gateway_payment_id",160,false],
    ["qr_url",2000,false],["upi_intent_url",2000,false],
    ["created_at_custom",40,false],["paid_at_custom",40,false]
  ];

  for (const [key,size,required] of strings) {
    await safe("attr "+key, () => db.createStringAttribute({databaseId, collectionId, key, size, required}));
    await wait(700);
  }

  await safe("attr amount", () => db.createFloatAttribute({databaseId, collectionId, key:"amount", required:true}));
  await wait(5000);

  await safe("index client_id", () => db.createIndex({databaseId, collectionId, key:"idx_client_id", type:"key", attributes:["client_id"]}));
  await safe("index request_id", () => db.createIndex({databaseId, collectionId, key:"idx_request_id", type:"unique", attributes:["request_id"]}));
  await safe("index status", () => db.createIndex({databaseId, collectionId, key:"idx_status", type:"key", attributes:["status"]}));

  console.log("DONE payment_requests");
})();
