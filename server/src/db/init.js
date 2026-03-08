import pool from "./pool.js";

const CREATE_LANGUAGES_TABLE = `
  CREATE TABLE IF NOT EXISTS languages (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    native_name TEXT NOT NULL
  );
`;

const CREATE_CURRICULA_TABLE = `
  CREATE TABLE IF NOT EXISTS curricula (
    source_code TEXT NOT NULL REFERENCES languages(code),
    target_code TEXT NOT NULL REFERENCES languages(code),
    "schema" JSONB NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (source_code, target_code)
  );
`;

const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_REFRESH_TOKENS_TABLE = `
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const CREATE_FUNCTION_SQL = `
  CREATE OR REPLACE FUNCTION set_curricula_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`;

const CREATE_TRIGGER_SQL = `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_curricula_updated_at'
    ) THEN
      CREATE TRIGGER set_curricula_updated_at
      BEFORE UPDATE ON curricula
      FOR EACH ROW
      EXECUTE FUNCTION set_curricula_updated_at();
    END IF;
  END $$;
`;

const CREATE_USERS_UPDATED_AT_FUNCTION = `
  CREATE OR REPLACE FUNCTION set_users_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
`;

const CREATE_USERS_UPDATED_AT_TRIGGER = `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_users_updated_at'
    ) THEN
      CREATE TRIGGER set_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION set_users_updated_at();
    END IF;
  END $$;
`;

export async function ensureTables() {
  await pool.query(CREATE_LANGUAGES_TABLE);
  await pool.query(CREATE_CURRICULA_TABLE);
  await pool.query(CREATE_USERS_TABLE);
  await pool.query(CREATE_REFRESH_TOKENS_TABLE);
  await pool.query(CREATE_FUNCTION_SQL);
  await pool.query(CREATE_TRIGGER_SQL);
  await pool.query(CREATE_USERS_UPDATED_AT_FUNCTION);
  await pool.query(CREATE_USERS_UPDATED_AT_TRIGGER);
}
