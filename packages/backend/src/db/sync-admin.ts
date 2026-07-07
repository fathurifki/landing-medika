import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import path from "path";

// In production, env vars are injected by Docker — no .env file needed.
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "../../../../.env") });
}

// Unlike `seed.ts` (create-if-missing only), this rotates credentials for the
// existing admin: run it after editing ADMIN_EMAIL/ADMIN_PASSWORD in .env to
// actually apply the new values to the database.
async function syncAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existingAdmin = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.role, "admin"),
    orderBy: (u, { asc }) => [asc(u.id)],
  });

  if (existingAdmin) {
    await db
      .update(users)
      .set({ email, passwordHash, updatedAt: new Date() })
      .where(eq(users.id, existingAdmin.id));
    console.log(
      `✅ Admin credentials synced (id ${existingAdmin.id}): ${existingAdmin.email} -> ${email}`
    );
  } else {
    await db.insert(users).values({
      email,
      passwordHash,
      name: "Administrator",
      role: "admin",
    });
    console.log(`✅ Admin user created: ${email}`);
  }

  process.exit(0);
}

syncAdmin().catch((err) => {
  console.error("Sync admin failed:", err);
  process.exit(1);
});
