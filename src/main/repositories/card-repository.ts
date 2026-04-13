import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

import type { Card, CardType } from '../../shared/types/models';
import type { CardCreateInput, CardUpdateInput, SearchCardsInput, SortItemInput } from '../../shared/types/ipc';

type CardRow = {
  id: string;
  type: CardType;
  name: string;
  category_id: string;
  target: string;
  icon: string | null;
  note: string | null;
  pinned: number;
  sort_order: number;
  open_count: number;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
};

const mapCard = (row: CardRow): Card => ({
  id: row.id,
  type: row.type,
  name: row.name,
  categoryId: row.category_id,
  target: row.target,
  icon: row.icon,
  note: row.note,
  pinned: row.pinned === 1,
  sortOrder: row.sort_order,
  openCount: row.open_count,
  lastOpenedAt: row.last_opened_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class CardRepository {
  constructor(private readonly db: Database.Database) {}

  list(categoryId?: string): Card[] {
    const baseQuery = `SELECT id, type, name, category_id, target, icon, note, pinned, sort_order, open_count, last_opened_at, created_at, updated_at
      FROM cards`;
    const orderClause = ' ORDER BY pinned DESC, sort_order ASC, created_at ASC';
    const rows =
      categoryId && categoryId !== 'all'
        ? (this.db.prepare(`${baseQuery} WHERE category_id = ?${orderClause}`).all(categoryId) as CardRow[])
        : (this.db.prepare(`${baseQuery}${orderClause}`).all() as CardRow[]);

    return rows.map(mapCard);
  }

  create(input: CardCreateInput): Card {
    const now = new Date().toISOString();
    const sortOrder =
      (this.db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS sortOrder FROM cards WHERE category_id = ?').get(
        input.categoryId,
      ) as { sortOrder: number }).sortOrder + 1;

    const record = {
      id: randomUUID(),
      type: input.type,
      name: input.name,
      categoryId: input.categoryId,
      target: input.target,
      icon: input.icon ?? null,
      note: input.note ?? null,
      pinned: 0,
      sortOrder,
      openCount: 0,
      lastOpenedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO cards (id, type, name, category_id, target, icon, note, pinned, sort_order, open_count, last_opened_at, created_at, updated_at)
         VALUES (@id, @type, @name, @categoryId, @target, @icon, @note, @pinned, @sortOrder, @openCount, @lastOpenedAt, @createdAt, @updatedAt)`,
      )
      .run(record);

    return this.findById(record.id) as Card;
  }

  update(input: CardUpdateInput): Card | null {
    const current = this.findById(input.id);
    if (!current) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE cards
         SET type = @type,
             name = @name,
             category_id = @categoryId,
             target = @target,
             icon = @icon,
             note = @note,
             pinned = @pinned,
             updated_at = @updatedAt
         WHERE id = @id`,
      )
      .run({
        id: input.id,
        type: input.type,
        name: input.name,
        categoryId: input.categoryId,
        target: input.target,
        icon: input.icon ?? null,
        note: input.note ?? null,
        pinned: input.pinned ? 1 : 0,
        updatedAt,
      });

    return this.findById(input.id);
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM cards WHERE id = ?').run(id).changes > 0;
  }

  reorder(items: SortItemInput[]): boolean {
    const updateStmt = this.db.prepare(
      `UPDATE cards
       SET sort_order = @sortOrder, updated_at = @updatedAt
       WHERE id = @id`,
    );
    const updatedAt = new Date().toISOString();
    const transaction = this.db.transaction((records: SortItemInput[]) => {
      for (const record of records) {
        updateStmt.run({ ...record, updatedAt });
      }
    });

    transaction(items);
    return true;
  }

  search(input: SearchCardsInput): Card[] {
    const keyword = input.keyword.trim();
    if (!keyword) {
      return this.list();
    }

    const likeKeyword = `%${keyword}%`;
    const rows = this.db
      .prepare(
        `SELECT id, type, name, category_id, target, icon, note, pinned, sort_order, open_count, last_opened_at, created_at, updated_at
         FROM cards
         WHERE name LIKE ? OR target LIKE ? OR COALESCE(note, '') LIKE ?
         ORDER BY pinned DESC, sort_order ASC, created_at ASC`,
      )
      .all(likeKeyword, likeKeyword, likeKeyword) as CardRow[];

    return rows.map(mapCard);
  }

  findById(id: string): Card | null {
    const row = this.db
      .prepare(
        `SELECT id, type, name, category_id, target, icon, note, pinned, sort_order, open_count, last_opened_at, created_at, updated_at
         FROM cards
         WHERE id = ?`,
      )
      .get(id) as CardRow | undefined;

    return row ? mapCard(row) : null;
  }

  markOpened(id: string): void {
    const lastOpenedAt = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE cards
         SET open_count = open_count + 1,
             last_opened_at = @lastOpenedAt,
             updated_at = @lastOpenedAt
         WHERE id = @id`,
      )
      .run({ id, lastOpenedAt });
  }
}
