import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Handshake, Building2, GraduationCap, Code, Globe, Users } from 'lucide-react';

export default function Partners() {
  const partnerTypes = [
    {
      icon: Building2,
      title: 'Enterprise Partners',
      description: 'Scale your development teams with Replit Enterprise',
      benefits: [
        'Custom deployment options',
        'Advanced security features',
        'Dedicated support team',
        'Volume licensing',
      ],
    },
    {
      icon: GraduationCap,
      title: 'Education Partners',
      description: 'Transform CS education with cloud-based coding',
      benefits: [
        'Classroom management tools',
        'Curriculum integration',
        'Student progress tracking',
        'Educational discounts',
      ],
    },
    {
      icon: Code,
      title: 'Technology Partners',
      description: 'Integrate your tools and services with Replit',
      benefits: [
        'API access',
        'Co-marketing opportunities',
        'Technical integration support',
        'Featured partner status',
      ],
    },
  ];

  const currentPartners = [
    { name: 'Google Cloud', category: 'Infrastructure' },
    { name: 'GitHub', category: 'Version Control' },
    { name: 'OpenAI', category: 'AI Services' },
    { name: 'Stripe', category: 'Payments' },
    { name: 'MongoDB', category: 'Database' },
    { name: 'Vercel', category: 'Deployment' },
  ];

  const successStories = [
    {
      company: 'TechCorp Inc.',
      quote: 'Replit helped us onboard new developers 3x faster with zero setup time.',
      author: 'Sarah Chen, CTO',
      metric: '70% faster onboarding',
    },
    {
      company: 'State University',
      quote: 'Our CS enrollment doubled after introducing Replit to our curriculum.',
      author: 'Dr. James Wilson, CS Department',
      metric: '2x enrollment growth',
    },
    {
      company: 'StartupXYZ',
      quote: 'We built and deployed our MVP entirely on Replit in just 2 weeks.',
      author: 'Alex Kumar, Founder',
      metric: '10x faster deployment',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-responsive bg-gradient-to-b from-background to-muted">
          <div className="container-responsive">
            <div className="text-center max-w-3xl mx-auto">
              <Handshake className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h1 className="text-4xl font-bold mb-4">Partner with Replit</h1>
              <p className="text-lg text-muted-foreground mb-8">
                Join thousands of organizations using Replit to transform how they build software
              </p>
              <Button size="lg" onClick={() => window.location.href = '/contact-sales'}>
                Become a Partner
              </Button>
            </div>
          </div>
        </section>

        {/* Partner Types */}
        <section className="py-responsive">
          <div className="container-responsive">
            <h2 className="text-3xl font-bold text-center mb-12">Partnership Programs</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {partnerTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card key={type.title}>
                    <CardHeader>
                      <Icon className="h-10 w-10 mb-4 text-primary" />
                      <CardTitle>{type.title}</CardTitle>
                      <CardDescription>{type.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 mb-6">
                        {type.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span className="text-sm">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                      <Button className="w-full">Learn More</Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Current Partners */}
        <section className="py-responsive bg-muted">
          <div className="container-responsive">
            <h2 className="text-3xl font-bold text-center mb-12">Our Partners</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
              {currentPartners.map((partner) => (
                <div key={partner.name} className="text-center">
                  <div className="h-20 w-20 mx-auto mb-4 bg-background rounded-lg flex items-center justify-center">
                    <Globe className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="font-semibold">{partner.name}</p>
                  <p className="text-sm text-muted-foreground">{partner.category}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="py-responsive">
          <div className="container-responsive">
            <h2 className="text-3xl font-bold text-center mb-12">Success Stories</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {successStories.map((story, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <Badge className="mb-4">{story.metric}</Badge>
                    <blockquote className="text-lg mb-4">
                      "{story.quote}"
                    </blockquote>
                    <div>
                      <p className="font-semibold">{story.author}</p>
                      <p className="text-sm text-muted-foreground">{story.company}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-responsive bg-muted">
          <div className="container-responsive">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-8">Why Partner with Replit?</h2>
              
              <div className="grid md:grid-cols-2 gap-8 text-left">
                <div>
                  <h3 className="text-xl font-semibold mb-4">For Your Organization</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary mt-0.5" />
                      <span>Access to millions of developers worldwide</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Code className="h-5 w-5 text-primary mt-0.5" />
                      <span>Cutting-edge development tools and AI</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-primary mt-0.5" />
                      <span>Global reach and brand visibility</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-4">For Your Users</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-primary mt-0.5" />
                      <span>Instant access to development environments</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Code className="h-5 w-5 text-primary mt-0.5" />
                      <span>Seamless collaboration features</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-primary mt-0.5" />
                      <span>Learn and build from anywhere</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-responsive bg-primary text-primary-foreground">
          <div className="container-responsive text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Partner?</h2>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              Join the growing ecosystem of Replit partners and transform how software is built
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => window.location.href = '/contact-sales'}
              >
                Contact Partnership Team
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10"
              >
                Download Partner Guide
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}