import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';

import type { SecuritySettings } from '../../shared/types/models';
import type { SecuritySettingsUpdateInput } from '../../shared/types/ipc';

const mapSecurity = (row: {
  id: string;
  password_hash: string;
  auto_lock_minutes: number;
  lock_enabled: number;
  updated_at: string;
}): SecuritySettings => ({
  id: row.id,
  passwordHash: row.password_hash,
  autoLockMinutes: row.auto_lock_minutes,
  lockEnabled: row.lock_enabled === 1,
  updatedAt: row.updated_at,
});

const hashPassword = (password: string): string =>
  createHash('sha256').update(password).digest('hex');

export class SecurityRepository {
  constructor(private readonly db: Database.Database) {}

  get(): SecuritySettings {
    const row = this.db
      .prepare(
        `SELECT id, password_hash, auto_lock_minutes, lock_enabled, updated_at
         FROM security_settings
         WHERE id = 'default'`,
      )
      .get() as {
      id: string;
      password_hash: string;
      auto_lock_minutes: number;
      lock_enabled: number;
      updated_at: string;
    };

    return mapSecurity(row);
  }

  hasPassword(): boolean {
    const settings = this.get();
    return settings.lockEnabled && settings.passwordHash.length > 0;
  }

  updateSettings(input: SecuritySettingsUpdateInput): SecuritySettings {
    const current = this.get();
    const updatedAt = new Date().toISOString();
    const nextPasswordHash =
      input.password && input.password.trim().length > 0 ? hashPassword(input.password.trim()) : current.passwordHash;

    this.db
      .prepare(
        `UPDATE security_settings
         SET password_hash = @passwordHash,
             auto_lock_minutes = @autoLockMinutes,
             lock_enabled = @lockEnabled,
             updated_at = @updatedAt
         WHERE id = @id`,
      )
      .run({
        id: current.id,
        passwordHash: nextPasswordHash,
        autoLockMinutes: input.autoLockMinutes,
        lockEnabled: input.lockEnabled ? 1 : 0,
        updatedAt,
      });

    return this.get();
  }

  verifyPassword(password: string): boolean {
    const settings = this.get();
    if (!settings.lockEnabled || settings.passwordHash.length === 0) {
      return true;
    }

    return hashPassword(password) === settings.passwordHash;
  }
}
