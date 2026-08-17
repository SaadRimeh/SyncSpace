# SyncSpace: Architectural Blueprint & Agile Roadmap

SyncSpace is a unified personal operating system integrating **Synapse** (rapid capture notes & binary conversion), **Task Engine** (priority & recurrence), **Habit Matrix** (2D GitHub-style streak grid), **Nano-Ledger** (financial budget & analytics), and **The Daily Canvas** (unified CURRENT_DATE dashboard).

---

## 1. High-Concurrency Architecture (500+ Concurrent Users)

To handle 500+ concurrent mobile clients with sub-50ms latency:
1. **Connection Pooling**: PostgreSQL `pg.Pool` tuned with `max: 50` connections, connection timeout, and idle pool management.
2. **Two-Tier Caching via Redis (`ioredis`)**:
   - **Daily Canvas Cache**: Cache pre-computed aggregated daily timeline for `CURRENT_DATE` per user with short TTL (60s) or event-driven cache invalidation upon any task/habit/expense mutation.
   - **Rate Limiting**: Distributed rate limiting powered by `express-rate-limit` + `rate-limit-redis` to prevent burst storms.
   - **Session & User Metadata Cache**: Avoid repeated DB lookups for user preferences and tokens.
3. **Database Optimization**:
   - Composite indexes on `(user_id, date)` and `(user_id, status, due_date)`.
   - Connection lifecycle management and transactions for multi-entity writes (e.g., Synapse binary note-to-task conversion).

---

## 2. Day-by-Day Agile Roadmap (100% Completed)

```mermaid
gantt
    title SyncSpace Agile Development Roadmap (All 10 Days Complete)
    dateFormat  YYYY-MM-DD
    section Backend Foundation (100% Complete)
    Day 1 - Core Express ES Modules, DB Pool & Redis Health :done, d1, 2026-08-16, 1d
    Day 2 - Auth, JWT, User Model & Security Middleware     :done, d2, 2026-08-17, 1d
    Day 3 - Synapse (Notes API) & Binary Conversion Engine  :done, d3, 2026-08-18, 1d
    Day 4 - Task Engine & Habit Matrix Backend with Redis   :done, d4, 2026-08-19, 1d
    Day 5 - Nano-Ledger & Daily Canvas Aggregation API      :done, d5, 2026-08-20, 1d
    section Frontend Foundation & UI (100% Complete)
    Day 6 - Expo Router Tab Setup, Dark Theme & Reanimated  :done, d6, 2026-08-21, 1d
    Day 7 - Synapse Mobile UI (Markdown & Binary Convert)   :done, d7, 2026-08-22, 1d
    Day 8 - Habit Matrix UI (2D Contribution Heatmap)       :done, d8, 2026-08-23, 1d
    Day 9 - Nano-Ledger UI (Gifted Charts & Quick Entry)    :done, d9, 2026-08-24, 1d
    Day 10 - The Daily Canvas & End-to-End Polish           :done, d10, 2026-08-25, 1d
```

### Completed Days Summary:

- **Day 1 (Complete)**: Backend Foundation — ES Modules, PostgreSQL Connection Pool (`max: 50`), Redis Client, Rate Limiting, Health Check API.
- **Day 2 (Complete)**: Authentication & User Profile — JWT auth, bcrypt password hashing, token validation middleware, user timezone/currency preferences (29 passing tests).
- **Day 3 (Complete)**: Synapse Module (Notes API) — Markdown note CRUD, tagging, and atomic "Binary Conversion" PostgreSQL transaction (33 passing tests).
- **Day 4 (Complete)**: Task Engine & Habit Matrix Backend — Tasks CRUD, Habits CRUD, daily check-in logs, Redis active streak caching, 2D GitHub-style heatmap data (43 passing tests).
- **Day 5 (Complete)**: Nano-Ledger & Daily Canvas Backend — Categories with budget limits, Income/Expense transactions, monthly financial analytics, and the high-speed cached `GET /api/canvas/today` aggregation endpoint (41 passing tests).
- **Day 6 (Complete)**: Mobile Shell & Design System — Expo Router 5-tab layout, glassmorphic obsidian dark theme, Reanimated micro-interactions, API client with interceptors.
- **Day 7 (Complete)**: Synapse Mobile Screen — Markdown rapid capture, tag chips, animated binary swipe/button conversion to task modal.
- **Day 8 (Complete)**: Habit Matrix Mobile Screen — 2D GitHub-style contribution heatmap grid, daily haptic toggles, streak badges.
- **Day 9 (Complete)**: Nano-Ledger Mobile Screen — Frictionless numerical keypad bottom sheet, category spending breakdown & budget progress ring.
- **Day 10 (Complete)**: The Daily Canvas & System Polish — Unified dynamic timeline, live widgets, pull-to-refresh with Redis cache revalidation, 60fps polished animations.
