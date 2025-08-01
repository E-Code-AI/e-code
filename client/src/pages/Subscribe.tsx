import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useLocation } from 'wouter';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/usage?subscription=success`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      toast({
        title: "Payment Successful",
        description: "You are now subscribed to E-Code Pro!",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <PaymentElement />
        </CardContent>
      </Card>
      
      <div className="flex gap-4">
        <Button 
          type="submit" 
          disabled={!stripe || !elements || isProcessing}
          className="flex-1"
        >
          {isProcessing ? "Processing..." : "Subscribe Now"}
        </Button>
        <Button 
          type="button" 
          variant="outline"
          onClick={() => setLocation('/usage')}
          disabled={isProcessing}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Create subscription as soon as the page loads
    apiRequest("POST", "/api/create-subscription")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast({
            title: "Error",
            description: data.error,
            variant: "destructive",
          });
          setLocation('/usage');
        } else {
          setClientSecret(data.clientSecret);
        }
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to initialize subscription",
          variant: "destructive",
        });
        setLocation('/usage');
      });
  }, [toast, setLocation]);

  if (!clientSecret) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upgrade to E-Code Pro</h1>
        <p className="text-muted-foreground">
          Unlock more resources and advanced features for your development workflow
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Plan Details */}
        <Card>
          <CardHeader>
            <CardTitle>E-Code Pro</CardTitle>
            <CardDescription>
              Everything you need for professional development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-6">
              $10
              <span className="text-base font-normal text-muted-foreground">/month</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">500 hours of compute time per month</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">50 GB storage space</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">500 GB bandwidth</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Unlimited private projects</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Unlimited deployments</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">10 team collaborators</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Priority support</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Advanced AI features</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <div>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <SubscribeForm />
          </Elements>
        </div>
      </div>
    </div>
  );
}