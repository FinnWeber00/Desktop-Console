import { app } from 'electron';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { INIT_SQL } from './schema';
import { seedDatabase } from './seed';
import {
  getDefaultBrowserPath,
  isKnownChromePath,
  normalizeExecutablePath,
} from '../services/browser-launcher';
import { DEFAULT_GLOBAL_HOTKEY } from '../services/hotkey';

let db: Database.Database | null = null;

const ensureAppSettingsSchema = (database: Database.Database): void => {
  const columns = database.prepare('PRAGMA table_info(app_settings)').all() as Array<{ name: string }>;
  const hasBrowserPath = columns.some((column) => column.name === 'browser_path');

  if (!hasBrowserPath) {
    database.prepare("ALTER TABLE app_settings ADD COLUMN browser_path TEXT NOT NULL DEFAULT ''").run();
  }

  database
    .prepare(
      `UPDATE app_settings
       SET browser_path = @browserPath
       WHERE COALESCE(TRIM(browser_path), '') = ''`,
    )
    .run({ browserPath: getDefaultBrowserPath() });

  const staleBrowserPaths = database
    .prepare('SELECT id, browser_path FROM app_settings')
    .all() as Array<{ id: string; browser_path: string }>;
  const resetBrowserPath = database.prepare(
    `UPDATE app_settings
     SET browser_path = @browserPath
     WHERE id = @id`,
  );

  for (const row of staleBrowserPaths) {
    const normalizedPath = normalizeExecutablePath(row.browser_path);
    if (normalizedPath && isKnownChromePath(normalizedPath) && !fs.existsSync(normalizedPath)) {
      resetBrowserPath.run({ id: row.id, browserPath: getDefaultBrowserPath() });
    }
  }

  database
    .prepare(
      `UPDATE app_settings
       SET global_hotkey = @globalHotkey
       WHERE COALESCE(TRIM(global_hotkey), '') = ''
          OR REPLACE(COALESCE(global_hotkey, ''), ' ', '') = 'Alt+Space'`,
    )
    .run({ globalHotkey: DEFAULT_GLOBAL_HOTKEY });
};

export const getDatabase = (): Database.Database => {
  if (db) {
    return db;
  }

  const userData = app.getPath('userData');
  fs.mkdirSync(userData, { recursive: true });

  const databasePath = path.join(userData, 'desktop-console.db');
  db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  db.exec(INIT_SQL);
  ensureAppSettingsSchema(db);
  seedDatabase(db);

  return db;
};
