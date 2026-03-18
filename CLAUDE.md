# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Commands

### Initial Setup
```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL
docker-compose up -d

# 3. Copy and fill env files
cp services/api/.env.example services/api/.env
cp apps/machine-guard/.env.example apps/machine-guard/.env

# 4. Run DB migrations
cd services/api && npx prisma migrate dev
```

### Development
```bash
# Run everything (API + Electron dev)
pnpm dev

# Or individually:
cd services/api && pnpm dev        # NestJS on :3001
cd apps/machine-guard && pnpm dev  # Vite on :5173 + Electron
cd packages/shared && pnpm dev     # Watch shared types
```

### Build & Lint
```bash
pnpm build   # Build all (turbo)
pnpm lint    # Lint all (turbo)

cd services/api && npx prisma studio   # DB GUI
cd services/api && npx prisma migrate dev --name <name>  # New migration
```

---

## Architecture

**Monorepo** managed with pnpm workspaces + Turbo.

```
apps/machine-guard/     — Electron + React + Vite (desktop kiosk)
services/api/           — NestJS REST + WebSocket API
packages/shared/        — Shared TypeScript types (@gamer-machine/shared)
```

**Stack**: PostgreSQL 16 (Docker) · Prisma ORM · JWT auth · Socket.io · AWS SNS (SMS) · AbacatePay (PIX)

### Electron — Two Processes
1. **Kiosk window** (`kioskWindow`): fullscreen, kiosk mode, keyboard locked. Hosts the main React app (auth + dashboard screens).
2. **Overlay window** (`overlayWindow`): transparent, always-on-top, `focusable: false`, `type: 'toolbar'`. Hosts the overlay UI (`?overlay=true`) that shows warnings while the user is gaming. Created when session starts, destroyed when session ends.

The WebSocket client lives in the **main process** (`WindowManager`), not the renderer. It forwards events to both windows via IPC.

### Session Flow
1. User authenticates via phone + OTP → receives JWT
2. `session:start` IPC → `POST /sessions/start` → DB record created
3. `WindowManager.unlockKiosk()` hides kiosk window, shows overlay, connects WebSocket
4. API timer fires every 5s, calculates time remaining from `started_at`, emits `balance_update`
5. At ≤60s and ≤30s remaining: `warning` events
6. At 0s: `endSession()` called server-side → `SESSION_ENDED` warning → `lockKiosk()`

### NestJS Modules
`AppModule` → `ConfigModule` · `ThrottlerModule` (5 req/60s) · `PrismaModule` · `AuthModule` · `UsersModule` · `SessionsModule` · `PaymentsModule`

---

## Key Conventions

### Database
- Column names: `snake_case` (e.g., `user_id`, `started_at`, `balance_cents`)
- Monetary values: integer cents (e.g., `balance_cents`, `cost_cents`, `amount_cents`)
- No `updatedAt` trigger on `Session` or `Payment` — only `User` has `updated_at`

### NestJS
- File suffixes: `.service.ts`, `.controller.ts`, `.module.ts`, `.gateway.ts`, `.guard.ts`, `.strategy.ts`
- All services use `@Injectable()`, injected via constructor
- Validation via `class-validator` DTOs on all controller inputs

### Zustand Store (`appStore.ts`)
```ts
screen: 'PHONE_INPUT' | 'OTP_INPUT' | 'DASHBOARD' | 'PLAYING'
overlayState: 'HIDDEN' | 'WARNING_1MIN' | 'WARNING_30SEC' | 'SESSION_ENDED'
```
Actions: `setAuth`, `setScreen`, `updateBalance`, `setSessionId`, `setOverlayState`, `clearSession`, `logout`

### IPC Channels
| Channel | Direction | Description |
|---|---|---|
| `session:start` | invoke | Start session, returns `{ sessionId }` |
| `session:end` | invoke | End session early |
| `balance_update` | event → renderer | `{ balance_cents, time_remaining_seconds, session_id }` |
| `warning` | event → renderer | `{ type: 'WARNING_1MIN' \| 'WARNING_30SEC' \| 'SESSION_ENDED' }` |
| `session_ended` | event → renderer | Sent to kiosk window when locking |

### Shared Types
Import from `@gamer-machine/shared`. All API DTOs are defined there. Never duplicate type definitions across packages.

---

## Gotchas / Critical Decisions

**WebSocket URL hardcoded in `windowManager.ts`**
`connectWebSocket` uses `http://localhost:3001` in both dev and prod branches (line 79). If the API moves to a different host/port in production, this must be updated manually — it does not read from env.

**Timer uses `started_at`, not in-memory state**
`scheduleTimer` receives `session.started_at` from the DB and calculates elapsed time via `Date.now() - startedAt.getTime()`. This survives API restarts correctly, but timers are not persisted — an API restart loses all active timers.

**SMS mock — automatic**
`SmsService` checks for `AWS_ACCESS_KEY_ID` at construction. If absent, all OTP sends log to console (`[SMS MOCK]`) instead of hitting SNS. No env var or flag needed to enable mock mode.

**PIX mock — automatic**
`AbacatePayClient` checks for `ABACATEPAY_API_KEY`. If absent, returns a fake `brCode` and a 1×1 PNG base64 as `brCodeBase64`. Webhook handling still works (POST `/payments/webhook`), so end-to-end payment flow can be tested manually.

**Overlay window type**
Uses `type: 'toolbar'` (not `'screen-saver'`) and `focusable: false` + `setIgnoreMouseEvents(true)`. This keeps it on top of fullscreen games on Windows without stealing focus or mouse input.

**Cost calculation rounds up to nearest minute**
`endSession` uses `Math.ceil(durationSeconds / 60) * pricePerMinCents`. A 1-second session costs the same as a 60-second session.

---

## Implementation Status

### Done (Sprints 1–6)
- Monorepo scaffold (pnpm, Turbo, tsconfig.base)
- Docker Compose for PostgreSQL
- Prisma schema + PrismaModule
- NestJS API: auth (OTP + JWT), users, sessions (timer + WebSocket), payments (PIX + webhook)
- Electron app: kiosk window, overlay window, shortcut blocker, IPC bridge
- React screens: PhoneInput, OtpInput, Dashboard, Playing, Overlay
- Zustand store + Socket.io integration in renderer
- Shared types package

### Pending / Not Yet Done
- `prisma migrate dev` has not been run — **no migrations exist yet**
- ESLint config not set up in any package
- Electron packaging (`electron-builder`) not configured
- No automated tests
- No production environment config (process manager, SSL, etc.)
