import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitCommit, Package, Rocket, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '@/lib/performance';

interface ActivityItem {
  id: number;
  type: 'deploy' | 'commit' | 'build' | 'error' | 'success';
  user: string;
  avatar: string;
  project: string;
  time: string;
  status?: 'success' | 'error' | 'pending';
  message?: string;
}

const activityFeed: ActivityItem[] = [
  { id: 1, type: 'deploy', user: 'John Doe', avatar: '👤', project: 'E-Commerce Store', time: '2 minutes ago', status: 'success' },
  { id: 2, type: 'commit', user: 'Jane Smith', avatar: '👩', project: 'Mobile App', time: '5 minutes ago', message: 'Fixed navigation bug' },
  { id: 3, type: 'build', user: 'Mike Johnson', avatar: '👨', project: 'API Gateway', time: '10 minutes ago', status: 'success' },
  { id: 4, type: 'error', user: 'System', avatar: '🤖', project: 'Data Pipeline', time: '15 minutes ago', status: 'error', message: 'Build failed' },
  { id: 5, type: 'deploy', user: 'Sarah Wilson', avatar: '👱‍♀️', project: 'Admin Dashboard', time: '20 minutes ago', status: 'pending' },
];

const ActivityIcon = memo(({ type }: { type: ActivityItem['type'] }) => {
  switch (type) {
    case 'deploy':
      return <Rocket className="h-4 w-4" />;
    case 'commit':
      return <GitCommit className="h-4 w-4" />;
    case 'build':
      return <Package className="h-4 w-4" />;
    case 'error':
      return <AlertCircle className="h-4 w-4" />;
    case 'success':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return null;
  }
});

const ActivityFeed = memo(function ActivityFeed() {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  const itemVariants = useMemo(() => ({
    hidden: prefersReducedMotion ? {} : { opacity: 0, x: -20 },
    visible: prefersReducedMotion ? {} : { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    },
    exit: prefersReducedMotion ? {} : { 
      opacity: 0, 
      x: 20,
      transition: { duration: 0.2 }
    }
  }), [prefersReducedMotion]);
  
  return (
    <Card className="contain-layout">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 pr-4">
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {activityFeed.map((item) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex items-start space-x-3 gpu-accelerated"
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                      {item.avatar}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ActivityIcon type={item.type} />
                        <span className="font-medium text-sm">{item.user}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.type === 'deploy' && 'deployed'}
                          {item.type === 'commit' && 'committed to'}
                          {item.type === 'build' && 'built'}
                          {item.type === 'error' && 'error in'}
                        </span>
                        <span className="font-medium text-sm">{item.project}</span>
                      </div>
                      {item.status && (
                        <Badge
                          variant={
                            item.status === 'success' ? 'default' :
                            item.status === 'error' ? 'destructive' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {item.status}
                        </Badge>
                      )}
                    </div>
                    {item.message && (
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

export default ActivityFeed;