import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

import type { Category } from '../../shared/types/models';

const mapCategory = (row: {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}): Category => ({
  id: row.id,
  name: row.name,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class CategoryRepository {
  constructor(private readonly db: Database.Database) {}

  list(): Category[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, sort_order, created_at, updated_at
         FROM categories
         ORDER BY sort_order ASC, created_at ASC`,
      )
      .all() as Array<{
      id: string;
      name: string;
      sort_order: number;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map(mapCategory);
  }

  create(name: string): Category {
    const now = new Date().toISOString();
    const sortOrder =
      (this.db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS sortOrder FROM categories').get() as {
        sortOrder: number;
      }).sortOrder + 1;
    const category: Category = {
      id: randomUUID(),
      name,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO categories (id, name, sort_order, created_at, updated_at)
         VALUES (@id, @name, @sortOrder, @createdAt, @updatedAt)`,
      )
      .run(category);

    return category;
  }

  update(id: string, name: string): Category | null {
    const current = this.findById(id);
    if (!current) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE categories
         SET name = @name, updated_at = @updatedAt
         WHERE id = @id`,
      )
      .run({ id, name, updatedAt });

    return { ...current, name, updatedAt };
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM categories WHERE id = ?').run(id).changes > 0;
  }

  reorder(items: Array<{ id: string; sortOrder: number }>): boolean {
    const updateStmt = this.db.prepare(
      `UPDATE categories
       SET sort_order = @sortOrder, updated_at = @updatedAt
       WHERE id = @id`,
    );
    const updatedAt = new Date().toISOString();
    const transaction = this.db.transaction((records: Array<{ id: string; sortOrder: number }>) => {
      for (const record of records) {
        updateStmt.run({ ...record, updatedAt });
      }
    });

    transaction(items);
    return true;
  }

  findById(id: string): Category | null {
    const row = this.db
      .prepare(
        `SELECT id, name, sort_order, created_at, updated_at
         FROM categories
         WHERE id = ?`,
      )
      .get(id) as
      | {
          id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    return row ? mapCategory(row) : null;
  }
}
