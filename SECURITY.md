# Security Policy — BYOKey Chat

## Supported Versions

| Version              | Supported                                 |
| -------------------- | ----------------------------------------- |
| Latest (main branch) | Yes                                       |
| Older versions       | No — please upgrade to the latest release |

---

## Reporting a Vulnerability

We take security seriously. BYOKey Chat handles user API keys with zero-knowledge encryption, and any vulnerability in that chain is critical.

### How to Report

**Option 1 (Preferred):** Use [GitHub Security Advisories](https://github.com/YOUR_ORG/byokey-chat/security/advisories/new) to report privately.

**Option 2:** Email **<security@byokey.chat>** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Please do NOT:**

- Open a public GitHub issue for security vulnerabilities
- Post details in Discussions, Discord, or social media before the fix is released
- Test vulnerabilities against the production deployment without permission

### Response Timeline

| Action                         | Timeline                |
| ------------------------------ | ----------------------- |
| Acknowledge receipt            | Within 48 hours         |
| Initial assessment             | Within 72 hours         |
| Patch for critical issues      | Within 7 days           |
| Patch for high-severity issues | Within 14 days          |
| Patch for medium/low issues    | Within 30 days          |
| Public disclosure              | After patch is deployed |

---

## What We Consider Security Issues

### In Scope (Report These)

**Vault / Encryption:**

- Plaintext API key exposure (stored, logged, transmitted unencrypted, or visible in browser DevTools persistence)
- Vault password bypass (decrypting keys without the vault password)
- Weak key derivation (PBKDF2 misconfiguration, insufficient iterations, weak salt)
- IV reuse in AES-256-GCM encryption
- Encryption key leakage (derived key sent to server, stored in localStorage, logged)
- Ciphertext malleability or padding oracle attacks

**AI Proxy Worker:**

- SSRF (Server-Side Request Forgery) — Worker can be tricked into accessing internal resources
- API key logging or persistence in the Worker (should be stateless)
- Request/response body storage or caching in the Worker
- Worker proxy bypass allowing unauthenticated requests

**Authentication / Authorization:**

- Auth bypass (accessing another user's data without authentication)
- Privilege escalation (accessing another user's encrypted keys or conversations)
- Session fixation or hijacking
- Clerk integration vulnerabilities

**Web Application:**

- XSS (Cross-Site Scripting) — especially in chat rendering, markdown, artifacts
- CSRF (Cross-Site Request Forgery)
- SQL injection in database queries
- Path traversal
- Open redirect
- Sensitive data in error messages or stack traces

### Out of Scope

- Security of the user's chosen AI provider (OpenAI, Anthropic, etc.)
- API key compromise at the provider level
- Brute-force attacks against the user's vault password (we use PBKDF2 with high iteration count; further rate-limiting is the user's responsibility)
- Denial of service attacks
- Social engineering
- Physical access attacks
- Vulnerabilities in dependencies that don't affect our usage of them
- Self-hosted deployments with modified code

---

## Security Architecture Summary

### Zero-Knowledge Vault

- User creates a vault password (never sent to server)
- Browser derives encryption key via **PBKDF2** (600,000 iterations, SHA-256)
- API keys encrypted with **AES-256-GCM** (random 12-byte IV per key)
- Server stores only: ciphertext + IV + salt
- Server **never** stores: plaintext keys, vault password, derived key

### Stateless AI Proxy

- Cloudflare Worker receives API key in Authorization header over HTTPS
- Forwards request to user's AI endpoint
- **Immediately discards** the key — no logging, no storage, no caching
- No persistent storage bindings (no KV, D1, Durable Objects)
- Direct mode available: browser sends directly to AI provider (bypasses proxy entirely)

### Client-Side Security

- All encryption/decryption happens in the browser using Web Crypto API
- Decrypted keys exist only in browser memory (never localStorage, sessionStorage, cookies)
- Vault auto-locks on tab close / session end
- No plaintext keys in console.log, error messages, or network payloads to our server

### Database Security

- Database leak = useless encrypted blobs (unrecoverable without each user's vault password)
- Server compromise = no key access (zero-knowledge architecture)
- Per-key encryption with unique random IVs (identical keys produce different ciphertext)

---

## Security Testing

Our CI pipeline runs automated security checks on every push and PR:

1. **Semgrep SAST** — Static analysis with OWASP, secrets, XSS, and Next.js rulesets
2. **GitHub CodeQL** — Security-extended queries for JavaScript/TypeScript
3. **Dependency scanning** — `pnpm audit` + Trivy for known vulnerabilities
4. **Secret scanning** — Gitleaks full-history scan
5. **Custom checks:**
   - Grep for plaintext API key assignment outside vault/crypto files
   - Grep for `console.log` containing sensitive keywords
   - Verify Worker has no persistent storage code
6. **License compliance** — Reject GPL/AGPL/SSPL dependencies

---

## Auditing

This is an open-source project. All security-critical code is publicly auditable:

- **Vault encryption:** `packages/core/src/vault/crypto.ts`
- **Key derivation:** `packages/core/src/vault/keyDerivation.ts`
- **Vault state:** `packages/core/src/vault/vaultStore.ts`
- **AI proxy:** `workers/ai-proxy/src/index.ts`
- **Input validation:** `packages/security/src/validation/`

We encourage security researchers to review these files and report any findings.

---

## Hall of Fame

We gratefully recognize security researchers who responsibly disclose vulnerabilities:

<!-- Contributors will be listed here after responsible disclosure and fix deployment -->

_No entries yet. Be the first to help us improve our security!_

---

## Acknowledgments

Our zero-knowledge vault architecture is inspired by [Bitwarden's security model](https://bitwarden.com/help/bitwarden-security-white-paper/). We use industry-standard cryptographic primitives (AES-256-GCM, PBKDF2) via the Web Crypto API.
