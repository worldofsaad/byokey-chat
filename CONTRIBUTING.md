# Contributing to BYOKey Chat

BYOKey Chat is a fork of LobeChat that replaces server-level API keys with per-user zero-knowledge encrypted key storage. We welcome contributions from developers, security researchers, and anyone who cares about privacy-respecting AI tools.

---

## Development Setup

### Prerequisites

- **Node.js** 20+ (24.x recommended — used in CI)
- **pnpm** 9+ (package manager)
- **bun** (script runner — used for `bun run` commands)
- **Git** 2.30+
- **Docker** (optional, for local Postgres/Redis via `bun run dev:docker`)

### Clone and Install

```bash
git clone https://github.com/YOUR_ORG/byokey-chat.git
cd byokey-chat
pnpm install
```

### Verify the Build

```bash
bun run type-check # TypeScript type checking
bun run lint       # ESLint + Stylelint + type-check + circular deps
```

### Run Dev Server

```bash
# SPA dev mode (frontend only — fastest for UI work)
bun run dev:spa

# Full-stack dev (Next.js + Vite SPA concurrently)
bun run dev
```

After `dev:spa` starts, the terminal prints a **Debug Proxy** URL. Open it to develop locally against the production backend with HMR.

### Run Tests

```bash
# Run a specific test file (ALWAYS prefer this over running all tests)
bunx vitest run --silent='passed-only' 'path/to/file.test.ts'

# Run tests for a specific package
cd packages/core && bunx vitest run --silent='passed-only' 'src/vault/__tests__/crypto.test.ts'
```

> **Never** run `bun run test` during development — it runs all tests across all packages and takes \~10 minutes.

### AI-Assisted Development

This project is designed for AI-assisted development with **Claude Code**:

- Claude Code reads `CLAUDE.md` automatically on every session for project context
- The `CLAUDE.md` file contains architecture details, coding rules, and a Lessons Learned section
- Skills in `.agents/skills/` are auto-loaded by Claude Code for domain-specific guidance

---

## TDD Process (Mandatory)

Every feature, bug fix, and security improvement follows the **Red-Green-Refactor-Secure** cycle. This is not optional.

### The Cycle

1. **RED** — Write a failing test that defines expected behavior
2. **GREEN** — Write the minimum code to make the test pass
3. **REFACTOR** — Clean up without breaking tests
4. **SECURE** — Run security audit checks

### Concrete Example: Vault Encryption

**Step 1: RED — Write the failing test first**

```typescript
// packages/core/src/vault/__tests__/crypto.test.ts
import { describe, expect, it } from 'vitest';

import { decrypt, encrypt } from '../crypto';

describe('vault encryption', () => {
  it('should encrypt and decrypt a plaintext API key', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);

    const plaintext = 'sk-proj-abc123def456';
    const encrypted = await encrypt(plaintext, key);

    expect(encrypted.ciphertext).toBeInstanceOf(ArrayBuffer);
    expect(encrypted.iv).toBeInstanceOf(Uint8Array);
    expect(encrypted.iv.length).toBe(12); // AES-GCM standard IV size

    const decrypted = await decrypt(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext for the same plaintext (random IV)', async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);

    const plaintext = 'sk-proj-abc123def456';
    const encrypted1 = await encrypt(plaintext, key);
    const encrypted2 = await encrypt(plaintext, key);

    // Different IVs should produce different ciphertext
    expect(encrypted1.iv).not.toEqual(encrypted2.iv);
  });

  it('should fail to decrypt with a different key', async () => {
    const key1 = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
    const key2 = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);

    const plaintext = 'sk-proj-abc123def456';
    const encrypted = await encrypt(plaintext, key1);

    await expect(decrypt(encrypted, key2)).rejects.toThrow();
  });
});
```

**Step 2: GREEN — Implement the minimum code**

```typescript
// packages/core/src/vault/crypto.ts
import type { EncryptedPayload } from '@byokey/types';

export async function encrypt(plaintext: string, key: CryptoKey): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  );
  return { ciphertext, iv };
}

export async function decrypt(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  const decoder = new TextDecoder();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: payload.iv },
    key,
    payload.ciphertext,
  );
  return decoder.decode(plaintext);
}
```

**Step 3: REFACTOR — Clean up** (if needed, without breaking tests)

**Step 4: SECURE — Run security checks**

```bash
# Verify no plaintext keys in code
grep -rn 'apiKey\s*=' packages/core/src/ --include='*.ts' | grep -v 'encrypted' | grep -v 'test'

# Run the security test suite (once implemented)
# bunx vitest run --project security
```

---

## Task Decomposition Rules

- **Every task is one PR.** Every PR is isolated and independently mergeable.
- **Tasks must be small** enough to review in under 30 minutes.
- **No PR depends on unmerged work** in another branch.
- **Every PR must pass CI** + security audit before merge.
- If a task is too big for one PR, break it into smaller tasks first.

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) with project-specific scopes.

### Format

```
type(scope): description
```

### Types

| Type       | Use For                           |
| ---------- | --------------------------------- |
| `feat`     | New feature                       |
| `fix`      | Bug fix                           |
| `test`     | Adding or updating tests          |
| `security` | Security improvement              |
| `refactor` | Code cleanup (no behavior change) |
| `docs`     | Documentation                     |
| `ci`       | CI/CD changes                     |
| `chore`    | Dependencies, config, tooling     |

### Scopes

| Scope    | Area                                                       |
| -------- | ---------------------------------------------------------- |
| `vault`  | Zero-knowledge vault (crypto, key derivation, vault store) |
| `byok`   | BYOK layer (API config, settings UI, endpoint management)  |
| `proxy`  | Cloudflare Worker AI proxy                                 |
| `sync`   | Cross-device sync                                          |
| `auth`   | Authentication (Clerk)                                     |
| `ui`     | UI components and pages                                    |
| `worker` | Cloudflare Workers infrastructure                          |
| `mobile` | Mobile-specific code                                       |

### Examples

**Good:**

```
feat(vault): add AES-256-GCM encrypt/decrypt with Web Crypto API
fix(proxy): handle SSE stream interruption gracefully
test(vault): add edge cases for key derivation with empty password
security(byok): sanitize base URL input to prevent SSRF
ci: add Semgrep SAST scanning to security audit workflow
```

**Bad:**

```
update code                     # no type, no scope, no description
feat: stuff                     # meaningless description
fix(vault): fixed the thing     # vague, past tense
feat(vault,proxy): add stuff    # multiple scopes — split into separate commits
```

---

## PR Process

### Branch Naming

```
type/description-in-kebab-case
```

Examples: `feat/vault-encryption`, `fix/proxy-cors-headers`, `test/vault-key-derivation`, `security/input-sanitization`

### Creating a PR

1. Create branch from `main`:

   ```bash
   git checkout main && git pull
   git checkout -b feat/your-feature
   ```

2. Write tests first, then implement (TDD cycle)

3. Push and create PR:

   ```bash
   git push -u origin feat/your-feature
   ```

4. Fill out the PR template completely — including the **Security Checklist** and **Lessons Learned** sections

### PR Requirements

- All CI checks must pass (lint, type-check, tests, security audit)
- PR template filled out completely
- At least 1 approval required for merge to main
- No unresolved review comments

---

## Code Style

This project inherits LobeChat's existing linting configuration:

- **ESLint:** `eslint.config.mjs` at repo root
- **Prettier:** `prettier.config.mjs` at repo root
- **Stylelint:** `stylelint.config.mjs` at repo root
- **TypeScript:** Strict mode (`tsconfig.json`)
- **Import style:** Follow existing patterns — use `@/` alias for app imports, package names for package imports

Run lint checks:

```bash
bun run lint       # All lint checks
bun run type-check # TypeScript only
```

---

## Testing Standards

### Framework

- **Unit tests:** Vitest with happy-dom environment (already configured in `vitest.config.mts`)
- **E2E tests:** Playwright (in `e2e/` directory)

### Coverage Requirements

| Area                             | Minimum Coverage |
| -------------------------------- | ---------------- |
| `packages/core/` (vault, crypto) | 90% lines        |
| `packages/security/`             | 90% lines        |
| App code (`src/`)                | 75% lines        |

### Test File Naming

- Unit tests: `[module].test.ts` or `[module].test.tsx`
- Place tests in `__tests__/` directories next to source code
- E2E tests: in `e2e/` directory

### Testing Best Practices

- Prefer `vi.spyOn` over `vi.mock`
- Tests must pass type check: `bun run type-check`
- **After 2 failed fix attempts, stop and ask for help** — don't spiral
- For Web Crypto API in tests: use `@peculiar/webcrypto` polyfill if happy-dom doesn't support it

### Security Tests

- Custom Semgrep rules for project-specific patterns
- Grep-based checks for plaintext key leakage
- Automated in CI via `.github/workflows/security-audit.yml`

---

## Maintaining Project Memory (CLAUDE.md Lessons Learned)

The bottom of `CLAUDE.md` contains a **Lessons Learned** section — the project's institutional memory.

### Rules for Every Developer (Human or AI)

1. **Before starting work:** Read the Lessons Learned section. Check if a relevant lesson already exists.

2. **When you discover something non-obvious:** Stop. Write it to `CLAUDE.md` Lessons Learned **immediately**. Do not wait until the end of your session. Do not batch. Do not "add it later."

3. **What counts as a discovery:**
   - A LobeChat internal behavior that isn't documented
   - A dependency conflict or version pin
   - A build quirk or workaround
   - A Web Crypto API gotcha
   - A test pattern that works or doesn't
   - An architecture decision made during implementation
   - A security finding
   - A performance discovery

4. **Format:**

   ```markdown
   ### [YYYY-MM-DD] — Short title

   **Context:** What were we doing
   **Problem:** What went wrong or was unexpected
   **Solution:** What fixed it or what we decided
   **Files affected:** Which files this applies to
   ```

5. **This is part of the definition of done** for any task where something unexpected was encountered. If you discovered something, but didn't write it down, the task isn't done.

---

## Questions?

- Open a [GitHub Discussion](https://github.com/YOUR_ORG/byokey-chat/discussions) for questions
- Check existing issues before opening new ones
- For security issues, see `SECURITY.md`
