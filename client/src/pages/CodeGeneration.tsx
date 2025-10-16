// @ts-nocheck
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Preview from '@/components/Preview';
import { 
  Wand2, 
  Sparkles, 
  Code2, 
  Zap, 
  ArrowRight, 
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURED_EXAMPLES = [
  {
    title: 'Modern Dashboard',
    description: 'Complete admin dashboard with charts, tables, and user management',
    image: '📊',
    tags: ['React', 'Charts', 'Complex'],
    time: '5 min',
    popularity: 95
  },
  {
    title: 'E-commerce Product Page',
    description: 'Product showcase with image gallery, reviews, and cart functionality',
    image: '🛒',
    tags: ['E-commerce', 'Interactive'],
    time: '3 min',
    popularity: 88
  },
  {
    title: 'Social Media Feed',
    description: 'Instagram-like feed with posts, likes, comments, and infinite scroll',
    image: '📱',
    tags: ['Social', 'Real-time'],
    time: '4 min',
    popularity: 92
  },
  {
    title: 'Landing Page',
    description: 'Beautiful marketing page with hero section, features, and contact form',
    image: '🌟',
    tags: ['Marketing', 'Responsive'],
    time: '2 min',
    popularity: 85
  },
  {
    title: 'Chat Application',
    description: 'Real-time messaging with emoji, file sharing, and typing indicators',
    image: '💬',
    tags: ['Real-time', 'WebSocket'],
    time: '6 min',
    popularity: 90
  },
  {
    title: 'Task Management',
    description: 'Kanban board with drag-and-drop, due dates, and team collaboration',
    image: '📋',
    tags: ['Productivity', 'Drag-Drop'],
    time: '4 min',
    popularity: 87
  }
];

const STATS = [
  { label: 'Code Generated', value: '2.5M+', icon: Code2 },
  { label: 'Active Users', value: '50K+', icon: Users },
  { label: 'Success Rate', value: '98%', icon: TrendingUp },
  { label: 'Avg. Time Saved', value: '4.2h', icon: Clock }
];

export default function CodeGeneration() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('generator');
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  const handleExampleSelect = (example: typeof FEATURED_EXAMPLES[0]) => {
    // Set the example prompt and switch to generator
    setSelectedExample(example.description);
    setActiveTab('generator');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container-responsive text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Wand2 className="h-8 w-8 text-primary" />
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Code Generation
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Transform your ideas into production-ready code in seconds. 
              Just describe what you want, and watch AI build it for you.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
              {STATS.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center mb-2">
                      <Icon className="h-5 w-5 text-primary mr-2" />
                      <span className="text-2xl font-bold">{stat.value}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={() => setActiveTab('generator')}
                className="text-lg px-8"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Start Generating
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setActiveTab('examples')}
              >
                View Examples
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 px-4">
        <div className="container-responsive">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
              <TabsTrigger value="generator" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Generator
              </TabsTrigger>
              <TabsTrigger value="examples" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Examples
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generator">
              <Preview 
                openFiles={[]}
                projectId={0}
              />
            </TabsContent>

            <TabsContent value="examples">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">Featured Examples</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Explore popular code generations from our community. 
                    Click any example to use it as a starting point for your own project.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {FEATURED_EXAMPLES.map((example, index) => (
                    <motion.div
                      key={example.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <Card 
                        className="h-full cursor-pointer hover:shadow-lg transition-all group"
                        onClick={() => handleExampleSelect(example)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-3xl">{example.image}</div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-green-500 font-medium">
                                {example.popularity}%
                              </span>
                            </div>
                          </div>
                          <CardTitle className="group-hover:text-primary transition-colors">
                            {example.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            {example.description}
                          </p>
                          
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {example.time}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-4">
                            {example.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          <Button 
                            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            variant="outline"
                          >
                            Use This Example
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="text-center mt-12">
                  <Card className="max-w-2xl mx-auto">
                    <CardContent className="pt-6">
                      <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">
                        Don't see what you're looking for?
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Our AI can generate any type of code you need. 
                        Just describe your idea and let us build it for you.
                      </p>
                      <Button 
                        onClick={() => setActiveTab('generator')}
                        className="w-full sm:w-auto"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Create Custom Code
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}