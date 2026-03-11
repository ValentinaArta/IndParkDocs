import { vi } from 'vitest';

// Mock responses — override per test
export const mockApiResponses: Record<string, unknown> = {};

// Mock fetch globally
export function setupFetchMock() {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();

    // Auth endpoints
    if (url.includes('/api/auth/login')) {
      return new Response(JSON.stringify({ accessToken: 'test-token', refreshToken: 'test-refresh' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check mock responses
    for (const [pattern, data] of Object.entries(mockApiResponses)) {
      if (url.includes(pattern)) {
        return new Response(JSON.stringify(data), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Default: 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  return () => { globalThis.fetch = originalFetch; };
}
