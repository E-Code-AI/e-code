// @ts-nocheck
import React from 'react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Users, Trophy, Star, Globe, Zap, Shield, Heart } from 'lucide-react';

const partnerLogos = [
  { name: 'Microsoft', logo: '🟨', tier: 'Premier' },
  { name: 'Google', logo: '🔴', tier: 'Premier' },
  { name: 'Amazon', logo: '🟠', tier: 'Premier' },
  { name: 'GitHub', logo: '⚫', tier: 'Strategic' },
  { name: 'OpenAI', logo: '🟢', tier: 'Strategic' },
  { name: 'MongoDB', logo: '🟢', tier: 'Technology' },
  { name: 'Docker', logo: '🔵', tier: 'Technology' },
  { name: 'Stripe', logo: '🟣', tier: 'Technology' },
  { name: 'Vercel', logo: '⚫', tier: 'Technology' },
  { name: 'Firebase', logo: '🟡', tier: 'Technology' },
  { name: 'Cloudflare', logo: '🟠', tier: 'Technology' },
  { name: 'Redis', logo: '🔴', tier: 'Technology' }
];

const partnershipTypes = [
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Technology Partners',
    description: 'Integrate your services with E-Code to reach millions of developers worldwide.',
    benefits: [
      'Technical integration support',
      'Co-marketing opportunities',
      'Joint go-to-market strategies',
      'Developer advocacy programs'
    ]
  },
  {
    icon: <Trophy className="h-6 w-6" />,
    title: 'Solution Partners',
    description: 'Help organizations implement E-Code with your expertise and services.',
    benefits: [
      'Partner certification programs',
      'Sales enablement resources',
      'Technical training and support',
      'Partner portal access'
    ]
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: 'Channel Partners',
    description: 'Resell E-Code solutions and expand your portfolio with cutting-edge development tools.',
    benefits: [
      'Competitive margins and incentives',
      'Dedicated partner support',
      'Marketing development funds',
      'Lead sharing programs'
    ]
  }
];

const partnerBenefits = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: 'Accelerated Growth',
    description: 'Tap into our global developer community and accelerate your business growth.'
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Enterprise Security',
    description: 'Benefit from enterprise-grade security and compliance standards.'
  },
  {
    icon: <Star className="h-5 w-5" />,
    title: 'Co-innovation',
    description: 'Collaborate on innovative solutions that shape the future of development.'
  },
  {
    icon: <Heart className="h-5 w-5" />,
    title: 'Dedicated Support',
    description: 'Get dedicated partner success management and technical support.'
  }
];

const successStories = [
  {
    partner: 'MongoDB',
    logo: '🟢',
    title: 'Seamless Database Integration',
    description: 'MongoDB Atlas integration allows developers to spin up databases in seconds, resulting in 40% faster project deployment.',
    metrics: '40% faster deployment',
    quote: 'E-Code has transformed how developers interact with MongoDB, making database setup effortless.'
  },
  {
    partner: 'OpenAI',
    logo: '🟢',
    title: 'AI-Powered Development',
    description: 'OpenAI integration brings intelligent code completion and AI assistance directly into the development workflow.',
    metrics: '60% productivity increase',
    quote: 'The integration with E-Code has made AI accessible to every developer, regardless of their experience level.'
  },
  {
    partner: 'Stripe',
    logo: '🟣',
    title: 'Instant Payment Solutions',
    description: 'Stripe integration enables developers to add payment processing to their applications with just a few clicks.',
    metrics: '90% setup time reduction',
    quote: 'E-Code makes implementing payments so simple that developers can focus on building amazing products.'
  }
];

export default function Partners() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <Badge variant="secondary" className="mb-6">
                <Users className="h-3 w-3 mr-1" />
                Partner Ecosystem
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Build the future together
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Join our thriving partner ecosystem and help millions of developers build, ship, and scale their ideas faster than ever before.
              </p>
              <div className="flex gap-4 justify-center">
                <Button size="lg">
                  Become a Partner
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline">
                  Partner Portal
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Partner Logos Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl font-bold mb-4">Trusted by industry leaders</h2>
              <p className="text-muted-foreground">
                We're proud to partner with the world's most innovative companies to deliver exceptional developer experiences.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 max-w-6xl mx-auto">
              {partnerLogos.map((partner, index) => (
                <div key={index} className="flex flex-col items-center group">
                  <div className="w-16 h-16 bg-background rounded-lg shadow-sm flex items-center justify-center text-2xl mb-2 group-hover:shadow-md transition-shadow">
                    {partner.logo}
                  </div>
                  <span className="text-sm font-medium text-center">{partner.name}</span>
                  <Badge variant="outline" className="text-xs mt-1">
                    {partner.tier}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Partnership Types Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl font-bold mb-4">Partnership opportunities</h2>
              <p className="text-muted-foreground">
                Whether you're a technology provider, solution implementer, or channel partner, we have programs designed for your success.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {partnershipTypes.map((type, index) => (
                <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                      {type.icon}
                    </div>
                    <CardTitle className="text-xl">{type.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-6">{type.description}</p>
                    <ul className="space-y-2">
                      {type.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Star className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Partner Benefits Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl font-bold mb-4">Why partner with E-Code?</h2>
              <p className="text-muted-foreground">
                Join a thriving ecosystem that's transforming how software is built and deployed worldwide.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {partnerBenefits.map((benefit, index) => (
                <Card key={index} className="border-none shadow-sm text-center">
                  <CardContent className="pt-6">
                    <div className="p-3 bg-primary/10 rounded-lg w-fit mx-auto mb-4">
                      {benefit.icon}
                    </div>
                    <h3 className="font-semibold mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Success Stories Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl font-bold mb-4">Partner success stories</h2>
              <p className="text-muted-foreground">
                See how our partners are achieving remarkable results and driving innovation with E-Code.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {successStories.map((story, index) => (
                <Card key={index} className="border-none shadow-sm">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-background rounded-lg shadow-sm flex items-center justify-center text-xl">
                        {story.logo}
                      </div>
                      <div>
                        <h3 className="font-semibold">{story.partner}</h3>
                        <Badge variant="outline" className="text-xs">
                          {story.metrics}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{story.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{story.description}</p>
                    <blockquote className="text-sm italic border-l-4 border-primary/20 pl-4">
                      "{story.quote}"
                    </blockquote>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Ready to partner with us?</h2>
              <p className="text-lg opacity-90 mb-8">
                Join thousands of partners who are already transforming the developer experience. Let's build something amazing together.
              </p>
              <div className="flex gap-4 justify-center">
                <Button size="lg" variant="secondary">
                  Apply Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10">
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}