import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Camera, Download, Trash2, ImageOff, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface ScreenshotsPanelProps {
  projectId: number;
}

interface Screenshot {
  id: number;
  projectId: number;
  title?: string;
  name?: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  deviceType?: string;
  createdAt?: string;
}

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return format(date, 'PP');
  } catch {
    return '';
  }
}

export function ScreenshotsPanel({ projectId }: ScreenshotsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [screenshotTitle, setScreenshotTitle] = useState('');
  const [screenshotDescription, setScreenshotDescription] = useState('');
  const [deviceType, setDeviceType] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [fullPage, setFullPage] = useState(false);

  const { data: screenshots, isLoading, isError, error } = useQuery<Screenshot[]>({
    queryKey: ['/api/screenshots', projectId],
    queryFn: () => apiRequest<Screenshot[]>('GET', `/api/screenshots/${projectId}`),
  });

  const captureScreenshotMutation = useMutation({
    mutationFn: () =>
      apiRequest<Screenshot>('POST', `/api/screenshots/${projectId}/capture`, {
        title: screenshotTitle || undefined,
        description: screenshotDescription || undefined,
        deviceType,
        fullPage,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screenshots', projectId] });
      toast({
        title: 'Screenshot captured',
        description: 'Project preview has been saved',
      });
      setScreenshotTitle('');
      setScreenshotDescription('');
      setFullPage(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Capture failed',
        description: error?.message || 'Could not capture screenshot',
        variant: 'destructive',
      });
    },
  });

  const deleteScreenshotMutation = useMutation({
    mutationFn: (screenshotId: number) =>
      apiRequest<{ success: boolean }>('DELETE', `/api/screenshots/${screenshotId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screenshots', projectId] });
      toast({
        title: 'Screenshot deleted',
        description: 'The screenshot has been removed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error?.message || 'Could not delete screenshot',
        variant: 'destructive',
      });
    },
  });

  const items = screenshots ?? [];

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-6">
        <h3 className="text-[15px] font-semibold mb-2">Capture Screenshot</h3>
        <label htmlFor="screenshot-title" className="sr-only">Screenshot title</label>
        <input
          id="screenshot-title"
          type="text"
          placeholder="Screenshot title (optional)"
          value={screenshotTitle}
          onChange={(e) => setScreenshotTitle(e.target.value)}
          className="w-full p-2 mb-2 border rounded"
          aria-label="Screenshot title"
        />
        <label htmlFor="screenshot-description" className="sr-only">Screenshot description</label>
        <textarea
          id="screenshot-description"
          placeholder="Description (optional)"
          value={screenshotDescription}
          onChange={(e) => setScreenshotDescription(e.target.value)}
          className="w-full p-2 mb-2 border rounded h-20"
          aria-label="Screenshot description"
        />
        <label htmlFor="screenshot-device" className="sr-only">Device type</label>
        <select
          id="screenshot-device"
          value={deviceType}
          onChange={(e) => setDeviceType(e.target.value as 'desktop' | 'tablet' | 'mobile')}
          className="w-full p-2 mb-2 border rounded"
          aria-label="Device type"
        >
          <option value="desktop">Desktop (1920×1080)</option>
          <option value="tablet">Tablet (1024×768)</option>
          <option value="mobile">Mobile (390×844)</option>
        </select>
        <label className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={fullPage}
            onChange={(e) => setFullPage(e.target.checked)}
            className="h-4 w-4"
          />
          Capture full page
        </label>
        <Button
          onClick={() => captureScreenshotMutation.mutate(undefined)}
          disabled={captureScreenshotMutation.isPending}
          className="w-full"
        >
          <Camera className="h-4 w-4 mr-2" />
          {captureScreenshotMutation.isPending ? 'Capturing…' : 'Capture Screenshot'}
        </Button>
      </div>

      <div>
        <h3 className="text-[15px] font-semibold mb-2">Screenshots Gallery</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading screenshots…</p>
        ) : isError ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {((error as Error | undefined)?.message) || 'Could not load screenshots'}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <ImageOff className="h-8 w-8 mb-2 opacity-60" />
            <p className="text-sm font-medium">No screenshots yet</p>
            <p className="text-xs mt-1">Capture a snapshot of your preview to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((screenshot) => {
              const label = screenshot.title || screenshot.name || `Screenshot ${screenshot.id}`;
              const dateLabel = formatDate(screenshot.createdAt);
              return (
                <Card key={screenshot.id} className="overflow-hidden">
                  <img
                    src={screenshot.thumbnailUrl || screenshot.imageUrl}
                    alt={label}
                    className="w-full h-32 object-cover bg-muted"
                  />
                  <div className="p-2">
                    <h4 className="font-medium text-[13px] truncate">{label}</h4>
                    {screenshot.description && (
                      <p className="text-[11px] text-muted-foreground truncate">{screenshot.description}</p>
                    )}
                    {dateLabel && (
                      <p className="text-[11px] text-muted-foreground mt-1">{dateLabel}</p>
                    )}
                    <div className="mt-2 flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(screenshot.imageUrl, '_blank', 'noopener')}
                        aria-label="Open screenshot"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(`/api/screenshots/${screenshot.id}/download`, '_blank', 'noopener')
                        }
                        aria-label="Download screenshot"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteScreenshotMutation.mutate(screenshot.id)}
                        disabled={deleteScreenshotMutation.isPending}
                        aria-label="Delete screenshot"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
