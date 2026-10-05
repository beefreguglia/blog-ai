CREATE TABLE IF NOT EXISTS posts (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  published_at TIMESTAMPTZ NULL,
  approved_at  TIMESTAMPTZ NULL,
  rejected_at  TIMESTAMPTZ NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
