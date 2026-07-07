import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { databaseUrl } from "../config/env";

const pool = new Pool({
  connectionString: databaseUrl,
  max: 30,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
});

// Idle clients can be dropped by the network layer (e.g. Docker/OrbStack port
// forwarding) between queries. Without this handler, that raises an
// unhandled 'error' event and crashes the process.
pool.on("error", (err) => {
  console.error("⚠️  Unexpected error on idle PG client:", err.message);
});

export const db = drizzle(pool, { schema });

export async function checkConnection() {
  try {
    const client = await pool.connect();
    client.release();
    console.log("✅ Database connected");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
}
