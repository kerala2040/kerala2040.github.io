-- Aggregate per campaign/hour. NO individual event, IP address, email, referrer or user-agent.
CREATE TABLE IF NOT EXISTS hourly_clicks (
  slug TEXT NOT NULL CHECK (length(slug) BETWEEN 1 AND 64),
  hour_utc TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0),
  suspected_prefetch INTEGER NOT NULL DEFAULT 0 CHECK (suspected_prefetch >= 0),
  PRIMARY KEY (slug, hour_utc)
);
CREATE INDEX IF NOT EXISTS ix_hourly_clicks_hour ON hourly_clicks(hour_utc);
