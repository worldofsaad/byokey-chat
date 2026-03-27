/**
 * State of the zero-knowledge vault.
 */
export interface VaultState {
  /** The derived CryptoKey, only present when vault is unlocked. NEVER persisted. */
  derivedKey: CryptoKey | null;
  /** Whether the vault is currently unlocked (key is in memory) */
  isUnlocked: boolean;
  /** Salt used for PBKDF2 key derivation, stored server-side */
  salt: Uint8Array | null;
}

/**
 * Result of encrypting a plaintext value with AES-256-GCM.
 * The ciphertext and IV are stored server-side; the key never leaves the browser.
 */
export interface EncryptedPayload {
  /** AES-256-GCM ciphertext */
  ciphertext: ArrayBuffer;
  /** Random 12-byte initialization vector (unique per encryption) */
  iv: Uint8Array;
}
