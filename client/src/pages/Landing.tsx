import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  Zap, Globe, Users, Shield, Code, Terminal, GitBranch, 
  Rocket, Package, Database, Cpu, Cloud, Lock, Star,
  ChevronRight, ArrowRight, CheckCircle, PlayCircle,
  Sparkles, Check, Loader2, MessageSquare, Bot, ShoppingCart,
  Play, Pause, Volume2, VolumeX, Maximize, Globe2,
  BookOpen, Store, Briefcase, ListTodo, CloudSun, PenTool,
  Layers, BarChart3, Settings, Palette, Workflow, Brain,
  TrendingUp, Users2, Building2, Award, Timer, Gauge,
  FileCode2, Server, Smartphone, Monitor, Laptop
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { MobileChatInterface } from '@/components/MobileChatInterface';
import { AnimatedPlatformDemo } from '@/components/AnimatedPlatformDemo';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import { getProjectUrl } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { AIModelSelector } from '@/components/ai/AIModelSelector';
import { 
  SiPython, SiJavascript, SiHtml5, SiCss3,
  SiTypescript, SiGo, SiReact, SiNodedotjs, SiSpring,
  SiRust, SiPhp, SiOpenjdk, SiDocker, SiKubernetes,
  SiAmazon, SiGoogle
} from 'react-icons/si';

// Import stock images
import cloudComputingImg from '@assets/stock_images/cloud_computing_tech_ffd053c9.jpg';
import modernSoftwareImg from '@assets/stock_images/modern_software_deve_ff7f5fd4.jpg';
import codingWorkspaceImg from '@assets/stock_images/coding_programming_l_3c65a90d.jpg';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { duration: 0.5 }
};

export default function Landing() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appDescription, setAppDescription] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  // Check if user just registered and needs to trigger workspace creation
  useEffect(() => {
    const triggerBuild = sessionStorage.getItem('triggerBuildOnLanding');
    const pendingPrompt = sessionStorage.getItem('pendingAppDescription');
    
    if (user && triggerBuild === 'true' && pendingPrompt) {
      // Clear the flags
      sessionStorage.removeItem('triggerBuildOnLanding');
      
      // Trigger workspace creation
      handleStartBuilding(pendingPrompt);
    }
  }, [user]);

  // Fetch real templates from database
  const { data: templates = [], isLoading: templatesLoading } = useQuery<any[]>({
    queryKey: ['/api/marketplace/templates'],
    enabled: true
  });

  // Professional feature set
  const features = [
    {
      icon: <Rocket className="h-6 w-6" />,
      title: 'Enterprise-Grade Infrastructure',
      description: 'Built on Fortune 500 standards with 99.99% uptime SLA, auto-scaling, and global CDN distribution'
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: 'AI-Powered Development',
      description: 'Advanced AI agents that understand context, write production code, and deploy automatically'
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Bank-Level Security',
      description: 'SOC 2 Type II certified with end-to-end encryption, RBAC, and continuous security monitoring'
    },
    {
      icon: <Users2 className="h-6 w-6" />,
      title: 'Real-Time Collaboration',
      description: 'Multiple developers can code simultaneously with instant sync and conflict resolution'
    },
    {
      icon: <Gauge className="h-6 w-6" />,
      title: '10x Faster Development',
      description: 'Ship features in minutes instead of months with our optimized development pipeline'
    },
    {
      icon: <Globe2 className="h-6 w-6" />,
      title: 'Global Edge Deployment',
      description: 'Deploy to 200+ edge locations worldwide with automatic SSL and DDoS protection'
    }
  ];

  // Enterprise testimonials
  const testimonials = [
    {
      quote: "E-Code reduced our development time by 85% and saved us $2M annually in engineering costs.",
      author: "Sarah Chen",
      role: "CTO, Fortune 500 Tech Company",
      company: "TechCorp Global",
      avatar: "SC"
    },
    {
      quote: "The AI agent built our entire customer portal in 3 days. What used to take months now takes hours.",
      author: "Michael Rodriguez",
      role: "VP Engineering, Series C Startup",
      company: "InnovateTech",
      avatar: "MR"
    },
    {
      quote: "Best development platform we've used. Our team productivity increased by 400% in the first month.",
      author: "Emily Watson",
      role: "Director of Engineering, Enterprise SaaS",
      company: "CloudScale Solutions",
      avatar: "EW"
    }
  ];

  // Stats for credibility
  const stats = [
    { label: 'Active Developers', value: '2M+', icon: <Users className="h-5 w-5" /> },
    { label: 'Apps Deployed', value: '10M+', icon: <Rocket className="h-5 w-5" /> },
    { label: 'Lines of Code', value: '5B+', icon: <FileCode2 className="h-5 w-5" /> },
    { label: 'Uptime SLA', value: '99.99%', icon: <TrendingUp className="h-5 w-5" /> }
  ];

  const handleStartBuilding = async (description: string) => {
    console.log('[Landing] 🚀 handleStartBuilding called with description:', description);
    console.log('[Landing] User status:', user ? `authenticated (${user.id})` : 'anonymous');
    
    // Store the app description for post-auth use
    sessionStorage.setItem('pendingAppDescription', description);
    setChatOpen(false);
    
    try {
      console.log('[Landing] Calling bootstrap API...');
      // ✅ FIX (Nov 24, 2025): Support anonymous workspace creation for "No credit card required" promise
      // Bootstrap API now accepts both authenticated and anonymous users
      const result = await apiRequest('POST', '/api/workspace/bootstrap', {
        prompt: description,
        autoStart: true
      }) as any;

      console.log('[Landing] Bootstrap API response:', result);

      if (result.success) {
        console.log('[Landing] Bootstrap successful, navigating to IDE...');
        toast({
          title: 'Creating your workspace...',
          description: 'AI is generating your project structure now',
        });

        // Redirect to IDE with bootstrap token - triggers autonomous workspace viewer
        navigate(`/ide/${result.projectId}?bootstrap=${result.bootstrapToken}`);
      } else {
        throw new Error(result.error || 'Bootstrap failed');
      }
    } catch (error) {
      console.error('[Landing] ❌ Failed to bootstrap workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to create workspace. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const { toast } = useToast();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = await apiRequest('POST', '/api/newsletter/subscribe', { email }) as any;
      toast({ title: "Success!", description: data.message || "You've been subscribed!" });
      setEmail('');
      setTimeout(() => navigate('/auth'), 1500);
    } catch (error) {
      toast({ title: "Error", description: "Failed to subscribe. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MarketingLayout>
      {/* Hero Section with Background Image */}
      <motion.section 
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Background Image with Parallax */}
        <motion.div 
          className="absolute inset-0 z-0"
          style={{ y }}
        >
          <img 
            src={cloudComputingImg} 
            alt="Cloud Computing Technology"
            className="w-full h-full object-cover opacity-10 dark:opacity-5"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
        </motion.div>

        {/* Animated Grid Background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10" />
        
        {/* Content */}
        <div className="container-responsive relative z-10 max-w-7xl text-center px-4 py-20">
          <motion.div 
            className="space-y-8"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Badge */}
            <motion.div variants={fadeInUp}>
              <Badge 
                variant="secondary" 
                className="mx-auto inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 border-violet-600/20 dark:from-violet-400/10 dark:to-fuchsia-400/10 dark:border-violet-400/20"
              >
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                AI-Powered Enterprise Development Platform
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </Badge>
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight"
              variants={fadeInUp}
            >
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Build & Deploy
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
                Production Apps
              </span>
              <br />
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                in Minutes
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p 
              className="mx-auto max-w-3xl text-xl sm:text-2xl text-gray-600 dark:text-gray-400 font-medium"
              variants={fadeInUp}
            >
              The only platform that combines AI agents, cloud infrastructure, and enterprise security 
              to deliver Fortune 500 development velocity to every team.
            </motion.p>

            {/* AI Model Selection */}
            <motion.div
              className="max-w-4xl mx-auto mt-8"
              variants={fadeInUp}
            >
              <div className="flex justify-center">
                <AIModelSelector variant="card" className="w-full max-w-2xl" />
              </div>
            </motion.div>

            {/* AI Input Section */}
            <motion.div 
              className="max-w-4xl mx-auto mt-8"
              variants={fadeInUp}
            >
              <div className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition duration-300" />
                
                {/* Input Container */}
                <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Describe your app idea in any language..."
                        className="w-full bg-transparent border-none outline-none text-lg placeholder:text-gray-400 dark:placeholder:text-gray-500 px-6 py-4 font-normal"
                        value={appDescription}
                        onChange={(e) => setAppDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && appDescription.trim()) {
                            handleStartBuilding(appDescription);
                          }
                        }}
                      />
                    </div>
                    <Button 
                      size="lg"
                      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg px-8 py-4 text-lg font-semibold h-auto rounded-xl transition-all duration-200 transform hover:scale-105"
                      onClick={() => {
                        if (appDescription.trim()) {
                          handleStartBuilding(appDescription);
                        }
                      }}
                      disabled={!appDescription.trim()}
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Build Now
                    </Button>
                  </div>
                </div>
              </div>

              {/* Popular Examples Below Input */}
              <motion.div 
                className="mt-8 space-y-4"
                variants={fadeInUp}
              >
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Try these popular examples:
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {[
                    { icon: <ShoppingCart className="h-4 w-4" />, text: "E-commerce store with Stripe payments", color: "from-purple-600 to-pink-600" },
                    { icon: <MessageSquare className="h-4 w-4" />, text: "Real-time chat app with websockets", color: "from-blue-600 to-cyan-600" },
                    { icon: <Bot className="h-4 w-4" />, text: "AI chatbot with OpenAI GPT-4", color: "from-green-600 to-emerald-600" },
                    { icon: <Globe className="h-4 w-4" />, text: "Social media dashboard with analytics", color: "from-orange-600 to-red-600" },
                    { icon: <Briefcase className="h-4 w-4" />, text: "SaaS landing page with auth", color: "from-indigo-600 to-purple-600" },
                    { icon: <ListTodo className="h-4 w-4" />, text: "Project management tool like Jira", color: "from-teal-600 to-cyan-600" }
                  ].map((example, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setAppDescription(example.text);
                        handleStartBuilding(example.text);
                      }}
                      className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-violet-600 dark:hover:border-violet-400 transition-all duration-200 hover:scale-105"
                    >
                      <div className={`bg-gradient-to-r ${example.color} bg-clip-text text-transparent`}>
                        {example.icon}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {example.text}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Features below input */}
              <motion.div 
                className="flex flex-wrap justify-center gap-4 mt-6"
                variants={fadeInUp}
              >
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Deploy instantly
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Scale to millions
                </div>
              </motion.div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8"
              variants={fadeInUp}
            >
              <Button 
                size="lg"
                variant="outline"
                className="gap-2 px-8 py-6 text-lg border-2"
                onClick={() => {
                  const demoSection = document.getElementById('video-demo');
                  demoSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <PlayCircle className="h-5 w-5" />
                Watch Demo (2 min)
              </Button>
              <Button 
                size="lg"
                variant="ghost"
                className="gap-2 px-8 py-6 text-lg"
                onClick={() => navigate('/pricing')}
              >
                View Pricing
                <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronRight className="h-8 w-8 text-gray-400 rotate-90" />
        </motion.div>
      </motion.section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-b from-background to-gray-50 dark:to-gray-900/50">
        <div className="container-responsive max-w-7xl">
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {stats.map((stat, index) => (
              <motion.div 
                key={index}
                className="text-center"
                variants={fadeInUp}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 mb-3">
                  {stat.icon}
                </div>
                <div className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section id="video-demo" className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="container-responsive max-w-7xl">
          <motion.div 
            className="text-center mb-12"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="text-4xl sm:text-5xl font-bold mb-4"
              variants={fadeInUp}
            >
              See E-Code Platform in Action
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
              variants={fadeInUp}
            >
              Watch a real demo: Build and deploy a full-stack application in under 2 minutes using AI agents
            </motion.p>
          </motion.div>

          <motion.div 
            className="relative max-w-5xl mx-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Video Container */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gray-900">
              {/* Video Placeholder */}
              <div className="relative aspect-video bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  poster={modernSoftwareImg}
                  controls={false}
                  muted={isMuted}
                  loop
                  playsInline
                >
                  <source src="/assets/platform-demo.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Custom Controls Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                
                {/* Play Button */}
                <button
                  className="absolute inset-0 flex items-center justify-center group"
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlaying) {
                        videoRef.current.pause();
                      } else {
                        videoRef.current.play();
                      }
                      setIsPlaying(!isPlaying);
                    }
                  }}
                >
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isPlaying ? (
                      <Pause className="h-8 w-8 text-white ml-0" />
                    ) : (
                      <Play className="h-8 w-8 text-white ml-1" />
                    )}
                  </div>
                </button>

                {/* Video Controls Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center gap-4">
                  <button
                    className="text-white hover:text-gray-300 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMuted(!isMuted);
                      if (videoRef.current) {
                        videoRef.current.muted = !isMuted;
                      }
                    }}
                  >
                    {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                  
                  <div className="flex-1" />
                  
                  <button
                    className="text-white hover:text-gray-300 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (videoRef.current) {
                        videoRef.current.requestFullscreen();
                      }
                    }}
                  >
                    <Maximize className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Video Description */}
            <div className="mt-8 text-center">
              <h3 className="text-lg font-semibold mb-2">Live Platform Demo</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Watch how E-Code Platform's AI agent builds a complete full-stack application with database, authentication, 
                and deployment - all from a single prompt
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                <Badge variant="secondary">AI Code Generation</Badge>
                <Badge variant="secondary">Real-time Preview</Badge>
                <Badge variant="secondary">Instant Deployment</Badge>
                <Badge variant="secondary">Database Setup</Badge>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Projects Showcase - Examples Built with E-Code */}
      <section className="py-20 bg-background">
        <div className="container-responsive max-w-7xl">
          <motion.div 
            className="text-center mb-12"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="text-4xl sm:text-5xl font-bold mb-4"
              variants={fadeInUp}
            >
              Built with E-Code Platform
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
              variants={fadeInUp}
            >
              Real production applications built by our community in hours, not months
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              {
                title: "TechStore Pro",
                description: "Full-featured e-commerce platform with 50K+ daily transactions",
                image: cloudComputingImg,
                tags: ["React", "Node.js", "PostgreSQL", "Stripe"],
                metrics: { users: "100K+", revenue: "$2M/mo", time: "Built in 3 days" },
                creator: "Built by StartupX"
              },
              {
                title: "CollabSpace",
                description: "Real-time collaboration tool used by 500+ remote teams",
                image: modernSoftwareImg,
                tags: ["Next.js", "WebSockets", "Redis", "AI"],
                metrics: { users: "50K+", messages: "10M+", time: "Built in 1 week" },
                creator: "Built by TeamFlow Inc"
              },
              {
                title: "DataViz Pro",
                description: "Analytics dashboard processing 1B+ events daily",
                image: codingWorkspaceImg,
                tags: ["Vue.js", "Python", "MongoDB", "D3.js"],
                metrics: { users: "10K+", events: "1B/day", time: "Built in 5 days" },
                creator: "Built by AnalyticsCo"
              },
              {
                title: "EduLearn Platform",
                description: "Online learning platform with 200K active students",
                image: cloudComputingImg,
                tags: ["React", "Django", "PostgreSQL", "Zoom API"],
                metrics: { students: "200K", courses: "5000+", time: "Built in 2 weeks" },
                creator: "Built by EduTech Global"
              },
              {
                title: "HealthTrack AI",
                description: "AI-powered health monitoring app with FDA approval",
                image: modernSoftwareImg,
                tags: ["React Native", "FastAPI", "TensorFlow", "FHIR"],
                metrics: { patients: "1M+", accuracy: "99.2%", time: "Built in 1 month" },
                creator: "Built by MedTech Solutions"
              },
              {
                title: "CryptoTrade Hub",
                description: "Cryptocurrency trading platform with $100M daily volume",
                image: codingWorkspaceImg,
                tags: ["Angular", "Go", "Redis", "WebSockets"],
                metrics: { volume: "$100M/day", trades: "1M+", time: "Built in 2 weeks" },
                creator: "Built by FinTech Innovations"
              }
            ].map((project, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                whileHover={{ scale: 1.03 }}
                className="group cursor-pointer"
              >
                <Card className="h-full overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-violet-600/20">
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10">
                    <img 
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <h3 className="text-xl font-bold text-white">{project.title}</h3>
                      <p className="text-sm text-gray-200">{project.creator}</p>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      {Object.entries(project.metrics).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {value}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {key === "time" ? "" : key}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate('/explore')}>
              Explore More Projects
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="container-responsive max-w-7xl">
          <motion.div 
            className="text-center mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="text-4xl sm:text-5xl font-bold mb-4"
              variants={fadeInUp}
            >
              Enterprise Features, Startup Speed
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
              variants={fadeInUp}
            >
              Everything you need to build, deploy, and scale production applications
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                whileHover={{ scale: 1.05 }}
                className="group"
              >
                <Card className="h-full border-2 border-transparent hover:border-violet-600/20 dark:hover:border-violet-400/20 transition-all duration-300 shadow-lg hover:shadow-xl">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 dark:from-violet-400/20 dark:to-fuchsia-400/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <div className="text-violet-600 dark:text-violet-400">
                        {feature.icon}
                      </div>
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Showcase Section with Images */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-background dark:from-gray-900/50 dark:to-background">
        <div className="container-responsive max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              <img 
                src={modernSoftwareImg}
                alt="Team Collaboration"
                className="rounded-2xl shadow-2xl"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6 order-1 lg:order-2"
            >
              <Badge variant="outline" className="text-violet-600 dark:text-violet-400 border-violet-600/20 dark:border-violet-400/20">
                Real-Time Collaboration
              </Badge>
              <h3 className="text-4xl font-bold">
                Code Together,
                <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent"> Ship Faster</span>
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Multiple developers can work on the same codebase simultaneously. See changes in real-time, 
                resolve conflicts automatically, and ship features faster than ever before.
              </p>
              <ul className="space-y-3">
                {['Live cursor tracking', 'Instant code sync', 'Voice & video chat', 'Shared debugging'].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="gap-2">
                Try Collaboration
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <Badge variant="outline" className="text-violet-600 dark:text-violet-400 border-violet-600/20 dark:border-violet-400/20">
                AI Development
              </Badge>
              <h3 className="text-4xl font-bold">
                Your AI
                <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent"> Pair Programmer</span>
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Our AI understands your codebase, suggests improvements, writes tests, and even deploys your applications. 
                It's like having a senior developer available 24/7.
              </p>
              <ul className="space-y-3">
                {['Code generation', 'Bug detection & fixes', 'Performance optimization', 'Security scanning'].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="gap-2">
                Explore AI Features
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img 
                src={codingWorkspaceImg}
                alt="Developer Workspace"
                className="rounded-2xl shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Language Support */}
      <section className="py-20 bg-background">
        <div className="container-responsive max-w-7xl text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="text-4xl font-bold mb-4"
              variants={fadeInUp}
            >
              Any Language, Any Framework
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto"
              variants={fadeInUp}
            >
              Build with the tools you love. E-Code supports all major languages and frameworks out of the box.
            </motion.p>
            
            <motion.div 
              className="flex flex-wrap justify-center gap-6"
              variants={fadeInUp}
            >
              {[
                { Icon: SiPython, name: 'Python', color: 'text-orange-500' },
                { Icon: SiJavascript, name: 'JavaScript', color: 'text-yellow-500' },
                { Icon: SiTypescript, name: 'TypeScript', color: 'text-orange-600' },
                { Icon: SiReact, name: 'React', color: 'text-cyan-500' },
                { Icon: SiNodedotjs, name: 'Node.js', color: 'text-green-500' },
                { Icon: SiGo, name: 'Go', color: 'text-cyan-600' },
                { Icon: SiRust, name: 'Rust', color: 'text-orange-600' },
                { Icon: SiPhp, name: 'PHP', color: 'text-purple-500' },
                { Icon: SiOpenjdk, name: 'Java', color: 'text-red-600' },
                { Icon: SiDocker, name: 'Docker', color: 'text-orange-500' },
                { Icon: SiKubernetes, name: 'Kubernetes', color: 'text-orange-600' },
                { Icon: SiSpring, name: 'Spring', color: 'text-green-600' }
              ].map(({ Icon, name, color }, index) => (
                <motion.div
                  key={name}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Icon className={`h-12 w-12 ${color}`} />
                  <span className="text-sm font-medium">{name}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-b from-background to-gray-50 dark:to-gray-900/50">
        <div className="container-responsive max-w-7xl">
          <motion.div 
            className="text-center mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              className="text-4xl sm:text-5xl font-bold mb-4"
              variants={fadeInUp}
            >
              Trusted by Industry Leaders
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 dark:text-gray-400"
              variants={fadeInUp}
            >
              See why thousands of companies choose E-Code
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} variants={scaleIn}>
                <Card className="h-full hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold">{testimonial.author}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{testimonial.role}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">{testimonial.company}</div>
                      </div>
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400 italic">
                      "{testimonial.quote}"
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Enterprise Logos */}
          <motion.div 
            className="mt-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
              Trusted by Fortune 500 companies and startups alike
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
              <SiGoogle className="h-8 w-auto" />
              <span className="text-2xl font-bold">Microsoft</span>
              <SiAmazon className="h-8 w-auto" />
              <span className="text-2xl font-bold">IBM</span>
              <span className="text-2xl font-bold">Oracle</span>
              <span className="text-2xl font-bold">Meta</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
        <div className="container-responsive max-w-4xl text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h2 className="text-4xl sm:text-5xl font-bold">
              Ready to Build Something Amazing?
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Join 2 million developers who are shipping faster with E-Code. 
              Start for free, scale to millions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
              <Button 
                size="lg"
                className="bg-white text-violet-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setTimeout(() => {
                    const aiInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                    if (aiInput) {
                      aiInput.focus();
                    }
                  }, 500);
                }}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Start Building Free
              </Button>
              <Button 
                size="lg"
                variant="ghost"
                className="text-white border-white hover:bg-white/10 px-8 py-6 text-lg"
                onClick={() => navigate('/contact-sales')}
              >
                <Building2 className="mr-2 h-5 w-5" />
                Contact Sales
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </MarketingLayout>
  );
}