import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { PageShell, PageHeader } from '@/components/layout/PageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Users,
  Gift,
  DollarSign,
  Link,
  Copy,
  Check,
  Share2,
  Mail,
  Trophy,
  TrendingUp,
  Clock,
  Star,
  Crown,
  Award,
  Target,
  Zap,
  ChevronRight,
  ExternalLink,
  Send,
  UserPlus,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  HelpCircle,
  Info,
} from 'lucide-react';
import { SiLinkedin, SiFacebook, SiReddit, SiWhatsapp, SiTelegram } from 'react-icons/si';
import { Twitter, MessageCircle } from 'lucide-react';

// Use lucide Twitter icon (SiTwitter was renamed to SiX but may not exist)
const SiTwitter = Twitter;
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  availableCredits: number;
  lifetimeCredits: number;
  rank: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  nextTierProgress: number;
  nextTierRequirement: number;
}

interface Referral {
  id: string;
  email: string;
  username?: string;
  status: 'pending' | 'signed_up' | 'converted' | 'expired';
  reward: number;
  invitedAt: string;
  signedUpAt?: string;
  convertedAt?: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  referrals: number;
  earnings: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

interface Reward {
  id: string;
  type: 'referral' | 'milestone' | 'bonus';
  amount: number;
  description: string;
  earnedAt: string;
  status: 'pending' | 'credited' | 'expired';
}

const mockStats: ReferralStats = {
  totalReferrals: 47,
  successfulReferrals: 32,
  pendingReferrals: 8,
  totalEarnings: 1280,
  availableCredits: 450,
  lifetimeCredits: 1680,
  rank: 15,
  tier: 'gold',
  nextTierProgress: 68,
  nextTierRequirement: 50,
};

const mockReferrals: Referral[] = [
  { id: '1', email: 'john@example.com', username: 'johndoe', status: 'converted', reward: 50, invitedAt: '2024-01-15T10:00:00Z', signedUpAt: '2024-01-16T14:30:00Z', convertedAt: '2024-01-20T09:00:00Z' },
  { id: '2', email: 'jane@example.com', username: 'janedev', status: 'converted', reward: 50, invitedAt: '2024-01-12T08:00:00Z', signedUpAt: '2024-01-13T11:00:00Z', convertedAt: '2024-01-18T16:00:00Z' },
  { id: '3', email: 'mike@example.com', username: 'mikesmith', status: 'signed_up', reward: 0, invitedAt: '2024-01-18T15:00:00Z', signedUpAt: '2024-01-19T10:00:00Z' },
  { id: '4', email: 'sarah@company.com', status: 'pending', reward: 0, invitedAt: '2024-01-20T12:00:00Z' },
  { id: '5', email: 'alex@startup.io', status: 'pending', reward: 0, invitedAt: '2024-01-21T09:30:00Z' },
  { id: '6', email: 'expired@old.com', status: 'expired', reward: 0, invitedAt: '2023-12-01T10:00:00Z' },
];

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, userId: '1', username: 'topdev', displayName: 'Top Developer', referrals: 156, earnings: 7800, tier: 'diamond' },
  { rank: 2, userId: '2', username: 'codequeen', displayName: 'Code Queen', referrals: 134, earnings: 6700, tier: 'diamond' },
  { rank: 3, userId: '3', username: 'devking', displayName: 'Dev King', referrals: 98, earnings: 4900, tier: 'platinum' },
  { rank: 4, userId: '4', username: 'buildmaster', displayName: 'Build Master', referrals: 87, earnings: 4350, tier: 'platinum' },
  { rank: 5, userId: '5', username: 'hackpro', displayName: 'Hack Pro', referrals: 76, earnings: 3800, tier: 'gold' },
  { rank: 6, userId: '6', username: 'codecrafter', displayName: 'Code Crafter', referrals: 65, earnings: 3250, tier: 'gold' },
  { rank: 7, userId: '7', username: 'devwizard', displayName: 'Dev Wizard', referrals: 54, earnings: 2700, tier: 'gold' },
  { rank: 8, userId: '8', username: 'techguru', displayName: 'Tech Guru', referrals: 43, earnings: 2150, tier: 'silver' },
  { rank: 9, userId: '9', username: 'builderx', displayName: 'Builder X', referrals: 38, earnings: 1900, tier: 'silver' },
  { rank: 10, userId: '10', username: 'codemaster', displayName: 'Code Master', referrals: 32, earnings: 1600, tier: 'silver' },
];

const mockRewards: Reward[] = [
  { id: '1', type: 'referral', amount: 50, description: 'Referral bonus for johndoe', earnedAt: '2024-01-20T09:00:00Z', status: 'credited' },
  { id: '2', type: 'referral', amount: 50, description: 'Referral bonus for janedev', earnedAt: '2024-01-18T16:00:00Z', status: 'credited' },
  { id: '3', type: 'milestone', amount: 100, description: '10 successful referrals milestone', earnedAt: '2024-01-15T12:00:00Z', status: 'credited' },
  { id: '4', type: 'bonus', amount: 200, description: 'New Year promotion bonus', earnedAt: '2024-01-01T00:00:00Z', status: 'credited' },
  { id: '5', type: 'referral', amount: 50, description: 'Referral bonus for mikesmith', earnedAt: '2024-01-19T10:00:00Z', status: 'pending' },
];

const referralLink = 'https://ecode.dev/r/user123abc';

export default function ReferralsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteMessage, setInviteMessage] = useState(
    "Hey! I've been using E-Code and it's amazing for building apps. Use my referral link to sign up and we both get $50 in credits!"
  );

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: 'Link copied!', description: 'Your referral link has been copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvites = () => {
    const emails = inviteEmails.split(',').map(e => e.trim()).filter(e => e);
    if (emails.length === 0) {
      toast({ title: 'No emails provided', description: 'Please enter at least one email address.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Invites sent!', description: `Invitation emails sent to ${emails.length} recipients.` });
    setShowInviteDialog(false);
    setInviteEmails('');
  };

  const handleShareSocial = (platform: string) => {
    const shareText = encodeURIComponent("Join me on E-Code - the ultimate platform for building apps! 🚀");
    const shareUrl = encodeURIComponent(referralLink);
    
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      reddit: `https://reddit.com/submit?url=${shareUrl}&title=${shareText}`,
      whatsapp: `https://wa.me/?text=${shareText}%20${shareUrl}`,
      telegram: `https://t.me/share/url?url=${shareUrl}&text=${shareText}`,
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
    toast({ title: 'Share window opened', description: `Share on ${platform} in the new window.` });
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      bronze: 'text-orange-600 bg-orange-100',
      silver: 'text-gray-600 bg-gray-100',
      gold: 'text-yellow-600 bg-yellow-100',
      platinum: 'text-purple-600 bg-purple-100',
      diamond: 'text-blue-600 bg-blue-100',
    };
    return colors[tier] || 'text-gray-600 bg-gray-100';
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'diamond': return <Crown className="h-4 w-4" />;
      case 'platinum': return <Award className="h-4 w-4" />;
      case 'gold': return <Trophy className="h-4 w-4" />;
      case 'silver': return <Star className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', label: 'Pending', icon: <Clock className="h-3 w-3 mr-1" /> },
      signed_up: { variant: 'outline', label: 'Signed Up', icon: <UserPlus className="h-3 w-3 mr-1" /> },
      converted: { variant: 'default', label: 'Converted', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      expired: { variant: 'destructive', label: 'Expired', icon: <XCircle className="h-3 w-3 mr-1" /> },
      credited: { variant: 'default', label: 'Credited', icon: <Check className="h-3 w-3 mr-1" /> },
    };
    const config = variants[status] || { variant: 'outline' as const, label: status, icon: null };
    return <Badge variant={config.variant}>{config.icon}{config.label}</Badge>;
  };

  const inputClassName = "min-h-[44px] border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-primary/20 focus:border-primary/40 focus:ring-2 transition-all duration-200";
  const cardClassName = "border border-border bg-card shadow-sm";

  const navItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'referrals', label: 'My Referrals', icon: Users },
    { id: 'rewards', label: 'Rewards', icon: Gift },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'terms', label: 'Terms & FAQ', icon: HelpCircle },
  ];

  return (
    <PageShell>
      <div 
        className="min-h-screen bg-background -mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8 px-4 pt-4 pb-8 md:px-6 md:pt-6 lg:px-8 lg:pt-8"
        style={{ fontFamily: 'var(--ecode-font-sans)' }}
        data-testid="page-referrals"
      >
        <PageHeader
          title="Referral Program"
          description="Invite friends to E-Code and earn credits for every successful referral. Share the love and grow together!"
          icon={Gift}
          actions={(
            <div className="flex flex-col gap-2 sm:flex-row">
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 border-border bg-card text-foreground hover:bg-muted hover:border-primary/30 transition-all duration-200"
                    data-testid="button-invite-email"
                  >
                    <Mail className="h-4 w-4" />
                    Invite via Email
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md" data-testid="dialog-invite-email">
                  <DialogHeader>
                    <DialogTitle>Invite Friends via Email</DialogTitle>
                    <DialogDescription>Send personalized invitation emails to your friends.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Email Addresses</Label>
                      <Textarea
                        value={inviteEmails}
                        onChange={(e) => setInviteEmails(e.target.value)}
                        placeholder="Enter email addresses separated by commas..."
                        className={`${inputClassName} min-h-[80px]`}
                        data-testid="textarea-invite-emails"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Separate multiple emails with commas</p>
                    </div>
                    <div>
                      <Label>Personal Message (Optional)</Label>
                      <Textarea
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        className={`${inputClassName} min-h-[100px]`}
                        data-testid="textarea-invite-message"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowInviteDialog(false)} data-testid="button-cancel-invite">Cancel</Button>
                    <Button onClick={handleSendInvites} className="gap-2" data-testid="button-send-invites">
                      <Send className="h-4 w-4" />
                      Send Invites
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button 
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200"
                onClick={handleCopyLink}
                data-testid="button-copy-link"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Referral Link'}
              </Button>
            </div>
          )}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <div className="lg:col-span-1">
            <nav 
              className="space-y-1 p-2 rounded-xl border border-border bg-card"
              data-testid="nav-referrals-sidebar"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] ${
                      isActive 
                        ? 'bg-primary/10 text-primary border-l-2 border-primary pl-[10px]' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    onClick={() => setActiveTab(item.id)}
                    data-testid={`button-nav-${item.id}`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <Card className={`${cardClassName} mt-4`} data-testid="card-your-tier">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getTierIcon(mockStats.tier)}
                  Your Tier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${getTierColor(mockStats.tier)}`}>
                  {getTierIcon(mockStats.tier)}
                  <span className="font-medium capitalize">{mockStats.tier}</span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress to Platinum</span>
                    <span className="font-medium">{mockStats.nextTierProgress}%</span>
                  </div>
                  <Progress value={mockStats.nextTierProgress} className="h-2" data-testid="progress-tier" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {mockStats.nextTierRequirement - mockStats.successfulReferrals} more referrals needed
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className={cardClassName} data-testid="card-stat-total-referrals">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Referrals</p>
                          <p className="text-2xl font-bold text-foreground">{mockStats.totalReferrals}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={cardClassName} data-testid="card-stat-successful">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Successful</p>
                          <p className="text-2xl font-bold text-foreground">{mockStats.successfulReferrals}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-green-500/10">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={cardClassName} data-testid="card-stat-earnings">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Earnings</p>
                          <p className="text-2xl font-bold text-foreground">${mockStats.totalEarnings}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-yellow-500/10">
                          <DollarSign className="h-5 w-5 text-yellow-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={cardClassName} data-testid="card-stat-rank">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Your Rank</p>
                          <p className="text-2xl font-bold text-foreground">#{mockStats.rank}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-500/10">
                          <Trophy className="h-5 w-5 text-purple-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className={cardClassName} data-testid="card-referral-link">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Link className="h-5 w-5" />
                      Your Referral Link
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Share this link with friends and earn $50 for each successful referral
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <Input
                          value={referralLink}
                          readOnly
                          className={`${inputClassName} pr-12 font-mono text-sm`}
                          data-testid="input-referral-link"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={handleCopyLink}
                          data-testid="button-copy-link-inline"
                        >
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-3">Share on Social Media</p>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleShareSocial('twitter')} data-testid="button-share-twitter">
                          <SiTwitter className="h-4 w-4 mr-2" />
                          Twitter
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleShareSocial('linkedin')} data-testid="button-share-linkedin">
                          <SiLinkedin className="h-4 w-4 mr-2" />
                          LinkedIn
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleShareSocial('facebook')} data-testid="button-share-facebook">
                          <SiFacebook className="h-4 w-4 mr-2" />
                          Facebook
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleShareSocial('reddit')} data-testid="button-share-reddit">
                          <SiReddit className="h-4 w-4 mr-2" />
                          Reddit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleShareSocial('whatsapp')} data-testid="button-share-whatsapp">
                          <SiWhatsapp className="h-4 w-4 mr-2" />
                          WhatsApp
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleShareSocial('telegram')} data-testid="button-share-telegram">
                          <SiTelegram className="h-4 w-4 mr-2" />
                          Telegram
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={cardClassName} data-testid="card-how-it-works">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      How It Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4" data-testid="step-1">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <Share2 className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-medium text-foreground mb-2">1. Share Your Link</h4>
                        <p className="text-sm text-muted-foreground">Share your unique referral link with friends, colleagues, or on social media</p>
                      </div>
                      <div className="text-center p-4" data-testid="step-2">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <UserPlus className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-medium text-foreground mb-2">2. Friend Signs Up</h4>
                        <p className="text-sm text-muted-foreground">Your friend creates an account using your referral link</p>
                      </div>
                      <div className="text-center p-4" data-testid="step-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <Gift className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-medium text-foreground mb-2">3. Both Get Rewarded</h4>
                        <p className="text-sm text-muted-foreground">You both receive $50 in credits when they subscribe to a paid plan</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'referrals' && (
              <Card className={cardClassName} data-testid="card-referral-history">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Referral History
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Track the status of all your referrals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <Table data-testid="table-referrals">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email / Username</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Invited</TableHead>
                          <TableHead>Signed Up</TableHead>
                          <TableHead>Reward</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockReferrals.map((referral) => (
                          <TableRow key={referral.id} data-testid={`row-referral-${referral.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{referral.username || referral.email}</p>
                                {referral.username && <p className="text-xs text-muted-foreground">{referral.email}</p>}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(referral.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(referral.invitedAt), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {referral.signedUpAt 
                                ? formatDistanceToNow(new Date(referral.signedUpAt), { addSuffix: true })
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              {referral.reward > 0 ? (
                                <span className="font-medium text-green-600">${referral.reward}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {activeTab === 'rewards' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className={cardClassName} data-testid="card-available-credits">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Available Credits</p>
                          <p className="text-3xl font-bold text-foreground">${mockStats.availableCredits}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-green-500/10">
                          <CreditCard className="h-6 w-6 text-green-500" />
                        </div>
                      </div>
                      <Button className="w-full mt-4" data-testid="button-redeem-credits">
                        Redeem Credits
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className={cardClassName} data-testid="card-lifetime-credits">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Lifetime Earnings</p>
                          <p className="text-3xl font-bold text-foreground">${mockStats.lifetimeCredits}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-primary/10">
                          <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        Total credits earned since joining the referral program
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className={cardClassName} data-testid="card-reward-history">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      Reward History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mockRewards.map((reward) => (
                        <div 
                          key={reward.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 transition-all"
                          data-testid={`reward-${reward.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${
                              reward.type === 'referral' ? 'bg-primary/10' : 
                              reward.type === 'milestone' ? 'bg-yellow-500/10' : 'bg-green-500/10'
                            }`}>
                              {reward.type === 'referral' && <UserPlus className="h-4 w-4 text-primary" />}
                              {reward.type === 'milestone' && <Trophy className="h-4 w-4 text-yellow-500" />}
                              {reward.type === 'bonus' && <Gift className="h-4 w-4 text-green-500" />}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{reward.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(reward.earnedAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg text-foreground">+${reward.amount}</span>
                            {getStatusBadge(reward.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'leaderboard' && (
              <Card className={cardClassName} data-testid="card-leaderboard">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Top Referrers
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    See how you rank against other community members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockLeaderboard.map((entry, index) => (
                      <div 
                        key={entry.userId}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                          entry.rank <= 3 ? 'border-primary/30 bg-primary/5' : 'border-border hover:border-primary/30'
                        }`}
                        data-testid={`leaderboard-${entry.rank}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          entry.rank === 1 ? 'bg-yellow-500 text-white' :
                          entry.rank === 2 ? 'bg-gray-400 text-white' :
                          entry.rank === 3 ? 'bg-orange-500 text-white' :
                          'bg-muted text-foreground'
                        }`}>
                          {entry.rank}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={entry.avatarUrl} />
                          <AvatarFallback>{entry.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{entry.displayName}</p>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getTierColor(entry.tier)}`}>
                              {getTierIcon(entry.tier)}
                              <span className="capitalize">{entry.tier}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">@{entry.username}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{entry.referrals} referrals</p>
                          <p className="text-sm text-green-600">${entry.earnings} earned</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'terms' && (
              <Card className={cardClassName} data-testid="card-terms-faq">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    Terms & FAQ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full" data-testid="accordion-faq">
                    <AccordionItem value="item-1">
                      <AccordionTrigger data-testid="faq-how-earn">How do I earn referral credits?</AccordionTrigger>
                      <AccordionContent>
                        You earn $50 in credits for each friend who signs up using your referral link and subscribes to a paid plan within 30 days. Your friend also receives $50 in credits as a welcome bonus.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger data-testid="faq-when-credited">When are credits credited to my account?</AccordionTrigger>
                      <AccordionContent>
                        Credits are typically credited within 24-48 hours after your referral subscribes to a paid plan. You can track the status of your referrals in the "My Referrals" tab.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger data-testid="faq-use-credits">How can I use my referral credits?</AccordionTrigger>
                      <AccordionContent>
                        Referral credits can be applied towards your subscription, compute resources, or any paid features on E-Code. Credits never expire as long as your account remains active.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                      <AccordionTrigger data-testid="faq-max-referrals">Is there a limit to how many people I can refer?</AccordionTrigger>
                      <AccordionContent>
                        There's no limit! You can refer as many people as you want. In fact, our top referrers have earned thousands of dollars in credits by actively sharing E-Code with their networks.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-5">
                      <AccordionTrigger data-testid="faq-referral-expiry">Do referral links expire?</AccordionTrigger>
                      <AccordionContent>
                        Your referral link never expires. However, each invitation is valid for 30 days from when the recipient receives it. If they don't sign up within 30 days, the invitation will expire and you can resend it.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-6">
                      <AccordionTrigger data-testid="faq-tier-system">How does the tier system work?</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <p>Your tier is based on the number of successful referrals:</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li><strong>Bronze:</strong> 0-9 referrals</li>
                            <li><strong>Silver:</strong> 10-24 referrals</li>
                            <li><strong>Gold:</strong> 25-49 referrals</li>
                            <li><strong>Platinum:</strong> 50-99 referrals</li>
                            <li><strong>Diamond:</strong> 100+ referrals</li>
                          </ul>
                          <p className="mt-2">Higher tiers unlock additional bonuses and exclusive perks!</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <Separator className="my-6" />

                  <div className="space-y-4" data-testid="terms-section">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Terms and Conditions
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>By participating in the E-Code Referral Program, you agree to the following terms:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Referral credits are non-transferable and cannot be exchanged for cash.</li>
                        <li>Self-referrals are not permitted and will result in disqualification.</li>
                        <li>E-Code reserves the right to modify or terminate the referral program at any time.</li>
                        <li>Fraudulent or abusive activity will result in account suspension and forfeiture of credits.</li>
                        <li>Referral rewards are subject to verification and may take up to 30 days to process.</li>
                      </ol>
                    </div>
                    <Button variant="link" className="p-0 h-auto text-primary" data-testid="link-full-terms">
                      Read Full Terms & Conditions <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
