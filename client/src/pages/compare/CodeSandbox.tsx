import { ComparisonLayout } from "@/components/ComparisonLayout";

export default function CodeSandboxComparison() {
  const features = [
    { name: "Browser-based IDE", ecode: true, competitor: true },
    { name: "AI Agent for Autonomous Building", ecode: true, competitor: false },
    { name: "Real-time Collaboration", ecode: true, competitor: true },
    { name: "Instant Preview", ecode: true, competitor: true },
    { name: "Free Tier", ecode: "Unlimited projects", competitor: "3 sandboxes" },
    { name: "Language Support", ecode: "50+", competitor: "Web focused" },
    { name: "Mobile App", ecode: true, competitor: true },
    { name: "Desktop App", ecode: true, competitor: false },
    { name: "NPM Support", ecode: true, competitor: true },
    { name: "Git Integration", ecode: "Full", competitor: "GitHub only" },
    { name: "Deployment", ecode: "One-click", competitor: "Vercel/Netlify" },
    { name: "Custom Domains", ecode: true, competitor: "Pro only" },
    { name: "Private Projects", ecode: "Unlimited", competitor: "Pro only" },
    { name: "Team Features", ecode: true, competitor: true },
    { name: "Templates", ecode: "10,000+", competitor: "100+" },
    { name: "Backend Support", ecode: "Full stack", competitor: "Limited" },
    { name: "Database", ecode: "Built-in", competitor: "External only" },
    { name: "Terminal Access", ecode: "Full", competitor: "Limited" },
    { name: "Educational Features", ecode: true, competitor: "Basic" },
    { name: "Pricing", ecode: "From $0/month", competitor: "From $9/month" },
  ];

  const ecodeAdvantages = [
    "AI Agent builds complete applications from descriptions",
    "Support for 50+ languages beyond just web technologies",
    "Unlimited free private projects vs 3 sandbox limit",
    "Full backend development with built-in databases",
    "Complete terminal access with root permissions",
    "One-click deployment with automatic SSL and domains",
    "Desktop app for offline development",
    "Comprehensive educational features and curriculum",
    "Bounty system to earn while coding",
    "Active community with millions of developers",
  ];

  const competitorAdvantages = [
    "Specialized for React, Vue, and modern web frameworks",
    "Excellent TypeScript and JSX support",
    "Fast hot module reloading",
    "Clean, focused interface for web development",
    "Strong integration with Vercel and Netlify",
    "Popular for sharing code examples and demos",
    "Good for embedding in documentation",
    "Lighter weight for simple web projects",
    "Better performance for pure frontend work",
  ];

  return (
    <ComparisonLayout
      competitorName="CodeSandbox"
      competitorLogo="/images/competitors/codesandbox.svg"
      tagline="Full-Stack Development vs Frontend-First Coding"
      description="E-Code offers complete full-stack development with AI assistance, while CodeSandbox excels at frontend web development. Compare their features and capabilities."
      features={features}
      ecodeAdvantages={ecodeAdvantages}
      competitorAdvantages={competitorAdvantages}
    />
  );
}