import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface UserCredits {
  id: number;
  userId: number;
  planType: string;
  totalCredits: number;
  remainingCredits: number;
  totalUsed: number;
  billingCycle: string;
  updatedAt: string;
}

export function CreditBalance() {
  const { data: credits, isLoading } = useQuery<UserCredits>({
    queryKey: ['/api/user/credits'],
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading || !credits) {
    return null;
  }

  const percentage = (credits.remainingCredits / credits.totalCredits) * 100;
  const isLow = percentage < 20;
  
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer">
          <Zap className={`w-4 h-4 ${isLow ? 'text-destructive' : 'text-primary'}`} />
          <Badge variant={isLow ? 'destructive' : 'secondary'} className="font-mono">
            {credits.remainingCredits.toFixed(0)} credits
          </Badge>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold">AI Credits</h4>
            <Badge variant="outline">{credits.planType}</Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Used</span>
              <span className="font-medium">{credits.totalUsed.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Remaining</span>
              <span className="font-medium">{credits.remainingCredits.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total</span>
              <span className="font-medium">{credits.totalCredits.toFixed(2)}</span>
            </div>
          </div>
          
          <Progress value={percentage} className="h-2" />
          
          <p className="text-xs text-muted-foreground">
            {percentage < 10 && "⚠️ Credits running low. "}
            Credits reset {credits.billingCycle === 'monthly' ? 'monthly' : 'weekly'}.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}