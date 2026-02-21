# Database Schema

This document describes the relational schema used by `chromewebstore-scraper`.

It is a contract for developers and agents integrating with the scraper data model.

## Scope

- Logical entities: `categories`, `extensions`, `category_extensions`

## Canonical Logical Schema

### `categories`

| Column          | Logical Type        | Null | Description                    |
| --------------- | ------------------- | ---- | ------------------------------ |
| `id`            | integer primary key | NO   | Surrogate category identifier. |
| `url`           | string unique       | NO   | Canonical category URL.        |
| `name`          | string              | NO   | Category display name.         |
| `first_seen_at` | timestamp           | NO   | First insert time.             |
| `last_seen_at`  | timestamp           | NO   | Last observed time.            |

### `extensions`

| Column              | Logical Type        | Null | Description                                      |
| ------------------- | ------------------- | ---- | ------------------------------------------------ |
| `id`                | integer primary key | NO   | Surrogate extension identifier.                  |
| `extension_key`     | string unique       | NO   | Stable extension key parsed from detail URL.     |
| `canonical_url`     | string              | NO   | Canonical extension detail URL.                  |
| `name`              | string              | NO   | Extension name.                                  |
| `publisher`         | string              | YES  | Publisher/creator.                               |
| `overview`          | text                | YES  | Overview section text.                           |
| `users`             | integer             | YES  | Absolute user count.                             |
| `rating`            | float               | YES  | Average rating in 0..5 range.                    |
| `rating_votes`      | integer             | YES  | Absolute vote count.                             |
| `version`           | string              | YES  | Version label.                                   |
| `updated_at`        | string timestamp    | YES  | Parsed update time (`YYYY-MM-DD HH:MM:SS`, UTC). |
| `size_kib`          | float               | YES  | Size normalized to KiB.                          |
| `languages`         | string              | YES  | Languages field as text.                         |
| `developer`         | string              | YES  | Developer field text.                            |
| `developer_website` | string              | YES  | Developer website URL.                           |
| `developer_email`   | string              | YES  | Developer email.                                 |
| `first_seen_at`     | timestamp           | NO   | First insert time.                               |
| `last_seen_at`      | timestamp           | NO   | Last observed time.                              |
| `last_fetched_at`   | timestamp           | NO   | Last full details refresh time.                  |

### `category_extensions`

| Column          | Logical Type | Null | Description                   |
| --------------- | ------------ | ---- | ----------------------------- |
| `category_id`   | integer fk   | NO   | FK to `categories.id`.        |
| `extension_id`  | integer fk   | NO   | FK to `extensions.id`.        |
| `first_seen_at` | timestamp    | NO   | First time relation was seen. |
| `last_seen_at`  | timestamp    | NO   | Last time relation was seen.  |

## PostgreSQL example DDL

```sql
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS extensions (
  id BIGSERIAL PRIMARY KEY,
  extension_key TEXT NOT NULL UNIQUE,
  canonical_url TEXT NOT NULL,
  name TEXT NOT NULL,
  publisher TEXT,
  overview TEXT,
  users BIGINT,
  rating DOUBLE PRECISION,
  rating_votes BIGINT,
  version TEXT,
  updated_at TEXT,
  size_kib DOUBLE PRECISION,
  languages TEXT,
  developer TEXT,
  developer_website TEXT,
  developer_email TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS category_extensions (
  category_id BIGINT NOT NULL,
  extension_id BIGINT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id, extension_id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE
);
```

## Storage Semantics

- Deduplication keys:
  - categories: `url`
  - extensions: `extension_key`
  - links: `(category_id, extension_id)`
- `always_refresh=false`:
  - existing extension row is not overwritten,
  - only `last_seen_at` is updated,
  - relation `last_seen_at` is updated.
- `always_refresh=true`:
  - extension details are updated,
  - `last_fetched_at` and `last_seen_at` are updated.
