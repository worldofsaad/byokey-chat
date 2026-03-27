import { describe, it } from 'vitest';

describe('vault store', () => {
  it.skip('should start in locked state', () => {
    // Initial state: vault is locked, no derived key in memory
  });

  it.skip('should unlock with a valid vault password', () => {
    // unlock(password) → derives key, sets state to unlocked
  });

  it.skip('should lock and clear the derived key from memory', () => {
    // lock() → clears derived key, sets state to locked
  });

  it.skip('should not persist the derived key', () => {
    // Derived key must only exist in memory, never localStorage/sessionStorage
  });
});
