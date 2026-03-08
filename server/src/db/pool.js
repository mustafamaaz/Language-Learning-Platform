import "../config/env.js";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST || "127.0.0.1",
  port: Number(process.env.PGPORT || 5433),
  user: process.env.PGUSER || "learning_user",
  password: process.env.PGPASSWORD || "learning_password",
  database: process.env.PGDATABASE || "learning_platform",
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error", err);
});

export default pool;
