import { createClient } from "@base44/sdk";

const base44 = createClient({
  appId: "6aa428eadfaf8d99d50d10b7",
});

async function run() {
  const txns = [];
  for (let i = 0; i < 5; i++) {
    const res = await base44.entities.Transaction.list("-date", 500, i * 500);
    if (!res || res.length === 0) break;
    txns.push(...res);
  }
  
  const types = {};
  txns.forEach(t => {
    const k = String(t.type || "BLANK").toLowerCase();
    types[k] = (types[k] || 0) + 1;
  });
  console.log("Found transaction types:", types);
}
run();

