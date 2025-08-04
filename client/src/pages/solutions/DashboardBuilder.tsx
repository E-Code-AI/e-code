import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Sparkles, ArrowRight, CheckCircle, BarChart3, LineChart, 
  PieChart, TrendingUp, Database, RefreshCw, FileText,
  Download, Users, DollarSign, Activity, PlayCircle
} from 'lucide-react';

export default function DashboardBuilder() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-96 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-96 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container-responsive max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                Data Visualization AI
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Beautiful Dashboards from Your Data
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Transform raw data into stunning, interactive dashboards. Connect any data source and let AI create the perfect visualization.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" className="gap-2">
                  Create Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  See Examples
                </Button>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>50M+ data points visualized</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span>Real-time updates</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border bg-slate-50 dark:bg-slate-900">
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Revenue</span>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold">$124.5K</div>
                      <div className="h-16 mt-2">
                        <div className="h-full bg-gradient-to-t from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded" />
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Users</span>
                        <Users className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="text-2xl font-bold">8,432</div>
                      <div className="h-16 mt-2 flex items-end gap-1">
                        {[40, 60, 45, 70, 65, 80, 75].map((h, i) => (
                          <div key={i} className="flex-1 bg-purple-200 dark:bg-purple-800 rounded-t" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Updating in real-time
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Enterprise-Grade Analytics Made Simple
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Connect your data, choose visualizations, and share insights - all without writing code
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Any Data Source</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Connect to databases, APIs, spreadsheets, or upload CSV files
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center mb-4">
                  <LineChart className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                </div>
                <CardTitle>Smart Visualizations</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  AI automatically suggests the best charts for your data
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                  <RefreshCw className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Real-Time Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Dashboards update automatically as your data changes
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Team Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Share dashboards with controlled access and permissions
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Download className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Export & Embed</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Export reports or embed dashboards in your applications
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle>AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get automatic insights and anomaly detection from your data
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dashboard Types */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Dashboards for Every Need
            </h2>
            <p className="text-lg text-muted-foreground">
              Pre-built templates to get you started quickly
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Sales Analytics</h3>
              <p className="text-sm text-muted-foreground">Track revenue, conversions, and sales team performance</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Marketing KPIs</h3>
              <p className="text-sm text-muted-foreground">Monitor campaigns, traffic, and engagement metrics</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Operations</h3>
              <p className="text-sm text-muted-foreground">Real-time monitoring of systems and processes</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Executive Reports</h3>
              <p className="text-sm text-muted-foreground">High-level overviews for leadership teams</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Visualization Types */}
      <section className="py-20">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              30+ Visualization Types
            </h2>
            <p className="text-lg text-muted-foreground">
              From simple charts to advanced data visualizations
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { icon: BarChart3, name: "Bar Charts" },
              { icon: LineChart, name: "Line Graphs" },
              { icon: PieChart, name: "Pie Charts" },
              { icon: Activity, name: "Area Charts" },
              { icon: TrendingUp, name: "Scatter Plots" },
              { icon: Database, name: "Heat Maps" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-muted/50 rounded-lg p-4 text-center hover:bg-muted transition-colors"
              >
                <item.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{item.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="container-responsive max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Turn Your Data Into Insights
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Start visualizing your data in minutes, not days
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="gap-2">
              Create Free Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 bg-transparent text-white border-white hover:bg-white/10">
              <BarChart3 className="h-4 w-4" />
              View Templates
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}