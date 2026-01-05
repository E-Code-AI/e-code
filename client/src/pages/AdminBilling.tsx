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
import { AdminLayout } from "./admin/AdminLayout";
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
      toast({ title: "Plan updated successfully", variant: "success" });
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
      toast({ title: "Resource limit updated successfully", variant: "success" });
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
      toast({ title: "Billing settings updated successfully", variant: "success" });
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
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white" data-testid="heading-billing-management">Billing Management</h1>
          <p className="text-zinc-400" data-testid="text-billing-description">Configure pricing plans and billing settings</p>
        </div>
      </div>

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList data-testid="tabs-billing">
          <TabsTrigger value="plans" data-testid="tab-pricing-plans">Pricing Plans</TabsTrigger>
          <TabsTrigger value="limits" data-testid="tab-resource-limits">Resource Limits</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-billing-settings">Billing Settings</TabsTrigger>
        </TabsList>

        {/* Pricing Plans Tab */}
        <TabsContent value="plans">
          <Card className="bg-zinc-800 border-zinc-700" data-testid="card-pricing-plans">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Pricing Plans</CardTitle>
                  <CardDescription className="text-zinc-400">Manage subscription tiers and pricing</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {pricingPlans.map((plan) => (
                  <Card key={plan.id} className="relative bg-zinc-900 border-zinc-700" data-testid={`card-plan-${plan.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-white">{plan.name}</CardTitle>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingPlan(plan);
                            setShowPlanDialog(true);
                          }}
                          data-testid={`button-edit-plan-${plan.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-2xl font-bold text-white">€{plan.monthlyPrice}</p>
                          <p className="text-sm text-zinc-400">per month</p>
                        </div>
                        <div>
                          <p className="text-sm text-zinc-300">Yearly: €{plan.yearlyPrice}</p>
                          <p className="text-xs text-green-500">
                            Save €{(plan.monthlyPrice * 12 - plan.yearlyPrice).toFixed(2)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">Features:</p>
                          <ul className="text-sm text-zinc-400 space-y-1">
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
          <Card className="bg-zinc-800 border-zinc-700" data-testid="card-resource-limits">
            <CardHeader>
              <CardTitle className="text-white">Resource Limits</CardTitle>
              <CardDescription className="text-zinc-400">Configure usage limits and overage rates for each plan</CardDescription>
            </CardHeader>
            <CardContent>
              {pricingPlans.map((plan) => (
                <div key={plan.id} className="mb-6" data-testid={`limits-plan-${plan.id}`}>
                  <h3 className="text-lg font-semibold mb-3 text-white">{plan.name}</h3>
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
                        <TableRow key={limit.id} data-testid={`row-limit-${limit.id}`}>
                          <TableCell className="capitalize text-white">
                            {limit.resourceType.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-zinc-300">
                            {limit.limit === -1 ? 'Unlimited' : limit.limit}
                          </TableCell>
                          <TableCell className="text-zinc-300">{limit.unit}</TableCell>
                          <TableCell className="text-zinc-300">
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
                              data-testid={`button-edit-limit-${limit.id}`}
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
          <Card className="bg-zinc-800 border-zinc-700" data-testid="card-billing-settings">
            <CardHeader>
              <CardTitle className="text-white">Billing Settings</CardTitle>
              <CardDescription className="text-zinc-400">Configure global billing parameters</CardDescription>
            </CardHeader>
            <CardContent>
              {billingSettings && (
                <form onSubmit={handleSettingsSubmit} className="space-y-4" data-testid="form-billing-settings">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="stripe-webhook" className="text-zinc-300">Stripe Webhook Endpoint</Label>
                      <Input
                        id="stripe-webhook"
                        value={billingSettings.stripeWebhookEndpoint}
                        onChange={(e) => billingSettings.stripeWebhookEndpoint = e.target.value}
                        placeholder="https://e-code.ai/webhooks/stripe"
                        className="bg-zinc-900 border-zinc-700 text-white"
                        data-testid="input-stripe-webhook"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tax-rate" className="text-zinc-300">Tax Rate (%)</Label>
                      <Input
                        id="tax-rate"
                        type="number"
                        step="0.01"
                        value={billingSettings.taxRate}
                        onChange={(e) => billingSettings.taxRate = parseFloat(e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white"
                        data-testid="input-tax-rate"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency" className="text-zinc-300">Currency</Label>
                      <Select 
                        value={billingSettings.currency}
                        onValueChange={(value) => billingSettings.currency = value}
                      >
                        <SelectTrigger id="currency" className="bg-zinc-900 border-zinc-700 text-white" data-testid="select-currency">
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
                      <Label htmlFor="invoice-prefix" className="text-zinc-300">Invoice Prefix</Label>
                      <Input
                        id="invoice-prefix"
                        value={billingSettings.invoicePrefix}
                        onChange={(e) => billingSettings.invoicePrefix = e.target.value}
                        placeholder="INV-"
                        className="bg-zinc-900 border-zinc-700 text-white"
                        data-testid="input-invoice-prefix"
                      />
                    </div>
                    <div>
                      <Label htmlFor="grace-period" className="text-zinc-300">Grace Period (days)</Label>
                      <Input
                        id="grace-period"
                        type="number"
                        value={billingSettings.gracePeriodDays}
                        onChange={(e) => billingSettings.gracePeriodDays = parseInt(e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-white"
                        data-testid="input-grace-period"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={updateSettingsMutation.isPending} data-testid="button-save-settings">
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
    </AdminLayout>
  );
}