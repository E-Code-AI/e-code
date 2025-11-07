import { lazy, Suspense } from 'react';
import { useParams } from 'wouter';
import { useDeviceType } from '@/hooks/use-media-query';
import { ECodeLoading } from '@/components/ECodeLoading';
import Editor from '@/pages/Editor';

const LazyTabletIDEView = lazy(() => import('@/components/tablet/LazyTabletIDEView').then(m => ({ default: m.LazyTabletIDEView })));
const MobileIDEView = lazy(() => import('@/components/mobile/MobileIDEView').then(m => ({ default: m.MobileIDEView })));

export default function ResponsiveEditorRoute() {
  const { id } = useParams();
  const deviceType = useDeviceType();

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Project ID is required</p>
      </div>
    );
  }

  if (deviceType === 'mobile') {
    return (
      <Suspense fallback={<ECodeLoading text="Loading mobile workspace..." />}>
        <MobileIDEView projectId={id} />
      </Suspense>
    );
  }

  if (deviceType === 'tablet') {
    return (
      <Suspense fallback={<ECodeLoading text="Loading tablet workspace..." />}>
        <LazyTabletIDEView projectId={id} />
      </Suspense>
    );
  }

  return <Editor projectId={id} />;
}
