import { describe, it } from 'vitest';

describe('vault encryption (AES-256-GCM)', () => {
  it.skip('should encrypt and decrypt a plaintext API key', () => {
    // TDD: implement encrypt() and decrypt() in crypto.ts first
  });

  it.skip('should produce different ciphertext for the same plaintext (random IV)', () => {
    // Each encryption must use a unique random IV
  });

  it.skip('should fail to decrypt with a different key', () => {
    // Wrong key must throw, not return garbage
  });

  it.skip('should handle empty string input', () => {
    // Edge case: empty string should encrypt/decrypt cleanly
  });

  it.skip('should handle unicode input', () => {
    // API keys could contain any characters
  });

  it.skip('should produce a 12-byte IV', () => {
    // AES-GCM standard IV size
  });
});
