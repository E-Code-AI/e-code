import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { 
  User, Mail, Key, Shield, CreditCard, Bell, 
  Globe, Download, Trash2, AlertTriangle, Check,
  Smartphone, Monitor, Lock, Link, Github, Twitter,
  Chrome, Apple, Zap, Crown, Database, Server
} from 'lucide-react';
import { ECodeSpinner } from '@/components/ECodeLoading';

export default function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  
  const [profile, setProfile] = useState({
    username: user?.username || '',
    email: user?.email || '',
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    website: user?.website || ''
  });

  const [emailPreferences, setEmailPreferences] = useState({
    marketing: true,
    updates: true,
    tips: true,
    community: false
  });

  const [security, setSecurity] = useState({
    twoFactor: false,
    sessions: []
  });

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      setProfile({
        username: user.username || '',
        email: user.email || '',
        displayName: user.displayName || '',
        bio: user.bio || '',
        website: user.website || ''
      });
      
      // Set 2FA status if available
      if (user.twoFactorEnabled !== undefined) {
        setSecurity(prev => ({ ...prev, twoFactor: user.twoFactorEnabled }));
      }
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      await apiRequest('PATCH', '/api/user/profile', {
        displayName: profile.displayName,
        bio: profile.bio,
        website: profile.website
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const currentPassword = prompt("Enter your current password:");
    const newPassword = prompt("Enter your new password:");
    
    if (!currentPassword || !newPassword) {
      return;
    }
    
    try {
      await apiRequest('POST', '/api/user/change-password', {
        currentPassword,
        newPassword
      });
      
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password. Please check your current password.",
        variant: "destructive"
      });
    }
  };

  const handleEnable2FA = async () => {
    try {
      const response = await apiRequest('POST', '/api/user/2fa', {
        enabled: !security.twoFactor
      });
      
      setSecurity({ ...security, twoFactor: !security.twoFactor });
      
      toast({
        title: security.twoFactor ? "Two-factor authentication disabled" : "Two-factor authentication enabled",
        description: security.twoFactor ? "2FA has been disabled." : "Your account is now more secure."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update 2FA settings.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateEmail = async () => {
    try {
      await apiRequest('PATCH', '/api/user/email', {
        email: profile.email
      });
      
      toast({
        title: "Email updated",
        description: "Your email address has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update email. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = confirm("Are you sure you want to delete your account? This action cannot be undone.");
    
    if (!confirmed) {
      return;
    }
    
    try {
      await apiRequest('DELETE', '/api/user/account');
      
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted.",
        variant: "destructive"
      });
      
      // Redirect to homepage after deletion
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Account settings"
        description="Manage your profile, security, billing, and notification preferences."
        icon={User}
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="gap-2" onClick={handleSaveProfile} data-testid="button-save-changes">
              <Check className="h-4 w-4" />
              Save changes
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/settings')} data-testid="button-security-center">
              <Shield className="h-4 w-4" />
              Security center
            </Button>
          </div>
        )}
      />
      <div className="space-y-6" data-testid="account-page">

      <Tabs defaultValue="profile" className="space-y-4" data-testid="account-tabs">
        <div className="overflow-x-auto max-w-full">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-max min-w-full md:w-full">
            <TabsTrigger value="profile" className="whitespace-nowrap" data-testid="tab-profile">Profile</TabsTrigger>
            <TabsTrigger value="account" className="whitespace-nowrap" data-testid="tab-account">Account</TabsTrigger>
            <TabsTrigger value="security" className="whitespace-nowrap" data-testid="tab-security">Security</TabsTrigger>
            <TabsTrigger value="billing" className="whitespace-nowrap" data-testid="tab-billing">Billing</TabsTrigger>
            <TabsTrigger value="notifications" className="whitespace-nowrap" data-testid="tab-notifications">Notifications</TabsTrigger>
            <TabsTrigger value="developer" className="whitespace-nowrap" data-testid="tab-developer">Developer</TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4" data-testid="content-profile">
          <Card data-testid="card-public-profile">
            <CardHeader>
              <CardTitle>Public Profile</CardTitle>
              <CardDescription>
                This information will be displayed on your public profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      disabled
                      data-testid="input-username"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your username cannot be changed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={profile.displayName}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                      placeholder="John Doe"
                      data-testid="input-display-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border bg-background"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    data-testid="input-bio"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Website</h3>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="https://yourwebsite.com"
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      data-testid="input-website"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isLoading} data-testid="button-save-profile">
                  {isLoading && <ECodeSpinner className="mr-2" size={16} />}
                  {isLoading ? "Saving" : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4" data-testid="content-account">
          <Card data-testid="card-account-info">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Update your account details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="flex-1"
                    data-testid="input-email"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleUpdateEmail}
                    disabled={profile.email === user?.email}
                    data-testid="button-update-email"
                  >
                    Update Email
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll send important notifications to this email
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Password</h3>
                <Button variant="outline" onClick={handleChangePassword} data-testid="button-change-password">
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
                <Button variant="destructive" onClick={handleDeleteAccount} data-testid="button-delete-account">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
                <p className="text-xs text-muted-foreground">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4" data-testid="content-security">
          <Card data-testid="card-security-settings">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Keep your account secure with these settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch
                  checked={security.twoFactor}
                  onCheckedChange={handleEnable2FA}
                  data-testid="switch-2fa"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Active Sessions</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg" data-testid="session-current">
                    <div className="flex items-center gap-3">
                      <Chrome className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">Chrome on Windows</p>
                        <p className="text-xs text-muted-foreground">Current session</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg" data-testid="session-iphone">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">iPhone</p>
                        <p className="text-xs text-muted-foreground">Last active 2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" data-testid="button-revoke-session">Revoke</Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Connected Apps</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg" data-testid="app-github">
                    <div className="flex items-center gap-3">
                      <Github className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">GitHub</p>
                        <p className="text-xs text-muted-foreground">Read access to repos</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" data-testid="button-disconnect-github">Disconnect</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4" data-testid="content-billing">
          <Card data-testid="card-billing">
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>
                Manage your subscription and billing details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50" data-testid="current-plan">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-semibold">Hacker Plan</h3>
                  </div>
                  <Badge>Active</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Monthly Cost</p>
                    <p className="font-medium" data-testid="text-monthly-cost">$7.00</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Next Billing</p>
                    <p className="font-medium" data-testid="text-next-billing">Feb 1, 2024</p>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline" data-testid="button-manage-subscription">
                  Manage Subscription
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Usage This Month</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Compute Hours</span>
                      <span className="text-sm font-medium">45 / 100</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: '45%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Storage</span>
                      <span className="text-sm font-medium">3.2GB / 10GB</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: '32%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Private Repls</span>
                      <span className="text-sm font-medium">8 / Unlimited</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-green-600" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Payment Method</h3>
                <div className="flex items-center justify-between p-3 border rounded-lg" data-testid="payment-method">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium" data-testid="text-card-number">•••• •••• •••• 4242</p>
                      <p className="text-xs text-muted-foreground">Expires 12/25</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" data-testid="button-update-payment">Update</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4" data-testid="content-notifications">
          <Card data-testid="card-email-notifications">
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Choose what emails you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails about new features and updates
                    </p>
                  </div>
                  <Switch
                    checked={emailPreferences.marketing}
                    onCheckedChange={(checked) => 
                      setEmailPreferences({ ...emailPreferences, marketing: checked })
                    }
                    data-testid="switch-marketing"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Product updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about important product changes
                    </p>
                  </div>
                  <Switch
                    checked={emailPreferences.updates}
                    onCheckedChange={(checked) => 
                      setEmailPreferences({ ...emailPreferences, updates: checked })
                    }
                    data-testid="switch-updates"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tips & tutorials</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive helpful tips to get the most out of E-Code
                    </p>
                  </div>
                  <Switch
                    checked={emailPreferences.tips}
                    onCheckedChange={(checked) => 
                      setEmailPreferences({ ...emailPreferences, tips: checked })
                    }
                    data-testid="switch-tips"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Community digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Weekly summary of popular projects and discussions
                    </p>
                  </div>
                  <Switch
                    checked={emailPreferences.community}
                    onCheckedChange={(checked) => 
                      setEmailPreferences({ ...emailPreferences, community: checked })
                    }
                    data-testid="switch-community"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-inapp-notifications">
            <CardHeader>
              <CardTitle>In-App Notifications</CardTitle>
              <CardDescription>
                Control what notifications you see in E-Code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Comments & mentions</Label>
                    <p className="text-sm text-muted-foreground">
                      When someone comments on your Repl or mentions you
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-comments" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Follows</Label>
                    <p className="text-sm text-muted-foreground">
                      When someone follows you
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-follows" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Repl activity</Label>
                    <p className="text-sm text-muted-foreground">
                      Updates about your Repls (forks, likes, etc.)
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-repl-activity" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Developer Tab */}
        <TabsContent value="developer" className="space-y-4" data-testid="content-developer">
          <Card data-testid="card-api-keys">
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API keys for accessing E-Code programmatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg" data-testid="api-key-item">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">Production API Key</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        rpl_1234...abcd
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Never expires</Badge>
                    <Button variant="ghost" size="sm" data-testid="button-revoke-api-key">Revoke</Button>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full" data-testid="button-generate-api-key">
                <Key className="mr-2 h-4 w-4" />
                Generate New API Key
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="card-ssh-keys">
            <CardHeader>
              <CardTitle>SSH Keys</CardTitle>
              <CardDescription>
                Add SSH keys to access your Repls via SSH
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg" data-testid="ssh-key-item">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">MacBook Pro</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        SHA256:xxxxxxxxxxxxxxxxxxxxxxxxxxx
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" data-testid="button-remove-ssh-key">Remove</Button>
                </div>
              </div>
              <Button variant="outline" className="w-full" data-testid="button-add-ssh-key">
                <Lock className="mr-2 h-4 w-4" />
                Add SSH Key
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="card-webhooks">
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Configure webhooks to receive events from your Repls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-configure-webhooks">
                <Link className="mr-2 h-4 w-4" />
                Configure Webhooks
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </PageShell>
  );
}