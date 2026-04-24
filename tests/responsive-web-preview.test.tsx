// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequestMock = vi.fn();

vi.mock('@/lib/queryClient', () => ({
  apiRequest: (...args: any[]) => apiRequestMock(...args),
}));

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => false,
}));

vi.mock('@/stores/autonomousBuildStore', () => ({
  useAutonomousBuildStore: () => ({
    phase: null,
    isActive: false,
    progress: 0,
  }),
}));

function renderPreview() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <React.Suspense fallback={null}>
        <Preview projectId="123" />
      </React.Suspense>
    </QueryClientProvider>
  );
}

let Preview: typeof import('../client/src/components/editor/ResponsiveWebPreview').ResponsiveWebPreview;

describe('ResponsiveWebPreview', () => {
  beforeEach(async () => {
    apiRequestMock.mockReset();
    ({ ResponsiveWebPreview: Preview } = await import('../client/src/components/editor/ResponsiveWebPreview'));
  });

  it('renders the preview iframe when a preview URL is available', async () => {
    apiRequestMock.mockResolvedValue({
      previewUrl: '/preview/123/',
      status: 'running',
    });

    renderPreview();

    const iframe = await screen.findByTitle('Preview for project 123');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', expect.stringContaining('/preview/123/'));
  });

  it('auto-starts preview when the backend reports a stopped runnable project', async () => {
    apiRequestMock.mockImplementation((method: string) => {
      if (method === 'GET') {
        return Promise.resolve({ previewUrl: null, status: 'stopped' });
      }
      if (method === 'POST') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({});
    });

    renderPreview();

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith('POST', '/api/preview/projects/123/preview/start', {});
    });
  });
});
