// @ts-nocheck
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { Megaphone, MessageSquare, Users, Award, ArrowUpRight } from 'lucide-react';

const featuredThreads = [
  {
    title: 'Scaling E-Code for a global enterprise rollout',
    description: 'Best practices from teams rolling out secure AI development across 10,000+ seats.',
    category: 'Enterprise',
    replies: 128,
  },
  {
    title: 'Recommended workflows for AI agent assisted development',
    description: 'Share your playbooks for combining AI agents with compliance guardrails.',
    category: 'AI',
    replies: 94,
  },
  {
    title: 'From PoC to production: winning strategies',
    description: 'A step-by-step checklist from CTOs on moving from prototype to production inside E-Code.',
    category: 'Leadership',
    replies: 76,
  },
];

const categories = [
  { label: 'Announcements', icon: Megaphone, description: 'Platform updates, roadmap reveals, and release notes.' },
  { label: 'Implementation', icon: Users, description: 'Architecture patterns, deployment questions, and how-to guides.' },
  { label: 'AI & Automation', icon: MessageSquare, description: 'Prompt engineering, agent operations, and AI governance.' },
  { label: 'Champions', icon: Award, description: 'Spotlights on teams shipping faster with E-Code.' },
];

export default function Forum() {
  return (
    <MarketingLayout>
      <section className="relative overflow-hidden py-16">
        <div className="container-responsive max-w-5xl text-center">
          <Badge className="mx-auto mb-6 bg-white/10 text-white border-white/20">Global developer forum</Badge>
          <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">
            Connect with the E-Code community
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-200 max-w-3xl mx-auto">
            Learn from engineers building at enterprise scale, share feedback with our product teams, and stay ahead with curated best practices.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button className="bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white shadow-blue-500/30" onClick={() => (window.location.href = '/register')}>
              Join the forum
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" className="border-white/20 text-slate-100 hover:text-white" onClick={() => (window.location.href = '/contact-sales')}>
              Request a tailored workshop
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-responsive max-w-6xl grid gap-6 lg:grid-cols-3">
          {featuredThreads.map((thread) => (
            <Card key={thread.title} className="bg-white/5 border-white/10 text-left">
              <CardHeader>
                <Badge variant="outline" className="w-fit border-white/30 text-slate-100">{thread.category}</Badge>
                <CardTitle className="text-xl text-white">{thread.title}</CardTitle>
                <CardDescription className="text-slate-300 leading-relaxed">{thread.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm text-slate-300">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-white/20">
                    <AvatarFallback className="bg-sky-500/20 text-sky-100">EC</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">E-Code Enterprise Team</p>
                    <p className="text-xs text-slate-400">Official insights & resources</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{thread.replies} replies</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="container-responsive max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2">
            {categories.map((category) => (
              <Card key={category.label} className="bg-white/5 border-white/10">
                <CardHeader className="flex items-center gap-4">
                  <div className="rounded-full bg-white/10 p-3 text-sky-200">
                    <category.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-white">{category.label}</CardTitle>
                    <CardDescription className="text-slate-300 leading-relaxed">{category.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container-responsive max-w-4xl">
          <Card className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-white/10">
            <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
              <h2 className="text-3xl font-semibold text-white">Bring E-Code to your organization</h2>
              <p className="max-w-2xl text-slate-300">
                Partner with our enterprise architects for tailored onboarding, SOC2 compliant deployments, and on-site enablement programs.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button className="bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white" onClick={() => (window.location.href = '/contact-sales')}>
                  Schedule a briefing
                </Button>
                <Button variant="outline" className="border-white/20 text-slate-100 hover:text-white" onClick={() => (window.location.href = '/pricing')}>
                  Explore pricing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
