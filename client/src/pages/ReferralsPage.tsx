import { Gift, Info, Mail, Megaphone } from 'lucide-react';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ReferralsPage() {
  return (
    <PageShell>
      <div className="space-y-6" data-testid="page-referrals">
        <PageHeader
          title="Referrals"
          description="The referral program is not active on this platform at the moment."
          actions={<Badge variant="outline">Inactive</Badge>}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Program Status
            </CardTitle>
            <CardDescription>
              Referral rewards, links, credits, and leaderboards are currently not enabled in production.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">
                No referral link has been issued for this account, and no referral ledger is being tracked by the backend.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium">Referral Links</p>
                <p className="text-sm text-muted-foreground mt-1">Not generated</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium">Credits</p>
                <p className="text-sm text-muted-foreground mt-1">No referral credit system active</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium">Leaderboard</p>
                <p className="text-sm text-muted-foreground mt-1">Not available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              What Exists Today
            </CardTitle>
            <CardDescription>
              If you need growth workflows now, use channels that already exist in the product and operations stack.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4" />
                <p className="text-sm font-medium">Direct Outreach</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Invite collaborators directly to teams and projects from the existing sharing flows.
              </p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="h-4 w-4" />
                <p className="text-sm font-medium">Announcements</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Launches, campaigns, and attribution still need to be handled outside this page until a real referral service ships.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button variant="outline" disabled data-testid="button-referrals-unavailable">
            Referral Actions Unavailable
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
