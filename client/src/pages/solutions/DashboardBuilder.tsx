// @ts-nocheck
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BarChart3, PieChart, TrendingUp, CheckCircle, Database, Zap, Monitor } from "lucide-react";
import { Link } from "wouter";
import PublicLayout from "@/components/layout/PublicLayout";

export default function DashboardBuilder() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <Badge className="mb-4 px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-0">
            Data Visualization Made Simple
          </Badge>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
            Dashboard Builder
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Build interactive data visualizations and analytics dashboards with AI assistance.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Create Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/templates?category=dashboards">
              <Button size="lg" variant="outline" className="gap-2">
                <Monitor className="h-4 w-4" />
                View Templates
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg w-fit mb-4">
              <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Rich Visualizations</h3>
            <p className="text-muted-foreground">
              Charts, graphs, maps, and tables that make your data come alive.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg w-fit mb-4">
              <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Connect Any Data</h3>
            <p className="text-muted-foreground">
              Import from databases, APIs, CSV files, or enter data manually.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/20 rounded-lg w-fit mb-4">
              <Zap className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Updates</h3>
            <p className="text-muted-foreground">
              Live data feeds with automatic refresh and instant updates.
            </p>
          </Card>
        </div>

        {/* Dashboard Types */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Dashboards for Every Need</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "Sales Analytics",
              "Marketing KPIs",
              "Financial Reports",
              "Project Management",
              "Customer Analytics",
              "IoT Monitoring",
              "Social Media Stats",
              "Health Metrics"
            ].map((dashType) => (
              <Card key={dashType} className="p-4 text-center hover:shadow-md transition-shadow">
                <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-2" />
                <p className="font-medium">{dashType}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Chart Types */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Visualization Options</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <PieChart className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Pie & Donut Charts</h3>
                  <p className="text-sm text-muted-foreground">Perfect for showing proportions and percentages</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BarChart3 className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Bar & Column Charts</h3>
                  <p className="text-sm text-muted-foreground">Compare values across categories</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Line & Area Charts</h3>
                  <p className="text-sm text-muted-foreground">Show trends and changes over time</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Monitor className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Heatmaps</h3>
                  <p className="text-sm text-muted-foreground">Visualize data density and patterns</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Data Tables</h3>
                  <p className="text-sm text-muted-foreground">Sortable, filterable data grids</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">KPI Cards</h3>
                  <p className="text-sm text-muted-foreground">Highlight key metrics and indicators</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="p-12 bg-gradient-to-r from-indigo-600/10 to-blue-600/10 border-2 border-primary/20">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Transform Your Data Into Insights</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create beautiful, interactive dashboards that help you make data-driven decisions.
            </p>
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Building Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </PublicLayout>
  );
}