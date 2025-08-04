import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Sparkles, ArrowRight, CheckCircle, Gamepad2, Zap, 
  Smartphone, Monitor, Joystick, Trophy, Users,
  Star, PlayCircle, Cpu, Cloud, Code2, Layers
} from 'lucide-react';

export default function GameBuilder() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-96 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-96 w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container-responsive max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                AI Game Development
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                Create Games Without Code
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Build 2D and 3D games with AI assistance. From casual mobile games to complex multiplayer experiences - no game development experience required.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" className="gap-2">
                  Start Creating Games
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  Play Demo Games
                </Button>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  <span>100K+ games created</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span>Featured games</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border bg-slate-900">
                <div className="p-6">
                  <div className="bg-gradient-to-br from-green-900/50 to-yellow-900/50 rounded-lg p-4 backdrop-blur">
                    <div className="flex items-center gap-2 text-green-400 font-mono text-sm mb-4">
                      <Sparkles className="h-4 w-4" />
                      <span>AI: Creating your platformer game...</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-slate-800 rounded p-2 text-center">
                        <Joystick className="h-6 w-6 mx-auto mb-1 text-yellow-400" />
                        <p className="text-xs">Player Controls</p>
                      </div>
                      <div className="bg-slate-800 rounded p-2 text-center">
                        <Layers className="h-6 w-6 mx-auto mb-1 text-blue-400" />
                        <p className="text-xs">Level Design</p>
                      </div>
                      <div className="bg-slate-800 rounded p-2 text-center">
                        <Cpu className="h-6 w-6 mx-auto mb-1 text-purple-400" />
                        <p className="text-xs">Game Logic</p>
                      </div>
                    </div>
                    <div className="text-yellow-400 text-sm animate-pulse">
                      → Generating game assets...
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Professional Game Development Tools
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Everything you need to create, test, and publish amazing games
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Code2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Visual Scripting</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Create game logic with visual blocks, no coding required
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Layers className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <CardTitle>Asset Library</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Thousands of sprites, sounds, and 3D models ready to use
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Cpu className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Physics Engine</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Realistic physics simulation built-in for all game types
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Multiplayer Ready</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Built-in networking for real-time multiplayer games
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Cross-Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Deploy to web, mobile, and desktop from one codebase
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Cloud className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle>Cloud Saves</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automatic cloud saving and leaderboards included
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Game Types */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Build Any Type of Game
            </h2>
            <p className="text-lg text-muted-foreground">
              From simple puzzles to complex RPGs
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Action Games</h3>
              <p className="text-sm text-muted-foreground">Platformers, shooters, and fighting games</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Puzzle Games</h3>
              <p className="text-sm text-muted-foreground">Match-3, logic puzzles, and brain teasers</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">RPG & Adventure</h3>
              <p className="text-sm text-muted-foreground">Story-driven games with quests and exploration</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Gamepad2 className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Casual Games</h3>
              <p className="text-sm text-muted-foreground">Simple, fun games for all ages</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Success Stories
            </h2>
            <p className="text-lg text-muted-foreground">
              Games built with our AI that found success
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-500 rounded-lg" />
                  <div>
                    <CardTitle className="text-lg">Space Runner</CardTitle>
                    <p className="text-sm text-muted-foreground">Endless runner</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">1M+ downloads</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span>4.8</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg" />
                  <div>
                    <CardTitle className="text-lg">Puzzle Quest</CardTitle>
                    <p className="text-sm text-muted-foreground">Match-3 RPG</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">500K+ players</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span>4.9</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg" />
                  <div>
                    <CardTitle className="text-lg">Battle Arena</CardTitle>
                    <p className="text-sm text-muted-foreground">Multiplayer</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">250K+ daily users</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span>4.7</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-yellow-600 text-white">
        <div className="container-responsive max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Building Your Dream Game
          </h2>
          <p className="text-xl mb-8 text-white/90">
            No experience needed - AI helps you every step of the way
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="gap-2">
              Create Your First Game
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 bg-transparent text-white border-white hover:bg-white/10">
              <Gamepad2 className="h-4 w-4" />
              Browse Games
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}