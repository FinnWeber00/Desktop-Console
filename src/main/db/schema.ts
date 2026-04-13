export const INIT_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('website', 'app')),
  name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  target TEXT NOT NULL,
  icon TEXT,
  note TEXT,
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER NOT NULL DEFAULT 0,
  last_opened_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS security_settings (
  id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  auto_lock_minutes INTEGER NOT NULL DEFAULT 15,
  lock_enabled INTEGER NOT NULL DEFAULT 1 CHECK (lock_enabled IN (0, 1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  theme_mode TEXT NOT NULL DEFAULT 'system',
  language TEXT NOT NULL DEFAULT 'zh-CN',
  tray_enabled INTEGER NOT NULL DEFAULT 1 CHECK (tray_enabled IN (0, 1)),
  global_hotkey TEXT,
  browser_path TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_sort_order
ON categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_cards_category_id
ON cards(category_id);

CREATE INDEX IF NOT EXISTS idx_cards_category_pinned_sort
ON cards(category_id, pinned DESC, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_cards_last_opened_at
ON cards(last_opened_at DESC);
`;
