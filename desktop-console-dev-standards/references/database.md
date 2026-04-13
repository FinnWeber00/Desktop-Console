# Database Reference

## Storage Choice

Use SQLite with `better-sqlite3`.

## Core Tables

### categories

- `id`
- `name`
- `sort_order`
- `created_at`
- `updated_at`

### cards

- `id`
- `type`
- `name`
- `category_id`
- `target`
- `icon`
- `note`
- `pinned`
- `sort_order`
- `open_count`
- `last_opened_at`
- `created_at`
- `updated_at`

### security_settings

- `id`
- `password_hash`
- `auto_lock_minutes`
- `lock_enabled`
- `updated_at`

### app_settings

- `id`
- `theme_mode`
- `language`
- `tray_enabled`
- `global_hotkey`
- `created_at`
- `updated_at`

## Type Notes

- `cards.type`: `website` or `app`
- `cards.target`: URL for websites, absolute path for desktop apps
- booleans can be stored as integers

## Query Priorities

Optimize for:

- loading categories ordered by `sort_order`
- loading cards by category ordered by `pinned DESC, sort_order ASC`
- loading recent cards by `last_opened_at DESC`
- searching cards by `name` and `target`

## Migration Rules

- use explicit versioned migrations
- never silently mutate schema in random runtime code
- keep schema initialization deterministic
