import "dotenv/config";

const API_URL = process.env.API_URL ?? "http://localhost:3000";
const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!ADMIN_SECRET) {
  console.error("ADMIN_SECRET not set in environment.");
  process.exit(1);
}

const res = await fetch(`${API_URL}/admin/bootstrap`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ADMIN_SECRET}`,
  },
  body: JSON.stringify({
    org_name: "Acme Corp",
    org_slug: "acme-corp",
    api_key_label: "local-dev",
  }),
});

const data = await res.json();

if (!res.ok) {
  console.error("Bootstrap failed:", data);
  process.exit(1);
}

console.log("Org created successfully.");
console.log("Org ID:  ", data.org_id);
console.log("Org Slug:", data.org_slug);
console.log("API Key: ", data.api_key);
console.log("");
console.log("Add this to your .env as BLACKOUT_API_KEY=<api_key>");
console.log("Add this to your blackout.yaml org field as:", data.org_slug);
