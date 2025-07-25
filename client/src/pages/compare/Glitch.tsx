import { ComparisonLayout } from "@/components/ComparisonLayout";

export default function GlitchComparison() {
  const features = [
    { name: "Browser-based IDE", ecode: true, competitor: true },
    { name: "AI Agent for Autonomous Building", ecode: true, competitor: false },
    { name: "Real-time Collaboration", ecode: true, competitor: true },
    { name: "Instant Deployment", ecode: true, competitor: true },
    { name: "Free Hosting", ecode: "Unlimited", competitor: "Limited hours" },
    { name: "Language Support", ecode: "50+", competitor: "Node.js focused" },
    { name: "Mobile App", ecode: true, competitor: false },
    { name: "Desktop App", ecode: true, competitor: false },
    { name: "Database Support", ecode: "Multiple", competitor: "SQLite" },
    { name: "Custom Domains", ecode: true, competitor: "Paid only" },
    { name: "SSL Certificates", ecode: "Automatic", competitor: "Automatic" },
    { name: "Community Templates", ecode: "10,000+", competitor: "1,000+" },
    { name: "Educational Features", ecode: true, competitor: "Basic" },
    { name: "Bounty System", ecode: true, competitor: false },
    { name: "Git Integration", ecode: true, competitor: "Export only" },
    { name: "Terminal Access", ecode: "Full", competitor: "Limited" },
    { name: "Environment Variables", ecode: true, competitor: true },
    { name: "Asset Storage", ecode: "Unlimited", competitor: "Limited" },
    { name: "Team Features", ecode: true, competitor: "Paid only" },
    { name: "Pricing", ecode: "From $0/month", competitor: "From $8/month" },
  ];

  const ecodeAdvantages = [
    "AI Agent can build complete applications autonomously",
    "Support for 50+ programming languages vs Node.js focus",
    "Unlimited free hosting without sleep restrictions",
    "Full terminal access with root permissions",
    "Mobile and desktop apps for coding anywhere",
    "Multiple database options (PostgreSQL, MySQL, Redis)",
    "Comprehensive Git integration with branching",
    "Advanced educational features and curriculum",
    "Bounty system to earn while learning",
    "Larger community with more templates and resources",
  ];

  const competitorAdvantages = [
    "Simpler, more approachable interface for beginners",
    "Strong focus on creative coding and web experiments",
    "Remix culture with easy project forking",
    "Lower learning curve for new developers",
    "Good for quick prototypes and demos",
    "Community focused on fun, creative projects",
    "Lightweight editor loads quickly",
    "Good for teaching basic web development",
  ];

  return (
    <ComparisonLayout
      competitorName="Glitch"
      competitorLogo="/images/competitors/glitch.svg"
      tagline="Professional Development Platform vs Creative Coding"
      description="E-Code provides a complete development environment with AI assistance, while Glitch focuses on simple, creative web projects. Compare their capabilities."
      features={features}
      ecodeAdvantages={ecodeAdvantages}
      competitorAdvantages={competitorAdvantages}
    />
  );
}