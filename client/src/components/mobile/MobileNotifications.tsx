import { Avatar,AvatarFallback,AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LazyAnimatePresence,LazyMotionDiv } from '@/lib/motion';
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle,Bell,ChevronLeft,Code,Heart,MessageCircle,UserPlus,X } from "lucide-react";
import { useEffect,useRef,useState } from "react";

type NotificationType = 'mention' | 'like' | 'follow' | 'comment' | 'deploy' | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  user?: {
    name: string;
    avatar?: string;
  };
  projectName?: string;
  actionUrl?: string;
}

const notificationIcons: Record<NotificationType, React.ElementType> = {
  mention: MessageCircle,
  like: Heart,
  follow: UserPlus,
  comment: MessageCircle,
  deploy: Code,
  system: AlertCircle,
};

const notificationColors: Record<NotificationType, string> = {
  mention: "text-blue-500",
  like: "text-pink-500",
  follow: "text-green-500",
  comment: "text-purple-500",
  deploy: "text-primary",
  system: "text-yellow-500",
};

export function MobileNotifications() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [swipedItem, setSwipedItem] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizeNotifications = (items: any[]): Notification[] =>
    items.map((item) => ({
      id: String(item.id),
      type: notificationIcons[item.type as NotificationType] ? item.type : 'system',
      title: item.title || item.subject || 'Notification',
      description: item.description || item.body || item.message || '',
      timestamp: new Date(item.createdAt || item.timestamp || Date.now()),
      read: Boolean(item.read ?? item.isRead),
      user: item.user,
      projectName: item.projectName,
      actionUrl: item.actionUrl,
    }));

  const fetchNotifications = async () => {
    const data = await apiRequest<any[]>('GET', '/api/notifications');
    setNotifications(normalizeNotifications(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetchNotifications().catch((error) => {
      toast({
        title: "Notifications unavailable",
        description: error.message || "Unable to load notifications",
        variant: "destructive",
      });
    });
  }, []);

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const today = new Date();
    const notifDate = new Date(notification.timestamp);
    let dateKey: string;
    
    if (today.toDateString() === notifDate.toDateString()) {
      dateKey = 'Today';
    } else if (new Date(today.getTime() - 86400000).toDateString() === notifDate.toDateString()) {
      dateKey = 'Yesterday';
    } else {
      dateKey = notifDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(notification);
    
    return groups;
  }, {} as Record<string, Notification[]>);

  const handleMarkAsRead = (id: string) => {
    const previous = notifications;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(5);
    
    apiRequest('PATCH', `/api/notifications/${id}/read`).catch((error) => {
      setNotifications(previous);
      toast({
        title: "Update failed",
        description: error.message || "Notification was not marked as read",
        variant: "destructive",
      });
    });
  };

  const handleMarkAllAsRead = () => {
    const previous = notifications;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(10);
    
    apiRequest('PATCH', '/api/notifications/read-all').catch((error) => {
      setNotifications(previous);
      toast({
        title: "Update failed",
        description: error.message || "Notifications were not marked as read",
        variant: "destructive",
      });
    });
  };

  const handleDelete = (id: string) => {
    const previous = notifications;
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate([10, 10]);
    
    apiRequest('DELETE', `/api/notifications/${id}`).catch((error) => {
      setNotifications(previous);
      toast({
        title: "Delete failed",
        description: error.message || "Notification was not removed",
        variant: "destructive",
      });
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate(10);
    
    try {
      await fetchNotifications();
    } catch (error: any) {
      toast({
        title: "Refresh failed",
        description: error.message || "Unable to refresh notifications",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Pull to refresh
  useEffect(() => {
    let startY = 0;
    let currentY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;
      
      if (pullDistance > 0 && containerRef.current?.scrollTop === 0) {
        e.preventDefault();
        
        if (pullDistance > 80 && !isRefreshing) {
          handleRefresh();
        }
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [isRefreshing]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="mobile-touch-target"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-[15px] font-semibold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-primary"
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Pull to refresh indicator */}
      <LazyAnimatePresence>
        {isRefreshing && (
          <LazyMotionDiv
            className="absolute top-16 left-0 right-0 z-20 flex justify-center py-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-secondary rounded-full p-3">
              <LazyMotionDiv
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Bell className="h-5 w-5 text-primary" />
              </LazyMotionDiv>
            </div>
          </LazyMotionDiv>
        )}
      </LazyAnimatePresence>

      {/* Notifications List */}
      <div ref={containerRef} className="pb-20 overflow-y-auto">
        {Object.keys(groupedNotifications).length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="p-4 bg-surface-solid rounded-full mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-[15px] font-semibold mb-2">No notifications</h3>
            <p className="text-[13px] text-muted-foreground text-center">
              When you receive notifications, they'll appear here
            </p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([date, notifs]) => (
            <div key={date}>
              <div className="px-4 py-2 bg-surface-solid sticky top-0 z-10">
                <h2 className="text-[11px] font-medium text-muted-foreground">
                  {date}
                </h2>
              </div>
              
              {notifs.map((notification, index) => {
                const Icon = notificationIcons[notification.type];
                const isSwipedLeft = swipedItem === notification.id;
                
                return (
                  <LazyMotionDiv
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ 
                      opacity: 1, 
                      x: isSwipedLeft ? -80 : 0 
                    }}
                    transition={{ delay: index * 0.05 }}
                    drag="x"
                    dragConstraints={{ left: -80, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -50) {
                        setSwipedItem(notification.id);
                      } else if (info.offset.x > 50) {
                        handleMarkAsRead(notification.id);
                      } else {
                        setSwipedItem(null);
                      }
                    }}
                    className={cn(
                      "relative px-4 py-3 border-b transition-colors",
                      !notification.read && "bg-primary/5",
                      "active:bg-surface-tertiary-solid"
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Icon or Avatar */}
                      <div className="flex-shrink-0">
                        {notification.user ? (
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={notification.user.avatar} />
                            <AvatarFallback className="text-[11px]">
                              {notification.user.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className={cn(
                            "p-2 rounded-full",
                            notification.type === 'system' 
                              ? "bg-yellow-100 dark:bg-yellow-900/30"
                              : "bg-secondary"
                          )}>
                            <Icon className={cn("h-5 w-5", notificationColors[notification.type])} />
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className={cn(
                              "text-[13px] font-medium",
                              !notification.read && "text-foreground"
                            )}>
                              {notification.title}
                            </p>
                            <p className="text-[13px] text-muted-foreground mt-0.5">
                              {notification.description}
                            </p>
                            {notification.projectName && (
                              <Badge 
                                variant="secondary" 
                                className="mt-2 text-[11px]"
                              >
                                {notification.projectName}
                              </Badge>
                            )}
                          </div>
                          
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          )}
                        </div>
                        
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    
                    {/* Swipe actions */}
                    <LazyAnimatePresence>
                      {isSwipedLeft && (
                        <LazyMotionDiv
                          className="absolute right-0 top-0 bottom-0 flex items-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="h-full px-6 bg-red-500 text-white"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </LazyMotionDiv>
                      )}
                    </LazyAnimatePresence>
                  </LazyMotionDiv>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}