import type Database from 'better-sqlite3';

import { normalizeAppLanguage } from '../../shared/constants/language';
import type { AppSettings } from '../../shared/types/models';
import type { SettingsUpdateInput } from '../../shared/types/ipc';

const mapSettings = (row: {
  id: string;
  theme_mode: 'light' | 'dark' | 'system';
  language: string;
  tray_enabled: number;
  global_hotkey: string | null;
  browser_path: string;
  created_at: string;
  updated_at: string;
}): AppSettings => ({
  id: row.id,
  themeMode: row.theme_mode,
  language: normalizeAppLanguage(row.language),
  trayEnabled: row.tray_enabled === 1,
  globalHotkey: row.global_hotkey,
  browserPath: row.browser_path,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class SettingsRepository {
  constructor(private readonly db: Database.Database) {}

  get(): AppSettings {
    const row = this.db
      .prepare(
        `SELECT id, theme_mode, language, tray_enabled, global_hotkey, browser_path, created_at, updated_at
         FROM app_settings
         WHERE id = 'default'`,
      )
      .get() as {
      id: string;
      theme_mode: 'light' | 'dark' | 'system';
      language: string;
      tray_enabled: number;
      global_hotkey: string | null;
      browser_path: string;
      created_at: string;
      updated_at: string;
    };

    return mapSettings(row);
  }

  update(input: SettingsUpdateInput): AppSettings {
    const current = this.get();
    const updated = {
      ...current,
      ...input,
      language: normalizeAppLanguage(input.language ?? current.language),
      updatedAt: new Date().toISOString(),
    };

    this.db
      .prepare(
        `UPDATE app_settings
         SET theme_mode = @themeMode,
             language = @language,
             tray_enabled = @trayEnabled,
             global_hotkey = @globalHotkey,
             browser_path = @browserPath,
             updated_at = @updatedAt
         WHERE id = @id`,
      )
      .run({
        ...updated,
        trayEnabled: updated.trayEnabled ? 1 : 0,
      });

    return this.get();
  }
}
