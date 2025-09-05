"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Check, Crown, Zap, Shield, Users, BarChart3, ArrowRight, Star, Rocket, Building, Loader2, CreditCard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService, useApiCall } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { PaymentDialog } from "../../components/payment-dialog"

interface Plan {
  id: string
  name: string
  price: number | string
  priceDescription?: string
  description: string
  features: {
    dataAccess: string
    apiRequests: string
    rateLimit: string
    requestCall: string
    support: string
  }
  popular?: boolean
  current?: boolean
}

const defaultPlans: Plan[] = [
  {
    id: "free",
    name: "Free Tier",
    price: 0,
    priceDescription: "$0",
    description: "Perfect for getting started and testing our API",
    features: {
      dataAccess: "All feeds",
      apiRequests: "1,000 reqs/month",
      rateLimit: "30 seconds",
      requestCall: "$0.00000",
      support: "Email & Community"
    },
  },
  {
    id: "developer",
    name: "Developer Tier",
    price: 50,
    priceDescription: "$50",
    description: "Great for developers building applications",
    features: {
      dataAccess: "All feeds",
      apiRequests: "10,000 reqs/month",
      rateLimit: "10 seconds",
      requestCall: "$0.0005",
      support: "24/7 support"
    },
    popular: true,
  },
  {
    id: "professional",
    name: "Professional Tier",
    price: 100,
    priceDescription: "$100",
    description: "For growing businesses with higher demands",
    features: {
      dataAccess: "All feeds + Historical data",
      apiRequests: "100,000 reqs/month",
      rateLimit: "2 seconds",
      requestCall: "$0.0002",
      support: "24/7 support"
    },
  },
  {
    id: "enterprise",
    name: "Enterprise Tier",
    price: -1,
    priceDescription: "Custom",
    description: "For large organizations with custom requirements",
    features: {
      dataAccess: "All feeds + Private",
      apiRequests: "Unlimited (custom SLA)",
      rateLimit: "Custom",
      requestCall: "Custom",
      support: "24/7 support + dedicated engineer"
    },
  },
]

export default function PlanPage() {
  const [plans, setPlans] = useState<Plan[]>(defaultPlans)
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [usageStats, setUsageStats] = useState<any>(null)
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'traditional'>('crypto')
  const { toast } = useToast()
  const { execute: executeApiCall, loading, error } = useApiCall()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    loadPlanData()
  }, [user])

  const loadPlanData = async () => {
    try {
      // Load available plans
      const plansData = await executeApiCall(() => apiService.getPlans())
      if (Array.isArray(plansData)) {
        setPlans(plansData as unknown as Plan[])
      }

      // Load current plan from company profile
      let resolvedPlanId: string | null = null
      try {
        const profile = user ? await executeApiCall(() => apiService.getCompanyProfile(user.id)) : null
        if (profile && typeof profile === 'object') {
          const planId = String((profile as any).subscription_plan || '').toLowerCase()
          resolvedPlanId = planId || null
        }
      } catch (e) {
        // ignore; will fallback below
      }

      const matchedPlan = resolvedPlanId
        ? defaultPlans.find(p => p.id === resolvedPlanId) || defaultPlans.find(p => p.id === 'free')
        : null

      if (matchedPlan) {
        setCurrentPlan({ ...matchedPlan, current: true })
        setPlans(prevPlans => prevPlans.map(plan => ({ ...plan, current: plan.id === matchedPlan!.id })))
      }

      // Load usage stats
      const usageData = await executeApiCall(() => apiService.getUsageStats())
      if (usageData) {
        setUsageStats(usageData)
      }
    } catch (err) {
      console.error('Failed to load plan data:', err)
      // Use default plans if API fails
      const freePlan = defaultPlans.find(p => p.id === 'free')
      if (freePlan) {
        setCurrentPlan({ ...freePlan, current: true })
        setPlans(defaultPlans.map(plan => ({
          ...plan,
          current: plan.id === 'free'
        })))
      }
    }
  }

  const currentUsage = usageStats || {
    apiCalls: 0,
    storage: 0,
    users: 0,
  }

  const handlePlanChange = (plan: Plan) => {
    if (plan.id === 'enterprise') {
      // Handle enterprise plan differently (contact sales)
      toast({
        title: "Enterprise Plan",
        description: "Please contact our sales team for enterprise pricing and setup.",
      })
      return
    }

    if (Number(plan.price) === 0 || plan.current) {
      // Handle free plan or current plan
      if (plan.current) {
        toast({
          title: "Current Plan",
          description: "This is already your current plan.",
        })
        return
      }
      
      // Direct downgrade to free
      confirmPlanChange(plan)
      return
    }

    // Show payment options for paid plans
    setSelectedPlan(plan)
    setIsUpgradeDialogOpen(true)
  }

  const handlePaymentMethodSelect = (method: 'crypto' | 'traditional') => {
    setPaymentMethod(method)
    setIsUpgradeDialogOpen(false)
    
    if (method === 'crypto') {
      setIsPaymentDialogOpen(true)
    } else {
      // Handle traditional payment methods (Stripe, etc.)
      toast({
        title: "Coming Soon",
        description: "Traditional payment methods will be available soon. Please use cryptocurrency for now.",
        variant: "default",
      })
    }
  }

  const confirmPlanChange = async (plan?: Plan) => {
    const planToUpdate = plan || selectedPlan
    if (!planToUpdate) return

    try {
      await executeApiCall(() => apiService.updatePlan(planToUpdate.id))
      toast({
        title: "Plan Updated",
        description: `Successfully ${Number(planToUpdate.price) > Number(currentPlan?.price ?? 0) ? "upgraded" : "changed"} to ${planToUpdate.name}.`,
      })
      setIsUpgradeDialogOpen(false)
      setSelectedPlan(null)
      // Reload plan data to reflect changes
      loadPlanData()
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update plan. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePaymentSuccess = () => {
    toast({
      title: "Payment Successful",
      description: `Successfully upgraded to ${selectedPlan?.name}!`,
    })
    setIsPaymentDialogOpen(false)
    setSelectedPlan(null)
    loadPlanData()
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    return Math.min((used / limit) * 100, 100)
  }

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "free": return <Zap className="h-5 w-5" />
      case "developer": return <Users className="h-5 w-5" />
      case "professional": return <Star className="h-5 w-5" />
      case "enterprise": return <Building className="h-5 w-5" />
      default: return <Zap className="h-5 w-5" />
    }
  }

  if (loading && plans.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-1 flex-col gap-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
        <p className="text-muted-foreground">Choose the perfect plan for your needs and scale as you grow. Pay with cryptocurrency for instant activation.</p>
      </div>

      {/* Current Plan & Usage */}
      {currentPlan && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
              <CardDescription>Your active subscription details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{currentPlan.name}</h3>
                  <p className="text-muted-foreground">{currentPlan.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{currentPlan.priceDescription}</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Next billing date</span>
                  <span className="font-medium">
                    {currentPlan.price === 0 ? 'N/A (Free Plan)' : 'September 25, 2025'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Billing cycle</span>
                  <span className="font-medium">
                    {currentPlan.price === 0 ? 'N/A' : 'Monthly'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Payment Method</span>
                  <span className="font-medium">
                    {currentPlan.price === 0 ? 'N/A' : 'Cryptocurrency'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Usage This Month
              </CardTitle>
              <CardDescription>Track your current usage against plan limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>API Calls</span>
                  <span>
                    {currentUsage.apiCalls?.toLocaleString() || 0} / {currentPlan.features.apiRequests}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(
                    currentUsage.apiCalls || 0, 
                    currentPlan.id === 'free' ? 1000 : 
                    currentPlan.id === 'developer' ? 10000 : 
                    currentPlan.id === 'professional' ? 100000 : -1
                  )} 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Rate Limit</span>
                  <span>{currentPlan.features.rateLimit}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Data Access</span>
                  <span>{currentPlan.features.dataAccess}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Choose Your Plan</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.popular && plan.id !== 'developer' ? "border-primary shadow-lg" : ""} ${plan.current ? "ring-2 ring-primary" : ""}`}>
              {plan.popular && plan.id !== 'developer' && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">Most Popular</Badge>
              )}
              {plan.current && (
                <Badge variant="secondary" className="absolute -top-2 right-4">
                  Current Plan
                </Badge>
              )}
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  {getPlanIcon(plan.id)}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
                <div className="pt-4">
                  <div className="text-3xl font-bold">
                    {plan.priceDescription}
                    {Number(plan.price) !== -1 && Number(plan.price) !== 0 && (
                      <span className="text-lg font-normal text-muted-foreground">/month</span>
                    )}
                  </div>
                  {Number(plan.price) > 0 && Number(plan.price) !== -1 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Pay with crypto for instant activation
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">Data Access</div>
                    <div className="text-sm">{plan.features.dataAccess}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">API Requests</div>
                    <div className="text-sm">{plan.features.apiRequests}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">Rate Limit</div>
                    <div className="text-sm">{plan.features.rateLimit}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">Request/Call</div>
                    <div className="text-sm">{plan.features.requestCall}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-muted-foreground">Support</div>
                    <div className="text-sm">{plan.features.support}</div>
                  </div>
                </div>
                <Button
                  className="w-full hover:bg-primary hover:text-primary-foreground"
                  variant={plan.current ? "secondary" : "outline"}
                  disabled={plan.current}
                  onClick={() => handlePlanChange(plan)}
                >
                  {plan.current ? "Current Plan" : 
                   plan.id === 'enterprise' ? "Contact Sales" :
                   "Select"}
                  {!plan.current && plan.id !== 'enterprise' && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Method Selection Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              {selectedPlan &&
                `Select how you'd like to pay for ${selectedPlan.name} (${selectedPlan.priceDescription}/month)`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Card 
              className="cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
              onClick={() => handlePaymentMethodSelect('crypto')}
            >
              <CardContent className="flex items-center gap-4 pt-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Cryptocurrency</h3>
                  <p className="text-sm text-muted-foreground">
                    Pay with Bitcoin, Ethereum, USDT, or other cryptocurrencies
                  </p>
                  <Badge variant="secondary" className="mt-1">Instant Activation</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:bg-accent transition-colors border-2 opacity-50"
              onClick={() => handlePaymentMethodSelect('traditional')}
            >
              <CardContent className="flex items-center gap-4 pt-4">
                <div className="p-2 bg-muted rounded-full">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-muted-foreground">Credit Card / Bank</h3>
                  <p className="text-sm text-muted-foreground">
                    Traditional payment methods (Coming Soon)
                  </p>
                  <Badge variant="outline" className="mt-1">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cryptocurrency Payment Dialog */}
      <PaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        selectedPlan={selectedPlan}
        onPaymentSuccess={handlePaymentSuccess}
      />
      </div>
    </ProtectedRoute>
  )
}