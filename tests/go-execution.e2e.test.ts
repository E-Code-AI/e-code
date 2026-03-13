import { describe, it, expect } from 'vitest';
import { CodeExecutor } from '../server/execution/executor';
import { languageConfigs } from '../server/runtimes/languages';

const codeExecutor = new CodeExecutor();

describe('Go Execution via Unified Executor', () => {
  it('should have Go registered in language configurations', () => {
    expect(languageConfigs.go).toBeDefined();
    expect(languageConfigs.go.name).toBe('go');
    expect(languageConfigs.go.displayName).toBe('Go');
    expect(languageConfigs.go.runCommand).toBe('go run main.go');
    expect(languageConfigs.go.defaultFile).toBe('main.go');
    expect(languageConfigs.go.fileExtensions).toContain('.go');
    expect(languageConfigs.go.defaultContent).toContain('fmt.Println');
  });

  it('should accept Go as a valid execution language', async () => {
    const goCode = `package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}`;

    const result = await codeExecutor.execute('go', goCode, { timeout: 10000 });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('exitCode');
    expect(result).toHaveProperty('executionTime');
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
    expect(result.output).not.toContain('not_implemented');
    if (result.error) {
      expect(result.error).not.toContain('not_implemented');
    }
  }, 30000);

  it('should accept golang alias and normalize to go', async () => {
    const goCode = `package main

import "fmt"

func main() {
	fmt.Println("Hello from Go!")
}`;

    const result = await codeExecutor.execute('golang', goCode, { timeout: 10000 });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('output');
    expect(result).toHaveProperty('exitCode');
    expect(result.output).not.toContain('not_implemented');
    if (result.error) {
      expect(result.error).not.toContain('Unsupported language');
      expect(result.error).not.toContain('not_implemented');
    }
  }, 30000);

  it('should NOT return not_implemented for Go language', async () => {
    const goCode = `package main

import "fmt"

func main() {
	fmt.Println("Real execution")
}`;

    const result = await codeExecutor.execute('go', goCode, { timeout: 10000 });

    expect(result.output).not.toContain('not_implemented');
    if (result.error) {
      expect(result.error).not.toContain('not_implemented');
      expect(result.error).not.toContain('mock');
    }
  }, 30000);

  it('should validate Go as an allowed language (not rejected as unsupported)', async () => {
    const result = await codeExecutor.execute('go', 'package main', { timeout: 5000 });

    if (result.error) {
      expect(result.error).not.toContain('Unsupported language');
    }
  }, 15000);
});

describe('Go Sidecar Removal Verification', () => {
  it('should not have go-runtime service files', async () => {
    const fs = await import('fs');
    expect(fs.existsSync('services/go-runtime/main.go')).toBe(false);
    expect(fs.existsSync('services/go-runtime/server.js')).toBe(false);
    expect(fs.existsSync('services/go-runtime')).toBe(false);
  });

  it('should not reference go-runtime in polyglot coordinator', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('server/services/polyglot-coordinator.ts', 'utf-8');
    expect(content).not.toContain('go-runtime');
    expect(content).not.toContain('GO_RUNTIME');
  });

  it('should not reference go-runtime in health checks', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('server/routes/health.ts', 'utf-8');
    expect(content).not.toContain('Go Runtime');
    expect(content).not.toContain('go-runtime');
  });

  it('should not reference go-runtime in kubernetes configs', async () => {
    const fs = await import('fs');
    const files = [
      'kubernetes/app-deployment.yaml',
      'kubernetes/services.yaml',
      'kubernetes/ingress.yaml',
      'kubernetes/configmap.yaml',
      'kubernetes/autoscaling.yaml'
    ];
    for (const file of files) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('go-runtime');
        expect(content).not.toContain('GO_RUNTIME');
      }
    }
  });

  it('should not have polyglot-container-proxy or polyglot-integration files', async () => {
    const fs = await import('fs');
    expect(fs.existsSync('server/services/polyglot-container-proxy.ts')).toBe(false);
    expect(fs.existsSync('server/services/polyglot-integration.ts')).toBe(false);
    expect(fs.existsSync('server/polyglot-services.ts.deprecated')).toBe(false);
  });
});
