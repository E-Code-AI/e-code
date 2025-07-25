import { ComparisonLayout } from "@/components/ComparisonLayout";

export default function GitHubCodespacesComparison() {
  const features = [
    { name: "Browser-based IDE", ecode: true, competitor: true },
    { name: "AI Agent for Autonomous Building", ecode: true, competitor: false },
    { name: "GitHub Integration", ecode: true, competitor: "Native" },
    { name: "Real-time Collaboration", ecode: true, competitor: "Limited" },
    { name: "Instant Environment Setup", ecode: true, competitor: true },
    { name: "Free Tier", ecode: "Unlimited projects", competitor: "60 hours/month" },
    { name: "Mobile App", ecode: true, competitor: false },
    { name: "Desktop App", ecode: true, competitor: false },
    { name: "Language Support", ecode: "50+", competitor: "All VS Code" },
    { name: "One-click Deployment", ecode: true, competitor: false },
    { name: "Built-in Hosting", ecode: true, competitor: false },
    { name: "Community Templates", ecode: "10,000+", competitor: "DevContainers" },
    { name: "Educational Features", ecode: true, competitor: "GitHub Education" },
    { name: "Bounty System", ecode: true, competitor: false },
    { name: "Package Management", ecode: "Automatic", competitor: "Via DevContainer" },
    { name: "Custom Domains", ecode: true, competitor: false },
    { name: "SSL Certificates", ecode: "Automatic", competitor: false },
    { name: "VS Code Extensions", ecode: "Curated", competitor: "Full marketplace" },
    { name: "GPU Support", ecode: "Available", competitor: "Available" },
    { name: "Pricing", ecode: "From $0/month", competitor: "From $4/month" },
  ];

  const ecodeAdvantages = [
    "Truly free tier with unlimited public projects and hosting",
    "AI Agent builds complete applications from natural language",
    "Instant start - no configuration files or setup required",
    "Built-in deployment and hosting with custom domains",
    "Mobile and desktop apps for coding anywhere",
    "Integrated database and backend services",
    "Active community with millions of users and templates",
    "Educational tools designed for learning",
    "Earn money through the bounty system",
    "Works without a GitHub account",
  ];

  const competitorAdvantages = [
    "Native GitHub integration and workflows",
    "Full VS Code experience in the browser",
    "Access to entire VS Code extension marketplace",
    "DevContainers for reproducible environments",
    "Seamless integration with GitHub Actions",
    "Pre-built images for common development stacks",
    "GitHub Copilot integration",
    "Enterprise features for organizations",
    "Local VS Code connection option",
    "Better for large, complex codebases",
  ];

  return (
    <ComparisonLayout
      competitorName="GitHub Codespaces"
      competitorLogo="/images/competitors/github-codespaces.svg"
      tagline="AI-Powered Development vs Enterprise Cloud Development"
      description="E-Code offers instant, AI-assisted coding for everyone while GitHub Codespaces provides enterprise-grade cloud development environments. See how they compare."
      features={features}
      ecodeAdvantages={ecodeAdvantages}
      competitorAdvantages={competitorAdvantages}
    />
  );
}