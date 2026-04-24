import { useMemo } from 'react';
import { Package } from 'lucide-react';
import { PageShell, PageHeader } from '@/components/layout/PageShell';
import { ExtensionsMarketplace } from '@/components/ExtensionsMarketplace';

function getProjectIdFromQuery(): number | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const params = new URLSearchParams(window.location.search);
  const raw = params.get('projectId');
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export default function ExtensionsPage() {
  const projectId = useMemo(() => getProjectIdFromQuery(), []);

  return (
    <PageShell>
      <div className="min-h-screen bg-background -mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8 px-4 pt-4 pb-8 md:px-6 md:pt-6 lg:px-8 lg:pt-8">
        <PageHeader
          title="Extensions Marketplace"
          description="Browse and manage project extensions with the same backend and state as the IDE."
          icon={Package}
        />

        <div className="mt-6">
          <ExtensionsMarketplace projectId={projectId} className="min-h-[70vh]" />
        </div>
      </div>
    </PageShell>
  );
}
