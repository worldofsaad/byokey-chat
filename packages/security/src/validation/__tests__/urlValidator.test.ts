import { describe, it } from 'vitest';

describe('URL validator', () => {
  it.skip('should accept valid HTTPS API URLs', () => {
    // https://api.openai.com/v1 → valid
  });

  it.skip('should reject non-HTTPS URLs in production', () => {
    // http://api.example.com → reject (except localhost for development)
  });

  it.skip('should reject private/internal IP addresses', () => {
    // Prevent SSRF: 10.x, 172.16-31.x, 192.168.x, 127.x, ::1
  });

  it.skip('should allow localhost in development mode', () => {
    // http://localhost:11434 (Ollama) → allow in dev
  });

  it.skip('should reject malformed URLs', () => {
    // "not a url", empty string, etc.
  });
});
