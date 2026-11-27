CREATE TABLE characters (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
  display_order INTEGER NOT NULL DEFAULT 0,
  price INTEGER NOT NULL DEFAULT 2900 CHECK (price BETWEEN 1 AND 100000),
  sale_mode TEXT NOT NULL DEFAULT 'notify' CHECK (sale_mode IN ('notify','buy')),
  product_id TEXT UNIQUE,
  details TEXT NOT NULL CHECK (json_valid(details)),
  revision INTEGER NOT NULL DEFAULT 0,
  first_published TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX characters_catalog ON characters(status, display_order, id);

CREATE TABLE character_media (
  character_id INTEGER NOT NULL REFERENCES characters(id),
  media_key TEXT NOT NULL,
  etag TEXT NOT NULL,
  PRIMARY KEY (character_id, media_key)
);
CREATE INDEX character_media_lookup ON character_media(media_key, character_id);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  offer_on INTEGER NOT NULL DEFAULT 0 CHECK (offer_on IN (0,1)),
  offer_price INTEGER NOT NULL DEFAULT 1900 CHECK (offer_price BETWEEN 1 AND 2899),
  offer_cap INTEGER NOT NULL DEFAULT 10 CHECK (offer_cap BETWEEN 1 AND 10)
);
INSERT INTO settings (id) VALUES (1);

CREATE TABLE feedback (
  id INTEGER PRIMARY KEY,
  character_id INTEGER REFERENCES characters(id),
  context TEXT NOT NULL CHECK (context IN ('before','after','support','notify')),
  outcome TEXT,
  message TEXT,
  email TEXT,
  reply INTEGER NOT NULL CHECK (reply IN (0,1)),
  research INTEGER NOT NULL CHECK (research IN (0,1)),
  notify INTEGER NOT NULL CHECK (notify IN (0,1)),
  reporter TEXT,
  confirmation TEXT UNIQUE,
  confirmation_seen INTEGER NOT NULL DEFAULT 0,
  blocker TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','closed')),
  reply_date TEXT,
  resolution TEXT,
  note TEXT,
  order_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  scrubbed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX feedback_queue ON feedback((status <> 'new'), created_at, id);
CREATE INDEX feedback_recent ON feedback(created_at, blocker, reporter) WHERE blocker IS NOT NULL;
CREATE INDEX feedback_retention ON feedback(created_at) WHERE research = 0 AND scrubbed = 0;
