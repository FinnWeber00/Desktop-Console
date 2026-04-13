import type Database from 'better-sqlite3';

import {
  DEFAULT_CARDS,
  DEFAULT_CATEGORIES,
  DEFAULT_SECURITY_SETTINGS,
  DEFAULT_SETTINGS,
} from '../services/seed-data';

export const seedDatabase = (db: Database.Database): void => {
  const categoryCount = (db.prepare('SELECT COUNT(1) AS count FROM categories').get() as { count: number }).count;
  if (categoryCount === 0) {
    const insertCategory = db.prepare(
      `INSERT INTO categories (id, name, sort_order, created_at, updated_at)
       VALUES (@id, @name, @sortOrder, @createdAt, @updatedAt)`,
    );
    const transaction = db.transaction(() => {
      for (const category of DEFAULT_CATEGORIES) {
        insertCategory.run(category);
      }
    });

    transaction();
  }

  const cardCount = (db.prepare('SELECT COUNT(1) AS count FROM cards').get() as { count: number }).count;
  if (cardCount === 0) {
    const insertCard = db.prepare(
      `INSERT INTO cards (id, type, name, category_id, target, icon, note, pinned, sort_order, open_count, last_opened_at, created_at, updated_at)
       VALUES (@id, @type, @name, @categoryId, @target, @icon, @note, @pinned, @sortOrder, @openCount, @lastOpenedAt, @createdAt, @updatedAt)`,
    );
    const transaction = db.transaction(() => {
      for (const card of DEFAULT_CARDS) {
        insertCard.run({
          ...card,
          pinned: card.pinned ? 1 : 0,
        });
      }
    });

    transaction();
  }

  const settingsCount = (db.prepare('SELECT COUNT(1) AS count FROM app_settings').get() as { count: number }).count;
  if (settingsCount === 0) {
    db.prepare(
      `INSERT INTO app_settings (id, theme_mode, language, tray_enabled, global_hotkey, browser_path, created_at, updated_at)
       VALUES (@id, @themeMode, @language, @trayEnabled, @globalHotkey, @browserPath, @createdAt, @updatedAt)`,
    ).run({
      ...DEFAULT_SETTINGS,
      trayEnabled: DEFAULT_SETTINGS.trayEnabled ? 1 : 0,
    });
  }

  const securityCount = (db.prepare('SELECT COUNT(1) AS count FROM security_settings').get() as { count: number })
    .count;
  if (securityCount === 0) {
    db.prepare(
      `INSERT INTO security_settings (id, password_hash, auto_lock_minutes, lock_enabled, updated_at)
       VALUES (@id, @passwordHash, @autoLockMinutes, @lockEnabled, @updatedAt)`,
    ).run({
      ...DEFAULT_SECURITY_SETTINGS,
      lockEnabled: DEFAULT_SECURITY_SETTINGS.lockEnabled ? 1 : 0,
    });
  }
};
