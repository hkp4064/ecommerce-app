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
