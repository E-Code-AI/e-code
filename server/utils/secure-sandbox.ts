import { VM, VMScript } from 'vm2';

export interface SandboxOptions {
  timeout?: number;
  sandbox?: Record<string, any>;
}

export class SecureSandbox {
  private static readonly DEFAULT_TIMEOUT = 1000;

  static evaluateExpression<T = any>(
    expression: string,
    context: Record<string, any>,
    options: SandboxOptions = {}
  ): T {
    const vm = new VM({
      timeout: options.timeout || this.DEFAULT_TIMEOUT,
      sandbox: { ...context, ...options.sandbox },
      eval: false,
      wasm: false,
    });

    try {
      return vm.run(expression);
    } catch (error) {
      console.warn('[SecureSandbox] Expression evaluation failed:', error);
      throw error;
    }
  }

  static evaluateCondition(
    condition: string,
    contextName: string,
    contextValue: Record<string, any>,
    options: SandboxOptions = {}
  ): boolean {
    const vm = new VM({
      timeout: options.timeout || this.DEFAULT_TIMEOUT,
      sandbox: { [contextName]: contextValue, ...options.sandbox },
      eval: false,
      wasm: false,
    });

    try {
      const wrappedCondition = `(function(${contextName}) { return !!(${condition}) })(${contextName})`;
      return vm.run(wrappedCondition);
    } catch (error) {
      console.warn('[SecureSandbox] Condition evaluation failed:', error);
      return false;
    }
  }

  static evaluateFakerExpression(
    generatorExpression: string,
    fakerInstance: any,
    options: SandboxOptions = {}
  ): any {
    const vm = new VM({
      timeout: options.timeout || this.DEFAULT_TIMEOUT,
      sandbox: { faker: fakerInstance, ...options.sandbox },
      eval: false,
      wasm: false,
    });

    try {
      return vm.run(generatorExpression);
    } catch (error) {
      console.warn('[SecureSandbox] Faker expression failed:', error);
      return null;
    }
  }

  static async evaluateAsyncFunction<T = any>(
    code: string,
    contextName: string,
    contextValue: Record<string, any>,
    options: SandboxOptions = {}
  ): Promise<T> {
    const vm = new VM({
      timeout: options.timeout || 5000,
      sandbox: { [contextName]: contextValue, ...options.sandbox },
      eval: false,
      wasm: false,
    });

    try {
      const asyncWrapper = `
        (async function(${contextName}) {
          ${code}
        })(${contextName})
      `;
      return await vm.run(asyncWrapper);
    } catch (error) {
      console.warn('[SecureSandbox] Async function evaluation failed:', error);
      throw error;
    }
  }

  static evaluatePlaywrightTest(
    testScript: string,
    page: any,
    options: SandboxOptions = {}
  ): any {
    const vm = new VM({
      timeout: options.timeout || 30000,
      sandbox: { page, ...options.sandbox },
      eval: false,
      wasm: false,
    });

    try {
      const wrappedScript = `(async function(page) { ${testScript} })(page)`;
      return vm.run(wrappedScript);
    } catch (error) {
      console.warn('[SecureSandbox] Playwright test evaluation failed:', error);
      throw error;
    }
  }
}
