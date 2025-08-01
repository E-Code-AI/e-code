import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  CreditCard, Settings, Users, Plus, Edit, 
  Trash2, Ban, CheckCircle, AlertCircle, Shield,
  DollarSign, Package, ArrowUpRight, TrendingUp
} from "lucide-react";

interface ResourceLimit {
  id: number;
  planId: string;
  resourceType: string;
  limit: number;
  unit: string;
  overage_rate?: number;
}

interface PricingPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: ResourceLimit[];
}

interface BillingSettings {
  stripeWebhookEndpoint: string;
  taxRate: number;
  currency: string;
  invoicePrefix: string;
  gracePeriodDays: number;
}

export default function AdminBilling() {
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [editingLimit, setEditingLimit] = useState<ResourceLimit | null>(null);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if user is admin
  if (!user || !user.email?.includes('admin')) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Access denied. Admin privileges required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch pricing plans
  const { data: pricingPlans = [], isLoading: plansLoading } = useQuery<PricingPlan[]>({
    queryKey: ['/api/admin/billing/plans'],
  });

  // Fetch billing settings
  const { data: billingSettings, isLoading: settingsLoading } = useQuery<BillingSettings>({
    queryKey: ['/api/admin/billing/settings'],
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: (plan: PricingPlan) => 
      apiRequest('PUT', `/api/admin/billing/plans/${plan.id}`, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/billing/plans'] });
      toast({ title: "Plan updated successfully" });
      setShowPlanDialog(false);
      setEditingPlan(null);
    },
    onError: () => {
      toast({ 
        title: "Failed to update plan", 
        variant: "destructive" 
      });
    }
  });

  // Update resource limit mutation
  const updateLimitMutation = useMutation({
    mutationFn: (data: { planId: string; limit: ResourceLimit }) => 
      apiRequest('PUT', `/api/admin/billing/plans/${data.planId}/limits/${data.limit.id}`, data.limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/billing/plans'] });
      toast({ title: "Resource limit updated successfully" });
      setShowLimitDialog(false);
      setEditingLimit(null);
    },
    onError: () => {
      toast({ 
        title: "Failed to update resource limit", 
        variant: "destructive" 
      });
    }
  });

  // Update billing settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: BillingSettings) => 
      apiRequest('PUT', '/api/admin/billing/settings', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/billing/settings'] });
      toast({ title: "Billing settings updated successfully" });
    },
    onError: () => {
      toast({ 
        title: "Failed to update billing settings", 
        variant: "destructive" 
      });
    }
  });

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      updatePlanMutation.mutate(editingPlan);
    }
  };

  const handleLimitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLimit && editingPlan) {
      updateLimitMutation.mutate({ 
        planId: editingPlan.id, 
        limit: editingLimit 
      });
    }
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (billingSettings) {
      updateSettingsMutation.mutate(billingSettings);
    }
  };

  if (plansLoading || settingsLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading billing configuration...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing Management</h1>
          <p className="text-muted-foreground">Configure pricing plans and billing settings</p>
        </div>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans">Pricing Plans</TabsTrigger>
          <TabsTrigger value="limits">Resource Limits</TabsTrigger>
          <TabsTrigger value="settings">Billing Settings</TabsTrigger>
        </TabsList>

        {/* Pricing Plans Tab */}
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pricing Plans</CardTitle>
                  <CardDescription>Manage subscription tiers and pricing</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {pricingPlans.map((plan) => (
                  <Card key={plan.id} className="relative">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingPlan(plan);
                            setShowPlanDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-2xl font-bold">€{plan.monthlyPrice}</p>
                          <p className="text-sm text-muted-foreground">per month</p>
                        </div>
                        <div>
                          <p className="text-sm">Yearly: €{plan.yearlyPrice}</p>
                          <p className="text-xs text-green-600">
                            Save €{(plan.monthlyPrice * 12 - plan.yearlyPrice).toFixed(2)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Features:</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {plan.features.slice(0, 3).map((feature, i) => (
                              <li key={i} className="truncate">• {feature}</li>
                            ))}
                            {plan.features.length > 3 && (
                              <li className="text-xs">+{plan.features.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resource Limits Tab */}
        <TabsContent value="limits">
          <Card>
            <CardHeader>
              <CardTitle>Resource Limits</CardTitle>
              <CardDescription>Configure usage limits and overage rates for each plan</CardDescription>
            </CardHeader>
            <CardContent>
              {pricingPlans.map((plan) => (
                <div key={plan.id} className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">{plan.name}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resource</TableHead>
                        <TableHead>Limit</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Overage Rate</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plan.limits.map((limit) => (
                        <TableRow key={limit.id}>
                          <TableCell className="capitalize">
                            {limit.resourceType.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell>
                            {limit.limit === -1 ? 'Unlimited' : limit.limit}
                          </TableCell>
                          <TableCell>{limit.unit}</TableCell>
                          <TableCell>
                            {limit.overage_rate ? `€${limit.overage_rate}/${limit.unit}` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingPlan(plan);
                                setEditingLimit(limit);
                                setShowLimitDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
              <CardDescription>Configure global billing parameters</CardDescription>
            </CardHeader>
            <CardContent>
              {billingSettings && (
                <form onSubmit={handleSettingsSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="stripe-webhook">Stripe Webhook Endpoint</Label>
                      <Input
                        id="stripe-webhook"
                        value={billingSettings.stripeWebhookEndpoint}
                        onChange={(e) => billingSettings.stripeWebhookEndpoint = e.target.value}
                        placeholder="https://api.e-code.com/webhooks/stripe"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                      <Input
                        id="tax-rate"
                        type="number"
                        step="0.01"
                        value={billingSettings.taxRate}
                        onChange={(e) => billingSettings.taxRate = parseFloat(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select 
                        value={billingSettings.currency}
                        onValueChange={(value) => billingSettings.currency = value}
                      >
                        <SelectTrigger id="currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="invoice-prefix">Invoice Prefix</Label>
                      <Input
                        id="invoice-prefix"
                        value={billingSettings.invoicePrefix}
                        onChange={(e) => billingSettings.invoicePrefix = e.target.value}
                        placeholder="INV-"
                      />
                    </div>
                    <div>
                      <Label htmlFor="grace-period">Grace Period (days)</Label>
                      <Input
                        id="grace-period"
                        type="number"
                        value={billingSettings.gracePeriodDays}
                        onChange={(e) => billingSettings.gracePeriodDays = parseInt(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={updateSettingsMutation.isPending}>
                    Save Settings
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pricing Plan</DialogTitle>
            <DialogDescription>
              Update pricing and features for {editingPlan?.name}
            </DialogDescription>
          </DialogHeader>
          {editingPlan && (
            <form onSubmit={handlePlanSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="plan-name">Plan Name</Label>
                  <Input
                    id="plan-name"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="monthly-price">Monthly Price (€)</Label>
                    <Input
                      id="monthly-price"
                      type="number"
                      step="0.01"
                      value={editingPlan.monthlyPrice}
                      onChange={(e) => setEditingPlan({...editingPlan, monthlyPrice: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="yearly-price">Yearly Price (€)</Label>
                    <Input
                      id="yearly-price"
                      type="number"
                      step="0.01"
                      value={editingPlan.yearlyPrice}
                      onChange={(e) => setEditingPlan({...editingPlan, yearlyPrice: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setShowPlanDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePlanMutation.isPending}>
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Resource Limit Dialog */}
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Resource Limit</DialogTitle>
            <DialogDescription>
              Update limit for {editingLimit?.resourceType.replace(/_/g, ' ')}
            </DialogDescription>
          </DialogHeader>
          {editingLimit && (
            <form onSubmit={handleLimitSubmit}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="limit-value">Limit Value</Label>
                  <Input
                    id="limit-value"
                    type="number"
                    value={editingLimit.limit}
                    onChange={(e) => setEditingLimit({...editingLimit, limit: parseInt(e.target.value)})}
                    placeholder="-1 for unlimited"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Use -1 for unlimited
                  </p>
                </div>
                <div>
                  <Label htmlFor="overage-rate">Overage Rate (€ per {editingLimit.unit})</Label>
                  <Input
                    id="overage-rate"
                    type="number"
                    step="0.01"
                    value={editingLimit.overage_rate || 0}
                    onChange={(e) => setEditingLimit({...editingLimit, overage_rate: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setShowLimitDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateLimitMutation.isPending}>
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}