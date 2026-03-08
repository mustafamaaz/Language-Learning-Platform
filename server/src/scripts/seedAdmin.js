import "../config/env.js";
import { promoteToAdmin } from "../services/authService.js";
import pool from "../db/pool.js";
import { ensureTables } from "../db/init.js";

const email = process.argv[2];

if (!email || !email.includes("@")) {
  console.error("Usage: node src/scripts/seedAdmin.js <email>");
  process.exit(1);
}

try {
  await ensureTables();
  const user = await promoteToAdmin(email);
  console.log(`Admin role granted to ${user.email} (id: ${user.id})`);
} catch (err) {
  console.error("Failed to seed admin:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
