import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Mail, 
  Newspaper, 
  Calendar,
  Users,
  TrendingUp,
  Award,
  Globe,
  Briefcase,
  Image,
  Video,
  FileText,
  ExternalLink,
  Quote,
  Building,
  Zap
} from 'lucide-react';
import { Link } from 'wouter';

interface PressRelease {
  date: string;
  title: string;
  description: string;
  link: string;
}

interface MediaKit {
  title: string;
  description: string;
  icon: React.ElementType;
  downloadUrl: string;
}

interface Coverage {
  outlet: string;
  date: string;
  title: string;
  quote?: string;
  link: string;
}

export default function Press() {
  const pressReleases: PressRelease[] = [
    {
      date: '2025-07-15',
      title: 'E-Code Launches Revolutionary AI Agent That Builds Complete Applications Autonomously',
      description: 'New AI-powered development platform enables anyone to create software without coding knowledge.',
      link: '#'
    },
    {
      date: '2025-06-20',
      title: 'E-Code Raises $150M Series C to Democratize Software Development',
      description: 'Funding round led by top venture firms to expand AI capabilities and global reach.',
      link: '#'
    },
    {
      date: '2025-05-10',
      title: 'E-Code Surpasses 10 Million Users Worldwide',
      description: 'Platform sees explosive growth as developers embrace AI-powered coding.',
      link: '#'
    },
    {
      date: '2025-04-01',
      title: 'E-Code Partners with Major Universities for Computer Science Education',
      description: 'Initiative brings AI-assisted learning to 500+ educational institutions.',
      link: '#'
    }
  ];

  const mediaKit: MediaKit[] = [
    {
      title: 'Logo Package',
      description: 'High-resolution logos in various formats',
      icon: Image,
      downloadUrl: '#'
    },
    {
      title: 'Product Screenshots',
      description: 'UI screenshots and product demos',
      icon: Image,
      downloadUrl: '#'
    },
    {
      title: 'Executive Bios',
      description: 'Leadership team biographies and headshots',
      icon: Users,
      downloadUrl: '#'
    },
    {
      title: 'Company Fact Sheet',
      description: 'Key statistics and company information',
      icon: FileText,
      downloadUrl: '#'
    },
    {
      title: 'Brand Guidelines',
      description: 'Visual identity and usage guidelines',
      icon: Briefcase,
      downloadUrl: '#'
    },
    {
      title: 'Product Videos',
      description: 'Demo videos and promotional content',
      icon: Video,
      downloadUrl: '#'
    }
  ];

  const coverage: Coverage[] = [
    {
      outlet: 'TechCrunch',
      date: '2025-07-16',
      title: 'E-Code\'s AI Agent is the Future of No-Code Development',
      quote: 'E-Code represents a paradigm shift in how we think about software creation.',
      link: '#'
    },
    {
      outlet: 'The Verge',
      date: '2025-07-10',
      title: 'How E-Code is Making Coding Accessible to Everyone',
      quote: 'The platform\'s AI capabilities are genuinely impressive.',
      link: '#'
    },
    {
      outlet: 'Forbes',
      date: '2025-06-21',
      title: 'E-Code Valued at $5 Billion After Latest Funding Round',
      link: '#'
    },
    {
      outlet: 'Wired',
      date: '2025-05-15',
      title: 'The Rise of AI-Powered Development Platforms',
      quote: 'E-Code is leading the charge in democratizing software development.',
      link: '#'
    }
  ];

  const stats = [
    { value: '10M+', label: 'Active Users' },
    { value: '50M+', label: 'Apps Created' },
    { value: '150+', label: 'Countries' },
    { value: '$5B', label: 'Valuation' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="border-b bg-gradient-to-b from-muted/30 to-background">
        <div className="container-responsive py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Press Center
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Get the latest news, press releases, and media resources about E-Code
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <a href="mailto:press@e-code.com">
                  <Mail className="mr-2 h-5 w-5" />
                  Contact Press Team
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#media-kit">
                  <Download className="mr-2 h-5 w-5" />
                  Download Media Kit
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Company Stats */}
      <section className="py-12 border-b">
        <div className="container-responsive">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Press Releases */}
      <section className="py-20">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Latest Press Releases
            </h2>
            <p className="text-lg text-muted-foreground">
              Official announcements and company news
            </p>
          </div>

          <div className="space-y-4 max-w-4xl mx-auto">
            {pressReleases.map((release) => (
              <Card key={release.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardDescription className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(release.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </CardDescription>
                      <CardTitle className="text-xl mb-2">{release.title}</CardTitle>
                      <CardDescription>{release.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="link" asChild className="p-0">
                    <a href={release.link} className="flex items-center gap-1">
                      Read Full Release
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/press/releases">
                View All Press Releases
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Media Coverage */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              In the News
            </h2>
            <p className="text-lg text-muted-foreground">
              What the media is saying about E-Code
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {coverage.map((article) => (
              <Card key={article.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{article.outlet}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(article.date).toLocaleDateString()}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{article.title}</CardTitle>
                  {article.quote && (
                    <div className="mt-3 flex gap-2">
                      <Quote className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                      <CardDescription className="italic">
                        "{article.quote}"
                      </CardDescription>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <Button variant="link" asChild className="p-0">
                    <a href={article.link} className="flex items-center gap-1">
                      Read Article
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About E-Code Section */}
      <section className="py-20">
        <div className="container-responsive">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">About E-Code</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                E-Code is revolutionizing software development by making it accessible to everyone. 
                Our AI-powered platform enables anyone to build professional applications without 
                writing code, democratizing technology creation for millions worldwide.
              </p>
              <p>
                Founded in 2023, E-Code has quickly become the leading AI-assisted development 
                platform, serving over 10 million users across 150+ countries. Our revolutionary 
                AI Agent can autonomously build complete applications from simple descriptions, 
                making software creation as easy as having a conversation.
              </p>
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div>
                  <h4 className="font-semibold mb-2">Key Features</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• AI Agent for autonomous app building</li>
                    <li>• Support for 50+ programming languages</li>
                    <li>• Real-time collaboration</li>
                    <li>• One-click deployment</li>
                    <li>• Enterprise-grade security</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Company Facts</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Founded: 2023</li>
                    <li>• Headquarters: San Francisco, CA</li>
                    <li>• Employees: 500+</li>
                    <li>• Funding: $250M raised</li>
                    <li>• Valuation: $5 billion</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Media Kit */}
      <section id="media-kit" className="py-20 bg-muted/30">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Media Kit
            </h2>
            <p className="text-lg text-muted-foreground">
              Download our brand assets and media resources
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {mediaKit.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={item.downloadUrl}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              For custom assets or additional resources, please contact{' '}
              <a href="mailto:press@e-code.com" className="text-primary hover:underline">
                press@e-code.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="container-responsive">
          <Card className="max-w-3xl mx-auto text-center">
            <CardContent className="py-12">
              <Newspaper className="h-12 w-12 mx-auto mb-6 text-primary" />
              <h3 className="text-2xl font-bold mb-4">Press Inquiries</h3>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                For media inquiries, interview requests, or additional information, 
                please contact our press team.
              </p>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">Email</p>
                  <a href="mailto:press@e-code.com" className="text-primary hover:underline">
                    press@e-code.com
                  </a>
                </div>
                <div>
                  <p className="font-semibold">Press Kit Password</p>
                  <p className="text-sm text-muted-foreground">
                    Contact us for access to password-protected resources
                  </p>
                </div>
              </div>
              <Button className="mt-8" asChild>
                <a href="mailto:press@e-code.com">
                  <Mail className="mr-2 h-5 w-5" />
                  Contact Press Team
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}