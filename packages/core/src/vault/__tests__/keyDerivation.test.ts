import { describe, it } from 'vitest';

describe('PBKDF2 key derivation', () => {
  it.skip('should derive a CryptoKey from a vault password and salt', () => {
    // deriveKey(password, salt) → CryptoKey suitable for AES-256-GCM
  });

  it.skip('should produce the same key for the same password and salt', () => {
    // Deterministic: same inputs → same key (for cross-device sync)
  });

  it.skip('should produce different keys for different passwords', () => {
    // Different passwords must produce different keys
  });

  it.skip('should produce different keys for different salts', () => {
    // Different salts must produce different keys even with same password
  });

  it.skip('should generate a random salt', () => {
    // generateSalt() → Uint8Array with sufficient entropy
  });
});
