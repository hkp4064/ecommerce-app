-- Schema for the e-commerce app (SQLite)
-- The same schema is created by db/migrations/001_create_products.js

CREATE TABLE categories (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE products (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         VARCHAR(200) NOT NULL,
  description  TEXT NOT NULL,
  price        DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  image_url    VARCHAR(500) NOT NULL,
  category_id  INTEGER NOT NULL,
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category_id ON products(category_id);

-- ===== Added in Part 2 (migrations 002 to 004) =====

CREATE TABLE users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  email          VARCHAR(254) NOT NULL UNIQUE,
  name           VARCHAR(100) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- One cart per user
CREATE TABLE carts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL UNIQUE,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Prices are not stored here: totals use products.price at read time
CREATE TABLE cart_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id     INTEGER NOT NULL,
  product_id  INTEGER NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (cart_id, product_id),
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);

-- Used by the session store
CREATE TABLE sessions (
  sid      VARCHAR(255) PRIMARY KEY,
  sess     JSON NOT NULL,
  expired  DATETIME NOT NULL
);
CREATE INDEX idx_sessions_expired ON sessions(expired);
