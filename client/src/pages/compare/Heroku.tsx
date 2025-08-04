import { ComparisonLayout } from "@/components/ComparisonLayout";
import { SiHeroku } from 'react-icons/si';

export default function HerokuComparison() {
  const features = [
    { name: "Browser-based IDE", ecode: true, competitor: false },
    { name: "AI Agent for Autonomous Building", ecode: true, competitor: false },
    { name: "Development Environment", ecode: "Integrated", competitor: "Local only" },
    { name: "Deployment Platform", ecode: true, competitor: true },
    { name: "Free Tier", ecode: "Unlimited apps", competitor: "Discontinued" },
    { name: "Language Support", ecode: "50+", competitor: "8 officially" },
    { name: "Build & Deploy", ecode: "Instant", competitor: "Git push" },
    { name: "Database Options", ecode: "Built-in", competitor: "Add-ons" },
    { name: "SSL Certificates", ecode: "Automatic", competitor: "Automatic" },
    { name: "Custom Domains", ecode: true, competitor: true },
    { name: "Scaling", ecode: "Automatic", competitor: "Manual" },
    { name: "CI/CD", ecode: "Built-in", competitor: "Heroku Flow" },
    { name: "Monitoring", ecode: "Included", competitor: "Add-ons" },
    { name: "Team Collaboration", ecode: "Real-time", competitor: "Git-based" },
    { name: "Mobile Development", ecode: true, competitor: false },
    { name: "Educational Features", ecode: true, competitor: false },
    { name: "Community Support", ecode: "Active", competitor: "Forums" },
    { name: "Container Support", ecode: "Yes", competitor: "Docker" },
    { name: "Pricing", ecode: "From $0/month", competitor: "From $5/month" },
    { name: "Development Speed", ecode: "Instant", competitor: "Setup required" },
  ];

  const ecodeAdvantages = [
    "Complete development environment in the browser - no local setup",
    "AI Agent builds and deploys applications automatically",
    "Code, test, and deploy in one seamless platform",
    "Truly free tier with unlimited projects and hosting",
    "Real-time collaboration for team development",
    "Instant environment setup - start coding in seconds",
    "Built-in databases and services without add-ons",
    "Educational tools and curriculum for learning",
    "Mobile and desktop apps for coding anywhere",
    "10,000+ templates to start from",
  ];

  const competitorAdvantages = [
    "Mature platform with proven enterprise reliability",
    "Extensive add-on marketplace for additional services",
    "Strong integration with Salesforce ecosystem",
    "Familiar Git-based deployment workflow",
    "Heroku Postgres is industry-standard",
    "Better for traditional deployment pipelines",
    "More control over infrastructure configuration",
    "Established DevOps practices and documentation",
  ];

  return (
    <ComparisonLayout
      competitorName="Heroku"
      competitorLogo={<SiHeroku className="w-16 h-16" />}
      tagline="All-in-One Development vs Traditional PaaS"
      description="E-Code combines development and deployment in one platform with AI assistance, while Heroku focuses on application hosting. See how they compare."
      features={features}
      ecodeAdvantages={ecodeAdvantages}
      competitorAdvantages={competitorAdvantages}
    />
  );
}