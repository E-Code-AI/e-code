import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  Code, Users, Globe, Target, Lightbulb, Heart, Rocket,
  ChevronRight, ArrowRight, Building2, GraduationCap
} from 'lucide-react';

export default function About() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const values = [
    {
      icon: <Lightbulb className="h-6 w-6" />,
      title: 'Innovation First',
      description: 'We push the boundaries of what\'s possible in browser-based development'
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Community Driven',
      description: 'Built by developers, for developers, with input from our amazing community'
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: 'Accessible to All',
      description: 'Making programming accessible to everyone, regardless of their background'
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: 'Developer Experience',
      description: 'Obsessed with creating the best possible experience for developers'
    }
  ];

  const milestones = [
    { year: '2016', event: 'Founded with a vision to make coding accessible' },
    { year: '2018', event: 'Launched multiplayer coding - a world first' },
    { year: '2020', event: 'Reached 10 million developers worldwide' },
    { year: '2022', event: 'Introduced AI-powered coding assistance' },
    { year: '2024', event: '20 million developers and counting' }
  ];

  const team = [
    { name: 'Amjad Masad', role: 'CEO & Co-founder', avatar: 'AM' },
    { name: 'Faris Masad', role: 'CTO & Co-founder', avatar: 'FM' },
    { name: 'Sarah Chen', role: 'VP of Engineering', avatar: 'SC' },
    { name: 'Marcus Johnson', role: 'VP of Product', avatar: 'MJ' },
    { name: 'Emily Rodriguez', role: 'VP of Design', avatar: 'ER' },
    { name: 'David Kim', role: 'VP of Growth', avatar: 'DK' }
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/')}
              >
                <Code className="h-6 w-6" />
                <span className="font-bold text-xl">E-Code</span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <Button variant="ghost" size="sm" onClick={() => navigate('/features')}>
                  Features
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
                  Pricing
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/about')}>
                  About
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/careers')}>
                  Careers
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Log in
              </Button>
              <Button onClick={() => navigate(user ? '/dashboard' : '/auth')}>
                {user ? 'Dashboard' : 'Sign up'}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-6">
            <Badge variant="secondary" className="mb-4">
              <Building2 className="h-3 w-3 mr-1" />
              Our Story
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold">
              Making programming more{' '}
              <span className="text-primary">accessible</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We believe everyone should have access to powerful programming tools. 
              Our mission is to bring the next billion software creators online.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">
                <Target className="h-3 w-3 mr-1" />
                Our Mission
              </Badge>
              <h2 className="text-3xl font-bold mb-4">
                Empowering the next generation of builders
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                We're on a mission to make programming more accessible, collaborative, and fun. 
                By removing barriers to entry and providing powerful tools in the browser, 
                we're enabling millions to turn their ideas into reality.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-100 dark:bg-green-900/20 rounded">
                    <Code className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm">
                    <strong>50+ languages</strong> supported with zero setup required
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/20 rounded">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm">
                    <strong>20M+ developers</strong> building amazing things every day
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-purple-100 dark:bg-purple-900/20 rounded">
                    <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-sm">
                    <strong>190+ countries</strong> represented in our community
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 blur-3xl" />
              <Card className="relative">
                <CardContent className="p-8">
                  <div className="text-center space-y-6">
                    <div className="text-6xl font-bold text-primary">20M+</div>
                    <p className="text-xl font-semibold">Developers worldwide</p>
                    <div className="grid grid-cols-3 gap-4 pt-4">
                      <div>
                        <div className="text-2xl font-bold">1B+</div>
                        <p className="text-sm text-muted-foreground">Lines of code</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">50+</div>
                        <p className="text-sm text-muted-foreground">Languages</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">24/7</div>
                        <p className="text-sm text-muted-foreground">Uptime</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our values</h2>
            <p className="text-lg text-muted-foreground">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="p-2 bg-primary/10 rounded-lg w-fit mb-2">
                    {value.icon}
                  </div>
                  <CardTitle className="text-lg">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our journey</h2>
            <p className="text-lg text-muted-foreground">
              From a simple idea to empowering millions
            </p>
          </div>
          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div key={index} className="flex gap-8 items-start">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="px-4 py-2">
                    {milestone.year}
                  </Badge>
                </div>
                <div className="flex-1">
                  <div className="h-full border-l-2 border-muted pl-8 pb-8">
                    <div className="relative">
                      <div className="absolute -left-[41px] w-4 h-4 bg-primary rounded-full" />
                      <p className="text-lg">{milestone.event}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Meet our team</h2>
            <p className="text-lg text-muted-foreground">
              The people making E-Code possible
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold">
                      {member.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => navigate('/careers')}>
              Join our team
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to start building?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join our community of creators and bring your ideas to life
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate(user ? '/dashboard' : '/auth')}>
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/community')}>
              Join the community
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2024 E-Code Clone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}