-- Assignable links store hashed high-entropy URL tokens, not raw tokens.
-- intended_recipient_label describes who got the link, never proof of actual visitor.
CREATE TABLE IF NOT EXISTS assigned_links (
  token_hash TEXT PRIMARY KEY CHECK(length(token_hash) = 64),
  recipient_label TEXT NOT NULL CHECK(length(recipient_label) BETWEEN 1 AND 96),
  created_utc TEXT NOT NULL,
  expires_utc TEXT NOT NULL,
  last_alert_utc TEXT
);
CREATE TABLE IF NOT EXISTS assigned_hourly (
  token_hash TEXT NOT NULL,
  hour_utc TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0 CHECK(requests >= 0),
  suspected_prefetch INTEGER NOT NULL DEFAULT 0 CHECK(suspected_prefetch >= 0),
  PRIMARY KEY (token_hash, hour_utc),
  FOREIGN KEY(token_hash) REFERENCES assigned_links(token_hash) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_assigned_hourly_utc ON assigned_hourly(hour_utc);
