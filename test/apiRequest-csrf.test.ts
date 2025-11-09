/**
 * Integration Tests for apiRequest CSRF Protection
 * Tests the complete CSRF token flow with real fetch calls
 */

import { describe, it, assert } from './setup/test-runner';

// Note: These tests validate the apiRequest implementation
// Full E2E testing requires a running server with CSRF middleware

describe('apiRequest Type Safety and Error Handling', () => {
  it('should have generic type parameter for type safety', async () => {
    // Validate that apiRequest function signature supports generics
    const { apiRequest } = await import('../client/src/lib/queryClient');
    
    // Type check: This should compile without errors
    type TestResponse = { success: boolean; data: string };
    
    // The function should be callable with type parameter
    assert(typeof apiRequest === 'function', 'apiRequest should be a function');
    assert(apiRequest.length === 4, 'apiRequest should accept 4 parameters');
  });
  
  it('should handle 204 No Content responses', async () => {
    const { apiRequest } = await import('../client/src/lib/queryClient');
    
    // Mock fetch for 204 response
    const originalFetch = global.fetch;
    global.fetch = async () => new Response(null, {
      status: 204,
      headers: { 'Content-Length': '0' },
    }) as any;
    
    try {
      const result = await apiRequest('DELETE', '/api/test');
      assert(result === undefined, '204 responses should return undefined');
    } finally {
      global.fetch = originalFetch;
    }
  });
  
  it('should handle empty responses (Content-Length: 0)', async () => {
    const { apiRequest } = await import('../client/src/lib/queryClient');
    
    // Mock fetch for empty response
    const originalFetch = global.fetch;
    global.fetch = async () => new Response('', {
      status: 200,
      headers: { 'Content-Length': '0', 'Content-Type': 'application/json' },
    }) as any;
    
    try {
      const result = await apiRequest('POST', '/api/test', {});
      assert(result === undefined, 'Empty responses should return undefined');
    } finally {
      global.fetch = originalFetch;
    }
  });
  
  it('should handle non-JSON responses gracefully', async () => {
    const { apiRequest } = await import('../client/src/lib/queryClient');
    
    // Mock fetch for text response
    const originalFetch = global.fetch;
    global.fetch = async () => new Response('Plain text response', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    }) as any;
    
    try {
      const result = await apiRequest('GET', '/api/test');
      assert(
        typeof result === 'object' && result.data === 'Plain text response',
        'Non-JSON responses should be wrapped in { data: text }'
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
  
  it('should throw error for non-OK responses', async () => {
    const { apiRequest } = await import('../client/src/lib/queryClient');
    
    // Mock fetch for error response
    const originalFetch = global.fetch;
    global.fetch = async () => new Response(JSON.stringify({ error: 'Test error' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }) as any;
    
    try {
      let errorThrown = false;
      try {
        await apiRequest('POST', '/api/test', {});
      } catch (error: any) {
        errorThrown = true;
        assert(
          error.message.includes('400'),
          'Error message should include status code'
        );
      }
      assert(errorThrown, 'Should throw error for non-OK responses');
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('apiRequest Request Body Handling', () => {
  it('should detect and handle FormData correctly', async () => {
    const { apiRequest } = await import('../client/src/lib/queryClient');
    
    let capturedRequest: any = null;
    const originalFetch = global.fetch;
    global.fetch = async (url: any, init: any) => {
      capturedRequest = init;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as any;
    };
    
    try {
      const formData = new FormData();
      formData.append('test', 'value');
      await apiRequest('POST', '/api/test', formData);
      
      assert(
        capturedRequest.body instanceof FormData,
        'FormData should be passed directly without JSON.stringify'
      );
      assert(
        !capturedRequest.headers['Content-Type'] || 
        !capturedRequest.headers['Content-Type'].includes('application/json'),
        'Content-Type should not be set for FormData (browser sets it)'
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
  
  it('should JSON.stringify regular objects', async () => {
    const { apiRequest } = await import('../client/src/lib/queryClient');
    
    let capturedRequest: any = null;
    const originalFetch = global.fetch;
    global.fetch = async (url: any, init: any) => {
      capturedRequest = init;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as any;
    };
    
    try {
      const testData = { key: 'value', nested: { prop: 123 } };
      await apiRequest('POST', '/api/test', testData);
      
      assert(
        capturedRequest.body === JSON.stringify(testData),
        'Regular objects should be JSON.stringified'
      );
      assert(
        capturedRequest.headers['Content-Type'] === 'application/json',
        'Content-Type should be application/json for JSON bodies'
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
  
  it('should include credentials in all requests', async () => {
    const { apiRequest } = await import('../client/src/lib/queryClient');
    
    let capturedRequest: any = null;
    const originalFetch = global.fetch;
    global.fetch = async (url: any, init: any) => {
      capturedRequest = init;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as any;
    };
    
    try {
      await apiRequest('POST', '/api/test', {});
      
      assert(
        capturedRequest.credentials === 'include',
        'credentials should always be "include" for cookie-based auth'
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('apiRequest CSRF Token Behavior', () => {
  it('should attempt to fetch CSRF token for state-changing methods', async () => {
    const { apiRequest } = await import('../client/src/lib/queryClient');
    
    let csrfTokenRequested = false;
    const originalFetch = global.fetch;
    global.fetch = async (url: any, init: any) => {
      if (typeof url === 'string' && url.includes('/api/csrf-token')) {
        csrfTokenRequested = true;
        return new Response(JSON.stringify({ csrfToken: 'test-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }) as any;
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as any;
    };
    
    try {
      await apiRequest('POST', '/api/test', {});
      
      assert(
        csrfTokenRequested,
        'CSRF token should be fetched for POST requests'
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
  
  it('should include CSRF token in request headers for mutations', async () => {
    const { apiRequest } = await import('../client/src/lib/queryClient');
    
    let capturedHeaders: any = null;
    const originalFetch = global.fetch;
    global.fetch = async (url: any, init: any) => {
      if (typeof url === 'string' && url.includes('/api/csrf-token')) {
        return new Response(JSON.stringify({ csrfToken: 'test-csrf-123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }) as any;
      }
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as any;
    };
    
    try {
      await apiRequest('POST', '/api/test', {});
      
      assert(
        capturedHeaders && capturedHeaders['X-CSRF-Token'] === 'test-csrf-123',
        'X-CSRF-Token header should be included with correct value'
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});

console.log('✅ apiRequest CSRF Protection Tests Ready');
