import { useState } from 'react';
import { useLocation } from 'wouter';
import { Search, Bell, HelpCircle, User, Menu, X, Bookmark, Share2, MoreVertical } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-media-query";

export function MobileHeader() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // Only render on mobile
  if (!isMobile) return null;
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (isSearchOpen) setIsSearchOpen(false);
  };
  
  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isMenuOpen) setIsMenuOpen(false);
  };
  
  // Main page header
  const renderHomeHeader = () => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 h-10 w-10 touch-target"
          onClick={() => navigate('/projects')}
        >
          <div className="h-6 w-6 bg-[var(--ecode-accent)] rounded-sm"></div>
        </Button>
        
        <div className="bg-[var(--ecode-surface-secondary)] rounded-lg flex items-center px-3 py-2 flex-1 max-w-xs">
          <Search className="h-4 w-4 text-[var(--ecode-text-secondary)] mr-2 flex-shrink-0" />
          <span className="text-sm text-[var(--ecode-text-secondary)] truncate">Search & run commands</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-1 ml-2">
        <Button variant="ghost" size="icon" className="h-10 w-10 touch-target">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 touch-target">
          <HelpCircle className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 touch-target relative">
          {user?.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.username} 
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <User className="h-5 w-5" />
          )}
          {user?.username && (
            <span className="absolute -top-1 -right-1 bg-[var(--ecode-accent)] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {user.username.slice(0, 2).toUpperCase()}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
  
  // Navigation page header
  const renderNavigationHeader = () => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center min-w-0 flex-1">
        <span className="font-medium text-sm mx-2 text-[var(--ecode-text)] truncate">
          {user?.username || 'User'}
        </span>
        <Button variant="ghost" size="sm" className="h-8 touch-target-sm">
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="icon" className="h-10 w-10 touch-target">
          <Bookmark className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 touch-target">
          <Share2 className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 touch-target">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
  
  // Determine which header to show based on route
  const getHeaderContent = () => {
    if (location.startsWith('/projects') || location === '/home' || location === '/dashboard') {
      return renderHomeHeader();
    } else {
      return renderNavigationHeader();
    }
  };
  
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[var(--ecode-surface)] border-b border-[var(--ecode-border)] z-50 md:hidden safe-top">
      <div className="px-container h-full flex items-center">
        {getHeaderContent()}
      </div>
      
      {/* Side navigation menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setIsMenuOpen(false)}>
          <div 
            className="w-4/5 max-w-sm h-full bg-[var(--ecode-surface)] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--ecode-border)]">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-[var(--ecode-accent)]/20 flex items-center justify-center text-[var(--ecode-accent)] mr-3">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[var(--ecode-text)]">{user?.username || 'User'}</div>
                  <div className="text-xs text-[var(--ecode-text-secondary)] truncate">{user?.email || 'user@example.com'}</div>
                </div>
              </div>
            </div>
            
            <nav className="p-2">
              <ul className="space-y-1">
                <li>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left h-12 font-normal touch-target text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
                    onClick={() => {
                      navigate('/projects');
                      setIsMenuOpen(false);
                    }}
                  >
                    <Menu className="h-5 w-5 mr-3" />
                    Create App
                  </Button>
                </li>
                <li>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left h-12 font-normal touch-target text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
                    onClick={() => {
                      navigate('/dashboard');
                      setIsMenuOpen(false);
                    }}
                  >
                    <Menu className="h-5 w-5 mr-3" />
                    Home
                  </Button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}