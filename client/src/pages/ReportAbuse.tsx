import { useState } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, Send, FileText, ExternalLink } from "lucide-react";

export default function ReportAbuse() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("code");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formElement = e.target as HTMLFormElement;
      const formData = new FormData(formElement);
      
      const response = await fetch('/api/report/abuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reportType: reportType,
          targetUrl: formData.get('url'),
          description: formData.get('description'),
          reporterEmail: formData.get('email')
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Report submitted",
          description: data.message || "Thank you for helping keep E-Code safe. We'll review your report and take appropriate action.",
        });
        
        // Reset form
        formElement.reset();
        setReportType('code');
      } else {
        toast({
          title: "Submission failed",
          description: data.error || "Failed to submit report. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      
      <section className="py-responsive">
        <div className="container-responsive">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5" />
              <span className="text-sm text-muted-foreground">Trust & Safety</span>
            </div>

            <h1 className="text-responsive-2xl font-bold tracking-tight mb-4">
              Report Abuse
            </h1>
            
            <p className="text-responsive-base text-muted-foreground mb-8">
              Help us maintain a safe and productive environment for all E-Code users. If you've encountered content or behavior that violates our policies, please report it here.
            </p>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>What constitutes abuse on E-Code?</CardTitle>
                <CardDescription>
                  We take the following violations seriously and investigate all reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Illegal Content
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Content that violates laws, including but not limited to copyright infringement, malware distribution, or illegal activities
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Harmful or Malicious Code
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Code designed to harm systems, steal data, or compromise security
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Harassment or Bullying
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Targeted harassment, threats, or intimidation of other users
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-purple-500" />
                        Spam or Scams
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Unsolicited promotional content, phishing attempts, or fraudulent schemes
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-blue-500" />
                        Privacy Violations
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Sharing personal information without consent or doxxing
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-green-500" />
                        Inappropriate Content
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Adult content, graphic violence, or content inappropriate for our community
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Submit a Report</CardTitle>
                <CardDescription>
                  Please provide as much detail as possible to help us investigate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label>Type of abuse</Label>
                    <RadioGroup value={reportType} onValueChange={setReportType} className="mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="code" id="code" />
                        <Label htmlFor="code" className="font-normal">Malicious or harmful code</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="content" id="content" />
                        <Label htmlFor="content" className="font-normal">Inappropriate content</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="harassment" id="harassment" />
                        <Label htmlFor="harassment" className="font-normal">Harassment or bullying</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="spam" id="spam" />
                        <Label htmlFor="spam" className="font-normal">Spam or scams</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="copyright" id="copyright" />
                        <Label htmlFor="copyright" className="font-normal">Copyright infringement</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="privacy" id="privacy" />
                        <Label htmlFor="privacy" className="font-normal">Privacy violation</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other" className="font-normal">Other</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="url">URL of the content</Label>
                    <Input 
                      id="url" 
                      type="url" 
                      placeholder="https://e-code.com/..."
                      required
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Please provide the direct link to the Repl, profile, or comment
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="username">Username of the violator (if applicable)</Label>
                    <Input 
                      id="username" 
                      placeholder="@username"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description of the issue</Label>
                    <Textarea 
                      id="description"
                      placeholder="Please describe the issue in detail. Include any relevant context, such as when the incident occurred, what specifically violates our policies, and any evidence you can provide."
                      rows={6}
                      required
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Your email (optional)</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="your@email.com"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Provide your email if you'd like us to follow up on this report
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="terms" required />
                    <Label htmlFor="terms" className="text-sm font-normal">
                      I confirm that this report is made in good faith and the information provided is accurate
                    </Label>
                  </div>

                  <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? (
                      <>Submitting...</>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Report
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">DMCA Takedown Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    For copyright infringement claims, please submit a formal DMCA takedown notice.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    DMCA Process
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    For urgent safety concerns or illegal activity, contact us immediately.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    abuse@e-code.com
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">What happens after I submit a report?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Our Trust & Safety team reviews all reports within 24-48 hours</li>
                <li>We investigate the reported content against our Community Guidelines</li>
                <li>Appropriate action is taken, which may include content removal or account suspension</li>
                <li>If you provided an email, we'll notify you of the outcome when possible</li>
              </ul>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                False reports or abuse of the reporting system may result in account penalties.
                <br />
                For more information, see our <a href="/terms" className="text-primary hover:underline">Terms of Service</a> and <a href="/community-guidelines" className="text-primary hover:underline">Community Guidelines</a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}