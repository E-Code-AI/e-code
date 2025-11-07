import { useState } from "react";
import { motion } from "framer-motion";
import { User, Settings, Moon, Sun, LogOut, ChevronRight, Code, Users, Flame, Edit2, Shield, Bell, CreditCard, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";

interface ProfileStat {
  label: string;
  value: string | number;
  icon: React.ElementType;
}

interface SettingItem {
  label: string;
  icon: React.ElementType;
  action?: () => void;
  href?: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
}

export function MobileProfile() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Mock user data
  const user = {
    name: "John Developer",
    username: "@johnddev",
    email: "john@example.com",
    avatar: "/api/placeholder/100/100",
    coverImage: "/api/placeholder/400/200",
    bio: "Full-stack developer passionate about creating amazing web experiences",
    joinedDate: "January 2024",
  };

  const stats: ProfileStat[] = [
    { label: "Projects", value: 24, icon: Code },
    { label: "Followers", value: "1.2k", icon: Users },
    { label: "Streak", value: 15, icon: Flame },
  ];

  const settings: SettingItem[] = [
    {
      label: "Edit Profile",
      icon: Edit2,
      action: () => {
        setIsEditing(true);
        if ('vibrate' in navigator) navigator.vibrate(10);
      },
    },
    {
      label: "Account Settings",
      icon: Settings,
      href: "/settings/account",
    },
    {
      label: "Privacy & Security",
      icon: Shield,
      href: "/settings/privacy",
    },
    {
      label: "Notifications",
      icon: Bell,
      hasToggle: true,
      toggleValue: notificationsEnabled,
      onToggle: (value) => {
        setNotificationsEnabled(value);
        toast({
          title: value ? "Notifications enabled" : "Notifications disabled",
          description: value ? "You'll receive notifications" : "You won't receive notifications",
        });
        if ('vibrate' in navigator) navigator.vibrate(10);
      },
    },
    {
      label: "Billing",
      icon: CreditCard,
      href: "/settings/billing",
    },
    {
      label: "Help & Support",
      icon: HelpCircle,
      href: "/help",
    },
  ];

  const handleSignOut = () => {
    // Haptic feedback
    if ('vibrate' in navigator) navigator.vibrate([10, 10, 10]);
    
    toast({
      title: "Signing out...",
      description: "You'll be redirected to the login page",
    });
    
    // Implement actual sign out logic
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Cover Image & Avatar */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-br from-[#F26207] to-[#F99D25] relative">
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)`,
            }} />
          </div>
        </div>
        
        <div className="relative -mt-12 px-4">
          <div className="flex items-end gap-4">
            <Avatar className="h-24 w-24 border-4 border-background">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-[#F26207] text-white text-2xl">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            {!isEditing && (
              <motion.button
                onClick={() => setIsEditing(true)}
                className="ml-auto mb-2 px-4 py-2 bg-secondary rounded-full text-sm font-medium"
                whileTap={{ scale: 0.95 }}
              >
                Edit Profile
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 mt-4">
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-muted-foreground">{user.username}</p>
        <p className="text-sm text-muted-foreground mt-2">{user.bio}</p>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <span>Joined {user.joinedDate}</span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 px-4 mt-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 text-center hover:shadow-md transition-shadow">
                <Icon className="h-5 w-5 text-[#F26207] mx-auto mb-2" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Settings List */}
      <div className="mt-6 px-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
          Settings
        </h2>
        
        <div className="space-y-1">
          {settings.map((setting, index) => {
            const Icon = setting.icon;
            return (
              <motion.button
                key={setting.label}
                onClick={() => {
                  if (setting.action) {
                    setting.action();
                  } else if (setting.href) {
                    window.location.href = setting.href;
                  }
                  if ('vibrate' in navigator) navigator.vibrate(5);
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 rounded-lg transition-colors group"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-lg group-hover:bg-[#F26207]/10 transition-colors">
                    <Icon className="h-4 w-4 group-hover:text-[#F26207] transition-colors" />
                  </div>
                  <span className="text-sm font-medium">{setting.label}</span>
                </div>
                
                {setting.hasToggle ? (
                  <Switch
                    checked={setting.toggleValue}
                    onCheckedChange={setting.onToggle}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Theme Switcher */}
      <div className="mt-6 px-4">
        <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
          Appearance
        </h2>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-[#F26207]" />
              ) : (
                <Sun className="h-5 w-5 text-[#F26207]" />
              )}
              <div>
                <div className="text-sm font-medium">Theme</div>
                <div className="text-xs text-muted-foreground">
                  {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <motion.button
                onClick={() => {
                  setTheme('light');
                  if ('vibrate' in navigator) navigator.vibrate(5);
                }}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  theme === 'light' 
                    ? "bg-[#F26207]/10 text-[#F26207]" 
                    : "bg-secondary text-muted-foreground"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Sun className="h-4 w-4" />
              </motion.button>
              
              <motion.button
                onClick={() => {
                  setTheme('dark');
                  if ('vibrate' in navigator) navigator.vibrate(5);
                }}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  theme === 'dark' 
                    ? "bg-[#F26207]/10 text-[#F26207]" 
                    : "bg-secondary text-muted-foreground"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Moon className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </Card>
      </div>

      {/* Sign Out Button */}
      <div className="mt-8 px-4 pb-8">
        <Button
          variant="outline"
          className="w-full justify-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}