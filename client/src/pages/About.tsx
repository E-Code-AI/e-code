// @ts-nocheck
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  Code, Users, Globe, Target, Lightbulb, Heart, Rocket,
  ChevronRight, ArrowRight, Building2, GraduationCap, Sparkles
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';

interface AboutData {
  values: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  milestones: Array<{
    year: string;
    event: string;
  }>;
  team: Array<{
    name: string;
    role: string;
    avatar: string;
  }>;
  stats: {
    users: string;
    projects: string;
    deployments: string;
    countries: string;
  };
}

export default function About() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Fetch about data from backend
  const { data: aboutData, isLoading, error } = useQuery<AboutData>({
    queryKey: ['/api/about']
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" className="mb-4" />
            <p className="text-muted-foreground">Loading about information...</p>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (error || !aboutData) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Failed to load about information.</p>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const { values, milestones, team } = aboutData;
  
  // Transform icon names to components
  const iconMap: Record<string, React.ReactNode> = {
    'Lightbulb': <Lightbulb className="h-6 w-6" />,
    'Users': <Users className="h-6 w-6" />,
    'Globe': <Globe className="h-6 w-6" />,
    'Heart': <Heart className="h-6 w-6" />
  };
  
  const valuesWithIcons = values.map((value) => ({
    ...value,
    icon: iconMap[value.icon] || <Lightbulb className="h-6 w-6" />
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 sm:space-y-6">
            <Badge variant="secondary" className="mb-2 sm:mb-4 text-xs sm:text-sm">
              <Building2 className="h-3 w-3 mr-1" />
              Our Story
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Making coding{' '}
              <span className="text-primary">for everyone</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4 sm:px-0">
              We believe coding is a form of creative expression that should be accessible to all. 
              Whether you're 8 or 80, artist or entrepreneur, we're here to help you create.
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
                Empowering everyone to create
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                We're on a mission to make coding accessible, collaborative, and enjoyable for all. 
                By eliminating technical barriers and creating a friendly environment, 
                we help people of all ages and backgrounds bring their ideas to life.
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
                    <strong>20M+ people</strong> learning and creating every day
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
                    <p className="text-xl font-semibold">Learners & creators worldwide</p>
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

      {/* AI Agent Innovation Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent via-violet-50/10 to-transparent dark:via-violet-950/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge variant="default" className="mb-4 text-sm px-4 py-1">
              <Sparkles className="h-4 w-4 mr-1" />
              Revolutionary Innovation
            </Badge>
            <h2 className="text-4xl font-bold mb-6">
              AI Agent: The future of software creation
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our groundbreaking AI Agent represents the biggest leap forward in making coding accessible. 
              Now anyone can build complete, professional applications just by describing what they want.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20">
              <CardHeader>
                <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg w-fit mb-3">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Zero to App in Seconds</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Watch as complete applications materialize from simple descriptions. No coding knowledge required.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20">
              <CardHeader>
                <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg w-fit mb-3">
                  <Code className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Professional Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Generates clean, maintainable code following industry best practices and modern patterns.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20">
              <CardHeader>
                <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg w-fit mb-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Democratizing Development</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Empowering entrepreneurs, students, and dreamers to build without technical barriers.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <div className="inline-flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg"
                onClick={() => navigate('/ai-agent')}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Explore AI Agent
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => user ? navigate('/dashboard') : window.location.href = '/api/login'}
              >
                Try It Now
              </Button>
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
            {valuesWithIcons.map((value, index: number) => (
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
            {milestones.map((milestone, index: number) => (
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
            {team.map((member, index: number) => (
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

      <PublicFooter />
    </div>
  );
}