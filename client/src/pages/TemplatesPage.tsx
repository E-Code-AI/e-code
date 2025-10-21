// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/hooks/use-auth';
import { PageShell, PageHeader } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Search, Code2, Sparkles, Zap, Globe, Database, Gamepad2, Bot, Briefcase,
  ShoppingCart, Music, Camera, MessageSquare, FileText, TrendingUp, Star,
  GitFork, Users, Clock, Check, ArrowRight, Layers, Server, Cloud, Mobile,
  Desktop, Terminal, Package, Rocket, Shield, Activity, BarChart3, PieChart,
  LineChart, Coffee, Moon, Sun, ChevronRight, ExternalLink, Github, Play,
  BookMarked, Hash, Lock, Unlock, Eye, Download, Heart, Share2, Copy,
  Filter, X, Settings, Cpu, HardDrive, Wifi, Gauge, AlertCircle
} from 'lucide-react';
import cloudComputingPath from '@assets/stock_images/cloud_computing_tech_179a9c59.jpg';
import modernSoftwarePath from '@assets/stock_images/modern_software_deve_49bda81c.jpg';
import codingProgrammingPath from '@assets/stock_images/coding_programming_l_4701c749.jpg';

// Template categories
const categories = [
  { id: 'all', name: 'All Templates', icon: Code2, color: 'bg-gray-500' },
  { id: 'webapp', name: 'Web Apps', icon: Globe, color: 'bg-blue-500' },
  { id: 'api', name: 'APIs & Backend', icon: Server, color: 'bg-green-500' },
  { id: 'data', name: 'Data Science', icon: BarChart3, color: 'bg-purple-500' },
  { id: 'game', name: 'Games', icon: Gamepad2, color: 'bg-yellow-500' },
  { id: 'automation', name: 'Automation', icon: Zap, color: 'bg-orange-500' },
  { id: 'mobile', name: 'Mobile', icon: Mobile, color: 'bg-pink-500' },
  { id: 'ai', name: 'AI & ML', icon: Bot, color: 'bg-indigo-500' },
  { id: 'ecommerce', name: 'E-Commerce', icon: ShoppingCart, color: 'bg-red-500' },
  { id: 'social', name: 'Social', icon: Users, color: 'bg-cyan-500' },
];

// Mock templates data
const templatesData = [
  // Featured Templates
  {
    id: 1,
    name: 'Next.js E-Commerce Platform',
    description: 'Full-featured e-commerce platform with payments, inventory, and admin dashboard',
    category: 'ecommerce',
    difficulty: 'Advanced',
    technologies: ['Next.js', 'TypeScript', 'Prisma', 'Stripe', 'TailwindCSS'],
    stars: 1234,
    forks: 456,
    users: 2890,
    featured: true,
    trending: true,
    image: cloudComputingPath,
    features: [
      'Product catalog with search and filters',
      'Shopping cart and checkout',
      'Stripe payment integration',
      'Admin dashboard',
      'Order management',
      'Customer accounts',
      'Email notifications',
      'SEO optimized',
    ],
    requirements: [
      'Node.js 18+',
      'PostgreSQL database',
      'Stripe account',
      'SendGrid account (optional)',
    ],
  },
  {
    id: 2,
    name: 'AI Chat Assistant',
    description: 'Intelligent chatbot powered by OpenAI with streaming responses and memory',
    category: 'ai',
    difficulty: 'Intermediate',
    technologies: ['React', 'OpenAI', 'Node.js', 'Socket.io', 'MongoDB'],
    stars: 987,
    forks: 321,
    users: 1567,
    featured: true,
    trending: true,
    image: modernSoftwarePath,
    features: [
      'Real-time chat interface',
      'OpenAI GPT-4 integration',
      'Conversation history',
      'Streaming responses',
      'Multiple chat sessions',
      'Export conversations',
      'Dark mode support',
      'Mobile responsive',
    ],
    requirements: [
      'OpenAI API key',
      'MongoDB database',
      'Node.js 16+',
    ],
  },
  {
    id: 3,
    name: 'Real-Time Analytics Dashboard',
    description: 'Beautiful analytics dashboard with real-time data visualization and reports',
    category: 'data',
    difficulty: 'Intermediate',
    technologies: ['React', 'D3.js', 'WebSocket', 'PostgreSQL', 'Redis'],
    stars: 756,
    forks: 234,
    users: 1123,
    featured: true,
    image: codingProgrammingPath,
    features: [
      'Real-time data updates',
      'Interactive charts and graphs',
      'Custom date range filters',
      'Export to PDF/CSV',
      'User activity tracking',
      'Performance metrics',
      'Customizable widgets',
      'Multi-tenant support',
    ],
    requirements: [
      'PostgreSQL database',
      'Redis for caching',
      'Node.js 16+',
    ],
  },
  // Regular Templates
  {
    id: 4,
    name: 'Blog Platform',
    description: 'Modern blog with markdown support, tags, and SEO optimization',
    category: 'webapp',
    difficulty: 'Beginner',
    technologies: ['Next.js', 'MDX', 'TailwindCSS'],
    stars: 543,
    forks: 123,
    users: 876,
    image: cloudComputingPath,
  },
  {
    id: 5,
    name: 'REST API Boilerplate',
    description: 'Production-ready REST API with authentication and database',
    category: 'api',
    difficulty: 'Intermediate',
    technologies: ['Express', 'JWT', 'PostgreSQL', 'Docker'],
    stars: 432,
    forks: 98,
    users: 654,
    image: modernSoftwarePath,
  },
  {
    id: 6,
    name: 'Discord Bot',
    description: 'Feature-rich Discord bot with commands and moderation',
    category: 'automation',
    difficulty: 'Beginner',
    technologies: ['Discord.js', 'Node.js', 'SQLite'],
    stars: 321,
    forks: 87,
    users: 543,
    image: codingProgrammingPath,
  },
  {
    id: 7,
    name: 'Portfolio Website',
    description: 'Professional portfolio with animations and contact form',
    category: 'webapp',
    difficulty: 'Beginner',
    technologies: ['React', 'Framer Motion', 'EmailJS'],
    stars: 765,
    forks: 234,
    users: 1234,
    trending: true,
    image: cloudComputingPath,
  },
  {
    id: 8,
    name: 'Web Scraper API',
    description: 'Powerful web scraping API with scheduling and data export',
    category: 'api',
    difficulty: 'Advanced',
    technologies: ['Python', 'FastAPI', 'Selenium', 'Celery'],
    stars: 234,
    forks: 56,
    users: 345,
    image: modernSoftwarePath,
  },
  {
    id: 9,
    name: '2D Platformer Game',
    description: 'Classic platformer game with physics and level editor',
    category: 'game',
    difficulty: 'Intermediate',
    technologies: ['Phaser', 'JavaScript', 'Matter.js'],
    stars: 456,
    forks: 123,
    users: 789,
    image: codingProgrammingPath,
  },
  {
    id: 10,
    name: 'Task Management App',
    description: 'Kanban board with drag-and-drop and team collaboration',
    category: 'webapp',
    difficulty: 'Intermediate',
    technologies: ['Vue.js', 'Vuex', 'Firebase'],
    stars: 567,
    forks: 145,
    users: 890,
    image: cloudComputingPath,
  },
  {
    id: 11,
    name: 'Machine Learning API',
    description: 'ML model serving API with TensorFlow and batch processing',
    category: 'ai',
    difficulty: 'Advanced',
    technologies: ['Python', 'TensorFlow', 'FastAPI', 'Docker'],
    stars: 345,
    forks: 89,
    users: 456,
    image: modernSoftwarePath,
  },
  {
    id: 12,
    name: 'Social Media Dashboard',
    description: 'Multi-platform social media management dashboard',
    category: 'social',
    difficulty: 'Advanced',
    technologies: ['React', 'Node.js', 'GraphQL', 'Redis'],
    stars: 678,
    forks: 167,
    users: 1012,
    image: codingProgrammingPath,
  },
];

// Difficulty colors
const difficultyConfig = {
  Beginner: { color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-400' },
  Intermediate: { color: 'bg-yellow-500', textColor: 'text-yellow-700 dark:text-yellow-400' },
  Advanced: { color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-400' },
};

export default function TemplatesPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [likedTemplates, setLikedTemplates] = useState(new Set());
  
  // Debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Featured templates
  const featuredTemplates = useMemo(() => 
    templatesData.filter(t => t.featured),
    []
  );

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = [...templatesData];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Search filter
    if (debouncedSearchQuery) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        t.technologies.some(tech => 
          tech.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        )
      );
    }

    return filtered;
  }, [selectedCategory, debouncedSearchQuery]);

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups = {};
    filteredTemplates.forEach(template => {
      if (!groups[template.category]) {
        groups[template.category] = [];
      }
      groups[template.category].push(template);
    });
    return groups;
  }, [filteredTemplates]);

  const handleUseTemplate = (template) => {
    // Create a new project from template
    const templatePrompt = `Create a ${template.name} using ${template.technologies.join(', ')}. ${template.description}`;
    navigate(`/dashboard?template=${template.id}&prompt=${encodeURIComponent(templatePrompt)}`);
  };

  const toggleLike = (templateId) => {
    setLikedTemplates(prev => {
      const newLikes = new Set(prev);
      if (newLikes.has(templateId)) {
        newLikes.delete(templateId);
      } else {
        newLikes.add(templateId);
      }
      return newLikes;
    });
  };

  const openTemplateModal = (template) => {
    setSelectedTemplate(template);
    setModalOpen(true);
  };

  return (
    <PageShell>
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20" />
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      </div>

      {/* Hero Section */}
      <div className="relative mb-12 overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 p-8 lg:p-12 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        
        <div className="relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Start Building with Professional Templates
            </h1>
            <p className="text-lg lg:text-xl opacity-90 mb-8">
              Choose from hundreds of pre-built templates to jumpstart your next project
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search templates, technologies, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg bg-white/95 text-gray-900 placeholder:text-gray-500 rounded-xl border-0 shadow-xl"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map(category => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      'gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30',
                      selectedCategory === category.id && 'bg-white text-purple-600 hover:bg-white/90'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {category.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Templates Carousel */}
      {selectedCategory === 'all' && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Featured Templates</h2>
              <p className="text-muted-foreground">Hand-picked templates to get you started quickly</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedCategory('all')}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <Carousel className="w-full">
            <CarouselContent>
              {featuredTemplates.map((template, index) => (
                <CarouselItem key={template.id} className="md:basis-1/2 lg:basis-1/3">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                      <div className="aspect-video relative overflow-hidden">
                        <img 
                          src={template.image}
                          alt={template.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        
                        {/* Badges */}
                        <div className="absolute top-4 left-4 flex gap-2">
                          {template.featured && (
                            <Badge className="bg-purple-500/90 text-white">
                              <Star className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          {template.trending && (
                            <Badge className="bg-orange-500/90 text-white">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Trending
                            </Badge>
                          )}
                        </div>
                        
                        {/* Like button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(template.id);
                          }}
                        >
                          <Heart className={cn(
                            "h-5 w-5",
                            likedTemplates.has(template.id) && "fill-red-500 text-red-500"
                          )} />
                        </Button>
                      </div>
                      
                      <CardContent className="p-6">
                        <div className="mb-4">
                          <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.description}
                          </p>
                        </div>
                        
                        {/* Technologies */}
                        <div className="flex flex-wrap gap-1 mb-4">
                          {template.technologies.slice(0, 3).map(tech => (
                            <Badge key={tech} variant="secondary" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                          {template.technologies.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.technologies.length - 3}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4" />
                              {template.stars}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitFork className="h-4 w-4" />
                              {template.forks}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {template.users}
                            </span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={difficultyConfig[template.difficulty].textColor}
                          >
                            {template.difficulty}
                          </Badge>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1"
                            onClick={() => handleUseTemplate(template)}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Use Template
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openTemplateModal(template)}
                          >
                            Preview
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      )}

      {/* Templates Grid by Category */}
      <div>
        {selectedCategory === 'all' ? (
          // Show grouped by category
          Object.entries(groupedTemplates).map(([categoryId, templates]) => {
            const category = categories.find(c => c.id === categoryId);
            if (!category || templates.length === 0) return null;
            const CategoryIcon = category.icon;
            
            return (
              <div key={categoryId} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className={cn("p-2 rounded-lg", category.color, "bg-opacity-20")}>
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold">{category.name}</h2>
                  <Badge variant="secondary">{templates.length} templates</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <AnimatePresence>
                    {templates.map((template, index) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ y: -4 }}
                      >
                        <Card 
                          className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group h-full flex flex-col"
                          onClick={() => openTemplateModal(template)}
                        >
                          {/* Preview Image */}
                          <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-950 dark:to-blue-950">
                            <img 
                              src={template.image}
                              alt={template.name}
                              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            
                            {template.trending && (
                              <Badge className="absolute top-2 left-2 bg-orange-500/90 text-white">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Trending
                              </Badge>
                            )}
                          </div>
                          
                          <CardContent className="p-4 flex-1 flex flex-col">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base mb-2 line-clamp-1">
                                {template.name}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {template.description}
                              </p>
                            </div>
                            
                            {/* Tech Stack */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {template.technologies.slice(0, 3).map(tech => (
                                <Badge key={tech} variant="outline" className="text-xs">
                                  {tech}
                                </Badge>
                              ))}
                            </div>
                            
                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Star className="h-3 w-3" />
                                <span>{template.stars}</span>
                                <Users className="h-3 w-3 ml-1" />
                                <span>{template.users}</span>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs", difficultyConfig[template.difficulty].textColor)}
                              >
                                {template.difficulty}
                              </Badge>
                            </div>
                            
                            {/* Hover Action */}
                            <Button 
                              className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUseTemplate(template);
                              }}
                            >
                              <Zap className="h-4 w-4 mr-2" />
                              Use Template
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })
        ) : (
          // Show filtered templates
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {categories.find(c => c.id === selectedCategory)?.name}
              </h2>
              <Badge variant="secondary">
                {filteredTemplates.length} templates
              </Badge>
            </div>
            
            {filteredTemplates.length === 0 ? (
              <Card className="p-16 text-center border-dashed">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No templates found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your search or browse other categories
                </p>
                <Button onClick={() => setSelectedCategory('all')}>
                  Browse All Templates
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {filteredTemplates.map((template, index) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -4 }}
                    >
                      <Card 
                        className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group h-full flex flex-col"
                        onClick={() => openTemplateModal(template)}
                      >
                        <div className="aspect-video relative overflow-hidden">
                          <img 
                            src={template.image}
                            alt={template.name}
                            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          
                          {template.trending && (
                            <Badge className="absolute top-2 left-2 bg-orange-500/90 text-white">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Trending
                            </Badge>
                          )}
                        </div>
                        
                        <CardContent className="p-4 flex-1 flex flex-col">
                          <div className="flex-1">
                            <h3 className="font-semibold text-base mb-2">
                              {template.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mb-3">
                            {template.technologies.slice(0, 3).map(tech => (
                              <Badge key={tech} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Star className="h-3 w-3" />
                              <span>{template.stars}</span>
                              <Users className="h-3 w-3 ml-1" />
                              <span>{template.users}</span>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", difficultyConfig[template.difficulty].textColor)}
                            >
                              {template.difficulty}
                            </Badge>
                          </div>
                          
                          <Button 
                            className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseTemplate(template);
                            }}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Use Template
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template Preview Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl">
                      {selectedTemplate.name}
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-base">
                      {selectedTemplate.description}
                    </DialogDescription>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={difficultyConfig[selectedTemplate.difficulty].textColor}
                  >
                    {selectedTemplate.difficulty}
                  </Badge>
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                {/* Preview Image */}
                <div className="aspect-video relative overflow-hidden rounded-lg">
                  <img 
                    src={selectedTemplate.image}
                    alt={selectedTemplate.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                
                {/* Template Info */}
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold">{selectedTemplate.stars}</span>
                      <span className="text-muted-foreground">stars</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GitFork className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold">{selectedTemplate.forks}</span>
                      <span className="text-muted-foreground">forks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="font-semibold">{selectedTemplate.users}</span>
                      <span className="text-muted-foreground">users</span>
                    </div>
                  </div>
                  
                  {/* Technologies */}
                  <div>
                    <h4 className="font-semibold mb-2">Technologies</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.technologies.map(tech => (
                        <Badge key={tech} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Features */}
                  {selectedTemplate.features && (
                    <div>
                      <h4 className="font-semibold mb-2">Features</h4>
                      <ScrollArea className="h-32">
                        <ul className="space-y-1">
                          {selectedTemplate.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  )}
                  
                  {/* Requirements */}
                  {selectedTemplate.requirements && (
                    <div>
                      <h4 className="font-semibold mb-2">Requirements</h4>
                      <ul className="space-y-1">
                        {selectedTemplate.requirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // View source code
                      window.open(`https://github.com/e-code/${selectedTemplate.name}`, '_blank');
                    }}
                  >
                    <Github className="h-4 w-4 mr-2" />
                    View Source
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setModalOpen(false);
                      handleUseTemplate(selectedTemplate);
                    }}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    Start with Template
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
      `}</style>
    </PageShell>
  );
}