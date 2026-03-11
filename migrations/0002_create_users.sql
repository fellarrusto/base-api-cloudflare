-- 0002_create_users.sql
-- Users table — IDP agnostic, subject = sub claim from JWT
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  subject TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  roles TEXT NOT NULL DEFAULT '["user"]',
  active_services TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_subject ON users(subject);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);