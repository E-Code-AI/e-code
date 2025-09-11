import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { TouchOptimizedButton } from '@/components/ui/touch-optimized';
import { useIsMobile, useIsTouch } from '@/hooks/use-responsive';
import { 
  Code, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Zap, 
  Globe, 
  Users,
  ArrowRight,
  Play,
  Check,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileDemoPage() {
  const isMobile = useIsMobile();
  const isTouch = useIsTouch();
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      id: 'responsive',
      title: 'Mobile-First Design',
      description: 'Seamlessly works across all devices with touch-optimized interfaces',
      icon: <Smartphone className="h-6 w-6" />,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'pwa',
      title: 'Progressive Web App',
      description: 'Install on your device for a native app experience with offline support',
      icon: <Globe className="h-6 w-6" />,
      color: 'from-green-500 to-teal-500'
    },
    {
      id: 'collaboration',
      title: 'Real-time Collaboration',
      description: 'Code together in real-time with your team from any device',
      icon: <Users className="h-6 w-6" />,
      color: 'from-purple-500 to-indigo-500'
    },
    {
      id: 'ai',
      title: 'AI-Powered Development',
      description: 'Advanced AI assistance optimized for mobile coding workflows',
      icon: <Zap className="h-6 w-6" />,
      color: 'from-orange-500 to-red-500'
    }
  ];

  const devices = [
    { name: 'Mobile', icon: <Smartphone className="h-8 w-8" />, active: isMobile },
    { name: 'Tablet', icon: <Tablet className="h-8 w-8" />, active: !isMobile && window.innerWidth < 1024 },
    { name: 'Desktop', icon: <Monitor className="h-8 w-8" />, active: window.innerWidth >= 1024 }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        
        <div className="relative z-10 container mx-auto px-4 pt-20 pb-16">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white/90">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              Now optimized for mobile development
            </div>
            
            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className={cn(
                "font-bold text-white leading-tight",
                isMobile ? "text-4xl" : "text-6xl"
              )}>
                Code Anywhere,
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Anytime
                </span>
              </h1>
              
              <p className={cn(
                "text-gray-300 leading-relaxed max-w-2xl mx-auto",
                isMobile ? "text-lg px-4" : "text-xl"
              )}>
                E-Code Platform now features a complete mobile-first design with PWA support, 
                touch-optimized components, and seamless cross-device development experience.
              </p>
            </div>
            
            {/* Device Detection Display */}
            <div className="flex items-center justify-center gap-4 py-6">
              {devices.map((device) => (
                <div
                  key={device.name}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                    device.active 
                      ? "border-blue-400 bg-blue-400/10 text-blue-400"
                      : "border-gray-600 bg-gray-800/50 text-gray-400"
                  )}
                >
                  {device.icon}
                  <span className="text-sm font-medium">{device.name}</span>
                  {device.active && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  )}
                </div>
              ))}
            </div>
            
            {/* Touch Detection */}
            {isTouch && (
              <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2 text-green-400">
                <Check className="h-4 w-4" />
                Touch device detected - Enhanced mobile experience active
              </div>
            )}
            
            {/* CTAs */}
            <div className={cn(
              "flex gap-4",
              isMobile ? "flex-col" : "flex-row justify-center"
            )}>
              <TouchOptimizedButton
                size={isMobile ? "lg" : "md"}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => window.location.href = '/projects'}
              >
                <Play className="h-5 w-5 mr-2" />
                Start Coding Now
              </TouchOptimizedButton>
              
              <TouchOptimizedButton
                size={isMobile ? "lg" : "md"}
                variant="ghost"
                className="border border-white/20 text-white hover:bg-white/10"
                onClick={() => window.location.href = '/features'}
              >
                Explore Features
                <ArrowRight className="h-5 w-5 ml-2" />
              </TouchOptimizedButton>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Showcase */}
      <div className="py-20 bg-black/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className={cn(
              "font-bold text-white mb-4",
              isMobile ? "text-3xl" : "text-4xl"
            )}>
              Mobile-First Development Platform
            </h2>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto">
              Experience the power of a truly responsive development environment 
              that adapts to your device and workflow.
            </p>
          </div>
          
          <div className={cn(
            "grid gap-8",
            isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"
          )}>
            {features.map((feature, index) => (
              <div
                key={feature.id}
                className={cn(
                  "relative p-6 rounded-xl border transition-all duration-300 cursor-pointer",
                  "hover:scale-105 hover:shadow-xl",
                  activeFeature === index
                    ? "border-blue-400 bg-blue-400/10 shadow-blue-400/20 shadow-lg"
                    : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                )}
                onClick={() => setActiveFeature(index)}
              >
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-gradient-to-r",
                  feature.color
                )}>
                  {feature.icon}
                </div>
                
                <h3 className="text-white font-semibold text-lg mb-2">
                  {feature.title}
                </h3>
                
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
                
                {activeFeature === index && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 to-purple-400/5 rounded-xl" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Mobile Experience Demo */}
      <div className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className={cn(
                "font-bold text-white mb-4",
                isMobile ? "text-3xl" : "text-4xl"
              )}>
                Optimized for Your Device
              </h2>
              <p className="text-gray-300 text-lg">
                Every interaction is designed for your current device
              </p>
            </div>
            
            {/* Device-specific features */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-semibold text-xl mb-4">
                  {isMobile ? "Mobile Features" : "Desktop Features"}
                </h3>
                <ul className="space-y-3 text-gray-300">
                  {isMobile ? (
                    <>
                      <li className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400" />
                        Touch-optimized code editor
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400" />
                        Gesture-based navigation
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400" />
                        Mobile-friendly file explorer
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400" />
                        Bottom navigation bar
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400" />
                        Full-featured code editor
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400" />
                        Multiple panel layout
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400" />
                        Keyboard shortcuts
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-400" />
                        Sidebar navigation
                      </li>
                    </>
                  )}
                </ul>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-semibold text-xl mb-4">
                  Universal Features
                </h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-400" />
                    Real-time collaboration
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-400" />
                    AI-powered assistance
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-400" />
                    Cloud synchronization
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-400" />
                    Offline support (PWA)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className={cn(
            "font-bold text-white mb-6",
            isMobile ? "text-3xl" : "text-4xl"
          )}>
            Ready to Experience Mobile-First Development?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are already coding on the go with E-Code Platform.
          </p>
          
          <div className={cn(
            "flex gap-4",
            isMobile ? "flex-col" : "flex-row justify-center"
          )}>
            <TouchOptimizedButton
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => window.location.href = '/register'}
            >
              Get Started Free
            </TouchOptimizedButton>
            
            <TouchOptimizedButton
              size="lg"
              variant="ghost"
              className="border border-white/30 text-white hover:bg-white/10"
              onClick={() => window.location.href = '/demo'}
            >
              View Demo
            </TouchOptimizedButton>
          </div>
        </div>
      </div>
    </div>
  );
}