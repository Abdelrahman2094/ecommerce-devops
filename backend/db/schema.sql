CREATE DATABASE IF NOT EXISTS ecommerce_db;
USE ecommerce_db;

-- Users table (passwords stored as bcrypt hashes, not plaintext)
CREATE TABLE IF NOT EXISTS users (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,       -- bcrypt hash
    role       ENUM('customer','admin') NOT NULL DEFAULT 'customer',
    full_name  VARCHAR(255),
    -- Sensitive PII stored AES encrypted
    phone_enc  TEXT,                        -- encrypted phone number
    address_enc TEXT,                       -- encrypted address
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    price       DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    stock       INT UNSIGNED NOT NULL DEFAULT 0,
    created_by  INT UNSIGNED,               -- admin user who added it
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    total       DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    status      ENUM('pending','paid','shipped','cancelled') NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id    INT UNSIGNED NOT NULL,
    product_id  INT UNSIGNED NOT NULL,
    quantity    INT UNSIGNED NOT NULL CHECK (quantity > 0),
    unit_price  DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Transactions table (payment records with HMAC integrity signatures)
CREATE TABLE IF NOT EXISTS transactions (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        INT UNSIGNED NOT NULL UNIQUE,
    user_id         INT UNSIGNED NOT NULL,
    amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    -- Card details stored AES encrypted
    card_last4_enc  TEXT NOT NULL,
    -- HMAC-SHA256 signature over (id + order_id + user_id + amount + timestamp)
    -- Used to detect any tampering with transaction records
    hmac_signature  VARCHAR(64) NOT NULL,
    status          ENUM('success','failed','refunded') NOT NULL DEFAULT 'success',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE RESTRICT,
    INDEX idx_user_id (user_id)
);
