# Vapor REST API reference

Base URL: `http://localhost:4000/api` (the frontend proxies `/api` to it).
Authenticated routes need the header `Authorization: Bearer <token>` (token comes from `/auth/login` or `/auth/register`).
Errors are returned as `{ "error": "message" }` with an HTTP status code.

Legend: 🔓 public · 🔑 logged-in user · 🛡️ admin only

## Auth & users
| Method | Path | Access | Description | CRUD |
|---|---|---|---|---|
| POST | `/auth/register` | 🔓 | Create an account `{username, email, password, display_name?}` | Create |
| POST | `/auth/login` | 🔓 | Log in `{username, password}` → `{user, token}` | Read |
| GET | `/auth/me` | 🔑 | Current user | Read |
| GET | `/users?q=` | 🔓 | Search users | Read |
| GET | `/users/:id` | 🔓 | Public profile + stats, most played games, reviews, friends | Read |
| PUT | `/users/me` | 🔑 | Update profile `{display_name, email, country, bio}` | Update |
| POST | `/users/me/wallet` | 🔑 | Add wallet funds `{amount}` | Update |
| DELETE | `/users/:id` | 🛡️ | Delete a user (cascades to their data) | Delete |

## Catalog
| Method | Path | Access | Description | CRUD |
|---|---|---|---|---|
| GET | `/games?q=&genre=&platform=&on_sale=&max_price=&sort=` | 🔓 | Search / filter / sort the store | Read |
| GET | `/games/:id` | 🔓 | Game details, achievements, and (if logged in) owned / wishlisted / in-cart flags | Read |
| GET | `/games/:id/edit` | 🛡️ | Raw row + genre/platform ids for the edit form | Read |
| POST | `/games` | 🛡️ | Create a game (+ `genre_ids`, `platform_ids`) in one transaction | Create |
| PUT | `/games/:id` | 🛡️ | Update a game and its genres/platforms | Update |
| DELETE | `/games/:id` | 🛡️ | Delete a game, or unpublish it if it has sales history | Delete |
| GET/POST | `/developers` | 🔓/🛡️ | List / create developers | R / C |
| GET/PUT/DELETE | `/developers/:id` | 🔓/🛡️ | Developer + its games / update / delete | R / U / D |
| GET/POST, GET/PUT/DELETE `/:id` | `/publishers` | 🔓/🛡️ | Same as developers | CRUD |
| GET/POST, GET/PUT/DELETE `/:id` | `/genres` | 🔓/🛡️ | Same pattern | CRUD |
| GET/POST, GET/PUT/DELETE `/:id` | `/platforms` | 🔓/🛡️ | Same pattern | CRUD |
| POST | `/games/:id/achievements` | 🛡️ | Add an achievement | Create |
| DELETE | `/achievements/:id` | 🛡️ | Delete an achievement | Delete |

## Store (cart → order → library)
| Method | Path | Access | Description | CRUD |
|---|---|---|---|---|
| GET | `/cart` | 🔑 | Cart items with current prices and total | Read |
| POST | `/cart` | 🔑 | Add `{game_id}` (rejected if already owned) | Create |
| DELETE | `/cart/:gameId` | 🔑 | Remove from cart | Delete |
| POST | `/cart/checkout` | 🔑 | `{payment_method}` — **one transaction**: charge wallet, create order + items, add to library, clear cart, remove from wishlist | Create |
| GET | `/orders` | 🔑 | Purchase history with line items | Read |
| POST | `/orders/:id/refund` | 🔑 | Refund if ≤ 14 days and < 2 h played; removes games, credits wallet (transaction) | Update |
| GET | `/library` | 🔑 | Owned games with playtime and achievement progress | Read |
| PATCH | `/library/:gameId` | 🔑 | `{is_favorite}` | Update |
| POST | `/library/:gameId/play` | 🔑 | Simulate a play session `{minutes}` | Update |
| POST | `/achievements/:id/unlock` | 🔑 | Unlock an achievement (DB trigger checks ownership) | Create |
| GET | `/wishlist` | 🔑 | Wishlist | Read |
| POST | `/wishlist` | 🔑 | Add `{game_id}` | Create |
| DELETE | `/wishlist/:gameId` | 🔑 | Remove | Delete |

## Community
| Method | Path | Access | Description | CRUD |
|---|---|---|---|---|
| GET | `/games/:id/reviews?filter=positive\|negative` | 🔓 | Reviews with the reviewer's playtime | Read |
| POST | `/games/:id/reviews` | 🔑 | `{recommended, body}` — DB trigger rejects if the game isn't owned; unique per user+game | Create |
| PUT | `/reviews/:id` | 🔑 | Edit own review | Update |
| DELETE | `/reviews/:id` | 🔑 | Delete own review (admins can delete any) | Delete |
| POST | `/reviews/:id/helpful` | 🔑 | Mark as helpful | Update |
| GET | `/friends` | 🔑 | Friends + incoming/outgoing requests | Read |
| POST | `/friends` | 🔑 | Send request `{username}` | Create |
| PUT | `/friends/:userId/accept` | 🔑 | Accept a request | Update |
| DELETE | `/friends/:userId` | 🔑 | Unfriend / decline / cancel | Delete |

## Admin
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/admin/stats` | 🛡️ | Totals, top sellers, revenue by genre, recent orders (aggregate SQL) |
| GET | `/health` | 🔓 | API + database health check |

## Example
```bash
TOKEN=$(curl -s -X POST localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"abhishek","password":"password123"}' | jq -r .token)

curl -s "localhost:4000/api/games?genre=Roguelike&sort=price_asc"
curl -s -X POST localhost:4000/api/cart -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"game_id": 5}'
curl -s -X POST localhost:4000/api/cart/checkout -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"payment_method":"wallet"}'
```
