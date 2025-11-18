/**
 * Enterprise Testing Infrastructure
 * Fortune 500-grade testing utilities and helpers
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { IDEProvider } from '@/components/providers/IDEProvider';

// ============================================================================
// TEST PROVIDERS
// ============================================================================

interface TestProvidersProps {
  children: ReactNode;
  projectId?: string;
}

/**
 * Wrapper for all tests with necessary providers
 */
export function TestProviders({ children, projectId = 'test-project' }: TestProvidersProps) {
  return (
    <IDEProvider projectId={projectId}>
      {children}
    </IDEProvider>
  );
}

// ============================================================================
// CUSTOM RENDER
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  projectId?: string;
}

/**
 * Custom render function with all providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult {
  const { projectId, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders projectId={projectId}>{children}</TestProviders>
    ),
    ...renderOptions,
  });
}

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Create mock file object
 */
export function createMockFile(overrides?: Partial<File>): File {
  const file = new File(['test content'], 'test.txt', {
    type: 'text/plain',
  });

  return Object.assign(file, overrides);
}

/**
 * Create mock project
 */
export interface MockProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export function createMockProject(overrides?: Partial<MockProject>): MockProject {
  return {
    id: 'test-project-1',
    name: 'Test Project',
    description: 'A test project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock user
 */
export interface MockUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
    ...overrides,
  };
}

/**
 * Create mock file tree node
 */
export interface MockFileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: MockFileNode[];
}

export function createMockFileNode(overrides?: Partial<MockFileNode>): MockFileNode {
  return {
    id: 'file-1',
    name: 'test.txt',
    type: 'file',
    path: '/test.txt',
    ...overrides,
  };
}

// ============================================================================
// MOCK API RESPONSES
// ============================================================================

/**
 * Mock fetch response
 */
export function createMockResponse<T>(
  data: T,
  options?: ResponseInit
): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
}

/**
 * Mock error response
 */
export function createMockErrorResponse(
  message: string,
  status: number = 500
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await wait(50);
  }
}

/**
 * Mock localStorage
 */
export function mockLocalStorage(): Storage {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    length: Object.keys(store).length,
  };
}

/**
 * Mock window.matchMedia
 */
export function mockMatchMedia(matches: boolean = false): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

/**
 * Mock IntersectionObserver
 */
export function mockIntersectionObserver(): void {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as any;
}

/**
 * Mock ResizeObserver
 */
export function mockResizeObserver(): void {
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;
}

// ============================================================================
// PERFORMANCE TESTING
// ============================================================================

/**
 * Measure component render time
 */
export async function measureRenderTime(
  renderFn: () => void,
  iterations: number = 100
): Promise<number> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    times.push(end - start);
  }

  return times.reduce((a, b) => a + b, 0) / times.length;
}

/**
 * Check for memory leaks
 */
export async function checkMemoryLeaks(
  setupFn: () => void,
  cleanupFn: () => void,
  iterations: number = 100
): Promise<boolean> {
  if (!performance.memory) {
    console.warn('Performance.memory not available');
    return true;
  }

  const initialMemory = (performance as any).memory.usedJSHeapSize;

  for (let i = 0; i < iterations; i++) {
    setupFn();
    cleanupFn();
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  await wait(1000);

  const finalMemory = (performance as any).memory.usedJSHeapSize;
  const memoryIncrease = finalMemory - initialMemory;

  // Allow for some memory increase (less than 10MB)
  return memoryIncrease < 10 * 1024 * 1024;
}

// ============================================================================
// ACCESSIBILITY TESTING
// ============================================================================

/**
 * Check for accessibility violations
 */
export function checkA11y(element: HTMLElement): {
  violations: string[];
  warnings: string[];
} {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check for alt text on images
  const images = element.querySelectorAll('img');
  images.forEach((img) => {
    if (!img.alt) {
      violations.push(`Image missing alt text: ${img.src}`);
    }
  });

  // Check for form labels
  const inputs = element.querySelectorAll('input, textarea, select');
  inputs.forEach((input) => {
    const id = input.getAttribute('id');
    if (id) {
      const label = element.querySelector(`label[for="${id}"]`);
      if (!label && !input.getAttribute('aria-label')) {
        violations.push(`Input missing label: ${id}`);
      }
    }
  });

  // Check for button text
  const buttons = element.querySelectorAll('button');
  buttons.forEach((button) => {
    if (!button.textContent?.trim() && !button.getAttribute('aria-label')) {
      violations.push('Button missing text or aria-label');
    }
  });

  // Check for heading hierarchy
  const headings = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let previousLevel = 0;
  headings.forEach((heading) => {
    const level = parseInt(heading.tagName[1]);
    if (level > previousLevel + 1) {
      warnings.push(`Heading level skipped: ${heading.tagName}`);
    }
    previousLevel = level;
  });

  return { violations, warnings };
}

// ============================================================================
// SNAPSHOT TESTING
// ============================================================================

/**
 * Normalize snapshot for consistent testing
 */
export function normalizeSnapshot(html: string): string {
  return html
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/<!--.*?-->/g, '') // Remove comments
    .replace(/data-testid="[^"]*"/g, '') // Remove test IDs
    .trim();
}

// ============================================================================
// EXPORTS
// ============================================================================

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

export default {
  TestProviders,
  renderWithProviders,
  createMockFile,
  createMockProject,
  createMockUser,
  createMockFileNode,
  createMockResponse,
  createMockErrorResponse,
  wait,
  waitFor,
  mockLocalStorage,
  mockMatchMedia,
  mockIntersectionObserver,
  mockResizeObserver,
  measureRenderTime,
  checkMemoryLeaks,
  checkA11y,
  normalizeSnapshot,
};
