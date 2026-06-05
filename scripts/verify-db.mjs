/**
 * Verifies Supabase DB state using the REST API (anon key).
 * Run: node scripts/verify-db.mjs
 * Requires .env.local to be populated.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local manually (no dotenv dep)
const envPath = resolve(process.cwd(), ".env.local");
let url, anonKey;
try {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const [k, ...rest] = line.split("=");
    const v = rest.join("=").trim();
    if (k?.trim() === "NEXT_PUBLIC_SUPABASE_URL") url = v;
    if (k?.trim() === "NEXT_PUBLIC_SUPABASE_ANON_KEY") anonKey = v;
  }
} catch {
  console.error("❌ Could not read .env.local — have you created it from .env.local.example?");
  process.exit(1);
}

if (!url || !anonKey || url.includes("your-project")) {
  console.error("❌ .env.local is missing or still has placeholder values.");
  process.exit(1);
}

async function query(table, params = "") {
  const res = await fetch(`${url}/rest/v1/${table}${params}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "count=exact",
    },
  });
  const count = res.headers.get("content-range")?.split("/")[1];
  const data = await res.json();
  return { ok: res.ok, status: res.status, count, data };
}

console.log("Verifying Supabase DB...\n");

// Check zones
const zones = await query("zones", "?select=id,name,state&limit=5");
if (!zones.ok) {
  console.error("❌ zones table:", zones.status, zones.data);
} else {
  console.log(`✅ zones: ${zones.count} rows total`);
  zones.data.forEach(z => console.log(`   ${z.id} — ${z.name} (${z.state})`));
}

// Check profiles table exists (will be empty — no users yet)
const profiles = await query("profiles", "?select=id&limit=1");
console.log(profiles.ok ? `✅ profiles table: accessible` : `❌ profiles table: ${profiles.status}`);

// Check saved_trips
const trips = await query("saved_trips", "?select=id&limit=1");
console.log(trips.ok ? `✅ saved_trips table: accessible` : `❌ saved_trips: ${trips.status}`);

// Check field_reports
const reports = await query("field_reports", "?select=id&limit=1");
console.log(reports.ok ? `✅ field_reports table: accessible` : `❌ field_reports: ${reports.status}`);
