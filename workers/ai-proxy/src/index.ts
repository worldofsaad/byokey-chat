/**
 * BYOKey AI Proxy — Cloudflare Worker
 *
 * A stateless streaming proxy that solves CORS for AI API endpoints.
 * - Receives request with user's API key in Authorization header
 * - Forwards to user's configured AI endpoint
 * - Streams SSE response back to browser
 * - IMMEDIATELY discards API key — nothing is logged or stored
 *
 * SECURITY: This worker has NO persistent storage bindings.
 * See wrangler.toml — no KV, D1, R2, or Durable Objects.
 */

export default {
  async fetch(_request: Request): Promise<Response> {
    // Placeholder — returns 200 OK to verify deployment
    // Full implementation will be built TDD-style
    return new Response(JSON.stringify({ status: 'ok', service: 'byokey-ai-proxy' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  },
};
