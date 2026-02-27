CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  endpoint TEXT,
  method TEXT,
  status INTEGER,
  duration_ms REAL,
  timestamp TEXT NOT NULL
);