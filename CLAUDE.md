# CLAUDE.md — BYOKey Chat

## Project Summary

BYOKey Chat is a fork of [LobeChat](https://github.com/lobehub/lobe-chat) (MIT license, \~48k+ stars) converted into a **free, open-source, hosted BYOK (Bring Your Own Key) AI chat app** with zero-knowledge encrypted API key storage.

**Key differentiator from LobeHub Cloud:** LobeHub sells AI credits ($9.90–$39.90/month). We are 100% free because BYOK is the _only_ way to use it. Users pay their own AI providers directly. Our server never sees plaintext API keys.

**Core modification:** Replace server-level API key configuration with per-user encrypted key storage using a zero-knowledge vault (AES-256-GCM + PBKDF2, client-side only).

---

## Repository Structure

```plaintext
byokey-chat/
├── apps/
│   └── desktop/                # Electron desktop app
├── packages/                   # Shared packages
│   ├── core/                   # NEW: @byokey/core — vault crypto, key derivation, vault store
│   │   └── src/vault/          #   AES-256-GCM encrypt/decrypt, PBKDF2, Zustand vault state
│   ├── security/               # NEW: @byokey/security — URL validation, input sanitization
│   │   └── src/validation/
│   ├── types/                  # NEW: @byokey/types — shared TypeScript interfaces
│   ├── database/               # Drizzle ORM schemas, models, repositories
│   ├── agent-runtime/          # Agent runtime
│   ├── model-runtime/          # Model provider integrations
│   └── ...                     # ~40+ existing LobeChat packages
├── workers/
│   └── ai-proxy/               # NEW: Cloudflare Worker streaming proxy (stateless CORS solution)
│       ├── src/index.ts
│       └── wrangler.toml
├── src/
│   ├── app/                    # Next.js App Router (backend API + auth)
│   │   ├── (backend)/          #   API routes (trpc, webapi, etc.)
│   │   ├── spa/                #   SPA HTML template service
│   │   └── [variants]/(auth)/  #   Auth pages (SSR)
│   ├── routes/                 # SPA page components (Vite)
│   │   ├── (main)/             #   Desktop pages
│   │   ├── (mobile)/           #   Mobile pages
│   │   └── (desktop)/          #   Desktop-specific pages
│   ├── spa/                    # SPA entry points and router config
│   ├── store/                  # Zustand stores
│   ├── services/               # Client services
│   ├── server/                 # Server services and routers
│   ├── features/               # Business components by domain
│   └── libs/                   # Shared libraries
├── e2e/                        # E2E tests (Cucumber + Playwright)
├── locales/                    # i18n translations
├── docker-compose/             # Docker dev environment
├── scripts/                    # Build and workflow scripts
└── docs/                       # Documentation
```

---

## Tech Stack

- **Framework:** Next.js 16 + React 19 + TypeScript
- **SPA:** React Router DOM inside Next.js, built with Vite
- **UI:** @lobehub/ui, Ant Design; antd-style for CSS-in-JS
- **State:** Zustand
- **Data fetching:** SWR + TRPC (type-safe backend)
- **i18n:** react-i18next
- **Database:** Drizzle ORM + Neon serverless Postgres
- **Auth:** Clerk
- **Storage:** Cloudflare R2 (S3-compatible)
- **Testing:** Vitest + happy-dom
- **Client-side crypto:** Web Crypto API (AES-256-GCM + PBKDF2)
- **Hosting:** Cloudflare Pages (migration from Vercel)
- **AI Proxy:** Cloudflare Worker (stateless streaming proxy)

---

## Development Commands

```bash
# Install dependencies
pnpm install

# SPA dev mode (frontend only, proxies API to localhost:3010)
bun run dev:spa

# Full-stack dev (Next.js + Vite SPA concurrently)
bun run dev

# Next.js dev server only
bun run dev:next

# Build
bun run build      # Full build (SPA + Next.js)
bun run build:spa  # SPA only
bun run build:next # Next.js only

# Lint & Type Check
bun run lint       # ESLint + Stylelint + type-check + circular deps
bun run type-check # TypeScript type checking (tsgo --noEmit)

# Testing
bunx vitest run --silent='passed-only' '[file-path]' # Run specific test
bun run test                                         # Run all tests (app + server — slow, ~10 min)

# Database
bun run db:generate # Generate Drizzle migrations
bun run db:migrate  # Run migrations
bun run db:studio   # Open Drizzle Studio

# Docker dev environment
bun run dev:docker      # Start PostgreSQL, Redis, etc.
bun run dev:docker:down # Stop Docker services

# Planned commands (to be implemented)
# pnpm test:e2e            # Playwright E2E tests
# pnpm audit:security      # Security audit checks
```

> **NEVER** run `bun run test` during development — it takes \~10 minutes. Always run specific test files with `bunx vitest run --silent='passed-only' '[file-path]'`.

---

## Coding Rules

### 1. TDD Always

Write failing test first → implement minimum code → verify green → run security checks. No code without tests. No merge without green CI.

### 2. Web Crypto API Only

All encryption MUST use Web Crypto API (AES-256-GCM + PBKDF2) — **never** Node.js `crypto` module in browser code. For test environments that lack Web Crypto, use `@peculiar/webcrypto` polyfill.

### 3. Zero Plaintext Keys

Plaintext API keys must NEVER be stored, logged, or appear in error messages anywhere. No `console.log` with key values. No error messages containing key material. No storing decrypted keys in localStorage, sessionStorage, or cookies.

### 4. Package Boundaries

Shared platform-agnostic logic goes in `packages/core` or `packages/security`, not in the `src/` app directory. The app imports from packages; packages never import from the app.

### 5. Security Coverage

Security-critical code (`packages/core/src/vault/`, `packages/security/`) requires **90% test coverage**. App code requires 75%.

### 6. Conventional Commits

```
type(scope): description

Types: feat, fix, test, security, refactor, docs, ci, chore
Scopes: vault, byok, proxy, sync, auth, ui, worker, mobile
```

### 7. PR Requirements

- All CI checks must pass
- Security audit must pass
- At least 1 approval required for main
- Fill out PR template completely (including security checklist)

### 8. SPA Routes Convention

Route segments in `src/routes/` must be thin — only import from `@/features/*`. Business logic and heavy UI live in `src/features/<Domain>/`. See `.agents/skills/spa-routes/SKILL.md`.

### 9. i18n

Add keys to `src/locales/default/namespace.ts`. For dev preview, translate `locales/zh-CN/` and `locales/en-US/`. Don't run `pnpm i18n` — CI handles it.

### 10. Package Management

Use `pnpm` for dependency management, `bun` to run npm scripts, `bunx` for executable npm packages.

---

## Architecture: Zero-Knowledge Vault

### How It Works

1. **Setup:** User creates a vault password (separate from login password)
2. **Key derivation:** Browser derives encryption key via PBKDF2 from vault password — key **never** leaves the browser
3. **Encryption:** API keys encrypted with AES-256-GCM using derived key + random IV per key
4. **Storage:** Only ciphertext + IV + salt stored in Postgres `api_configs` table
5. **Sync:** Encrypted blobs sync to new devices; user enters vault password to decrypt locally
6. **AI requests:** Browser sends decrypted key in Authorization header over HTTPS to Cloudflare Worker proxy → Worker forwards to AI provider → Worker discards key immediately

### What the Server NEVER Sees

- Plaintext API keys
- Vault password
- Derived encryption key
- AI request/response content (proxy is stateless passthrough)

### Database: `api_configs` Table

```sql
api_configs (
  id              UUID PRIMARY KEY,
  user_id         TEXT NOT NULL,        -- from Clerk
  name            TEXT,                  -- e.g., "My OpenAI"
  base_url        TEXT,                  -- e.g., "https://api.openai.com/v1"
  encrypted_api_key BYTEA,             -- AES-256-GCM ciphertext (NEVER plaintext)
  encryption_iv   BYTEA,               -- random IV, unique per key
  encryption_salt BYTEA,               -- salt for PBKDF2
  model_list      JSONB,               -- cached available models
  is_default      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
)
```

### AI Traffic Flow

```
Browser → Cloudflare Worker proxy (stateless) → User's AI provider
         OR
Browser → AI provider directly (if CORS supported, bypasses proxy)
```

### Infrastructure

- **Database:** Neon serverless Postgres
- **Object storage:** Cloudflare R2
- **Auth:** Clerk
- **Hosting:** Cloudflare Pages
- **AI proxy:** Cloudflare Worker (stateless, no persistent storage)

---

## Critical Files (To Be Implemented)

| File                                                      | Purpose                                          |
| --------------------------------------------------------- | ------------------------------------------------ |
| `packages/core/src/vault/crypto.ts`                       | AES-256-GCM encrypt/decrypt using Web Crypto API |
| `packages/core/src/vault/keyDerivation.ts`                | PBKDF2 key derivation from vault password        |
| `packages/core/src/vault/vaultStore.ts`                   | Zustand store for vault lock/unlock state        |
| `packages/core/src/vault/__tests__/crypto.test.ts`        | Vault crypto test suite                          |
| `packages/core/src/vault/__tests__/keyDerivation.test.ts` | Key derivation test suite                        |
| `packages/core/src/vault/__tests__/vaultStore.test.ts`    | Vault store test suite                           |
| `packages/security/src/validation/urlValidator.ts`        | URL validation for API endpoints                 |
| `packages/security/src/validation/inputSanitizer.ts`      | Input sanitization                               |
| `packages/types/src/vault.ts`                             | TypeScript interfaces for vault types            |
| `packages/types/src/api.ts`                               | TypeScript interfaces for API config types       |
| `workers/ai-proxy/src/index.ts`                           | Cloudflare Worker streaming proxy                |

---

## Lessons Learned

<!-- This section is updated throughout development. Every non-obvious discovery gets logged here. -->

<!-- Format: ### [YYYY-MM-DD] — Short title -->

<!-- Context / Problem / Solution / Files affected -->

_No entries yet. This section will grow as development progresses._
