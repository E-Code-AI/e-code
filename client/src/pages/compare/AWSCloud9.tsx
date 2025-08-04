import { ComparisonLayout } from "@/components/ComparisonLayout";
import { SiAmazon } from 'react-icons/si';

export default function AWSCloud9Comparison() {
  const features = [
    { name: "Browser-based IDE", ecode: true, competitor: true },
    { name: "AI Agent for Autonomous Building", ecode: true, competitor: false },
    { name: "Real-time Collaboration", ecode: true, competitor: true },
    { name: "Built-in Terminal", ecode: true, competitor: true },
    { name: "50+ Language Support", ecode: "50+", competitor: "20+" },
    { name: "Instant Environment Setup", ecode: true, competitor: false },
    { name: "Free Tier", ecode: "Unlimited projects", competitor: "Limited EC2 hours" },
    { name: "Mobile App", ecode: true, competitor: false },
    { name: "One-click Deployment", ecode: true, competitor: false },
    { name: "Built-in Database", ecode: true, competitor: false },
    { name: "Package Management", ecode: "Automatic", competitor: "Manual" },
    { name: "Community Templates", ecode: "10,000+", competitor: "Limited" },
    { name: "Educational Features", ecode: true, competitor: false },
    { name: "Bounty System", ecode: true, competitor: false },
    { name: "Git Integration", ecode: true, competitor: true },
    { name: "Debugging Tools", ecode: true, competitor: true },
    { name: "Environment Variables", ecode: true, competitor: true },
    { name: "Custom Domains", ecode: true, competitor: false },
    { name: "SSL Certificates", ecode: "Automatic", competitor: "Manual" },
    { name: "Pricing", ecode: "From $0/month", competitor: "Pay per EC2 usage" },
  ];

  const ecodeAdvantages = [
    "Zero setup time - start coding instantly without AWS configuration",
    "AI Agent can build entire applications autonomously",
    "Free tier includes unlimited public projects and hosting",
    "Mobile and tablet apps for coding on the go",
    "Integrated deployment with automatic SSL and custom domains",
    "Built-in package management for all languages",
    "Active community with millions of templates and examples",
    "Educational tools for learning and teaching",
    "Bounty system to earn money while coding",
    "No AWS account or credit card required to start",
  ];

  const competitorAdvantages = [
    "Direct integration with AWS services and infrastructure",
    "Full control over EC2 instance configuration",
    "Enterprise-grade security with VPC support",
    "Familiar AWS IAM for access management",
    "Can develop and test Lambda functions locally",
    "Integration with AWS CodeCommit and CodeBuild",
    "Suitable for AWS-specific development workflows",
    "Can access private resources in your VPC",
  ];

  return (
    <ComparisonLayout
      competitorName="AWS Cloud9"
      competitorLogo={<SiAmazon className="w-16 h-16" />}
      tagline="The Complete Development Platform vs AWS Infrastructure"
      description="E-Code provides an instant, AI-powered development environment while AWS Cloud9 offers deep AWS integration. Compare features, pricing, and capabilities."
      features={features}
      ecodeAdvantages={ecodeAdvantages}
      competitorAdvantages={competitorAdvantages}
    />
  );
}