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
import { Switch } from "@/components/ui/switch"
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
  billingFrequency?: 'monthly' | 'annual'
  monthlyPrice?: number
  annualPrice?: number
}

const defaultPlans: Plan[] = [
  {
    id: "free",
    name: "Free tier",
    price: 0,
    priceDescription: "$0",
    description: "Perfect for getting started and testing our API",
    features: {
      dataAccess: "Two feeds",
      apiRequests: "1,000 reqs/month",
      rateLimit: "10 reqs/hour",
      requestCall: "$0.00000",
      support: "Email & Community"
    },
    billingFrequency: 'monthly',
    monthlyPrice: 0,
    annualPrice: 0,
  },
  {
    id: "developer",
    name: "Developer tier",
    price: 50, // Monthly price
    priceDescription: "$50",
    description: "Great for developers building applications",
    features: {
      dataAccess: "All feeds",
      apiRequests: "10,000 reqs/month",
      rateLimit: "100 reqs/hour",
      requestCall: "$0.0005",
      support: "24/7 support"
    },
    popular: true,
    billingFrequency: 'monthly',
    monthlyPrice: 50,
    annualPrice: 500,
  },
  {
    id: "professional",
    name: "Professional tier",
    price: 100, // Monthly price
    priceDescription: "$100",
    description: "For growing businesses with higher demands",
    features: {
      dataAccess: "All feeds + Historical data",
      apiRequests: "100,000 reqs/month",
      rateLimit: "500 reqs/hour",
      requestCall: "$0.0002",
      support: "24/7 support"
    },
    billingFrequency: 'monthly',
    monthlyPrice: 100,
    annualPrice: 1000,
  },
  {
    id: "enterprise",
    name: "Enterprise tier",
    price: -1,
    priceDescription: "Custom",
    description: "For large organizations with custom requirements",
    features: {
      dataAccess: "All feeds + Private",
      apiRequests: "Unlimited (custom SLA)",
      rateLimit: "Unlimited",
      requestCall: "Custom",
      support: "24/7 support + dedicated engineer"
    },
    billingFrequency: 'annual',
    monthlyPrice: -1,
    annualPrice: -1,
  },
]

// Helper function to calculate next billing date
const calculateNextBillingDate = (billingFrequency: 'monthly' | 'annual', subscriptionStartDate?: string): string => {
  const startDate = subscriptionStartDate ? new Date(subscriptionStartDate) : new Date()
  const nextBillingDate = new Date(startDate)
  
  // Calculate next billing date based on billing frequency
  if (billingFrequency === 'annual') {
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
  } else {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
  }
  
  // If the calculated date is in the past, add another billing period
  const now = new Date()
  while (nextBillingDate <= now) {
    if (billingFrequency === 'annual') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    }
  }
  
  return nextBillingDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default function PlanPage() {
  const [plans, setPlans] = useState<Plan[]>(defaultPlans)
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [usageStats, setUsageStats] = useState<any>(null)
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'traditional'>('crypto')
  const [billingFrequency, setBillingFrequency] = useState<'monthly' | 'annual'>('monthly')
  const { toast } = useToast()
  const { execute: executeApiCall, loading, error } = useApiCall()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    loadPlanData()
  }, [user])

  // Reload plan data when page becomes visible (e.g., after payment redirect)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('Page became visible, reloading plan data')
        loadPlanData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  // Initialize plans with correct pricing based on billing frequency
  useEffect(() => {
    setPlans(prevPlans => updatePlanPricing(prevPlans, billingFrequency))
    
    // Update current plan pricing as well
    if (currentPlan) {
      const updatedCurrentPlan = updatePlanPricing([currentPlan], billingFrequency)[0]
      setCurrentPlan(updatedCurrentPlan)
    }
  }, [billingFrequency])

  // Listen for profile updates from payment success page
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('Profile updated event received in plan page:', event.detail)
      console.log('New subscription plan from event:', event.detail?.subscription_plan)
      // Reload plan data when profile is updated
      loadPlanData()
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user_profile' && event.newValue) {
        console.log('User profile updated in localStorage, reloading plan data')
        try {
          const updatedProfile = JSON.parse(event.newValue)
          console.log('Updated profile from localStorage:', updatedProfile)
          loadPlanData()
        } catch (err) {
          console.error('Failed to parse updated profile from localStorage:', err)
        }
      } else if (event.key === 'profile_updated_timestamp') {
        console.log('Profile update timestamp changed, reloading plan data')
        loadPlanData()
      }
    }

    // Check if profile was updated recently (within last 30 seconds)
    const checkRecentProfileUpdate = () => {
      const lastUpdate = localStorage.getItem('profile_updated_timestamp')
      const directPlan = localStorage.getItem('subscription_plan')
      
      if (lastUpdate) {
        const updateTime = parseInt(lastUpdate)
        const now = Date.now()
        if (now - updateTime < 30000) { // 30 seconds
          console.log('Recent profile update detected, reloading plan data')
          loadPlanData()
        }
      }
      
      // Also check for direct subscription plan update
      if (directPlan && directPlan !== 'free') {
        console.log('Direct subscription plan found in localStorage:', directPlan)
        loadPlanData()
      }
    }

    // Check on mount
    checkRecentProfileUpdate()

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const loadPlanData = async () => {
    try {
      // Load available plans
      const plansData = await executeApiCall(() => apiService.getPlans())
      if (Array.isArray(plansData)) {
        setPlans(plansData as unknown as Plan[])
      }

      // Load current plan from company profile
      let resolvedPlanId: string | null = null
      let profile: any = null
      
      // First, check for direct subscription plan in localStorage
      const directPlan = localStorage.getItem('subscription_plan')
      if (directPlan && directPlan !== 'free') {
        console.log('Plan page - Using direct subscription plan from localStorage:', directPlan)
        resolvedPlanId = directPlan.toLowerCase()
      }
      
      try {
        profile = user ? await executeApiCall(() => apiService.getCompanyProfile(user.id)) : null
        console.log('Plan page - Profile loaded from API:', JSON.stringify(profile, null, 2))
        
        if (profile && typeof profile === 'object') {
          // Try multiple possible field names for the subscription plan
          const subscriptionPlan = profile.subscription_plan || 
                                   profile.plan || 
                                   profile.subscription ||
                                   profile.tier ||
                                   profile.plan_id
          const planId = String(subscriptionPlan || '').toLowerCase().trim()
          
          // Only use API profile if it has a valid plan
          if (planId && planId !== '' && planId !== 'null' && planId !== 'undefined') {
            resolvedPlanId = planId
          }
          console.log('Plan page - Resolved plan ID from API profile:', resolvedPlanId, 'from subscription plan:', subscriptionPlan)
        }
      } catch (e) {
        console.error('Plan page - Failed to load profile from API:', e)
        // Try to get profile from localStorage as fallback
        try {
          const storedProfile = localStorage.getItem('user_profile')
          if (storedProfile) {
            profile = JSON.parse(storedProfile)
            console.log('Plan page - Profile loaded from localStorage:', JSON.stringify(profile, null, 2))
            if (profile && typeof profile === 'object') {
              const subscriptionPlan = profile.subscription_plan || 
                                       profile.plan || 
                                       profile.subscription ||
                                       profile.tier ||
                                       profile.plan_id
              const planId = String(subscriptionPlan || '').toLowerCase().trim()
              
              // Only use localStorage profile if it has a valid plan
              if (planId && planId !== '' && planId !== 'null' && planId !== 'undefined') {
                resolvedPlanId = planId
              }
              console.log('Plan page - Resolved plan ID from localStorage profile:', resolvedPlanId, 'from subscription plan:', subscriptionPlan)
            }
          }
        } catch (localError) {
          console.error('Plan page - Failed to load profile from localStorage:', localError)
        }
      }

      const matchedPlan = resolvedPlanId
        ? defaultPlans.find(p => p.id === resolvedPlanId) || defaultPlans.find(p => p.id === 'free')
        : null

      console.log('Plan page - Matched plan:', matchedPlan)
      console.log('Plan page - Is free tier:', matchedPlan?.id === 'free')

      if (matchedPlan) {
        const updatedPlan = { ...matchedPlan, current: true, billingFrequency }
        setCurrentPlan(updatedPlan)
        setPlans(prevPlans => {
          const updatedPlans = prevPlans.map(plan => ({ ...plan, current: plan.id === matchedPlan!.id }))
          return updatePlanPricing(updatedPlans, billingFrequency)
        })
        console.log('Plan page - Set current plan to:', matchedPlan.name)
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
        const updatedFreePlan = { ...freePlan, current: true }
        setCurrentPlan(updatedFreePlan)
        setPlans(updatePlanPricing(defaultPlans.map(plan => ({
          ...plan,
          current: plan.id === 'free'
        })), billingFrequency))
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

  const handlePaymentMethodSelect = (method: 'crypto' | 'traditional' | 'paystack') => {
    setPaymentMethod(method as 'crypto' | 'traditional')
    setIsUpgradeDialogOpen(false)
    
    if (method === 'paystack') {
      setIsPaymentDialogOpen(true)
    } else if (method === 'crypto') {
      // Crypto payments coming soon
      toast({
        title: "Coming Soon",
        description: "Cryptocurrency payments will be available soon. Please use Paystack for now.",
        variant: "default",
      })
    } else {
      // Handle other traditional payment methods
      toast({
        title: "Coming Soon",
        description: "Other payment methods will be available soon. Please use Paystack.",
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
    if (selectedPlan) {
      // Store billing frequency
      const billingFreq = selectedPlan.billingFrequency || 'monthly'
      localStorage.setItem('billing_frequency', billingFreq)
      
      // Store subscription start date
      const now = new Date()
      localStorage.setItem('subscription_start_date', now.toISOString())
      
      // Create initial billing history record
      const billingHistory = [{
        created_at: now.toISOString(),
        date: now.toISOString(),
        amount: typeof selectedPlan.price === 'number' ? selectedPlan.price : 0,
        status: 'paid',
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        billing_frequency: billingFreq
      }]
      localStorage.setItem('billing_history', JSON.stringify(billingHistory))
      
      // Store subscription plan
      localStorage.setItem('subscription_plan', selectedPlan.id)
      
      // Update profile timestamp to trigger reload in other pages
      localStorage.setItem('profile_updated_timestamp', Date.now().toString())
    }
    
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

  const updatePlanPricing = (plans: Plan[], frequency: 'monthly' | 'annual') => {
    return plans.map(plan => {
      if (plan.id === 'free') {
        return {
          ...plan,
          price: 0,
          priceDescription: "$0",
          billingFrequency: frequency
        }
      }
      
      if (plan.id === 'enterprise') {
        return {
          ...plan,
          price: -1,
          priceDescription: "Custom",
          billingFrequency: frequency
        }
      }

      const monthlyPrice = plan.monthlyPrice ?? 0
      const annualPrice = plan.annualPrice ?? 0
      const price = frequency === 'monthly' ? monthlyPrice : annualPrice
      const priceDescription = frequency === 'monthly' ? `$${monthlyPrice}` : `$${annualPrice}`
      
      return {
        ...plan,
        price,
        priceDescription,
        billingFrequency: frequency
      }
    })
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
        
        {/* Billing Frequency Toggle */}
        <div className="flex items-center justify-center mt-6">
          <div className="flex items-center space-x-4 bg-muted p-1 rounded-lg">
            <span className={`text-sm font-medium ${billingFrequency === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch
              checked={billingFrequency === 'annual'}
              onCheckedChange={(checked) => {
                const newFrequency = checked ? 'annual' : 'monthly'
                setBillingFrequency(newFrequency)
                setPlans(prevPlans => updatePlanPricing(prevPlans, newFrequency))
              }}
            />
            <span className={`text-sm font-medium ${billingFrequency === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
            </span>
            {billingFrequency === 'annual' && (
              <Badge variant="secondary" className="ml-2">
                Save up to 17%
              </Badge>
            )}
          </div>
        </div>
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
                  <div className="text-sm text-muted-foreground">
                    {currentPlan.price === 0 ? 'Free Forever' : 
                     currentPlan.billingFrequency === 'annual' ? 'per year' : 'per month'}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Next billing date</span>
                  <span className="font-medium">
                    {currentPlan.price === 0 ? 'N/A (Free Plan)' : 
                     calculateNextBillingDate(
                       currentPlan.billingFrequency || 'monthly',
                       localStorage.getItem('subscription_start_date') || undefined
                     )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Billing cycle</span>
                  <span className="font-medium">
                    {currentPlan.price === 0 ? 'N/A' : 
                     currentPlan.billingFrequency === 'annual' ? 'Annual' : 'Monthly'}
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
                      <span className="text-lg font-normal text-muted-foreground">
                        /{plan.billingFrequency === 'annual' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  {Number(plan.price) > 0 && Number(plan.price) !== -1 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {plan.billingFrequency === 'annual' && plan.monthlyPrice && plan.annualPrice ? (
                        <>
                          ${Math.round(plan.annualPrice / 12)}/month billed annually
                          <br />
                          Save ${(plan.monthlyPrice * 12) - plan.annualPrice}/year
                        </>
                      ) : (
                        'Pay with crypto for instant activation'
                      )}
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
                `Select how you'd like to pay for ${selectedPlan.name} (${selectedPlan.priceDescription}/${selectedPlan.billingFrequency === 'annual' ? 'year' : 'month'})`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Card 
              className="cursor-pointer hover:bg-accent transition-colors border-2 hover:border-primary"
              onClick={() => handlePaymentMethodSelect('paystack')}
            >
              <CardContent className="flex items-center gap-4 pt-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Pay with Paystack</h3>
                  <p className="text-sm text-muted-foreground">
                    Pay with debit card, bank transfer, or mobile money
                  </p>
                  <Badge variant="secondary" className="mt-1">Instant Activation</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:bg-accent transition-colors border-2 opacity-50"
              onClick={() => {}}
            >
              <CardContent className="flex items-center gap-4 pt-4">
                <div className="p-2 bg-muted rounded-full">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-muted-foreground">Cryptocurrency</h3>
                  <p className="text-sm text-muted-foreground">
                    Pay with Bitcoin, Ethereum, USDT, or other cryptocurrencies
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