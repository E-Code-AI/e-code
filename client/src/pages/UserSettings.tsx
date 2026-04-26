import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Moon, Monitor, Sun, Trash2, Upload, User } from "lucide-react";
import { useLocation } from "wouter";
import { PageHeader, PageShell, PageShellLoading } from "@/components/layout/PageShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useTheme } from "@/components/ThemeProvider";

interface UserProfile {
  id: string;
  username: string;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
}

export default function UserSettings() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    avatarUrl: "",
  });

  const { data: me, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/me"],
    enabled: !!user,
  });

  useEffect(() => {
    if (me) {
      setFormData({
        displayName: me.displayName || "",
        bio: me.bio || "",
        avatarUrl: me.avatarUrl || "",
      });
    }
  }, [me]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!me?.id) {
        throw new Error("No authenticated user");
      }

      return apiRequest("PUT", `/api/user/${me.id}`, {
        displayName: formData.displayName,
        bio: formData.bio,
        avatarUrl: formData.avatarUrl || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      if (me?.username) {
        queryClient.invalidateQueries({ queryKey: ["/api/users/username", me.username] });
      }
      toast({
        title: "Profile updated",
        description: "Your profile changes were saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!me?.id) {
        throw new Error("No authenticated user");
      }
      return apiRequest("DELETE", `/api/user/${me.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently removed.",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) {
    navigate("/");
    return null;
  }

  if (isLoading) {
    return <PageShellLoading text="Loading settings..." />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Settings"
        description="Manage the account settings that are actually exposed by the current backend."
        icon={User}
      />

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Current backend scope</AlertTitle>
        <AlertDescription>
          Profile editing and account deletion are wired to the real user routes. Password change, email change, and notification preference persistence are not exposed through the same user API today, so they are intentionally not presented here as fake controls.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Public Profile</CardTitle>
            <CardDescription>This data is stored on your user record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={formData.avatarUrl || undefined} />
                <AvatarFallback>
                  {(me?.displayName || me?.username || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Label htmlFor="avatar-url">Avatar URL</Label>
                <Input
                  id="avatar-url"
                  value={formData.avatarUrl}
                  onChange={(event) => setFormData((prev) => ({ ...prev, avatarUrl: event.target.value }))}
                  placeholder="https://example.com/avatar.png"
                  data-testid="input-avatar-url"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={formData.displayName}
                onChange={(event) => setFormData((prev) => ({ ...prev, displayName: event.target.value }))}
                data-testid="input-display-name"
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
                data-testid="input-bio"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={me?.username || ""} disabled data-testid="input-username" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={me?.email || ""} disabled data-testid="input-email" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => updateProfileMutation.mutate(undefined)} disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Local theme preference for the current app shell.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTheme("light")}
                className={`rounded-lg border p-4 text-center ${theme === "light" ? "border-primary bg-accent" : ""}`}
                data-testid="button-theme-light"
              >
                <Sun className="mx-auto mb-2 h-6 w-6" />
                <span className="text-sm font-medium">Light</span>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`rounded-lg border p-4 text-center ${theme === "dark" ? "border-primary bg-accent" : ""}`}
                data-testid="button-theme-dark"
              >
                <Moon className="mx-auto mb-2 h-6 w-6" />
                <span className="text-sm font-medium">Dark</span>
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`rounded-lg border p-4 text-center ${theme === "system" ? "border-primary bg-accent" : ""}`}
                data-testid="button-theme-system"
              >
                <Monitor className="mx-auto mb-2 h-6 w-6" />
                <span className="text-sm font-medium">System</span>
              </button>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Delete Account</CardTitle>
              <CardDescription>Permanently remove your user account using the mounted backend route.</CardDescription>
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
        <DialogContent data-testid="dialog-delete-account">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>This action is permanent and removes your user account through the backend.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccountOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteAccountMutation.mutate(undefined)} disabled={deleteAccountMutation.isPending}>
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
