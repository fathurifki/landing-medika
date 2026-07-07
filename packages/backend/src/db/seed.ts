import { db } from "./index";
import { users } from "./schema";
import bcrypt from "bcryptjs";
import { readOptionalEnv } from "../config/env";

async function seed() {
  const email = readOptionalEnv("ADMIN_EMAIL");
  const password = readOptionalEnv("ADMIN_PASSWORD");

  const existingAdmin = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.role, "admin"),
    orderBy: (u, { asc }) => [asc(u.id)],
  });

  if (existingAdmin) {
    console.log(`Admin user already exists (${existingAdmin.email}), skipping seed.`);
    process.exit(0);
  }

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set before bootstrapping a fresh database."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(users).values({
    email,
    passwordHash,
    name: "Administrator",
    role: "admin",
  });

  console.log(`✅ Admin user created: ${email}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
