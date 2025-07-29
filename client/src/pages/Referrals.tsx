import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Users, Gift, Copy, Share2, Mail, 
  Twitter, Facebook, Link2, TrendingUp,
  DollarSign, Check, ChevronRight, Star,
  Trophy, Zap, Crown, MessageSquare
} from 'lucide-react';

export default function Referrals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customMessage, setCustomMessage] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Fetch referral stats
  const { data: referralStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/referrals/stats'],
    enabled: !!user
  });

  // Fetch user referrals
  const { data: referralHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['/api/referrals'],
    enabled: !!user
  });

  // Fetch leaderboard
  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ['/api/referrals/leaderboard'],
    enabled: !!user
  });

  // Generate referral code mutation
  const generateCodeMutation = useMutation({
    mutationFn: () => apiRequest('/api/referrals/generate-code', {
      method: 'POST'
    }),
    onSuccess: (data) => {
      setReferralCode(data.referralCode);
      queryClient.invalidateQueries({ queryKey: ['/api/referrals'] });
      toast({
        title: "Success",
        description: "Referral code generated successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate referral code",
        variant: "destructive"
      });
    }
  });

  // Load existing referral code on mount
  useEffect(() => {
    if (referralStats?.referralCode) {
      setReferralCode(referralStats.referralCode);
    }
  }, [referralStats]);

  const tiers = [
    {
      name: 'Bronze',
      referrals: 0,
      reward: 500,
      perks: ['500 Cycles per referral', 'Basic referral tracking']
    },
    {
      name: 'Silver',
      referrals: 5,
      reward: 750,
      perks: ['750 Cycles per referral', 'Priority support', 'Monthly bonus'],
      current: (referralStats || defaultStats).currentTier === 'Silver'
    },
    {
      name: 'Gold',
      referrals: 15,
      reward: 1000,
      perks: ['1000 Cycles per referral', 'VIP support', 'Exclusive features'],
      current: (referralStats || defaultStats).currentTier === 'Gold'
    },
    {
      name: 'Platinum',
      referrals: 30,
      reward: 1500,
      perks: ['1500 Cycles per referral', 'Personal account manager', 'Early access'],
      current: (referralStats || defaultStats).currentTier === 'Platinum'
    }
  ];

  const shareOptions = [
    { name: 'Copy Link', icon: <Copy />, action: 'copy' },
    { name: 'Email', icon: <Mail />, action: 'email' },
    { name: 'Twitter', icon: <Twitter />, action: 'twitter' },
    { name: 'Facebook', icon: <Facebook />, action: 'facebook' }
  ];

  const handleShare = (action: string) => {
    const referralUrl = `https://e-code.com/signup?ref=${referralCode}`;
    
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(referralUrl);
        toast({
          title: "Link copied!",
          description: "Your referral link has been copied to clipboard"
        });
        break;
      case 'email':
        window.open(`mailto:?subject=Join me on E-Code&body=I'm using E-Code to build amazing projects with AI. Join me using this link: ${referralUrl}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=I'm building awesome projects with AI on E-Code! Join me: ${referralUrl}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`);
        break;
    }
  };

  // Default values for UI
  const defaultStats = {
    totalReferrals: 0,
    successfulReferrals: 0,
    pendingReferrals: 0,
    totalCyclesEarned: 0,
    currentTier: 'Bronze',
    tierProgress: 0
  };

  const tiers = [
    {
      name: 'Bronze',
      referrals: 0,
      reward: 500,
      perks: ['500 Cycles per referral', 'Basic referral tracking']
    },
    {
      name: 'Silver',
      referrals: 5,
      reward: 750,
      perks: ['750 Cycles per referral', 'Priority support', 'Monthly bonus'],
      current: true
    },
    {
      name: 'Gold',
      referrals: 15,
      reward: 1000,
      perks: ['1000 Cycles per referral', 'VIP support', 'Exclusive features']
    },
    {
      name: 'Platinum',
      referrals: 30,
      reward: 1500,
      perks: ['1500 Cycles per referral', 'Personal account manager', 'Early access']
    }
  ];

  const shareOptions = [
    { name: 'Copy Link', icon: <Copy />, action: 'copy' },
    { name: 'Email', icon: <Mail />, action: 'email' },
    { name: 'Twitter', icon: <Twitter />, action: 'twitter' },
    { name: 'Facebook', icon: <Facebook />, action: 'facebook' }
  ];

  const handleShare = (action: string) => {
    const referralUrl = `https://e-code.com/signup?ref=${referralCode}`;
    
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(referralUrl);
        toast({
          title: "Link copied!",
          description: "Your referral link has been copied to clipboard"
        });
        break;
      case 'email':
        window.open(`mailto:?subject=Join me on E-Code&body=${customMessage || 'Check out E-Code!'} ${referralUrl}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(customMessage || 'Join me on E-Code!')} ${referralUrl}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${referralUrl}`);
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'expired': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          Refer a Friend
        </h1>
        <p className="text-muted-foreground mt-2">
          Invite friends to E-Code and earn rewards together
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : (referralStats || defaultStats).totalReferrals}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : (referralStats || defaultStats).successfulReferrals}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cycles Earned</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : (referralStats || defaultStats).totalCyclesEarned.toLocaleString()}
                </p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Tier</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : (referralStats || defaultStats).currentTier}
                </p>
              </div>
              <Crown className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="share" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="share">Share & Earn</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        {/* Share Tab */}
        <TabsContent value="share" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
              <CardDescription>
                Share your unique link to start earning rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Your referral code</p>
                {referralCode ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-lg font-mono bg-background px-3 py-2 rounded border">
                      {referralCode}
                    </code>
                    <Button 
                      variant="outline"
                      onClick={() => handleShare('copy')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => generateCodeMutation.mutate()}
                    disabled={generateCodeMutation.isPending}
                    className="w-full"
                  >
                    {generateCodeMutation.isPending ? 'Generating...' : 'Generate Referral Code'}
                  </Button>
                )}
              </div>

              <div>
                <Label htmlFor="message" className="mb-2">Custom Message (optional)</Label>
                <textarea
                  id="message"
                  className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border bg-background"
                  placeholder="Add a personal message to your referral..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {shareOptions.map((option) => (
                  <Button
                    key={option.action}
                    variant="outline"
                    onClick={() => handleShare(option.action)}
                    className="flex items-center gap-2"
                  >
                    {option.icon}
                    <span>{option.name}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold">Share your link</h4>
                    <p className="text-sm text-muted-foreground">
                      Send your referral link to friends who might enjoy E-Code
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold">They sign up</h4>
                    <p className="text-sm text-muted-foreground">
                      Your friend creates an account using your referral link
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold">Both earn rewards</h4>
                    <p className="text-sm text-muted-foreground">
                      You both receive Cycles when they complete their first project
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Referral History</CardTitle>
              <CardDescription>
                Track your referrals and rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="w-32 h-3 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                      <div className="w-16 h-6 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : referralHistory.length > 0 ? (
                <div className="space-y-3">
                  {referralHistory.map((referral: any) => (
                    <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          {referral.referredUser?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium">{referral.referredUser?.username || 'Unknown User'}</p>
                          <p className="text-sm text-muted-foreground">
                            Joined {new Date(referral.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${referral.status === 'completed' ? 'text-green-600' : referral.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {referral.status === 'completed' && `+${referral.cyclesEarned || 500} Cycles`}
                          {referral.status === 'pending' && 'Pending'}
                          {referral.status === 'expired' && 'Expired'}
                        </p>
                        <Badge variant={
                          referral.status === 'completed' ? 'default' :
                          referral.status === 'pending' ? 'secondary' : 'outline'
                        }>
                          {referral.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No referrals yet</p>
                  <p className="text-sm">Share your referral link to get started!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Referral Tiers</CardTitle>
              <CardDescription>
                Unlock better rewards as you refer more friends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress to next tier</span>
                  <span>{statsLoading ? '...' : (referralStats || defaultStats).tierProgress}%</span>
                </div>
                <Progress value={statsLoading ? 0 : (referralStats || defaultStats).tierProgress} className="h-3" />
              </div>

              <div className="space-y-4">
                {tiers.map((tier) => (
                  <Card key={tier.name} className={tier.current ? 'border-primary' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {tier.name}
                            {tier.current && (
                              <Badge>Current</Badge>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {tier.referrals}+ successful referrals
                          </p>
                          <ul className="space-y-1">
                            {tier.perks.map((perk, index) => (
                              <li key={index} className="text-sm flex items-center gap-2">
                                <Check className="h-3 w-3 text-green-500" />
                                {perk}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {tier.reward}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Cycles/referral
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Referrers</CardTitle>
              <CardDescription>
                See how you rank among other E-Code ambassadors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboardLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-6 bg-gray-200 rounded"></div>
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="w-20 h-3 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="w-16 h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="w-20 h-3 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((user: any, index: number) => (
                    <div 
                      key={user.id || index} 
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        user.username === user?.username ? 'bg-primary/10 border border-primary' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg w-8">#{index + 1}</span>
                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          {user.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium">{user.username || 'Unknown User'}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.totalReferrals || 0} referrals
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{(user.totalCyclesEarned || 0).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Cycles earned</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leaderboard data yet</p>
                  <p className="text-sm">Be the first to start referring friends!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-6 text-center">
              <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Become a Top Referrer!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Top referrers get exclusive perks, early access to features, and special recognition
              </p>
              <Button>
                Learn More
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}