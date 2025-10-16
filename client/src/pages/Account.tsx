// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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
  const [isLoading, setIsLoading] = useState(false);
  
  const [profile, setProfile] = useState({
    username: user?.username || '',
    email: user?.email || '',
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    website: '',
    location: '',
    twitter: '',
    github: ''
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
        website: user.website || '',
        location: user.location || '',
        twitter: user.twitter || '',
        github: user.github || ''
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
      await apiRequest('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: profile.displayName,
          bio: profile.bio,
          website: profile.website,
          location: profile.location,
          github: profile.github,
          twitter: profile.twitter
        })
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
      await apiRequest('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
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
      const response = await apiRequest('/api/user/2fa', {
        method: 'POST',
        body: JSON.stringify({ enabled: !security.twoFactor })
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
      await apiRequest('/api/user/email', {
        method: 'PATCH',
        body: JSON.stringify({ email: profile.email })
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
      await apiRequest('/api/user/account', {
        method: 'DELETE'
      });
      
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
    <div className="container mx-auto max-w-6xl py-8 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--ecode-text)]">Account Settings</h1>
        <p className="text-[var(--ecode-text-secondary)] mt-2 text-base">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-max min-w-full md:w-full">
            <TabsTrigger value="profile" className="whitespace-nowrap">Profile</TabsTrigger>
            <TabsTrigger value="account" className="whitespace-nowrap">Account</TabsTrigger>
            <TabsTrigger value="security" className="whitespace-nowrap">Security</TabsTrigger>
            <TabsTrigger value="billing" className="whitespace-nowrap">Billing</TabsTrigger>
            <TabsTrigger value="notifications" className="whitespace-nowrap">Notifications</TabsTrigger>
            <TabsTrigger value="developer" className="whitespace-nowrap">Developer</TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
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
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Social Links</h3>
                  <div className="grid gap-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="https://yourwebsite.com"
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Twitter className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="@username"
                        value={profile.twitter}
                        onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="username"
                        value={profile.github}
                        onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={isLoading}>
                  {isLoading && <ECodeSpinner className="mr-2" size={16} />}
                  {isLoading ? "Saving" : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card>
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
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleUpdateEmail}
                    disabled={profile.email === user?.email}
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
                <Button variant="outline" onClick={handleChangePassword}>
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
                <Button variant="destructive" onClick={handleDeleteAccount}>
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
        <TabsContent value="security" className="space-y-4">
          <Card>
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
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Active Sessions</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Chrome className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">Chrome on Windows</p>
                        <p className="text-xs text-muted-foreground">Current session</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">iPhone</p>
                        <p className="text-xs text-muted-foreground">Last active 2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Revoke</Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Connected Apps</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Github className="h-5 w-5" />
                      <div>
                        <p className="text-sm font-medium">GitHub</p>
                        <p className="text-xs text-muted-foreground">Read access to repos</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">Disconnect</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>
                Manage your subscription and billing details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
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
                    <p className="font-medium">$7.00</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Next Billing</p>
                    <p className="font-medium">Feb 1, 2024</p>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="outline">
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
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                      <p className="text-xs text-muted-foreground">Expires 12/25</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Update</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
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
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
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
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Follows</Label>
                    <p className="text-sm text-muted-foreground">
                      When someone follows you
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Repl activity</Label>
                    <p className="text-sm text-muted-foreground">
                      Updates about your Repls (forks, likes, etc.)
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Developer Tab */}
        <TabsContent value="developer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API keys for accessing E-Code programmatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
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
                    <Button variant="ghost" size="sm">Revoke</Button>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                <Key className="mr-2 h-4 w-4" />
                Generate New API Key
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SSH Keys</CardTitle>
              <CardDescription>
                Add SSH keys to access your Repls via SSH
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">MacBook Pro</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        SHA256:xxxxxxxxxxxxxxxxxxxxxxxxxxx
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Remove</Button>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                <Lock className="mr-2 h-4 w-4" />
                Add SSH Key
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Configure webhooks to receive events from your Repls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Link className="mr-2 h-4 w-4" />
                Configure Webhooks
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}