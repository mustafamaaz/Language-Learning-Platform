import crypto from "node:crypto";
import pool from "../db/pool.js";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function upsertUser({ googleId, email, name, avatarUrl }) {
  const { rows } = await pool.query(
    `INSERT INTO users (google_id, email, name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET
       google_id  = EXCLUDED.google_id,
       name       = EXCLUDED.name,
       avatar_url = EXCLUDED.avatar_url
     RETURNING *`,
    [googleId, email, name, avatarUrl ?? null]
  );
  return rows[0];
}

export async function findUserById(id) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  return rows[0] ?? null;
}

export async function createRefreshToken(userId) {
  const raw = crypto.randomBytes(64).toString("hex");
  const hash = hashToken(raw);

  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash) VALUES ($1, $2)",
    [userId, hash]
  );

  return raw;
}

export async function rotateRefreshToken(userId, oldRaw) {
  const oldHash = hashToken(oldRaw);

  const { rowCount } = await pool.query(
    "DELETE FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2",
    [userId, oldHash]
  );

  if (rowCount === 0) return null;

  return createRefreshToken(userId);
}

export async function deleteAllRefreshTokens(userId) {
  await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
}

export async function findRefreshToken(userId, raw) {
  const hash = hashToken(raw);
  const { rows } = await pool.query(
    "SELECT * FROM refresh_tokens WHERE user_id = $1 AND token_hash = $2",
    [userId, hash]
  );
  return rows[0] ?? null;
}

export async function promoteToAdmin(email) {
  const { rows } = await pool.query(
    `INSERT INTO users (google_id, email, name, role)
     VALUES ($1, $2, $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET role = 'admin'
     RETURNING *`,
    [`pending_${email}`, email]
  );
  return rows[0];
}
