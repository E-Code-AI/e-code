import { CodeGenerationPanel } from '@/components/CodeGenerationPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '@/components/ui/tabs';
import { LazyMotionDiv } from '@/lib/motion';
import {
ArrowRight,
Sparkles,
Star,
Wand2,
Zap
} from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'wouter';

// Curated starter prompts. These are PROMPTS, not fake usage statistics —
// they are wired into the generator via the `seedPrompt` prop below so the
// Examples tab is interactive rather than decorative.
const FEATURED_EXAMPLES: Array<{ title: string; description: string; image: string; tags: string[]; prompt: string }> = [
  {
    title: 'Modern Admin Dashboard',
    description: 'Complete admin dashboard with KPIs, area chart, donut chart, and a sortable users table.',
    image: '📊',
    tags: ['React', 'Charts', 'Tables'],
    prompt: 'Build a modern admin dashboard SPA with: 4 KPI cards, an area chart of monthly revenue, a donut of user segments, a paginated/sortable users table, sidebar nav, dark/light toggle, glassmorphism, Framer Motion. Stack: React + TS + Vite + Tailwind + shadcn/ui + recharts.'
  },
  {
    title: 'E-commerce Product Page',
    description: 'Product showcase with image gallery, variants, reviews, and add-to-cart.',
    image: '🛒',
    tags: ['E-commerce', 'Interactive'],
    prompt: 'Build a product detail page with image gallery + zoom, size/color variants, sticky add-to-cart, reviews list with ratings, related products carousel. Stack: React + TS + Tailwind + shadcn/ui.'
  },
  {
    title: 'Social Feed',
    description: 'Instagram-like feed with posts, likes, comments, and optimistic updates.',
    image: '📱',
    tags: ['Social', 'Realtime'],
    prompt: 'Build a social feed: composer, post card with like/comment/share, optimistic likes, comment thread, infinite scroll. Stack: React + TS + Tailwind + shadcn/ui + framer-motion.'
  },
  {
    title: 'SaaS Landing Page',
    description: 'Marketing site with hero, features grid, pricing, FAQ, and a contact form.',
    image: '🌟',
    tags: ['Marketing', 'Responsive'],
    prompt: 'Build a SaaS landing page with animated hero, 6-feature grid, 3-tier pricing, FAQ accordion, testimonials, and contact form (controlled). Stack: React + TS + Tailwind + shadcn/ui + framer-motion.'
  },
  {
    title: 'Chat Application',
    description: 'Real-time messaging UI with channels, mentions, file uploads, and typing indicators.',
    image: '💬',
    tags: ['Realtime', 'WebSocket'],
    prompt: 'Build a chat app UI: channel list, message thread, composer with @mentions and file upload, typing indicator, emoji picker, dark mode. Stack: React + TS + Tailwind + shadcn/ui.'
  },
  {
    title: 'CRM Pipeline',
    description: 'Salesforce-style kanban with drag-and-drop opportunities, stage totals, and detail drawer.',
    image: '📋',
    tags: ['Productivity', 'DnD'],
    prompt: 'Build a CRM kanban board: 6 stages (Prospecting → Closed Lost), draggable opportunity cards (dnd-kit) with deal value, stage totals, opportunity detail side drawer. Stack: React + TS + Tailwind + shadcn/ui + dnd-kit.'
  }
];

export default function CodeGeneration() {
  const [, _setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('generator');
  const [seedPrompt, setSeedPrompt] = useState<string | undefined>(undefined);

  const handleExampleSelect = (example: typeof FEATURED_EXAMPLES[0]) => {
    setSeedPrompt(example.prompt);
    setActiveTab('generator');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container-responsive text-center">
          <LazyMotionDiv
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

            <div className="flex items-center justify-center gap-4">
              <Button 
                size="lg" 
                onClick={() => setActiveTab('generator')}
                className="text-[15px] px-8"
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
          </LazyMotionDiv>
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

            <TabsContent value="generator" className="h-[calc(100vh-300px)]">
              <CodeGenerationPanel seedPrompt={seedPrompt} />
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
                    <div
                      key={example.title}
                      className="animate-slide-in-up opacity-0"
                      style={{ animationDelay: `${100 * index}ms`, animationFillMode: 'forwards' }}
                    >
                      <Card
                        className="h-full cursor-pointer hover:shadow-lg transition-all group"
                        onClick={() => handleExampleSelect(example)}
                        data-testid={`example-card-${example.title.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <CardHeader>
                          <div className="text-3xl mb-2">{example.image}</div>
                          <CardTitle className="group-hover:text-primary transition-colors">
                            {example.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-[13px] text-muted-foreground mb-4">
                            {example.description}
                          </p>

                          <div className="flex flex-wrap gap-1 mb-4">
                            {example.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[11px]">
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
                    </div>
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