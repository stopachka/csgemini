import { init, id } from "@instantdb/admin";
import schema from "../src/instant.schema";

// Bun loads .env automatically
const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;

if (!appId || !adminToken) {
  console.error("Missing App ID or Admin Token");
  process.exit(1);
}

const db = init({ appId, adminToken, schema });

const mapNames = [
  "de_dust2_classic",
  "cs_assault_neon",
  "de_aztec_ruins",
  "fy_iceworld_poly",
  "de_inferno_lite"
];

async function seed() {
  console.log("Seeding maps...");
  
  // Clear existing maps? Maybe not, just add if missing or unique names?
  // Schema says `name` is not unique/indexed in the provided file, but let's just create them.
  
  const txs = mapNames.map(name => {
      return db.tx.maps[id()].update({ name });
  });

  await db.transact(txs);
  console.log("Seeded 5 maps!");
}

seed();
