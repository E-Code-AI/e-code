import { useState, useEffect } from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone, Code, Cloud, Users, Zap, Shield, 
  Terminal, Sparkles, Globe, Palette, Play, 
  FileCode, Package, GitBranch, Layers, 
  Wifi, Download, Star, ChevronRight, QrCode,
  Apple, Chrome, ArrowRight, Check
} from 'lucide-react';
import { useLocation } from 'wouter';

export default function Mobile() {
  const [, navigate] = useLocation();
  const [activeFeature, setActiveFeature] = useState(0);

  // Auto-rotate features every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      id: 'editor',
      icon: <Code className="h-6 w-6" />,
      title: 'Full-Featured Editor',
      description: 'Syntax highlighting, autocomplete, and multi-file editing',
      image: '/mobile-editor.png',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'terminal',
      icon: <Terminal className="h-6 w-6" />,
      title: 'Integrated Terminal',
      description: 'Run commands, install packages, and debug your code',
      image: '/mobile-terminal.png',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'ai',
      icon: <Sparkles className="h-6 w-6" />,
      title: 'AI Assistant',
      description: 'Get code suggestions and explanations on the go',
      image: '/mobile-ai.png',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'preview',
      icon: <Globe className="h-6 w-6" />,
      title: 'Live Preview',
      description: 'See your web apps running in real-time',
      image: '/mobile-preview.png',
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'collab',
      icon: <Users className="h-6 w-6" />,
      title: 'Real-time Collaboration',
      description: 'Code together with your team from anywhere',
      image: '/mobile-collab.png',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      id: 'git',
      icon: <GitBranch className="h-6 w-6" />,
      title: 'Version Control',
      description: 'Commit, push, and manage branches on mobile',
      image: '/mobile-git.png',
      color: 'from-teal-500 to-blue-500'
    }
  ];

  const capabilities = [
    {
      icon: <FileCode className="h-5 w-5" />,
      title: '50+ Languages',
      description: 'Python, JavaScript, Go, Rust, and more'
    },
    {
      icon: <Package className="h-5 w-5" />,
      title: 'Package Management',
      description: 'npm, pip, cargo - all at your fingertips'
    },
    {
      icon: <Layers className="h-5 w-5" />,
      title: 'Multi-file Projects',
      description: 'Work with complex codebases on mobile'
    },
    {
      icon: <Wifi className="h-5 w-5" />,
      title: 'Offline Mode',
      description: 'Code without internet, sync when connected'
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'Secure Storage',
      description: 'Your code is encrypted and protected'
    },
    {
      icon: <Cloud className="h-5 w-5" />,
      title: 'Cloud Sync',
      description: 'Seamless sync across all devices'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Full Stack Developer',
      avatar: 'SC',
      content: 'I can review PRs and fix bugs during my commute. The mobile experience is incredibly smooth!',
      rating: 5
    },
    {
      name: 'Alex Rivera',
      role: 'Student',
      avatar: 'AR',
      content: 'Perfect for learning on the go. I practice coding problems between classes.',
      rating: 5
    },
    {
      name: 'Marcus Johnson',
      role: 'DevOps Engineer',
      avatar: 'MJ',
      content: 'Being able to SSH and run scripts from my phone has saved me countless times.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(var(--primary),0.2),transparent_50%)]" />
          
          <div className="relative py-20 px-4">
            <div className="container mx-auto max-w-7xl">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="text-center lg:text-left space-y-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Available on iOS & Android</span>
                  </div>
                  
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold">
                    Code on the go with
                    <span className="block mt-2 bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      E-Code Mobile
                    </span>
                  </h1>
                  
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                    The full power of E-Code in your pocket. Write, run, and deploy code 
                    from anywhere with our native mobile apps.
                  </p>
                  
                  {/* Download buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <a 
                      href="https://apps.apple.com/app/ecode" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-lg bg-black p-[1px] transition-all hover:scale-105"
                    >
                      <div className="relative flex items-center gap-3 bg-black px-6 py-3 rounded-lg">
                        <Apple className="h-8 w-8 text-white" />
                        <div className="text-left">
                          <p className="text-xs text-gray-300">Download on the</p>
                          <p className="text-lg font-semibold text-white">App Store</p>
                        </div>
                      </div>
                    </a>
                    
                    <a 
                      href="https://play.google.com/store/apps/details?id=com.ecode.app" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-lg bg-black p-[1px] transition-all hover:scale-105"
                    >
                      <div className="relative flex items-center gap-3 bg-black px-6 py-3 rounded-lg">
                        <Chrome className="h-8 w-8 text-white" />
                        <div className="text-left">
                          <p className="text-xs text-gray-300">Get it on</p>
                          <p className="text-lg font-semibold text-white">Google Play</p>
                        </div>
                      </div>
                    </a>
                  </div>
                  
                  {/* QR Code section */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg max-w-fit mx-auto lg:mx-0">
                    <QrCode className="h-16 w-16 text-muted-foreground" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Scan to download</p>
                      <p className="text-xs text-muted-foreground">Or visit ecode.com/mobile</p>
                    </div>
                  </div>
                </div>
                
                {/* Interactive Phone Mockup */}
                <div className="relative">
                  <div className="relative mx-auto w-[320px] h-[640px]">
                    {/* Phone frame */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 rounded-[3rem] shadow-2xl">
                      {/* Screen */}
                      <div className="absolute inset-[14px] bg-black rounded-[2.5rem] overflow-hidden">
                        {/* Dynamic content based on active feature */}
                        <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-black">
                          {/* Status bar */}
                          <div className="absolute top-0 left-0 right-0 h-10 bg-black/50 flex items-center justify-between px-6 text-white text-xs">
                            <span>9:41</span>
                            <div className="flex gap-1">
                              <div className="w-4 h-3 bg-white rounded-sm"></div>
                              <div className="w-4 h-3 bg-white rounded-sm"></div>
                              <div className="w-4 h-3 bg-white rounded-sm"></div>
                            </div>
                          </div>
                          
                          {/* App content */}
                          <div className="pt-10 h-full">
                            <div className={`absolute inset-x-0 top-10 bottom-0 bg-gradient-to-br ${features[activeFeature].color} opacity-20`} />
                            <div className="relative p-6 text-white">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-white/20 rounded-xl">
                                  {features[activeFeature].icon}
                                </div>
                                <h3 className="text-xl font-semibold">{features[activeFeature].title}</h3>
                              </div>
                              <p className="text-sm text-gray-300">{features[activeFeature].description}</p>
                              
                              {/* Feature-specific content */}
                              <div className="mt-6 bg-black/30 rounded-lg p-4">
                                {activeFeature === 0 && (
                                  <pre className="text-xs text-green-400">
{`function hello() {
  console.log("Hello from mobile!");
  return "E-Code Mobile";
}`}
                                  </pre>
                                )}
                                {activeFeature === 1 && (
                                  <div className="text-xs text-green-400 font-mono">
                                    $ npm install express<br />
                                    $ node server.js<br />
                                    Server running on port 3000...
                                  </div>
                                )}
                                {activeFeature === 2 && (
                                  <div className="text-xs space-y-2">
                                    <div className="bg-purple-500/20 p-2 rounded">
                                      <Sparkles className="h-3 w-3 inline mr-1" />
                                      AI: "Here's how to optimize this function..."
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Phone details */}
                    <div className="absolute -left-[2px] top-[120px] w-[3px] h-[60px] bg-gray-700 rounded-r-lg"></div>
                    <div className="absolute -left-[2px] top-[200px] w-[3px] h-[60px] bg-gray-700 rounded-r-lg"></div>
                    <div className="absolute -right-[2px] top-[160px] w-[3px] h-[80px] bg-gray-700 rounded-l-lg"></div>
                  </div>
                  
                  {/* Feature selector dots */}
                  <div className="flex justify-center gap-2 mt-8">
                    {features.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveFeature(index)}
                        className={`h-2 w-2 rounded-full transition-all ${
                          index === activeFeature 
                            ? 'w-8 bg-primary' 
                            : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Showcase */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                Mobile Features
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Everything you need, <span className="text-primary">anywhere you are</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Our mobile apps are built from the ground up for touch, with all the power of the desktop experience
              </p>
            </div>

            <Tabs defaultValue="editor" className="w-full">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full max-w-4xl mx-auto mb-12">
                {features.map((feature) => (
                  <TabsTrigger key={feature.id} value={feature.id} className="gap-2">
                    {feature.icon}
                    <span className="hidden md:inline">{feature.title.split(' ')[0]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {features.map((feature) => (
                <TabsContent key={feature.id} value={feature.id} className="mt-0">
                  <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color}`}>
                        {feature.icon}
                      </div>
                      <h3 className="text-3xl font-bold">{feature.title}</h3>
                      <p className="text-lg text-muted-foreground">{feature.description}</p>
                      
                      {/* Feature-specific details */}
                      <ul className="space-y-3">
                        {feature.id === 'editor' && (
                          <>
                            <li className="flex items-center gap-3">
                              <Check className="h-5 w-5 text-primary" />
                              <span>IntelliSense and autocomplete</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <Check className="h-5 w-5 text-primary" />
                              <span>Multi-cursor editing</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <Check className="h-5 w-5 text-primary" />
                              <span>Find and replace with regex</span>
                            </li>
                          </>
                        )}
                        {feature.id === 'terminal' && (
                          <>
                            <li className="flex items-center gap-3">
                              <Check className="h-5 w-5 text-primary" />
                              <span>Full Linux terminal</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <Check className="h-5 w-5 text-primary" />
                              <span>Package manager support</span>
                            </li>
                            <li className="flex items-center gap-3">
                              <Check className="h-5 w-5 text-primary" />
                              <span>SSH and remote access</span>
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                    
                    {/* Feature mockup */}
                    <div className="relative">
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} blur-3xl opacity-20`} />
                      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-2xl">
                        <div className="bg-black rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                          <div className="text-center text-white/50">
                            {feature.icon}
                            <p className="mt-4">{feature.title} Demo</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </section>

        {/* Capabilities Grid */}
        <section className="py-24 px-4 bg-muted/50">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Professional development, <span className="text-primary">pocket-sized</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                No compromises. Get the full development experience on your mobile device.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {capabilities.map((capability, index) => (
                <Card key={index} className="group hover:shadow-xl transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform">
                      {capability.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{capability.title}</h3>
                    <p className="text-muted-foreground">{capability.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Comparison */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Why developers choose <span className="text-primary">E-Code Mobile</span>
              </h2>
            </div>

            <div className="bg-muted/50 rounded-2xl p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-bold mb-6 text-red-500">Other Mobile Code Editors</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                        <span className="text-red-500 text-sm">✗</span>
                      </div>
                      <span className="text-muted-foreground">Limited language support</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                        <span className="text-red-500 text-sm">✗</span>
                      </div>
                      <span className="text-muted-foreground">No package management</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                        <span className="text-red-500 text-sm">✗</span>
                      </div>
                      <span className="text-muted-foreground">Basic text editing only</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5">
                        <span className="text-red-500 text-sm">✗</span>
                      </div>
                      <span className="text-muted-foreground">No collaboration features</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-6 text-primary">E-Code Mobile</h3>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <span>50+ languages with full IDE features</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <span>Built-in package managers</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <span>Full terminal and debugging</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <span>Real-time collaboration</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-4 bg-gradient-to-b from-background to-muted/50">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Loved by <span className="text-primary">2M+ developers</span>
              </h2>
              <div className="flex items-center justify-center gap-3 mt-6">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <span className="text-lg font-semibold">4.8/5</span>
                <span className="text-muted-foreground">(10,000+ reviews)</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="hover:shadow-xl transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                    <div className="flex mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>
                    <p className="text-muted-foreground">{testimonial.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to code anywhere?
            </h2>
            <p className="text-xl text-muted-foreground mb-12">
              Join millions of developers who code on the go with E-Code Mobile
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
              <a 
                href="https://apps.apple.com/app/ecode" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-lg bg-black p-[1px] transition-all hover:scale-105"
              >
                <div className="relative flex items-center gap-3 bg-black px-8 py-4 rounded-lg">
                  <Apple className="h-10 w-10 text-white" />
                  <div className="text-left">
                    <p className="text-sm text-gray-300">Download on the</p>
                    <p className="text-xl font-semibold text-white">App Store</p>
                  </div>
                </div>
              </a>
              
              <a 
                href="https://play.google.com/store/apps/details?id=com.ecode.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-lg bg-black p-[1px] transition-all hover:scale-105"
              >
                <div className="relative flex items-center gap-3 bg-black px-8 py-4 rounded-lg">
                  <Chrome className="h-10 w-10 text-white" />
                  <div className="text-left">
                    <p className="text-sm text-gray-300">Get it on</p>
                    <p className="text-xl font-semibold text-white">Google Play</p>
                  </div>
                </div>
              </a>
            </div>

            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/features')}
              className="gap-2"
            >
              Explore all features
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}