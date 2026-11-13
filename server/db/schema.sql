SET client_min_messages = warning;
-- =====================================================================
--  Vapor — a Steam-inspired digital game store
--  PostgreSQL 16 schema
--  Run:  psql -d vapor -f db/schema.sql
-- =====================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- ---------------------------------------------------------------------
-- 1. USERS
-- ---------------------------------------------------------------------
CREATE TABLE users (
    user_id         SERIAL PRIMARY KEY,
    username        VARCHAR(32)  NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(64)  NOT NULL,
    country         CHAR(2),
    bio             TEXT,
    wallet_balance  NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
    is_admin        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT username_format CHECK (username ~ '^[A-Za-z0-9_]{3,32}$')
);

-- ---------------------------------------------------------------------
-- 2. COMPANIES (developers & publishers)
-- ---------------------------------------------------------------------
CREATE TABLE developers (
    developer_id    SERIAL PRIMARY KEY,
    name            VARCHAR(128) NOT NULL UNIQUE,
    country         VARCHAR(64),
    founded_year    SMALLINT CHECK (founded_year BETWEEN 1950 AND 2100),
    website         VARCHAR(255)
);

CREATE TABLE publishers (
    publisher_id    SERIAL PRIMARY KEY,
    name            VARCHAR(128) NOT NULL UNIQUE,
    country         VARCHAR(64),
    website         VARCHAR(255)
);

-- ---------------------------------------------------------------------
-- 3. GAMES & CATALOG LOOKUPS
-- ---------------------------------------------------------------------
CREATE TABLE games (
    game_id           SERIAL PRIMARY KEY,
    title             VARCHAR(160) NOT NULL UNIQUE,
    short_description VARCHAR(300) NOT NULL,
    description       TEXT,
    price             NUMERIC(8,2) NOT NULL CHECK (price >= 0),
    discount_percent  SMALLINT     NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
    release_date      DATE,
    age_rating        VARCHAR(8)   CHECK (age_rating IN ('E','E10+','T','M','AO','RP')),
    developer_id      INT REFERENCES developers(developer_id) ON DELETE SET NULL,
    publisher_id      INT REFERENCES publishers(publisher_id) ON DELETE SET NULL,
    cover_color       VARCHAR(7)   NOT NULL DEFAULT '#1b2838', -- used to render generated cover art
    is_published      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE genres (
    genre_id   SERIAL PRIMARY KEY,
    name       VARCHAR(48) NOT NULL UNIQUE
);

-- M:N  games <-> genres
CREATE TABLE game_genres (
    game_id   INT NOT NULL REFERENCES games(game_id)   ON DELETE CASCADE,
    genre_id  INT NOT NULL REFERENCES genres(genre_id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, genre_id)
);

CREATE TABLE platforms (
    platform_id SERIAL PRIMARY KEY,
    name        VARCHAR(32) NOT NULL UNIQUE
);

-- M:N  games <-> platforms
CREATE TABLE game_platforms (
    game_id      INT NOT NULL REFERENCES games(game_id)         ON DELETE CASCADE,
    platform_id  INT NOT NULL REFERENCES platforms(platform_id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, platform_id)
);

-- ---------------------------------------------------------------------
-- 4. COMMERCE: cart -> orders -> order_items -> library
-- ---------------------------------------------------------------------
CREATE TABLE cart_items (
    user_id   INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    game_id   INT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);

CREATE TABLE orders (
    order_id        SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    total_amount    NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
    payment_method  VARCHAR(16) NOT NULL DEFAULT 'wallet' CHECK (payment_method IN ('wallet','card','paypal')),
    status          VARCHAR(16) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','refunded')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    order_id    INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    game_id     INT NOT NULL REFERENCES games(game_id)   ON DELETE RESTRICT,
    price_paid  NUMERIC(8,2) NOT NULL CHECK (price_paid >= 0),  -- snapshot of price at purchase time
    PRIMARY KEY (order_id, game_id)
);

-- Games a user owns
CREATE TABLE library (
    user_id           INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    game_id           INT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    order_id          INT REFERENCES orders(order_id) ON DELETE SET NULL,
    acquired_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    playtime_minutes  INT NOT NULL DEFAULT 0 CHECK (playtime_minutes >= 0),
    last_played_at    TIMESTAMPTZ,
    is_favorite       BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, game_id)
);

CREATE TABLE wishlist (
    user_id   INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    game_id   INT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
);

-- ---------------------------------------------------------------------
-- 5. COMMUNITY: reviews, friends, achievements
-- ---------------------------------------------------------------------
CREATE TABLE reviews (
    review_id     SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    game_id       INT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    recommended   BOOLEAN NOT NULL,
    body          TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
    helpful_count INT NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, game_id)                -- one review per user per game
);

CREATE TABLE friendships (
    requester_id  INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    addressee_id  INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status        VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);
-- prevent A->B and B->A both existing
CREATE UNIQUE INDEX friendships_pair_uniq
    ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));

CREATE TABLE achievements (
    achievement_id  SERIAL PRIMARY KEY,
    game_id         INT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    name            VARCHAR(96) NOT NULL,
    description     VARCHAR(255) NOT NULL,
    UNIQUE (game_id, name)
);

CREATE TABLE user_achievements (
    user_id         INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    achievement_id  INT NOT NULL REFERENCES achievements(achievement_id) ON DELETE CASCADE,
    unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

-- ---------------------------------------------------------------------
-- 6. INDEXES (for common lookups / FK joins)
-- ---------------------------------------------------------------------
CREATE INDEX idx_games_developer   ON games(developer_id);
CREATE INDEX idx_games_publisher   ON games(publisher_id);
CREATE INDEX idx_games_title_lower ON games(LOWER(title));
CREATE INDEX idx_reviews_game      ON reviews(game_id);
CREATE INDEX idx_orders_user       ON orders(user_id);
CREATE INDEX idx_library_game      ON library(game_id);
CREATE INDEX idx_achievements_game ON achievements(game_id);

-- ---------------------------------------------------------------------
-- 7. TRIGGERS — business rules enforced inside the database
-- ---------------------------------------------------------------------

-- 7a. A user may only review a game they own
CREATE OR REPLACE FUNCTION trg_review_requires_ownership() RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM library WHERE user_id = NEW.user_id AND game_id = NEW.game_id) THEN
        RAISE EXCEPTION 'User % does not own game % and cannot review it', NEW.user_id, NEW.game_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER review_requires_ownership
    BEFORE INSERT ON reviews
    FOR EACH ROW EXECUTE FUNCTION trg_review_requires_ownership();

-- 7b. Keep reviews.updated_at fresh
CREATE OR REPLACE FUNCTION trg_touch_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_touch_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

-- 7c. Achievements can only be unlocked for owned games
CREATE OR REPLACE FUNCTION trg_achievement_requires_ownership() RETURNS trigger AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM library l
        JOIN achievements a ON a.game_id = l.game_id
        WHERE l.user_id = NEW.user_id AND a.achievement_id = NEW.achievement_id
    ) THEN
        RAISE EXCEPTION 'User % does not own the game for achievement %', NEW.user_id, NEW.achievement_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER achievement_requires_ownership
    BEFORE INSERT ON user_achievements
    FOR EACH ROW EXECUTE FUNCTION trg_achievement_requires_ownership();

-- ---------------------------------------------------------------------
-- 8. VIEWS — read models used by the API
-- ---------------------------------------------------------------------

-- Store catalog: final price, review score, genres & platforms aggregated
CREATE OR REPLACE VIEW v_game_catalog AS
SELECT
    g.game_id,
    g.title,
    g.short_description,
    g.price,
    g.discount_percent,
    ROUND(g.price * (100 - g.discount_percent) / 100.0, 2)          AS final_price,
    g.release_date,
    g.age_rating,
    g.cover_color,
    g.is_published,
    d.developer_id, d.name                                            AS developer,
    p.publisher_id, p.name                                            AS publisher,
    COALESCE(r.review_count, 0)                                       AS review_count,
    r.positive_pct,
    COALESCE(o.owner_count, 0)                                        AS owner_count,
    COALESCE((SELECT ARRAY_AGG(ge.name ORDER BY ge.name)
              FROM game_genres gg JOIN genres ge USING (genre_id)
              WHERE gg.game_id = g.game_id), '{}')                    AS genres,
    COALESCE((SELECT ARRAY_AGG(pl.name ORDER BY pl.platform_id)
              FROM game_platforms gp JOIN platforms pl USING (platform_id)
              WHERE gp.game_id = g.game_id), '{}')                    AS platforms
FROM games g
LEFT JOIN developers d ON d.developer_id = g.developer_id
LEFT JOIN publishers p ON p.publisher_id = g.publisher_id
LEFT JOIN (
    SELECT game_id,
           COUNT(*) AS review_count,
           ROUND(100.0 * AVG(CASE WHEN recommended THEN 1 ELSE 0 END)) AS positive_pct
    FROM reviews GROUP BY game_id
) r ON r.game_id = g.game_id
LEFT JOIN (
    SELECT game_id, COUNT(*) AS owner_count FROM library GROUP BY game_id
) o ON o.game_id = g.game_id;

-- Steam-style review summary label
CREATE OR REPLACE FUNCTION review_label(pct NUMERIC, n BIGINT) RETURNS TEXT AS $$
    SELECT CASE
        WHEN n IS NULL OR n = 0 THEN 'No user reviews'
        -- small sample sizes get a simpler label (as Steam does)
        WHEN n < 5 AND pct >= 80 THEN 'Positive'
        WHEN n < 5 AND pct >= 40 THEN 'Mixed'
        WHEN n < 5 THEN 'Negative'
        WHEN pct >= 95 AND n >= 10 THEN 'Overwhelmingly Positive'
        WHEN pct >= 80 THEN 'Very Positive'
        WHEN pct >= 70 THEN 'Mostly Positive'
        WHEN pct >= 40 THEN 'Mixed'
        WHEN pct >= 20 THEN 'Mostly Negative'
        ELSE 'Overwhelmingly Negative'
    END
$$ LANGUAGE sql IMMUTABLE;

-- Per-user sales report used by the profile page
CREATE OR REPLACE VIEW v_user_stats AS
SELECT
    u.user_id,
    u.username,
    (SELECT COUNT(*) FROM library l WHERE l.user_id = u.user_id)                         AS games_owned,
    (SELECT COALESCE(SUM(playtime_minutes),0) FROM library l WHERE l.user_id = u.user_id) AS total_playtime_minutes,
    (SELECT COUNT(*) FROM reviews r WHERE r.user_id = u.user_id)                         AS reviews_written,
    (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.user_id)             AS achievements_unlocked,
    (SELECT COALESCE(SUM(total_amount),0) FROM orders o
        WHERE o.user_id = u.user_id AND o.status = 'completed')                          AS total_spent
FROM users u;
