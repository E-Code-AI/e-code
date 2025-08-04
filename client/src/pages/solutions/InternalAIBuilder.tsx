import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Sparkles, ArrowRight, CheckCircle, Brain, Lock, 
  Building, Users, FileText, Workflow, Shield,
  BarChart, Clock, Zap, PlayCircle, Star
} from 'lucide-react';

export default function InternalAIBuilder() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-96 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-96 w-[500px] h-[500px] bg-slate-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container-responsive max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                Enterprise AI Automation
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-slate-600 bg-clip-text text-transparent">
                AI Agents for Your Team's Workflows
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Deploy secure, private AI agents that automate internal processes, answer employee questions, and integrate with your existing tools.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" className="gap-2">
                  Deploy Internal AI
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  See Enterprise Demo
                </Button>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>Fortune 500 trusted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-green-500" />
                  <span>SOC 2 compliant</span>
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
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <Brain className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">HR Assistant AI</h3>
                        <p className="text-xs text-muted-foreground">Internal use only • Enterprise SSO</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Answers policy questions instantly</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Processes leave requests</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Onboards new employees</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span>Your data never leaves your infrastructure</span>
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
              Enterprise-Grade AI Automation
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Build secure, compliant AI agents that integrate with your existing infrastructure
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <CardTitle>Private & Secure</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Deploy on-premise or in your private cloud. Your data never leaves your control.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Workflow className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                </div>
                <CardTitle>Workflow Automation</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automate complex multi-step processes across departments and systems
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>Role-Based Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Fine-grained permissions ensure employees only access appropriate information
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle>Document Intelligence</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Process and understand internal documents, policies, and knowledge bases
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                  <BarChart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Analytics & Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Track usage, measure ROI, and optimize agent performance over time
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Instant Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Connect with Slack, Teams, email, and your existing enterprise tools
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              AI Agents for Every Department
            </h2>
            <p className="text-lg text-muted-foreground">
              Pre-built templates for common enterprise use cases
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">HR Operations</h3>
              <p className="text-sm text-muted-foreground">Benefits, policies, onboarding, and employee queries</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Legal & Compliance</h3>
              <p className="text-sm text-muted-foreground">Contract review, compliance checks, and policy updates</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Finance & Accounting</h3>
              <p className="text-sm text-muted-foreground">Expense processing, budget queries, and reporting</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">IT Support</h3>
              <p className="text-sm text-muted-foreground">Ticket automation, password resets, and troubleshooting</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ROI Stats */}
      <section className="py-20">
        <div className="container-responsive max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Proven ROI for Enterprises
            </h2>
            <p className="text-lg text-muted-foreground">
              Real results from companies using internal AI agents
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">70%</div>
              <p className="text-sm text-muted-foreground">Reduction in response time</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">$2.5M</div>
              <p className="text-sm text-muted-foreground">Average annual savings</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">95%</div>
              <p className="text-sm text-muted-foreground">Employee satisfaction</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">24/7</div>
              <p className="text-sm text-muted-foreground">Always available support</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="py-20 bg-muted/30">
        <div className="container-responsive max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Enterprise Security First
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Built to meet the strictest security and compliance requirements
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">SOC 2 Type II Certified</h3>
                    <p className="text-sm text-muted-foreground">Annual audits ensure continuous compliance</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">GDPR & CCPA Compliant</h3>
                    <p className="text-sm text-muted-foreground">Full data privacy and protection compliance</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">End-to-End Encryption</h3>
                    <p className="text-sm text-muted-foreground">All data encrypted at rest and in transit</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">SSO & MFA Support</h3>
                    <p className="text-sm text-muted-foreground">Integrate with your existing identity providers</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <Card className="bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950 dark:to-slate-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="secondary" className="mr-2">Private Cloud Deploy</Badge>
                  <Badge variant="secondary" className="mr-2">On-Premise Option</Badge>
                  <Badge variant="secondary" className="mr-2">Audit Logs</Badge>
                  <Badge variant="secondary" className="mr-2">Data Residency</Badge>
                  <Badge variant="secondary" className="mr-2">ISO 27001</Badge>
                  <Badge variant="secondary" className="mr-2">HIPAA Ready</Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-slate-600 text-white">
        <div className="container-responsive max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Transform Your Enterprise with AI
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Join leading companies automating internal workflows with secure AI
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="gap-2">
              Schedule Enterprise Demo
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 bg-transparent text-white border-white hover:bg-white/10">
              <FileText className="h-4 w-4" />
              Download Whitepaper
            </Button>
          </div>
          <p className="mt-6 text-sm text-white/70">
            Trusted by Fortune 500 companies worldwide
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}