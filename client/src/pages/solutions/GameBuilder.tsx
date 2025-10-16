// @ts-nocheck
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Gamepad2, Rocket, Sparkles, CheckCircle, Play, Code, Users } from "lucide-react";
import { Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";

export default function GameBuilder() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <Badge className="mb-4 px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
            Game Development Made Easy
          </Badge>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Game Builder
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Design and code games with AI. From simple puzzles to complex adventures.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Create Your Game
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/showcase?type=games">
              <Button size="lg" variant="outline" className="gap-2">
                <Play className="h-4 w-4" />
                Play Examples
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg w-fit mb-4">
              <Gamepad2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Any Game Genre</h3>
            <p className="text-muted-foreground">
              Create platformers, puzzles, RPGs, strategy games, or any genre you imagine.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg w-fit mb-4">
              <Code className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Coding Required</h3>
            <p className="text-muted-foreground">
              Describe your game idea and watch as AI creates all the code and assets.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-lg w-fit mb-4">
              <Users className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multiplayer Support</h3>
            <p className="text-muted-foreground">
              Build real-time multiplayer games with built-in networking and matchmaking.
            </p>
          </Card>
        </div>

        {/* Game Types */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Games You Can Create</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "2D Platformers",
              "Puzzle Games",
              "Racing Games",
              "Card Games",
              "Tower Defense",
              "RPG Adventures",
              "Arcade Classics",
              "Educational Games"
            ].map((gameType) => (
              <Card key={gameType} className="p-4 text-center hover:shadow-md transition-shadow">
                <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-2" />
                <p className="font-medium">{gameType}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Game Features */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Built-in Game Features</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Physics Engine</h3>
                  <p className="text-sm text-muted-foreground">Realistic physics for collisions, gravity, and movement</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Sound & Music</h3>
                  <p className="text-sm text-muted-foreground">AI-generated sound effects and background music</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Leaderboards</h3>
                  <p className="text-sm text-muted-foreground">Global high scores and player rankings</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Save System</h3>
                  <p className="text-sm text-muted-foreground">Automatic game progress saving and loading</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Mobile Controls</h3>
                  <p className="text-sm text-muted-foreground">Touch controls for mobile and tablet play</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Achievements</h3>
                  <p className="text-sm text-muted-foreground">Unlock system with badges and rewards</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="p-12 bg-gradient-to-r from-orange-600/10 to-red-600/10 border-2 border-primary/20">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Start Building Your Game</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Turn your game ideas into reality. No experience needed - just imagination.
            </p>
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Build Your First Game
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}