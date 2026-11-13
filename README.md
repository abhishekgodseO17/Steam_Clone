# Vapor — a Steam-inspired game store

Vapor is a full-stack web app built on a **relational database** for a database course project. It models the core of a digital game store like Steam: a store catalog, cart and checkout, a game library, wishlists, reviews, friends, achievements, refunds, and an admin console with full CRUD.

| Layer | Technology |
|---|---|
| Database | **PostgreSQL 16** — 17 tables, constraints, triggers, views, a SQL function |
| Backend | **Node.js 20+ / Express 5** REST API, `pg` driver with raw parameterised SQL, JWT auth, bcrypt password hashing |
| Frontend | **React 19 + Vite**, React Router, plain CSS (dark, Steam-inspired theme) |

![Store](docs/screenshots/02-store.png)

---

## 1. Features

**Shoppers**
- Browse, search, filter (genre, OS, price, on sale) and sort the store
- Game pages with sale pricing, Steam-style review summaries, achievements and global unlock rates
- Cart → checkout with Wallet / card / PayPal (demo) — runs as one database transaction
- Library with play time, "Play" button (simulates a session), favourites and achievement progress
- Wishlist, purchase history, **refunds** (≤ 14 days and < 2 hours played, like Steam)
- Write / edit / delete reviews (only for games you own), mark reviews helpful
- Profiles with stats, friends list and friend requests, wallet top-ups

**Admins** (`admin` / `password123`)
- Dashboard: revenue, top sellers, revenue by genre, recent orders (aggregate SQL)
- Full CRUD for games (including their genres, platforms and achievements), developers, publishers, genres, platforms and users

---

## 2. Re-creating the project from scratch

### Prerequisites
- **Node.js 20 or newer** (`node -v`)
- **PostgreSQL 14+** (16 recommended), installed locally **or** Docker Desktop
- Git

### Step 1 — Clone
```bash
git clone <your-repo-url> vapor
cd vapor
```

### Step 2 — Start PostgreSQL and create the database

**Option A: Docker (easiest)**
```bash
docker compose up -d          # starts postgres:16 on localhost:5432 with database "vapor"
```

**Option B: a local PostgreSQL install**
```bash
# macOS (Homebrew):   brew install postgresql@16 && brew services start postgresql@16
# Windows:            install from https://www.postgresql.org/download/windows/
# Ubuntu/Debian:      sudo apt install postgresql && sudo service postgresql start
createdb vapor                # or in psql:  CREATE DATABASE vapor;
```

### Step 3 — Configure the backend
```bash
cp server/.env.example server/.env
```
Edit `server/.env` if your Postgres username/password differs:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/vapor
JWT_SECRET=change-me-to-a-long-random-string
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

### Step 4 — Install dependencies
```bash
npm run setup                 # installs root, server/ and client/ packages
```

### Step 5 — Create the tables and load sample data
```bash
npm run db:init               # runs server/db/schema.sql then server/db/seed.sql
```
You should see `✓ Database ready: { users: '5', games: '16', orders: '5', reviews: '10' }`.
(Re-running it resets the database to the sample data. You can also run the SQL files yourself with `psql -d vapor -f server/db/schema.sql` and `psql -d vapor -f server/db/seed.sql`.)

### Step 6 — Run it
```bash
npm run dev                   # API on http://localhost:4000, website on http://localhost:5173
```
Open **http://localhost:5173**.

### Demo accounts (password for all: `password123`)
| Username | Role | Notes |
|---|---|---|
| `admin` | Admin | Access to the Admin console |
| `abhishek` | User | 4 games, reviews, friends, 1 item in cart, $120 wallet |
| `pixelpaz` | User | Cozy-games player |
| `frag_lord` | User | Has sent `abhishek` a friend request |
| `mika_n` | User | Factory-game player |

### Troubleshooting
| Problem | Fix |
|---|---|
| `password authentication failed` | Fix the user/password in `DATABASE_URL` in `server/.env` |
| `database "vapor" does not exist` | Run `createdb vapor` (or `docker compose up -d`) |
| Port 5432 already in use (Docker) | Stop your local Postgres, or change the port mapping in `docker-compose.yml` and `DATABASE_URL` |
| Website loads but shows no games | The API isn't running or the DB isn't seeded — check the `api` output from `npm run dev`, then `npm run db:init` |

---

## 3. Database design

![ER diagram](docs/erd.png)

The ER diagram source is in [`docs/erd.mmd`](docs/erd.mmd) (Mermaid). The full DDL is in [`server/db/schema.sql`](server/db/schema.sql).

### Tables (17)
| Group | Table | Purpose |
|---|---|---|
| Accounts | `users` | Accounts, hashed passwords, wallet balance, admin flag |
| Catalog | `developers`, `publishers` | Companies that make / publish games |
| | `games` | Store listings: price, discount, release date, rating, FK to developer & publisher |
| | `genres`, `game_genres` | Many-to-many: a game has many genres |
| | `platforms`, `game_platforms` | Many-to-many: Windows / macOS / Linux support |
| Commerce | `cart_items` | A user's cart (composite PK `user_id, game_id`) |
| | `orders`, `order_items` | Completed purchases; `price_paid` snapshots the price at purchase time |
| | `library` | Games a user owns, with play time and favourite flag; links back to the order |
| | `wishlist` | Games a user wants |
| Community | `reviews` | One review per user per game (UNIQUE), recommended yes/no |
| | `friendships` | Self-referencing many-to-many on `users` with pending/accepted status |
| | `achievements`, `user_achievements` | Per-game achievements and which users unlocked them |

### Relationships
- **1 : N** — developer → games, publisher → games, user → orders, order → order_items, game → achievements, user → reviews
- **M : N** (junction tables) — games ↔ genres, games ↔ platforms, users ↔ games (via `library`, `wishlist`, `cart_items`, `reviews`), users ↔ users (`friendships`), users ↔ achievements

### Normalisation
The schema is in **3NF**: every non-key column depends only on its table's key. Repeating groups (genres, platforms) live in junction tables. Derived values (final sale price, review score, owner count) are **not stored**; the `v_game_catalog` view computes them so they can never go out of sync. The one deliberate copy is `order_items.price_paid`, a historical snapshot, because a later price change must not rewrite past receipts.

### Integrity rules enforced by the database
| Rule | How |
|---|---|
| Prices and wallet can't go negative; discount is 0–100 | `CHECK` constraints |
| Usernames/emails/game titles are unique | `UNIQUE` constraints |
| One review per user per game; one row per (user, game) in cart/library/wishlist | `UNIQUE` / composite primary keys |
| You can't friend yourself; no duplicate A↔B friendships | `CHECK (requester_id <> addressee_id)` + unique index on `(LEAST, GREATEST)` |
| **You can only review a game you own** | `BEFORE INSERT` trigger `review_requires_ownership` |
| **You can only unlock achievements for games you own** | `BEFORE INSERT` trigger `achievement_requires_ownership` |
| `reviews.updated_at` is always current | `BEFORE UPDATE` trigger |
| Deleting a user removes their cart, library, reviews, etc. | `ON DELETE CASCADE` |
| A game with sales history can't be deleted | `ON DELETE RESTRICT` on `order_items.game_id` (API unpublishes it instead) |

### Views and functions
- `v_game_catalog` — joins games + developer + publisher, computes `final_price`, review count / positive %, owner count, and aggregates genres and platforms into arrays
- `v_user_stats` — games owned, total play time, reviews, achievements, total spent per user
- `review_label(pct, n)` — Steam-style labels ("Very Positive", "Mixed", ...)

### Transactions
- **Checkout** (`POST /api/cart/checkout`): lock the user row (`SELECT … FOR UPDATE`), price the cart, check and deduct the wallet, insert `orders` + `order_items` + `library`, clear the cart, and remove purchased games from the wishlist, all in one `BEGIN … COMMIT`. If anything fails, everything rolls back.
- **Refund** (`POST /api/orders/:id/refund`): checks the 14-day / 2-hour rule, removes the games (and related reviews and achievements) from the library, credits the wallet and marks the order refunded, all atomically.

---

## 4. Backend API

All endpoints are listed in **[docs/API.md](docs/API.md)**. Summary:

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Games | `GET /games` (search/filter/sort), `GET /games/:id`, `POST`, `PUT /:id`, `DELETE /:id` |
| Developers / Publishers / Genres / Platforms | full CRUD each |
| Cart & orders | `GET/POST/DELETE /cart`, `POST /cart/checkout`, `GET /orders`, `POST /orders/:id/refund` |
| Library & wishlist | `GET /library`, `PATCH /library/:id`, `POST /library/:id/play`, `GET/POST/DELETE /wishlist` |
| Reviews | `GET/POST /games/:id/reviews`, `PUT/DELETE /reviews/:id`, `POST /reviews/:id/helpful` |
| Users & friends | `GET /users`, `GET /users/:id`, `PUT /users/me`, `POST /users/me/wallet`, `DELETE /users/:id`, `GET/POST/PUT/DELETE /friends` |
| Admin | `GET /admin/stats` |

Security notes: every query uses `$1, $2, …` parameters (no string-built SQL from user input, which prevents SQL injection); passwords are hashed with bcrypt; write routes check the JWT and admin flag; PostgreSQL errors (unique, foreign key, check, trigger) are translated into clear 400/409 messages.

---

## 5. Project structure
```
vapor/
├── docker-compose.yml        # optional Postgres container
├── package.json              # root scripts: setup, db:init, dev
├── docs/
│   ├── API.md                # endpoint reference
│   ├── erd.mmd / erd.png     # ER diagram
│   └── screenshots/          # UI screenshots
├── server/                   # Express API
│   ├── db/
│   │   ├── schema.sql        # tables, constraints, indexes, triggers, views
│   │   └── seed.sql          # sample data
│   ├── scripts/init-db.js    # runs schema.sql + seed.sql
│   └── src/
│       ├── index.js          # app + route mounting
│       ├── db.js             # pg pool + transaction helper
│       ├── middleware/       # auth (JWT), error handling
│       └── routes/           # auth, games, crudFactory, store, community
└── client/                   # React + Vite frontend
    └── src/
        ├── main.jsx          # router + header
        ├── api.js            # fetch wrapper
        ├── AppContext.jsx    # logged-in user, cart count, toasts
        ├── components/ui.jsx # cover art, price, tags, rows
        └── pages/            # Store, GameDetail, Cart, Library, Wishlist, Orders, Profile, Account, Auth, Admin, Company
```

---

## 6. Screenshots

| | |
|---|---|
| ![Game page](docs/screenshots/04-game-detail.png) | ![Reviews & achievements](docs/screenshots/05-game-owned-reviews.png) |
| ![Cart](docs/screenshots/06-cart.png) | ![Library](docs/screenshots/07-library.png) |
| ![Profile](docs/screenshots/10-profile.png) | ![Admin dashboard](docs/screenshots/12-admin-dashboard.png) |

---

*Game titles, developers and publishers are real products used as sample data; prices are illustrative. Cover art is generated by CSS, so no copyrighted images are included. Vapor is a student project and is not affiliated with Valve or Steam.*
