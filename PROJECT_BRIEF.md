# BYOKey Chat — Full Project Brief (v3)

## What This Is

A fully hosted, free, open-source SaaS chat app (like ChatGPT/Claude) where users bring their own OpenAI-compatible API endpoint and key. Users sign up, add their API config, and get a full-featured chat experience. AI API calls never touch our server — they go through a thin Cloudflare Worker proxy (for CORS) or directly from the browser when the endpoint supports it. We have zero AI infrastructure costs.

## Why Open Source

The moat is not the code but the hosted experience (accounts, sync, reliability). Since users enter their own API keys, being open source proves we're not stealing them — this is a critical trust argument. Model: public GitHub repo, hosted version has the convenience advantage (like Supabase, Plausible, LibreChat).

## Competitive Gap

- Open WebUI: requires self-hosting, SvelteKit + Python backend, designed for local/Ollama
- TypingMind / AnythingLLM: paid
- NextChat hosted demo: no proper multi-user accounts, no server-side database
- LibreChat: open-source but Express + MongoDB, designed for Docker self-hosting, not serverless SaaS

Our differentiator: hosted experience with accounts and cross-device sync that "just works," with UX and reliability better than self-hosting alternatives.

---

## How We Differ from LobeHub Cloud (app.lobehub.com)

**LobeHub Cloud is a credit-based AI reseller.** Their hosted product sells compute credits — $9.90/month for 5M credits, $19.90 for 15M, $39.90 for 35M. They buy API access from OpenAI, Anthropic, Google etc. in bulk and resell it through their UI at a markup. Their free tier gives 500k credits (a trial), then users hit a paywall. They list "Bring your own API keys" as a feature, but it's only on paid plans as a supplement to their credit system.

**We are the opposite:**

- Our product is **100% free** because BYOK is the _only_ way to use it, not a bonus feature
- We **never resell** API access, we never have AI infrastructure costs
- Users **only ever pay their own API providers** directly
- We use **zero-knowledge encryption** for API keys — our server literally cannot read them
- LobeHub handles API traffic through their servers and charges for it; we either proxy statelessly (for CORS) or let traffic go browser-direct

**Their positioning is also different:** LobeHub Cloud pitches "AI agent workspace" with agent teams, multi-agent collaboration, and skills marketplace. We're building a "free ChatGPT/Claude replacement" — simpler, more consumer-focused: bring your key, get the experience, pay nothing to us.

**Why this is a permanent differentiator:** LobeHub will never make their hosted version fully free with pure BYOK because that would destroy their credit-based revenue model. That gap is our opportunity.

**Technical gap confirmed:** GitHub discussion #8669 shows users requesting per-user API keys in LobeChat's multi-user mode — it's still not properly supported. The current setup exposes the admin's API key to all users with no isolation. This is exactly what we're building.

---

## Fork Decision: LobeChat

### Why LobeChat

After evaluating all major open-source chat UIs, **LobeChat** is the clear winner to fork from:

- **\~48k+ GitHub stars**, MIT license, actively maintained (updates daily as of March 2026)
- **Tech stack matches our architecture almost exactly:** Next.js, TypeScript, Zustand state management, Clerk auth, Neon serverless Postgres, Cloudflare R2 for S3 storage
- **Already has 70-80% of our target features built:**
  - Artifacts (React, HTML, SVG, Mermaid rendering in chat)
  - Conversation branching (edit past messages, fork conversations)
  - 42+ AI provider integrations (OpenAI, Anthropic, Google, Ollama, etc.)
  - Plugin/tool system with MCP support
  - File uploads and knowledge base/RAG
  - TTS/STT (text-to-speech, speech-to-text)
  - Markdown + LaTeX + code highlighting
  - Streaming responses
  - Multi-model switching
  - Chain of thought visualization
  - i18n (20+ languages)
  - Polished UI that rivals ChatGPT
- **Server-database mode** already supports Vercel + Postgres + S3 (our exact pattern)
- **MIT license** — full freedom to rebrand, modify, commercialize

### Why Not the Others

| Project    | Stars  | License | Why Not                                                                                                                              |
| ---------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Open WebUI | \~127k | BSD-3   | SvelteKit + Python backend. Designed for Ollama/local models. Wrong architecture for serverless SaaS.                                |
| LibreChat  | \~35k  | MIT     | Express + React + MongoDB. Designed for Docker self-hosting. Would require fighting the backend architecture.                        |
| NextChat   | \~87k  | MIT     | Super lightweight (5MB) but lacks server-side database, proper multi-user auth, and rich feature set. More additive work than reuse. |

### What LobeChat Already Provides (No Modification Needed)

- Chat UI with streaming responses
- Markdown + LaTeX + syntax highlighting + Mermaid diagrams
- Artifacts rendering (React components, HTML, SVG in sandboxed iframes)
- Conversation branching (tree model, edit & fork)
- Multi-model switching within conversations
- File uploads (images, documents, knowledge base)
- Plugin system + MCP server support
- TTS/STT voice features
- Agent marketplace and custom assistants
- Clerk authentication integration
- Neon Postgres database integration
- Cloudflare R2 S3 storage integration
- i18n multilingual support
- Responsive design (mobile-usable)
- One-click Vercel deployment

---

## API Key Security Architecture (Zero-Knowledge Encrypted Sync)

### The Core Problem

Users need API keys to sync across devices (our selling point), but we promise "we never touch your AI traffic." If we store keys server-side in plaintext, users have to trust us. If we store only client-side, sync breaks.

### Solution: Zero-Knowledge Vault (Option A — Primary)

Modeled after Bitwarden's architecture. Our server NEVER sees plaintext API keys.

**How it works:**

1. **User Setup (once):**
   - User creates a "vault password" (separate from their login password)
   - Browser derives an encryption key using PBKDF2 or Argon2id from the vault password
   - This vault key never leaves the browser — it is never sent to the server

2. **Storing an API Key:**
   - User enters their API key + base URL in the settings UI
   - Browser encrypts the API key using AES-256-GCM with the vault-derived key
   - Browser generates a random IV (initialization vector) per key
   - Only the **ciphertext + IV** are sent to our API and stored in Postgres
   - The plaintext key exists only in browser memory, never on our server

3. **Syncing to Another Device:**
   - User logs in on a new device (via Clerk auth)
   - Encrypted blobs sync down from Postgres
   - User enters their vault password on the new device
   - Browser derives the same encryption key and decrypts locally
   - API keys are now available on the new device — server was never involved in decryption

4. **Making an AI Request:**
   - Browser holds the decrypted API key in memory
   - For proxy mode: browser sends the plaintext key in an `Authorization` header over HTTPS to our Cloudflare Worker proxy
   - Worker forwards the request to the user's AI endpoint with the key in the header
   - Worker immediately discards the key — nothing is logged, nothing is stored
   - For direct mode: browser sends the request directly to the AI endpoint (Worker is not involved at all)

**What our server stores (the `api_configs` table):**

```
api_configs:
  id                  UUID PRIMARY KEY
  user_id             TEXT NOT NULL (from Clerk)
  name                TEXT (e.g., "My OpenAI", "Work Anthropic")
  base_url            TEXT (e.g., "https://api.openai.com/v1")
  encrypted_api_key   BYTEA (AES-256-GCM ciphertext — NEVER plaintext)
  encryption_iv       BYTEA (random IV, unique per key)
  encryption_salt     BYTEA (salt used in key derivation)
  model_list          JSONB (cached list of available models)
  is_default          BOOLEAN DEFAULT false
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ
```

**What our server NEVER stores:**

- Plaintext API keys
- The vault password
- The derived encryption key
- Any AI request/response content

**Security properties:**

- **Database leak = useless data.** Attacker gets encrypted blobs they can't decrypt without each user's vault password.
- **Server compromise = no key access.** Even with full server access, keys are encrypted with user-held secrets.
- **Open-source verifiable.** Anyone can audit the code and confirm zero-knowledge architecture.
- **Per-key encryption.** Each API key has its own random IV, so identical keys produce different ciphertext.

**Trade-off:** If a user forgets their vault password, their stored API keys are unrecoverable (we can't reset it). This is a feature for trust-conscious users, not a bug. Users can always re-enter their keys.

### Local-Only Mode (Option C — Phase 2 Feature)

For maximum-paranoia users who don't want encrypted keys touching the server at all:

- API keys stored ONLY in the browser's IndexedDB, encrypted with a local key
- Keys do NOT sync across devices — user must re-enter on each device
- Toggle in settings: "Local-only key storage (keys never leave this device)"
- Everything else (chat history, conversations, folders) still syncs normally via the server
- This mode is essentially "offline key management with online chat sync"

### Vault Password UX Flow

**First time setup:**

1. User signs up via Clerk (email/Google/GitHub)
2. User navigates to Settings → API Keys
3. Prompted: "Create a vault password to encrypt your API keys. This password never leaves your device."
4. User creates vault password (with strength indicator)
5. User adds their first API endpoint (base URL + API key)
6. Key is encrypted in-browser, ciphertext synced to server
7. Ready to chat

**New device login:**

1. User logs in via Clerk on new device
2. Prompted: "Enter your vault password to unlock your API keys"
3. User enters vault password
4. Keys are decrypted locally — ready to use
5. Vault password is cached in browser session (cleared on logout/tab close)

**Forgot vault password:**

1. User can reset vault password, but this **deletes all stored encrypted keys**
2. User must re-enter API keys after reset
3. Clear messaging: "We cannot recover your keys because they are encrypted with your vault password, which we never store."

---

## What We Need to Build / Modify (on top of LobeChat)

### 1. BYOK Layer + Zero-Knowledge Vault — THE core modification

**Current behavior:** Server admin configures API keys, or users provide keys that the server proxies through Next.js API routes.

**Target behavior:** Each user stores their own base URL + API key, encrypted with their vault password. Server only sees ciphertext.

**Changes required:**

- Implement vault password creation/unlock flow in the frontend
- Client-side encryption/decryption using Web Crypto API (AES-256-GCM + PBKDF2/Argon2id)
- Add `api_configs` table with encrypted key storage (schema above)
- Build settings UI for users to add/edit/test their API endpoints
- Auto-fetch available models from user's endpoint (`/v1/models`)
- Modify the API route handlers to read from user's config instead of server-level env vars
- Build the Cloudflare Worker streaming proxy (stateless, forwards requests with user's API key)
- Add "direct mode" toggle for endpoints that support CORS (bypasses proxy, zero latency)
- Client-side logic: detect CORS support, auto-select proxy vs direct mode

### 2. Cloudflare Pages Deployment (instead of Vercel)

- Use `@cloudflare/next-on-pages` to deploy Next.js on Cloudflare Pages
- Migrate from Vercel serverless functions to Cloudflare Workers where needed
- Keep Neon Postgres and Cloudflare R2 (already supported by LobeChat)
- This gives us free hosting with global CDN instead of Vercel's usage-based pricing

### 3. Cross-Device Sync (Lightweight Version)

**Current behavior:** LobeChat's server-database mode already syncs via Postgres + S3.

**Enhancement:** Add a lightweight polling-based sync mechanism for near-instant cross-device updates:

- Each conversation gets a `version` number in Postgres
- Client polls `/api/sync` every 30 seconds (tiny payload: just conversation IDs + versions)
- Only fetch full messages from R2 for conversations with changed versions
- Upgradeable to WebSockets/Durable Objects later if needed

### 4. Memory (Persistent Facts Across Conversations)

LobeChat has knowledge base/RAG but NOT ChatGPT-style memory (persistent user facts).

**Build:**

- Memory table in Postgres: `memories (id, user_id, key, value, source_conversation_id, created_at)`
- After each conversation, run a small secondary prompt to extract facts
- Inject relevant memory items into the system prompt on each new request
- Settings UI to view/edit/delete memory items
- Toggle to enable/disable memory per conversation

### 5. Public Sharing

- Generate random slug when user clicks "Share"
- Copy conversation JSON to a public R2 bucket path
- Serve through a static read-only viewer page on Cloudflare Pages
- Viewer renders markdown/LaTeX/artifacts without requiring login

### 6. Folders / Organization Enhancement

- Nested folders (projects → subfolders → conversations)
- Drag-and-drop organization
- Folder-level default model/instructions

### 7. Custom Instructions Enhancement

- Global custom instructions (applied to all conversations)
- Per-conversation instruction overrides
- Multiple "personas" the user can switch between

---

## Architecture (Scalable, \~$0 cost)

### Frontend

- **Cloudflare Pages** (free, global CDN) — LobeChat's Next.js app deployed via `@cloudflare/next-on-pages`
- **Responsive PWA first**, native mobile (React Native/Expo) later once validated
- **Desktop (future):** Tauri wrapping the web app

### Backend

- **Cloudflare Workers** (serverless) — AI proxy, sync endpoints, lightweight API routes
- Free tier: 100k req/day; paid plan ($5/month) for 10M req/month when needed

### Auth

- **Clerk** — already integrated in LobeChat's server-database mode
- Free up to 10k monthly active users

### Database — Neon Serverless Postgres (Free Tier: 0.5GB)

Already used by LobeChat. Stores:

- Users, sessions, auth data (via Clerk)
- Conversations metadata (id, user_id, title, folder_id, model, version, timestamps)
- Folders (id, user_id, name, parent_id)
- API Configs with encrypted keys (schema detailed above) — **NEW**
- Memories (id, user_id, key, value, source_conversation_id) — **NEW**
- Shared links (id, conversation_id, slug, created_at) — **NEW**
- All existing LobeChat tables (agents, plugins, topics, messages, files, etc.)

### File/Message Storage — Cloudflare R2 (S3-Compatible Object Storage)

Already used by LobeChat for file uploads. We also use it for:

- Chat message storage as compressed JSON
- Shared conversation snapshots (public bucket)
- Free tier: 10GB storage, 10M reads/month, zero egress fees

### AI Proxy — Cloudflare Worker (Solves CORS)

**The Problem:** Many OpenAI-compatible endpoints (Ollama, LM Studio, vLLM, some cloud providers) don't set permissive CORS headers, so browser-direct calls fail.

**The Solution:** A thin Cloudflare Worker that acts as a transparent streaming proxy:

- Browser sends request to our Worker with the user's API key in the header
- Worker forwards the request to the user's configured base URL
- Worker streams the SSE response back to the browser
- Worker **never stores anything** — just pipes bytes through, key is discarded after forwarding
- **Optional "direct mode"** for endpoints that support CORS (OpenAI, OpenRouter) — bypasses proxy entirely

**Cost:** 10k DAU × 50 AI req/day = 500k req/day, well within Workers paid plan ($5/month).

### Cross-Device Sync

- Version-based polling (30 second intervals)
- Tiny payload: only changed conversation IDs + version numbers
- Full message fetch from R2 only for updated conversations
- Upgradeable to WebSockets/Durable Objects later

---

## Data Flow Diagram (Request Lifecycle)

```
User's Browser                    Our Infrastructure              User's AI Provider
─────────────                    ──────────────────              ──────────────────

1. User types message
2. Browser holds decrypted
   API key in memory
   (from vault unlock)
                    ─── HTTPS ───►
3. Request sent to               4. Worker receives request
   Worker proxy with                (or direct to provider
   API key in header                if CORS supported)
                                 5. Worker forwards to
                                    user's base_url with
                                    API key in header
                                 6. Worker DISCARDS key     ──── HTTPS ────►
                                    from memory              7. Provider processes
                                                                request
                                 8. Worker streams SSE      ◄─── SSE stream ───
                                    response back
                    ◄── SSE ────
9. Browser renders
   streaming response
10. Browser saves message
    to R2 (via API)
                                 11. Postgres gets metadata
                                     update (title, version)
                                 12. R2 gets compressed
                                     message JSON

Server NEVER sees: plaintext API key at rest, AI request content at rest, AI response content
Server ONLY sees: encrypted key blobs, conversation metadata, compressed messages in R2
```

---

## Security Summary (Trust Guarantees)

| What                        | How                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| API keys at rest            | AES-256-GCM encrypted with user's vault password. Server stores only ciphertext.                                      |
| API keys in transit         | HTTPS only. Plaintext key sent in Authorization header to Worker proxy, immediately discarded after forwarding.       |
| Vault password              | Never leaves the browser. Never sent to server. Used only for local key derivation.                                   |
| AI request/response content | Passes through Worker proxy but is never stored or logged. Direct mode bypasses proxy entirely.                       |
| Database leak scenario      | Attacker gets encrypted blobs + conversation metadata. API keys are unrecoverable without each user's vault password. |
| Server compromise scenario  | Even with full server access, no ability to decrypt API keys. Zero-knowledge architecture.                            |
| Code trust                  | MIT open-source. Anyone can audit encryption implementation, verify server never sees plaintext.                      |
| Local-only option (Phase 2) | Keys stored only in browser IndexedDB. Never touch server at all. No cross-device sync for keys.                      |

---

## Feature Matrix: What's Ready vs What We Build

| Feature                            | Status     | Notes                                                               |
| ---------------------------------- | ---------- | ------------------------------------------------------------------- |
| Chat + Streaming                   | ✅ Ready   | LobeChat built-in                                                   |
| Markdown + LaTeX + Code            | ✅ Ready   | LobeChat built-in                                                   |
| Artifacts (React/HTML/SVG/Mermaid) | ✅ Ready   | LobeChat built-in                                                   |
| Conversation Branching             | ✅ Ready   | LobeChat built-in                                                   |
| Multi-Model Switching              | ✅ Ready   | LobeChat built-in                                                   |
| File Uploads + Knowledge Base      | ✅ Ready   | LobeChat built-in                                                   |
| Plugin System + MCP                | ✅ Ready   | LobeChat built-in                                                   |
| TTS / STT                          | ✅ Ready   | LobeChat built-in                                                   |
| Agent Marketplace                  | ✅ Ready   | LobeChat built-in                                                   |
| Clerk Auth                         | ✅ Ready   | LobeChat server-db mode                                             |
| Postgres + R2 Storage              | ✅ Ready   | LobeChat server-db mode                                             |
| i18n (20+ languages)               | ✅ Ready   | LobeChat built-in                                                   |
| Chain of Thought Visualization     | ✅ Ready   | LobeChat built-in                                                   |
| BYOK + Zero-Knowledge Vault        | 🔨 Build   | Core — vault password, client-side encryption, per-user API configs |
| Cloudflare Pages Deploy            | 🔨 Build   | Migrate from Vercel to CF Pages                                     |
| CORS Proxy Worker                  | 🔨 Build   | Thin streaming proxy on CF Workers                                  |
| Memory (Persistent Facts)          | 🔨 Build   | New table + extraction prompt + injection                           |
| Public Sharing                     | 🔨 Build   | Slug generation + public R2 + viewer page                           |
| Enhanced Folders                   | 🔨 Modify  | Nested folders, drag-and-drop                                       |
| Custom Instructions                | 🔨 Modify  | Global + per-conversation + personas                                |
| Cross-Device Sync Optimization     | 🔨 Modify  | Version-based polling layer                                         |
| Web Search Tool                    | 🔨 Build   | Brave Search API or SearXNG via tool calling                        |
| Local-Only Key Storage             | 📋 Phase 2 | Keys in IndexedDB only, no server sync                              |
| Code Interpreter                   | 📋 Phase 3 | e2b.dev integration                                                 |
| Native Mobile App                  | 📋 Phase 3 | React Native / Expo or PWA                                          |
| Image Generation                   | 📋 Phase 3 | DALL-E compatible endpoint passthrough                              |
| Desktop App                        | 📋 Phase 3 | Tauri wrapping web app                                              |

---

## Phased Roadmap

### Phase 1 — Fork + BYOK + Deploy (Target: 4-6 weeks)

1. Fork LobeChat, rebrand (name, logo, colors)
2. Build zero-knowledge vault (vault password, client-side AES-256-GCM encryption)
3. Build BYOK layer (user API config table with encrypted keys, settings UI, endpoint testing)
4. Build Cloudflare Worker streaming proxy (CORS solution)
5. Deploy to Cloudflare Pages via `@cloudflare/next-on-pages`
6. Configure Neon Postgres + Cloudflare R2 (LobeChat's existing setup)
7. Configure Clerk auth
8. Add direct mode detection (auto-bypass proxy for CORS-friendly endpoints)
9. Test with OpenAI, OpenRouter, Anthropic, Groq, local Ollama endpoints
10. Add cross-device sync polling endpoint
11. Launch MVP — fully usable daily driver

### Phase 2 — Feature Parity (Target: 4-8 weeks after Phase 1)

- Local-only key storage mode (IndexedDB, no server sync for keys)
- Memory system (persistent user facts across conversations)
- Public sharing (conversation share links)
- Enhanced folders (nested, drag-and-drop)
- Custom instructions (global + per-conversation + personas)
- Web search tool integration (Brave Search free tier)
- Canvas/edit mode for AI outputs
- Onboarding flow + documentation

### Phase 3 — Advanced Features

- Code interpreter (e2b.dev integration or LibreChat's Code Interpreter API)
- Native mobile app (React Native / Expo, or lean into PWA)
- Image generation passthrough (DALL-E compatible endpoints)
- Desktop app (Tauri wrapping the web app)
- Real-time sync upgrade (WebSockets / Durable Objects)
- Plugin/extension marketplace (user-contributed tools)
- Team/organization features (shared API configs, shared conversations)

---

## Estimated Monthly Costs

| Users | Cost       | Notes                                |
| ----- | ---------- | ------------------------------------ |
| 1k    | \~$0       | All free tiers                       |
| 10k   | \~$5-10    | Workers paid plan kicks in           |
| 100k  | \~$25-50   | R2 storage + Workers + Clerk overage |
| 1M    | \~$200-500 | Still remarkably cheap               |

---

## Tech Stack Summary (Post-Fork)

| Layer                  | Technology                                     | Source                        |
| ---------------------- | ---------------------------------------------- | ----------------------------- |
| Frontend Framework     | Next.js + TypeScript                           | LobeChat                      |
| UI Components          | Ant Design + lobe-ui                           | LobeChat                      |
| State Management       | Zustand                                        | LobeChat                      |
| Client-Side Encryption | Web Crypto API (AES-256-GCM + PBKDF2/Argon2id) | New                           |
| Hosting                | Cloudflare Pages                               | Migration from Vercel         |
| Auth                   | Clerk                                          | LobeChat (already integrated) |
| Database               | Neon serverless Postgres                       | LobeChat (already integrated) |
| Object Storage         | Cloudflare R2                                  | LobeChat (already integrated) |
| AI Proxy               | Cloudflare Worker                              | New (thin streaming proxy)    |
| Rendering              | Built-in artifact renderer                     | LobeChat                      |
| Markdown/LaTeX         | react-markdown, KaTeX                          | LobeChat                      |
| Code Highlighting      | Shiki                                          | LobeChat                      |
| Diagrams               | Mermaid.js                                     | LobeChat                      |
| i18n                   | i18next + lobe-i18n                            | LobeChat                      |
| Plugins/Tools          | MCP protocol + plugin SDK                      | LobeChat                      |
| Mobile (later)         | React Native / Expo or PWA                     | New                           |
| Desktop (later)        | Tauri                                          | New                           |
| Code Sandbox (Phase 3) | e2b.dev                                        | New                           |
| Search (Phase 2)       | Brave Search API                               | New                           |

---

## Key Architectural Decisions

1. **Fork LobeChat** — gives us 70-80% of features on our exact target stack (Next.js, Clerk, Neon, R2)
2. **Zero-knowledge API key storage** — vault password + AES-256-GCM client-side encryption, server only stores ciphertext
3. **BYOK is the core modification** — user-level API configs replacing server-level env vars
4. **CORS solved via Cloudflare Worker proxy** — thin stateless streaming proxy, with direct mode for compatible endpoints
5. **Deploy on Cloudflare Pages** instead of Vercel — free hosting, global CDN, pairs with Workers + R2
6. **DB stores metadata + encrypted blobs, R2 stores messages** — LobeChat already does this pattern
7. **AI traffic never stored on our servers** — proxy is stateless passthrough, key discarded after forwarding
8. **Sync via version polling** — simple, nearly free, upgradeable later
9. **Artifacts, branching, plugins all inherited** — no need to build from scratch
10. **Open source for trust** — zero-knowledge encryption is verifiable by code audit

---

## Implementation Priority for Phase 1

The critical path (in order):

1. **Fork & rebrand** — new name, logo, remove LobeChat marketplace/branding
2. **Zero-knowledge vault** — vault password flow, Web Crypto API encryption/decryption
3. **BYOK data model** — add `api_configs` table with encrypted key storage
4. **Settings UI** — add/edit/test API endpoints, model auto-detection
5. **Worker proxy** — Cloudflare Worker that streams AI requests (solves CORS)
6. **Rewire API routes** — point LobeChat's AI request pipeline to user's config + proxy
7. **Direct mode** — detect CORS support, bypass proxy when possible
8. **Cloudflare Pages deploy** — `@cloudflare/next-on-pages` setup + CI/CD
9. **Sync endpoint** — lightweight version-polling API for cross-device updates
10. **Testing matrix** — verify against OpenAI, Anthropic, OpenRouter, Groq, Ollama, vLLM
11. **Landing page + docs** — explain BYOK concept, zero-knowledge security, onboarding guide
12. **Launch** — public beta

---

## Repository Structure (Post-Fork)

```
byokey-chat/                    # Renamed from lobe-chat
├── apps/
│   └── web/                    # Next.js app (LobeChat core)
│       └── src/
│           └── libs/
│               └── vault/      # NEW: Zero-knowledge encryption module
│                   ├── crypto.ts       # AES-256-GCM encrypt/decrypt
│                   ├── keyDerivation.ts # PBKDF2/Argon2id from vault password
│                   └── vaultStore.ts   # Zustand store for vault state
├── packages/                   # Shared packages (lobe-ui, etc.)
├── workers/
│   └── ai-proxy/              # NEW: Cloudflare Worker streaming proxy
│       ├── src/index.ts
│       └── wrangler.toml
├── docs/                      # Self-hosting docs + BYOK guides
├── .env.example               # Updated with BYOK-specific vars
└── cloudflare-pages.config    # NEW: CF Pages deployment config
```

---

## Reference Links

- **LobeChat Repo:** <https://github.com/lobehub/lobe-chat>
- **LobeChat License:** MIT
- **LobeChat Docs:** <https://lobehub.com/docs>
- **Architecture Wiki:** <https://github.com/lobehub/lobe-chat/wiki/Architecture>
- **Server-Database Deploy Guide:** <https://lobehub.com/docs/self-hosting/server-database/vercel>
- **R2 Storage Guide:** <https://github.com/lobehub/lobe-chat/blob/main/docs/self-hosting/advanced/s3/cloudflare-r2.mdx>
- **Per-User API Key Discussion:** <https://github.com/lobehub/lobe-chat/discussions/8669>
- **LobeHub Pricing (competitor):** <https://lobehub.com/pricing>
- **Cloudflare Next-on-Pages:** <https://github.com/cloudflare/next-on-pages>
- **Web Crypto API Docs:** <https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API>
