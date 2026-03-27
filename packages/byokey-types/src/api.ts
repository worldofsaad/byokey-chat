/**
 * User's API provider configuration.
 * The API key is always encrypted — this interface represents the decrypted view
 * that exists only in browser memory after vault unlock.
 */
export interface ApiConfig {
  /** API base URL, e.g., "https://api.openai.com/v1" */
  baseUrl: string;
  /** Timestamp of creation */
  createdAt: Date;
  /** Unique identifier */
  id: string;
  /** Whether this is the user's default provider */
  isDefault: boolean;
  /** Cached list of available model IDs from this provider */
  modelList: string[];
  /** User-defined name, e.g., "My OpenAI", "Work Anthropic" */
  name: string;
  /** Timestamp of last update */
  updatedAt: Date;
}

/**
 * Request shape sent from browser to the Cloudflare Worker AI proxy.
 * The API key is included in the Authorization header, not in the body.
 */
export interface ProxyRequest {
  /** Request body to forward to the AI provider (chat completions payload) */
  body: string;
  /** HTTP headers to forward (Authorization is added by the browser) */
  headers: Record<string, string>;
  /** HTTP method (typically POST) */
  method: string;
  /** Whether to stream the response (SSE) */
  stream: boolean;
  /** Full target URL at the AI provider, e.g., "https://api.openai.com/v1/chat/completions" */
  targetUrl: string;
}
