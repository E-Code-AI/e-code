import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Trash2, User } from "lucide-react";
import { useLocation } from "wouter";
import { PageHeader, PageShell, PageShellLoading } from "@/components/layout/PageShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UserProfile {
  id: string;
  username: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  website?: string | null;
}

interface BillingSummary {
  plan: string;
  monthlyCost: number;
  nextBillingDate: string;
  usage: {
    compute: { used: number; limit: number };
    storage: { used: number; limit: number };
    privateRepls: { used: number; limit: string };
  };
  paymentMethod: {
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  } | null;
}

export default function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    website: "",
  });

  const { data: me, isLoading: userLoading } = useQuery<UserProfile>({
    queryKey: ["/api/me"],
    enabled: !!user,
  });

  const { data: billingSummary, isLoading: billingLoading } = useQuery<BillingSummary>({
    queryKey: ["/api/user/billing-summary"],
    queryFn: async () => apiRequest("GET", "/api/user/billing-summary"),
    enabled: !!user,
  });

  useEffect(() => {
    if (me) {
      setFormData({
        displayName: me.displayName || "",
        bio: me.bio || "",
        website: me.website || "",
      });
    }
  }, [me]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!me?.id) throw new Error("No authenticated user");
      return apiRequest("PUT", `/api/user/${me.id}`, {
        displayName: formData.displayName,
        bio: formData.bio,
        website: formData.website,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Account updated", description: "Profile details saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update account", description: error.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!me?.id) throw new Error("No authenticated user");
      return apiRequest("DELETE", `/api/user/${me.id}`);
    },
    onSuccess: () => {
      toast({ title: "Account deleted", description: "Your account has been removed." });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete account", description: error.message, variant: "destructive" });
    },
  });

  if (!user) {
    navigate("/");
    return null;
  }

  if (userLoading || billingLoading) {
    return <PageShellLoading text="Loading account..." />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Account"
        description="Manage the account and billing data exposed by the current backend."
        icon={User}
        actions={(
          <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending} data-testid="button-save-account">
            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        )}
      />

      <Alert>
        <User className="h-4 w-4" />
        <AlertTitle>Real account scope</AlertTitle>
        <AlertDescription>
          This page is bound to the mounted user routes for profile update, billing summary, and account deletion. Password/email mutation flows that are not exposed by the backend are intentionally omitted.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Editable user fields persisted on your account record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={me?.username || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={me?.email || ""} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={formData.displayName}
                onChange={(event) => setFormData((prev) => ({ ...prev, displayName: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(event) => setFormData((prev) => ({ ...prev, website: event.target.value }))}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={5}
                value={formData.bio}
                onChange={(event) => setFormData((prev) => ({ ...prev, bio: event.target.value }))}
                placeholder="Tell people about yourself"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Billing
              </CardTitle>
              <CardDescription>Summary returned by the billing backend.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <Badge variant="secondary">{billingSummary?.plan || "Unknown"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly Cost</span>
                <span className="font-medium">${billingSummary?.monthlyCost || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Next Billing Date</span>
                <span className="text-sm font-medium">
                  {billingSummary?.nextBillingDate ? new Date(billingSummary.nextBillingDate).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium">Usage</p>
                <p className="text-xs text-muted-foreground">
                  Compute: {billingSummary?.usage.compute.used || 0} / {billingSummary?.usage.compute.limit || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Storage: {billingSummary?.usage.storage.used || 0} / {billingSummary?.usage.storage.limit || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Private Projects: {billingSummary?.usage.privateRepls.used || 0} / {billingSummary?.usage.privateRepls.limit || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Delete Account</CardTitle>
              <CardDescription>Permanently remove your account through the mounted user API.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setDeleteAccountOpen(true)} data-testid="button-delete-account">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>This action is permanent and will remove your user record.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccountOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteAccountMutation.mutate()} disabled={deleteAccountMutation.isPending}>
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
