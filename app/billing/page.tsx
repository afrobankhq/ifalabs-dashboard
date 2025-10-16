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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService, useApiCall } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"

interface Invoice {
  id: string
  date: string
  amount: number
  status: "paid" | "pending" | "failed"
  description: string
  downloadUrl: string
  billingPeriod: {
    start: string
    end: string
  }
  nextBillingDate?: string
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

// Helper function to generate invoices based on actual billing history
const generateInvoices = (plan: Plan, billingHistory: any[] = []): Invoice[] => {
  if (plan.id === 'free') return []
  
  const invoices: Invoice[] = []
  const billingFrequency = plan.billingFrequency || 'monthly'
  const planPrice = typeof plan.price === 'number' ? plan.price : 0
  
  // Only show actual payments from billing history
  billingHistory.forEach((bill, index) => {
    const billDate = new Date(bill.created_at || bill.date)
    const nextBillingDate = new Date(billDate)
    
    // Calculate billing period
    if (billingFrequency === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    } else {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
    }
    
    const billingPeriodEnd = new Date(nextBillingDate)
    billingPeriodEnd.setDate(billingPeriodEnd.getDate() - 1)
    
    const invoice: Invoice = {
      id: `INV-${String(index + 1).padStart(3, '0')}`,
      date: billDate.toISOString().split('T')[0],
      amount: bill.amount || planPrice,
      status: bill.status || "paid",
      description: `${plan.name} - ${billDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      downloadUrl: "#",
      billingPeriod: {
        start: billDate.toISOString().split('T')[0],
        end: billingPeriodEnd.toISOString().split('T')[0]
      }
    }
    
    invoices.push(invoice)
  })
  
  // Add next upcoming invoice based on last payment
  if (billingHistory.length > 0) {
    const lastBill = billingHistory[billingHistory.length - 1]
    const lastBillDate = new Date(lastBill.created_at || lastBill.date)
    const nextBillingDate = new Date(lastBillDate)
    
    if (billingFrequency === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
    } else {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
    }
    
    const now = new Date()
    // Only show upcoming invoice if next billing date is in the future
    if (nextBillingDate > now) {
      const billingPeriodEnd = new Date(nextBillingDate)
      if (billingFrequency === 'monthly') {
        billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1)
      } else {
        billingPeriodEnd.setFullYear(billingPeriodEnd.getFullYear() + 1)
      }
      billingPeriodEnd.setDate(billingPeriodEnd.getDate() - 1)
      
      const upcomingInvoice: Invoice = {
        id: `INV-${String(billingHistory.length + 1).padStart(3, '0')}`,
        date: nextBillingDate.toISOString().split('T')[0],
        amount: planPrice,
        status: "pending",
        description: `${plan.name} - ${nextBillingDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        downloadUrl: "#",
        billingPeriod: {
          start: nextBillingDate.toISOString().split('T')[0],
          end: billingPeriodEnd.toISOString().split('T')[0]
        },
        nextBillingDate: nextBillingDate.toISOString().split('T')[0]
      }
      
      invoices.push(upcomingInvoice)
    }
  }
  
  return invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export default function BillingPage() {
  const router = useRouter()
  const [billingInfo, setBillingInfo] = useState<any>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [isFreeTier, setIsFreeTier] = useState(false)
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
      
      // Load current plan from company profile
      let resolvedPlanId: string | null = null
      let profile: any = null
      
      // First, check for direct subscription plan in localStorage
      const directPlan = localStorage.getItem('subscription_plan')
      if (directPlan && directPlan !== 'free') {
        console.log('Using direct subscription plan from localStorage:', directPlan)
        resolvedPlanId = directPlan.toLowerCase()
      }
      
      try {
        profile = user ? await executeApiCall(() => apiService.getCompanyProfile(user.id)) : null
        console.log('Profile loaded from API:', profile)
        
        if (profile && typeof profile === 'object') {
          const subscriptionPlan = profile.subscription_plan || profile.plan || profile.subscription
          const planId = String(subscriptionPlan || '').toLowerCase()
          resolvedPlanId = planId || resolvedPlanId
          console.log('Resolved plan ID from API profile:', resolvedPlanId, 'from subscription plan:', subscriptionPlan)
        }
      } catch (e) {
        console.error('Failed to load profile from API:', e)
        // Try to get profile from localStorage as fallback
        try {
          const storedProfile = localStorage.getItem('user_profile')
          if (storedProfile) {
            profile = JSON.parse(storedProfile)
            console.log('Profile loaded from localStorage:', profile)
            if (profile && typeof profile === 'object') {
              const subscriptionPlan = profile.subscription_plan || profile.plan || profile.subscription
              const planId = String(subscriptionPlan || '').toLowerCase()
              resolvedPlanId = planId || resolvedPlanId
              console.log('Resolved plan ID from localStorage profile:', resolvedPlanId, 'from subscription plan:', subscriptionPlan)
            }
          }
        } catch (localError) {
          console.error('Failed to load profile from localStorage:', localError)
        }
      }

      // Default plans (same as in plan page)
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
          billingFrequency: 'monthly',
          monthlyPrice: 0,
          annualPrice: 0,
        },
        {
          id: "developer",
          name: "Developer Tier",
          price: 500, // Annual price (2 months free)
          priceDescription: "$500",
          description: "Great for developers building applications",
          features: {
            dataAccess: "All feeds",
            apiRequests: "10,000 reqs/month",
            rateLimit: "10 seconds",
            requestCall: "$0.0005",
            support: "24/7 support"
          },
          popular: true,
          billingFrequency: 'annual',
          monthlyPrice: 50,
          annualPrice: 500,
        },
        {
          id: "professional",
          name: "Professional Tier",
          price: 1000, // Annual price (2 months free)
          priceDescription: "$1,000",
          description: "For growing businesses with higher demands",
          features: {
            dataAccess: "All feeds + Historical data",
            apiRequests: "100,000 reqs/month",
            rateLimit: "2 seconds",
            requestCall: "$0.0002",
            support: "24/7 support"
          },
          billingFrequency: 'annual',
          monthlyPrice: 100,
          annualPrice: 1000,
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
          billingFrequency: 'annual',
          monthlyPrice: -1,
          annualPrice: -1,
        },
      ]

      const matchedPlan = resolvedPlanId
        ? defaultPlans.find(p => p.id === resolvedPlanId) || defaultPlans.find(p => p.id === 'free')
        : defaultPlans.find(p => p.id === 'free')

      console.log('Matched plan:', matchedPlan)
      console.log('Is free tier:', matchedPlan?.id === 'free')

      let displayPlan: Plan | null = null
      if (matchedPlan) {
        // Get the actual billing frequency from localStorage
        const actualBillingFrequency = localStorage.getItem('billing_frequency') as 'monthly' | 'annual' | null
        const planToDisplay = { ...matchedPlan, current: true }
        
        if (matchedPlan.id !== 'free' && actualBillingFrequency) {
          // Use the actual billing frequency that was selected during payment
          planToDisplay.billingFrequency = actualBillingFrequency
          
          if (actualBillingFrequency === 'monthly') {
            planToDisplay.price = matchedPlan.monthlyPrice || 0
            planToDisplay.priceDescription = `$${matchedPlan.monthlyPrice || 0}`
          } else {
            planToDisplay.price = matchedPlan.annualPrice || 0
            planToDisplay.priceDescription = `$${matchedPlan.annualPrice || 0}`
          }
        }
        
        displayPlan = planToDisplay
        setCurrentPlan(displayPlan)
        setIsFreeTier(matchedPlan.id === 'free')
        console.log('Set current plan to:', matchedPlan.name, 'Free tier:', matchedPlan.id === 'free', 'Billing frequency:', displayPlan.billingFrequency)
      }

      // Only load billing info and invoices for paid plans
      if (matchedPlan && matchedPlan.id !== 'free') {
        // Load billing info
        const billingData = await executeApiCall(() => apiService.getBillingInfo())
        if (billingData) {
          setBillingInfo(billingData)
        }

        // Get billing history from localStorage - this contains actual payment records
        const billingHistory = JSON.parse(localStorage.getItem('billing_history') || '[]')
        
        // Generate invoices based only on actual billing history
        const generatedInvoices = generateInvoices(displayPlan!, billingHistory)
        setInvoices(generatedInvoices)
        
        console.log('Generated invoices:', generatedInvoices.length, 'for plan:', matchedPlan.name)
        console.log('Billing history records:', billingHistory.length)
      } else {
        // Clear billing data for free tier
        setBillingInfo(null)
        setInvoices([])
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

  const handleViewInvoice = (invoiceId: string) => {
    router.push(`/invoice/${invoiceId}`)
  }

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      await executeApiCall(() => apiService.downloadInvoice(invoice.id))
      toast({
        title: "Download Started",
        description: `Downloading invoice ${invoice.id}...`,
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive",
      })
    }
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
                  {Number(currentPlan.price) === 0 ? 'Free Forever' : 
                   currentPlan.billingFrequency === 'annual' ? 'per year' : 'per month'}
                </div>
              </div>
            </div>
            
            {/* Billing Cycle Information - Same as plan page */}
            <div className="space-y-2 pt-4 border-t">
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

      {/* Billing Overview - Only show for paid plans */}
      {!isFreeTier && (
        <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${billingInfo?.currentBalance?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">{billingInfo?.balanceStatus || 'No outstanding balance'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${billingInfo?.nextPayment?.amount?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">Due {billingInfo?.nextPayment?.date || 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${billingInfo?.monthlyUsage?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">{billingInfo?.planName || 'No active plan'}</p>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Invoice History - Only show for paid plans */}
      {!isFreeTier && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoice History
          </CardTitle>
          <CardDescription>View and download your past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Billing Period</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    <Button 
                      variant="link" 
                      className="p-0 h-auto font-medium"
                      onClick={() => handleViewInvoice(invoice.id)}
                    >
                      {invoice.id}
                    </Button>
                  </TableCell>
                  <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(invoice.billingPeriod.start).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">to</div>
                      <div>{new Date(invoice.billingPeriod.end).toLocaleDateString()}</div>
                    </div>
                  </TableCell>
                  <TableCell>{invoice.description}</TableCell>
                  <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewInvoice(invoice.id)}
                        title="View Invoice"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
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
        </CardContent>
      </Card>
      )}

      {/* Billing Alerts - Only show for paid plans */}
      {!isFreeTier && (billingInfo?.nextPayment || invoices.some(inv => inv.nextBillingDate)) && (
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-5 w-5" />
            Billing Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {billingInfo?.nextPayment ? (
              <>Your next payment of ${billingInfo.nextPayment.amount?.toFixed(2) || '0.00'} will be automatically charged to your default payment method on {billingInfo.nextPayment.date ? new Date(billingInfo.nextPayment.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : 'N/A'}.</>
            ) : (
              (() => {
                const nextInvoice = invoices.find(inv => inv.nextBillingDate)
                const planPrice = currentPlan?.price
                const billingFrequency = currentPlan?.billingFrequency || 'monthly'
                const nextDate = nextInvoice?.nextBillingDate
                
                if (nextDate && planPrice && typeof planPrice === 'number') {
                  return <>Your next {billingFrequency} payment of ${planPrice.toFixed(2)} will be automatically charged on {new Date(nextDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}.</>
                }
                return <>Your next billing cycle information will be available soon.</>
              })()
            )}
          </p>
        </CardContent>
      </Card>
      )}
      </div>
    </ProtectedRoute>
  )
}
