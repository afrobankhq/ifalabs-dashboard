"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Download,
  Calendar,
  DollarSign,
  Receipt,
  AlertCircle,
  Loader2,
  Crown,
  Zap,
  ExternalLink,
  CreditCard,
  FileText,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService, useApiCall } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { PaymentDialog } from "@/components/payment-dialog"

interface BackendInvoice {
  id: string
  invoice_number: string
  account_id: string
  amount: number // Amount in cents
  currency: string
  due_date: string
  issued_at: string
  status: 'pending' | 'paid' | 'failed' | 'void'
  metadata: {
    plan_id?: string
    billing_cycle?: string
    payment_method?: string
    subscription_id?: string
    created_from?: string
  }
  paid_at?: string
  payment_id?: string
  created_at: string
  updated_at: string
}

interface InvoiceListResponse {
  invoices: BackendInvoice[]
  total_count: number
  page: number
  page_size: number
}

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

// Helper function to calculate next billing date (same as plan page)
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

// Helper function to update plan pricing based on billing frequency (from plan page)
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


export default function BillingPage() {
  const router = useRouter()
  const [billingInfo, setBillingInfo] = useState<any>(null)
  const [invoices, setInvoices] = useState<BackendInvoice[]>([])
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [isFreeTier, setIsFreeTier] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<BackendInvoice | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const { toast } = useToast()
  const { execute: executeApiCall, loading, error } = useApiCall()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    loadBillingData()
  }, [user])

  // Listen for profile updates from payment success page
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('Profile updated event received in billing page:', event.detail)
      console.log('New subscription plan from event:', event.detail?.subscription_plan)
      // Reload billing data when profile is updated
      loadBillingData()
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user_profile' && event.newValue) {
        console.log('User profile updated in localStorage, reloading billing data')
        try {
          const updatedProfile = JSON.parse(event.newValue)
          console.log('Updated profile from localStorage:', updatedProfile)
          loadBillingData()
        } catch (err) {
          console.error('Failed to parse updated profile from localStorage:', err)
        }
      } else if (event.key === 'profile_updated_timestamp') {
        console.log('Profile update timestamp changed, reloading billing data')
        loadBillingData()
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
          console.log('Recent profile update detected, reloading billing data')
          loadBillingData()
        }
      }
      
      // Also check for direct subscription plan update
      if (directPlan && directPlan !== 'free') {
        console.log('Direct subscription plan found in localStorage:', directPlan)
        loadBillingData()
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

  const loadBillingData = async () => {
    try {
      console.log('Loading billing data for user:', user?.id)
      
      // Load current plan from company profile (same logic as plan page)
      let resolvedPlanId: string | null = null
      let profile: any = null
      
      // First, check for direct subscription plan in localStorage
      const directPlan = localStorage.getItem('subscription_plan')
      if (directPlan && directPlan !== 'free') {
        console.log('Billing page - Using direct subscription plan from localStorage:', directPlan)
        resolvedPlanId = directPlan.toLowerCase()
      }
      
      try {
        profile = user ? await executeApiCall(() => apiService.getCompanyProfile(user.id)) : null
        console.log('Billing page - Profile loaded from API:', JSON.stringify(profile, null, 2))
        
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
          console.log('Billing page - Resolved plan ID from API profile:', resolvedPlanId, 'from subscription plan:', subscriptionPlan)
        }
      } catch (e) {
        console.error('Billing page - Failed to load profile from API:', e)
        // Try to get profile from localStorage as fallback
        try {
          const storedProfile = localStorage.getItem('user_profile')
          if (storedProfile) {
            profile = JSON.parse(storedProfile)
            console.log('Billing page - Profile loaded from localStorage:', JSON.stringify(profile, null, 2))
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
              console.log('Billing page - Resolved plan ID from localStorage profile:', resolvedPlanId, 'from subscription plan:', subscriptionPlan)
            }
          }
        } catch (localError) {
          console.error('Billing page - Failed to load profile from localStorage:', localError)
        }
      }

      // Default plans (same as in plan page)
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

      // Get billing frequency from localStorage (same as plan page)
      const billingFrequency = (localStorage.getItem('billing_frequency') as 'monthly' | 'annual') || 'monthly'
      console.log('Billing page - Using billing frequency:', billingFrequency)

      const matchedPlan = resolvedPlanId
        ? defaultPlans.find(p => p.id === resolvedPlanId) || defaultPlans.find(p => p.id === 'free')
        : null

      console.log('Billing page - Matched plan:', matchedPlan)
      console.log('Billing page - Is free tier:', matchedPlan?.id === 'free')

      if (matchedPlan) {
        const updatedPlan = { ...matchedPlan, current: true, billingFrequency }
        setCurrentPlan(updatedPlan)
        setPlans(prevPlans => {
          const updatedPlans = prevPlans.map(plan => ({ ...plan, current: plan.id === matchedPlan!.id }))
          return updatePlanPricing(updatedPlans, billingFrequency)
        })
        setIsFreeTier(matchedPlan.id === 'free')
        console.log('Billing page - Set current plan to:', matchedPlan.name)
      }

      // Load invoices from backend for all users (including free tier)
      try {
        const invoiceResponse = await executeApiCall(() => apiService.getInvoices(user!.id))
        
        if (invoiceResponse && typeof invoiceResponse === 'object' && 'invoices' in invoiceResponse) {
          const invoiceData = invoiceResponse as InvoiceListResponse
          setInvoices(invoiceData.invoices || [])
          console.log('Loaded invoices from backend:', invoiceData.invoices?.length || 0)
          } else {
          // Handle case where response is directly an array
          setInvoices(Array.isArray(invoiceResponse) ? invoiceResponse : [])
          console.log('Loaded invoices from backend (array format):', Array.isArray(invoiceResponse) ? invoiceResponse.length : 0)
        }
      } catch (err) {
        console.error('Failed to load invoices from backend:', err)
        setInvoices([])
      }

      // Only load billing info for paid plans
      if (matchedPlan && matchedPlan.id !== 'free') {
        // Load billing info
        const billingData = await executeApiCall(() => apiService.getBillingInfo())
        if (billingData) {
          setBillingInfo(billingData)
        }
      } else {
        // Clear billing data for free tier
        setBillingInfo(null)
      }
    } catch (err) {
      console.error('Failed to load billing data:', err)
      // Fallback to free tier
      const freePlan: Plan = {
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
        billingFrequency: 'monthly',
        monthlyPrice: 0,
        annualPrice: 0,
      }
      setCurrentPlan({ ...freePlan, current: true })
      setIsFreeTier(true)
      setBillingInfo(null)
      setInvoices([])
    }
  }

  const handleViewInvoice = (invoice: BackendInvoice) => {
    router.push(`/invoices`)
  }

  const handlePayInvoice = (invoice: BackendInvoice) => {
    if (invoice.status !== 'pending') {
      toast({
        title: "Cannot Pay Invoice",
        description: "This invoice is not in pending status.",
        variant: "destructive",
      })
      return
    }

    setSelectedInvoice(invoice)
    setIsPaymentDialogOpen(true)
  }

  const handlePaymentSuccess = () => {
    if (selectedInvoice) {
      toast({
        title: "Payment Successful",
        description: `Invoice ${selectedInvoice.invoice_number} has been paid successfully!`,
      })
      
      // Reload invoices to reflect the updated status
      loadBillingData()
    }
    
    setIsPaymentDialogOpen(false)
    setSelectedInvoice(null)
  }

  const handleDownloadInvoice = async (invoice: BackendInvoice) => {
    try {
      await executeApiCall(() => apiService.downloadInvoice(invoice.id))
      toast({
        title: "Download Started",
        description: `Downloading invoice ${invoice.invoice_number}...`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatAmount = (amountInCents: number, currency: string) => {
    const amount = amountInCents / 100
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  if (loading && !currentPlan) {
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
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          {isFreeTier 
            ? "You're currently on the free tier. Upgrade to access billing features and payment history."
            : "Manage your billing information and view payment history."
          }
        </p>
      </div>

      {/* Current Plan Display */}
      {currentPlan && (
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
            
            {isFreeTier && (
              <div className="pt-4 border-t">
                <Button className="w-full" onClick={() => window.location.href = '/plan'}>
                  <Zap className="mr-2 h-4 w-4" />
                  Upgrade to Paid Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

     
      {/* Invoice History - Show for all users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoice History
          </CardTitle>
          <CardDescription>
            {invoices.length === 0 
              ? "No invoices found. Invoices will appear here when payments are made or generated."
              : "View and manage your invoices"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
              <p className="text-muted-foreground text-center mb-4">
                You don't have any invoices yet. Invoices will appear here when you make payments or when they are generated for your subscription.
              </p>
              {isFreeTier && (
                <Button onClick={() => router.push('/plan')}>
                  <Zap className="mr-2 h-4 w-4" />
                  Upgrade to Paid Plan
                </Button>
              )}
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-medium"
                        onClick={() => handleViewInvoice(invoice)}
                    >
                        {invoice.invoice_number}
                    </Button>
                  </TableCell>
                    <TableCell>{formatDate(invoice.issued_at)}</TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                        <div className="font-medium capitalize">
                          {invoice.metadata?.plan_id || 'Unknown'}
                        </div>
                        <div className="text-muted-foreground capitalize">
                          {invoice.metadata?.billing_cycle || 'N/A'}
                        </div>
                    </div>
                  </TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(invoice.amount, invoice.currency)}
                    </TableCell>
                  <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                          onClick={() => handleViewInvoice(invoice)}
                        title="View Invoice"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                        {invoice.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handlePayInvoice(invoice)}
                            title="Pay Invoice"
                            className="text-green-600 hover:text-green-700"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownloadInvoice(invoice)}
                        title="Download Invoice"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Billing Alerts - Show pending invoices */}
      {invoices.some(inv => inv.status === 'pending') && (
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-5 w-5" />
              Pending Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
              {invoices
                .filter(inv => inv.status === 'pending')
                .map(invoice => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        Due {formatDate(invoice.due_date)} • {formatAmount(invoice.amount, invoice.currency)}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handlePayInvoice(invoice)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Now
                    </Button>
                  </div>
                ))}
            </div>
        </CardContent>
      </Card>
      )}

      {/* Payment Dialog */}
      <PaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        selectedPlan={selectedInvoice ? {
          id: selectedInvoice.metadata?.plan_id || 'unknown',
          name: `${selectedInvoice.metadata?.plan_id || 'Unknown'} Plan`,
          price: selectedInvoice.amount / 100,
          priceDescription: formatAmount(selectedInvoice.amount, selectedInvoice.currency),
          description: `Payment for invoice ${selectedInvoice.invoice_number}`,
          features: {
            dataAccess: 'N/A',
            apiRequests: 'N/A',
            rateLimit: 'N/A',
            requestCall: 'N/A',
            support: 'N/A'
          },
          billingFrequency: selectedInvoice.metadata?.billing_cycle as 'monthly' | 'annual' || 'monthly'
        } : null}
        onPaymentSuccess={handlePaymentSuccess}
        invoiceId={selectedInvoice?.id}
      />
      </div>
    </ProtectedRoute>
  )
}
