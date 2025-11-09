/**
 * Comprehensive Unit Tests for apiRequest Helper
 * Tests CSRF token handling, type safety, error handling, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach } from './test-helpers';

// Mock fetch globally
let mockFetch: any;
let fetchCalls: any[] = [];

beforeEach(() => {
  fetchCalls = [];
  mockFetch = global.fetch;
  
  // Mock fetch implementation
  global.fetch = async (url: string | Request, init?: RequestInit) => {
    const callInfo = {
      url: typeof url === 'string' ? url : url.url,
      method: init?.method || 'GET',
      headers: init?.headers || {},
      body: init?.body,
      credentials: init?.credentials,
    };
    fetchCalls.push(callInfo);
    
    // Return mock responses based on URL
    if (callInfo.url === '/api/csrf-token') {
      return new Response(JSON.stringify({ csrfToken: 'test-csrf-token-123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (callInfo.url === '/api/test-success') {
      return new Response(JSON.stringify({ success: true, data: 'test-data' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (callInfo.url === '/api/test-204') {
      return new Response(null, {
        status: 204,
        headers: { 'Content-Length': '0' },
      });
    }
    
    if (callInfo.url === '/api/test-error') {
      return new Response(JSON.stringify({ error: 'Test error' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (callInfo.url === '/api/test-text') {
      return new Response('Plain text response', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    
    if (callInfo.url === '/api/test-empty') {
      return new Response('', {
        status: 200,
        headers: { 'Content-Length': '0' },
      });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
});

afterEach(() => {
  global.fetch = mockFetch;
  fetchCalls = [];
});

// Import apiRequest after mocking fetch
const importApiRequest = async () => {
  // Reset module cache to get fresh instance
  delete require.cache[require.resolve('../../client/src/lib/queryClient')];
  const { apiRequest } = await import('../../client/src/lib/queryClient');
  return apiRequest;
};

describe('apiRequest - CSRF Token Handling', () => {
  it('should automatically fetch CSRF token for POST requests', async () => {
    const apiRequest = await importApiRequest();
    
    await apiRequest('POST', '/api/test-success', { data: 'test' });
    
    // Should make 2 calls: 1 for CSRF token, 1 for actual request
    expect(fetchCalls.length).toBe(2);
    expect(fetchCalls[0].url).toBe('/api/csrf-token');
    expect(fetchCalls[1].url).toBe('/api/test-success');
    expect(fetchCalls[1].headers['X-CSRF-Token']).toBe('test-csrf-token-123');
  });
  
  it('should include CSRF token for PUT requests', async () => {
    const apiRequest = await importApiRequest();
    
    await apiRequest('PUT', '/api/test-success', { data: 'test' });
    
    expect(fetchCalls.length).toBe(2);
    expect(fetchCalls[1].headers['X-CSRF-Token']).toBe('test-csrf-token-123');
  });
  
  it('should include CSRF token for PATCH requests', async () => {
    const apiRequest = await importApiRequest();
    
    await apiRequest('PATCH', '/api/test-success', { data: 'test' });
    
    expect(fetchCalls.length).toBe(2);
    expect(fetchCalls[1].headers['X-CSRF-Token']).toBe('test-csrf-token-123');
  });
  
  it('should include CSRF token for DELETE requests', async () => {
    const apiRequest = await importApiRequest();
    
    await apiRequest('DELETE', '/api/test-success');
    
    expect(fetchCalls.length).toBe(2);
    expect(fetchCalls[1].headers['X-CSRF-Token']).toBe('test-csrf-token-123');
  });
  
  it('should cache CSRF token and not refetch for subsequent requests', async () => {
    const apiRequest = await importApiRequest();
    
    await apiRequest('POST', '/api/test-success', { data: 'test1' });
    await apiRequest('POST', '/api/test-success', { data: 'test2' });
    
    // Should make 3 calls: 1 CSRF fetch, 2 actual requests
    expect(fetchCalls.length).toBe(3);
    expect(fetchCalls.filter(c => c.url === '/api/csrf-token').length).toBe(1);
  });
});

describe('apiRequest - Request Body Handling', () => {
  it('should JSON.stringify regular objects', async () => {
    const apiRequest = await importApiRequest();
    
    await apiRequest('POST', '/api/test-success', { key: 'value' });
    
    const actualRequest = fetchCalls[1];
    expect(actualRequest.body).toBe(JSON.stringify({ key: 'value' }));
    expect(actualRequest.headers['Content-Type']).toBe('application/json');
  });
  
  it('should handle FormData without JSON.stringify', async () => {
    const apiRequest = await importApiRequest();
    
    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'test.txt');
    
    await apiRequest('POST', '/api/test-success', formData);
    
    const actualRequest = fetchCalls[1];
    expect(actualRequest.body).toBeInstanceOf(FormData);
    expect(actualRequest.headers['Content-Type']).toBeUndefined(); // Let browser set it
  });
  
  it('should handle undefined body', async () => {
    const apiRequest = await importApiRequest();
    
    await apiRequest('POST', '/api/test-success');
    
    const actualRequest = fetchCalls[1];
    expect(actualRequest.body).toBeUndefined();
  });
  
  it('should include credentials in all requests', async () => {
    const apiRequest = await importApiRequest();
    
    await apiRequest('POST', '/api/test-success', { data: 'test' });
    
    const actualRequest = fetchCalls[1];
    expect(actualRequest.credentials).toBe('include');
  });
});

describe('apiRequest - Response Handling', () => {
  it('should parse JSON responses correctly', async () => {
    const apiRequest = await importApiRequest();
    
    const result = await apiRequest('POST', '/api/test-success', { data: 'test' });
    
    expect(result).toEqual({ success: true, data: 'test-data' });
  });
  
  it('should handle 204 No Content responses', async () => {
    const apiRequest = await importApiRequest();
    
    const result = await apiRequest('DELETE', '/api/test-204');
    
    expect(result).toBeUndefined();
  });
  
  it('should handle empty responses (Content-Length: 0)', async () => {
    const apiRequest = await importApiRequest();
    
    const result = await apiRequest('POST', '/api/test-empty');
    
    expect(result).toBeUndefined();
  });
  
  it('should handle non-JSON responses gracefully', async () => {
    const apiRequest = await importApiRequest();
    
    const result = await apiRequest('GET', '/api/test-text');
    
    expect(result).toEqual({ data: 'Plain text response' });
  });
  
  it('should throw on error responses', async () => {
    const apiRequest = await importApiRequest();
    
    try {
      await apiRequest('POST', '/api/test-error', { data: 'test' });
      throw new Error('Should have thrown');
    } catch (error: any) {
      expect(error.message).toContain('400');
    }
  });
});

describe('apiRequest - Type Safety', () => {
  it('should support generic type parameter', async () => {
    const apiRequest = await importApiRequest();
    
    interface TestResponse {
      success: boolean;
      data: string;
    }
    
    const result = await apiRequest<TestResponse>('POST', '/api/test-success', { data: 'test' });
    
    // TypeScript should enforce this at compile time
    expect(result.success).toBe(true);
    expect(result.data).toBe('test-data');
  });
  
  it('should support void type for 204 responses', async () => {
    const apiRequest = await importApiRequest();
    
    const result = await apiRequest<void>('DELETE', '/api/test-204');
    
    expect(result).toBeUndefined();
  });
});

describe('apiRequest - Edge Cases', () => {
  it('should handle custom headers in options', async () => {
    const apiRequest = await importApiRequest();
    
    await apiRequest('POST', '/api/test-success', { data: 'test' }, {
      headers: { 'X-Custom-Header': 'custom-value' },
    });
    
    const actualRequest = fetchCalls[1];
    expect(actualRequest.headers['X-Custom-Header']).toBe('custom-value');
    expect(actualRequest.headers['X-CSRF-Token']).toBe('test-csrf-token-123'); // CSRF still included
  });
  
  it('should handle case-insensitive HTTP methods', async () => {
    const apiRequest = await importApiRequest();
    
    await apiRequest('post', '/api/test-success', { data: 'test' });
    
    // Should still fetch CSRF token for lowercase 'post'
    expect(fetchCalls.length).toBe(2);
    expect(fetchCalls[1].headers['X-CSRF-Token']).toBe('test-csrf-token-123');
  });
  
  it('should handle complex nested objects', async () => {
    const apiRequest = await importApiRequest();
    
    const complexData = {
      user: {
        name: 'Test User',
        meta: {
          tags: ['tag1', 'tag2'],
          settings: { theme: 'dark' },
        },
      },
    };
    
    await apiRequest('POST', '/api/test-success', complexData);
    
    const actualRequest = fetchCalls[1];
    expect(actualRequest.body).toBe(JSON.stringify(complexData));
  });
});

describe('apiRequest - Security', () => {
  it('should always include credentials for cookie-based auth', async () => {
    const apiRequest = await importApiRequest();
    
    await apiRequest('POST', '/api/test-success', { data: 'test' });
    
    const actualRequest = fetchCalls[1];
    expect(actualRequest.credentials).toBe('include');
  });
  
  it('should protect against CSRF attacks on state-changing requests', async () => {
    const apiRequest = await importApiRequest();
    
    const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    
    for (const method of methods) {
      fetchCalls = [];
      await apiRequest(method, '/api/test-success', { data: 'test' });
      
      const actualRequest = fetchCalls[1];
      expect(actualRequest.headers['X-CSRF-Token']).toBe('test-csrf-token-123');
    }
  });
  
  it('should handle CSRF token rotation from response headers', async () => {
    const apiRequest = await importApiRequest();
    
    // Mock a response with new CSRF token
    global.fetch = async (url: string | Request, init?: RequestInit) => {
      const callInfo = {
        url: typeof url === 'string' ? url : url.url,
        method: init?.method || 'GET',
        headers: init?.headers || {},
      };
      fetchCalls.push(callInfo);
      
      if (callInfo.url === '/api/csrf-token') {
        return new Response(JSON.stringify({ csrfToken: 'old-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'new-rotated-token',
        },
      });
    };
    
    await apiRequest('POST', '/api/test-success', { data: 'test' });
    await apiRequest('POST', '/api/test-success', { data: 'test2' });
    
    // Second request should use new rotated token
    expect(fetchCalls[2].headers['X-CSRF-Token']).toBe('new-rotated-token');
  });
});

// Export test suite for test runner
export default {
  name: 'apiRequest Helper Tests',
  tests: [
    'CSRF Token Handling',
    'Request Body Handling',
    'Response Handling',
    'Type Safety',
    'Edge Cases',
    'Security',
  ],
};
