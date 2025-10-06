"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Download,
  Calendar,
  DollarSign,
  Receipt,
  AlertCircle,
  Loader2,
  ArrowLeft,
  CreditCard,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { apiService, useApiCall } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { PaymentDialog } from "@/components/payment-dialog"

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

export default function InvoicePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const { execute: executeApiCall, loading } = useApiCall()
  
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  useEffect(() => {
    if (!user) return
    loadInvoiceData()
  }, [user, params.id])

  const loadInvoiceData = async () => {
    try {
      // Get invoice ID from URL params
      const invoiceId = params.id as string
      
      // Load current plan from localStorage or API
      const subscriptionPlan = localStorage.getItem('subscription_plan')
      const userProfile = localStorage.getItem('user_profile')
      
      let planId = 'free'
      if (subscriptionPlan && subscriptionPlan !== 'free') {
        planId = subscriptionPlan.toLowerCase()
      } else if (userProfile) {
        try {
          const profile = JSON.parse(userProfile)
          const subscriptionPlanFromProfile = profile.subscription_plan || profile.plan || profile.subscription
          if (subscriptionPlanFromProfile) {
            planId = String(subscriptionPlanFromProfile).toLowerCase()
          }
        } catch (e) {
          console.error('Failed to parse user profile:', e)
        }
      }

      // Default plans (same as billing page)
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
          price: 500,
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
          price: 1000,
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

      const matchedPlan = defaultPlans.find(p => p.id === planId) || defaultPlans.find(p => p.id === 'free')
      
      if (matchedPlan) {
        // Ensure paid plans show annual pricing by default to match plan page
        const planToDisplay = { ...matchedPlan, current: true }
        if (matchedPlan.id !== 'free' && matchedPlan.billingFrequency === 'annual') {
          setCurrentPlan(planToDisplay)
        } else if (matchedPlan.id !== 'free') {
          const annualPrice = matchedPlan.annualPrice || (typeof matchedPlan.price === 'number' ? matchedPlan.price * 12 : 0)
          planToDisplay.price = annualPrice
          planToDisplay.priceDescription = `$${annualPrice}`
          planToDisplay.billingFrequency = 'annual'
          setCurrentPlan(planToDisplay)
        } else {
          setCurrentPlan(planToDisplay)
        }
      }

      // Generate mock invoice data based on the plan
      // In a real app, this would come from an API
      const mockInvoice: Invoice = {
        id: invoiceId,
        date: new Date().toISOString().split('T')[0],
        amount: typeof matchedPlan?.price === 'number' ? matchedPlan.price : 0,
        status: "pending",
        description: `${matchedPlan?.name || 'Plan'} - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        downloadUrl: "#",
        billingPeriod: {
          start: new Date().toISOString().split('T')[0],
          end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 year from now
        }
      }

      setInvoice(mockInvoice)
    } catch (err) {
      console.error('Failed to load invoice data:', err)
      toast({
        title: "Error",
        description: "Failed to load invoice. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDownloadInvoice = async () => {
    if (!invoice) return
    
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

  const handlePayNow = () => {
    if (!currentPlan || !invoice) return
    setIsPaymentDialogOpen(true)
  }

  const handlePaymentSuccess = () => {
    console.log('Payment successful')
    
    // Update invoice status to paid
    if (invoice) {
      setInvoice(prev => prev ? { ...prev, status: "paid" } : null)
    }
    
    toast({
      title: "Payment Successful",
      description: "Your invoice has been paid successfully.",
    })
    
    // Redirect to billing page after successful payment
    setTimeout(() => {
      router.push('/billing')
    }, 2000)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
        return <AlertCircle className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  if (loading && !invoice) {
    return (
      <ProtectedRoute>
        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!invoice) {
    return (
      <ProtectedRoute>
        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Invoice Not Found</h1>
            <p className="text-muted-foreground">The requested invoice could not be found.</p>
            <Button 
              className="mt-4" 
              onClick={() => router.push('/billing')}
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Billing
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-1 flex-col gap-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              onClick={() => router.push('/billing')}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Billing
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Invoice {invoice.id}</h1>
            <p className="text-muted-foreground">
              Invoice details and payment information
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(invoice.status)}>
              {getStatusIcon(invoice.status)}
              <span className="ml-1 capitalize">{invoice.status}</span>
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Invoice Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Invoice Details
                </CardTitle>
                <CardDescription>Complete invoice information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Invoice Number</h3>
                    <p className="text-muted-foreground">{invoice.id}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Invoice Date</h3>
                    <p className="text-muted-foreground">
                      {new Date(invoice.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Billing Period */}
                <div>
                  <h3 className="font-semibold mb-2">Billing Period</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(invoice.billingPeriod.start).toLocaleDateString()} - {new Date(invoice.billingPeriod.end).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Service Details */}
                <div>
                  <h3 className="font-semibold mb-2">Service Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{invoice.description}</span>
                      <span className="font-semibold">${invoice.amount.toFixed(2)}</span>
                    </div>
                    {currentPlan && (
                      <div className="text-sm text-muted-foreground">
                        <p>Billing Frequency: {currentPlan.billingFrequency === 'annual' ? 'Annual' : 'Monthly'}</p>
                        <p>Plan: {currentPlan.name}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Total */}
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Amount</span>
                  <span>${invoice.amount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment
                </CardTitle>
                <CardDescription>Complete your payment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoice.status === 'paid' ? (
                  <div className="text-center space-y-2">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="font-semibold text-green-700">Payment Complete</p>
                    <p className="text-sm text-muted-foreground">
                      This invoice has been paid successfully.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">${invoice.amount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Amount Due</p>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handlePayNow}
                      disabled={isProcessingPayment}
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Pay Now
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Secure payment powered by cryptocurrency
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleDownloadInvoice}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => router.push('/billing')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Billing
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Payment Dialog */}
        {currentPlan && (
          <PaymentDialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            selectedPlan={currentPlan}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
