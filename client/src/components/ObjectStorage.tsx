import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive } from 'lucide-react';
import { useLocation } from 'wouter';

export function ObjectStorage() {
  const [, navigate] = useLocation();
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <HardDrive className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Object Storage</CardTitle>
              <CardDescription>
                Project-scoped object storage backed by Replit GCS or S3
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Storage is managed per-project. Select a project to browse and manage its files.
          </p>
          <Button onClick={() => navigate('/object-storage')}>
            Open Object Storage
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
