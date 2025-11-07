// CORS security configuration tests
import { getAllowedOrigins, validateProductionCors, verifyCorsConfiguration } from '../server/middleware/cors-config';

describe('CORS Security Tests', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });
  
  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  describe('Production CORS Configuration', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });
    
    it('should throw error in production when no origins are configured', () => {
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.FRONTEND_URL;
      delete process.env.APP_URL;
      
      expect(() => {
        validateProductionCors([]);
      }).toThrow('CORS configuration error: No allowed origins configured for production');
    });
    
    it('should accept explicit origins in production', () => {
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://api.example.com';
      
      const origins = getAllowedOrigins();
      expect(origins).toContain('https://app.example.com');
      expect(origins).toContain('https://api.example.com');
      
      // Should not throw
      expect(() => {
        validateProductionCors(origins);
      }).not.toThrow();
    });
    
    it('should use FRONTEND_URL if configured', () => {
      process.env.FRONTEND_URL = 'https://frontend.example.com';
      
      const origins = getAllowedOrigins();
      expect(origins).toContain('https://frontend.example.com');
    });
    
    it('should use APP_URL if configured', () => {
      process.env.APP_URL = 'https://myapp.example.com';
      
      const origins = getAllowedOrigins();
      expect(origins).toContain('https://myapp.example.com');
    });
    
    it('should not include localhost in production', () => {
      process.env.ALLOWED_ORIGINS = 'https://app.example.com';
      
      const origins = getAllowedOrigins();
      expect(origins).not.toContain('http://localhost:3000');
      expect(origins).not.toContain('http://localhost:5000');
    });
    
    it('should warn about insecure HTTP origins in production', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      process.env.ALLOWED_ORIGINS = 'http://insecure.example.com,https://secure.example.com';
      
      const origins = getAllowedOrigins();
      validateProductionCors(origins);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Insecure HTTP origin in production: http://insecure.example.com')
      );
      
      consoleSpy.mockRestore();
    });
    
    it('should remove duplicate origins', () => {
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://app.example.com';
      process.env.FRONTEND_URL = 'https://app.example.com';
      
      const origins = getAllowedOrigins();
      const uniqueOrigins = origins.filter(o => o === 'https://app.example.com');
      expect(uniqueOrigins).toHaveLength(1);
    });
  });
  
  describe('Development CORS Configuration', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });
    
    it('should include localhost origins in development', () => {
      const origins = getAllowedOrigins();
      
      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('http://localhost:5000');
      expect(origins).toContain('http://localhost:5173');
      expect(origins).toContain('http://127.0.0.1:3000');
    });
    
    it('should not throw in development without explicit origins', () => {
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.FRONTEND_URL;
      delete process.env.APP_URL;
      
      expect(() => {
        validateProductionCors([]);
      }).not.toThrow();
    });
    
    it('should combine configured origins with localhost in development', () => {
      process.env.ALLOWED_ORIGINS = 'https://dev.example.com';
      
      const origins = getAllowedOrigins();
      expect(origins).toContain('https://dev.example.com');
      expect(origins).toContain('http://localhost:3000');
    });
  });
  
  describe('CORS Verification Health Check', () => {
    it('should report invalid configuration in production without origins', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.FRONTEND_URL;
      delete process.env.APP_URL;
      
      const result = verifyCorsConfiguration();
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('No allowed origins configured for production');
    });
    
    it('should report valid configuration in production with origins', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com';
      
      const result = verifyCorsConfiguration();
      expect(result.isValid).toBe(true);
      expect(result.message).toContain('CORS properly configured for production');
      expect(result.origins).toContain('https://app.example.com');
    });
    
    it('should report valid configuration in development', () => {
      process.env.NODE_ENV = 'development';
      
      const result = verifyCorsConfiguration();
      expect(result.isValid).toBe(true);
      expect(result.message).toContain('CORS configured for development');
    });
  });
  
  describe('Origin Parsing', () => {
    it('should parse comma-separated origins correctly', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com, https://api.example.com , https://admin.example.com';
      
      const origins = getAllowedOrigins();
      expect(origins).toContain('https://app.example.com');
      expect(origins).toContain('https://api.example.com');
      expect(origins).toContain('https://admin.example.com');
    });
    
    it('should filter empty strings from origins list', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,,,https://api.example.com,';
      
      const origins = getAllowedOrigins();
      expect(origins).toHaveLength(2);
      expect(origins).toContain('https://app.example.com');
      expect(origins).toContain('https://api.example.com');
    });
    
    it('should handle origins with ports', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com:3000,https://api.example.com:8080';
      
      const origins = getAllowedOrigins();
      expect(origins).toContain('https://app.example.com:3000');
      expect(origins).toContain('https://api.example.com:8080');
    });
  });
});

// Export for test runner
export default describe;