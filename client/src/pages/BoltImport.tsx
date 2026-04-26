import { AlertTriangle, Archive, Link as LinkIcon, Zap } from 'lucide-react';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function BoltImport() {
  return (
    <PageShell>
      <div className="space-y-6">
        <PageHeader
          title="Import from Bolt"
          description="Bolt import is not available in the current backend."
          actions={<Badge variant="outline">Unavailable</Badge>}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Current Status
            </CardTitle>
            <CardDescription>
              The backend service for Bolt imports currently returns a non-active availability state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="h-4 w-4" />
                  <p className="text-sm font-medium">Import by URL</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Not active. No real project ingestion is executed from Bolt URLs.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Archive className="h-4 w-4" />
                  <p className="text-sm font-medium">Import by Archive</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Not active. Archive uploads are not converted into real projects yet.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4" />
                <p className="text-sm font-medium">Platform Contract</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This page now reflects the real service state instead of exposing disabled pseudo-actions.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" disabled data-testid="button-bolt-import-unavailable">
            Bolt Import Unavailable
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
